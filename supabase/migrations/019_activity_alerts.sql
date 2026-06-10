-- 019_activity_alerts.sql — Activity Alerts + Web Push (participant discovery)
-- Depends on: 006 (activities), 008 (notifications + notification_type), 013 (email queue)
--
-- Participants opt in to be notified about new activities matching their chosen
-- categories / location / language. Reuses the existing `notifications` table for
-- in-app delivery; adds web-push subscriptions and a digest queue.

-- New in-app notification kind.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'activity_alert';

-- ── Participant notification preferences (opt-in) ───────────────────────────
CREATE TABLE IF NOT EXISTS alert_preferences (
  profile_id  UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  categories  TEXT[] NOT NULL DEFAULT '{}',           -- from the activity category taxonomy
  language    TEXT,                                    -- notification language (locale code)
  radius_km   INTEGER NOT NULL DEFAULT 40,             -- captured for v1.1 precise distance
  frequency   TEXT NOT NULL DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily_digest')),
  city        TEXT,                                    -- v1 location match (city-level)
  country     TEXT,
  in_app      BOOLEAN NOT NULL DEFAULT TRUE,
  push        BOOLEAN NOT NULL DEFAULT FALSE,
  paused      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alert_preferences_rw" ON alert_preferences;
CREATE POLICY "alert_preferences_rw" ON alert_preferences FOR ALL
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- GIN index so the matcher can do `categories && activity_category` quickly.
CREATE INDEX IF NOT EXISTS alert_preferences_categories_idx ON alert_preferences USING GIN (categories);
CREATE INDEX IF NOT EXISTS alert_preferences_city_idx ON alert_preferences (lower(city));

-- ── Browser push subscriptions (Web Push / VAPID) ───────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subscriptions_rw" ON push_subscriptions;
CREATE POLICY "push_subscriptions_rw" ON push_subscriptions FOR ALL
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_profile_idx ON push_subscriptions (profile_id);

-- ── Delivery ledger: dedup + daily-digest queue ─────────────────────────────
CREATE TABLE IF NOT EXISTS activity_alert_deliveries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL DEFAULT 'in_app',          -- in_app | push
  status      TEXT NOT NULL DEFAULT 'sent',            -- sent | pending (digest)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at     TIMESTAMPTZ,
  UNIQUE (activity_id, profile_id)                     -- a participant is alerted once per activity
);

ALTER TABLE activity_alert_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_alert_deliveries_select" ON activity_alert_deliveries;
CREATE POLICY "activity_alert_deliveries_select" ON activity_alert_deliveries FOR SELECT
  USING (auth.uid() = profile_id);
CREATE INDEX IF NOT EXISTS aad_pending_idx ON activity_alert_deliveries (profile_id, status) WHERE status = 'pending';

-- ── Activity dispatch bookkeeping (idempotency + organizer benefit) ──────────
ALTER TABLE activities ADD COLUMN IF NOT EXISTS alerts_sent_at        TIMESTAMPTZ;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS alerts_reached_count  INTEGER NOT NULL DEFAULT 0;

-- ── Keep activity_alert OUT of the email queue (email is not in scope) ───────
CREATE OR REPLACE FUNCTION enqueue_email_for_notification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Activity alerts are in-app + web-push only; never mirror them to email.
  IF NEW.type = 'activity_alert' THEN
    RETURN NEW;
  END IF;
  INSERT INTO email_notifications (profile_id, to_email, template, subject, payload, status)
  VALUES (NEW.profile_id, (SELECT email FROM profiles WHERE id = NEW.profile_id),
          NEW.type::text, NEW.title, NEW.data, 'queued');
  RETURN NEW;
END;
$$;
