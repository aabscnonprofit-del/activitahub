-- 020_participants.sql — Participant Management System v1 (organizer operations)
-- Depends on: 006 (activities), 009 (bookings), 008 (notifications + notification_type)
--
-- Structured participant management per activity: list, RSVP, reminders, event
-- updates, check-in. NOT a CRM — scoped to running one activity's attendees.

-- New in-app notification kinds (event updates + reminders).
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_update';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_reminder';

-- Configurable reminder offsets (hours before the event). Default 7d / 24h / 2h.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS reminder_offsets_hours INTEGER[] NOT NULL DEFAULT '{168,24,2}';

-- ── Participants ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE participant_status AS ENUM
    ('invited', 'confirmed', 'maybe', 'declined', 'checked_in', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE participant_source AS ENUM ('manual', 'booking', 'registration');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS participants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id   UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  organizer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL, -- set when the participant is a platform user
  full_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  status        participant_status NOT NULL DEFAULT 'invited',
  notes         TEXT,
  source        participant_source NOT NULL DEFAULT 'manual',
  rsvp_token    TEXT NOT NULL UNIQUE DEFAULT replace(uuid_generate_v4()::text, '-', ''),
  checked_in_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS participants_activity_idx ON participants (activity_id);
CREATE INDEX IF NOT EXISTS participants_organizer_idx ON participants (organizer_id);
CREATE UNIQUE INDEX IF NOT EXISTS participants_activity_profile_idx
  ON participants (activity_id, profile_id) WHERE profile_id IS NOT NULL;

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants_organizer_rw" ON participants;
CREATE POLICY "participants_organizer_rw" ON participants FOR ALL
  USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);
-- A linked participant may read their own record (RSVP writes go via the RPC).
DROP POLICY IF EXISTS "participants_self_select" ON participants;
CREATE POLICY "participants_self_select" ON participants FOR SELECT
  USING (auth.uid() = profile_id);

-- ── Event updates (organizer broadcast log) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_updates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id  UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activity_updates_activity_idx ON activity_updates (activity_id, created_at DESC);
ALTER TABLE activity_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_updates_organizer_rw" ON activity_updates;
CREATE POLICY "activity_updates_organizer_rw" ON activity_updates FOR ALL
  USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

-- ── Reminder dedup ledger ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participant_reminders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  offset_hours   INTEGER NOT NULL,
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_id, offset_hours)
);

-- ── RSVP RPCs (token-based; participants manage only their own RSVP) ─────────
CREATE OR REPLACE FUNCTION rsvp_lookup(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  SELECT jsonb_build_object(
    'participant_name', p.full_name,
    'status', p.status,
    'activity_title', a.title,
    'city', a.city,
    'next_date', (SELECT MIN(ce.date) FROM calendar_events ce
                   WHERE ce.activity_id = a.id AND ce.date >= CURRENT_DATE)
  ) INTO v
  FROM participants p JOIN activities a ON a.id = p.activity_id
  WHERE p.rsvp_token = p_token;
  RETURN v; -- NULL if not found
END;
$$;

CREATE OR REPLACE FUNCTION rsvp_respond(p_token TEXT, p_response TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new participant_status; v_title TEXT;
BEGIN
  IF p_response NOT IN ('confirmed', 'maybe', 'declined') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_response');
  END IF;
  v_new := p_response::participant_status;
  -- Don't let an RSVP override a recorded check-in / no-show.
  UPDATE participants
     SET status = v_new, updated_at = NOW()
   WHERE rsvp_token = p_token AND status NOT IN ('checked_in', 'no_show')
  RETURNING (SELECT title FROM activities WHERE id = participants.activity_id) INTO v_title;
  IF v_title IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object('ok', true, 'status', p_response, 'activity_title', v_title);
END;
$$;

GRANT EXECUTE ON FUNCTION rsvp_lookup(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rsvp_respond(TEXT, TEXT) TO anon, authenticated;
