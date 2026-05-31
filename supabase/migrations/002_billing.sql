-- ============================================================
-- 002_billing.sql — Phase 2: Stripe billing foundation
-- Depends on: 001_profiles.sql (profiles, user_role, onboarding_status)
-- ============================================================
--
-- Adds the Stripe payment + subscription layer:
--   * profiles.stripe_customer_id  — links a profile to its Stripe Customer
--   * payments                     — one-time certification purchases
--   * subscriptions                — the recurring organizer subscription
--
-- All writes happen via the service-role webhook (Stripe is the source of
-- truth). RLS only grants users read access to their OWN billing rows.
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

-- Mirrors Stripe subscription statuses, normalised to the spelling the
-- billing UI expects ('cancelled' with two l's, vs Stripe's 'canceled').
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'cancelled',
    'incomplete',
    'incomplete_expired',
    'unpaid',
    'paused'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- The two certification purchase types (map 1:1 to onboarding_path).
DO $$ BEGIN
  CREATE TYPE payment_kind AS ENUM (
    'beginner_course',
    'experienced_test'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- PROFILES → add Stripe customer link
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- One Stripe customer maps to at most one profile.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN profiles.stripe_customer_id IS
  'Stripe Customer id (cus_...). Created lazily on first checkout.';

-- ============================================================
-- PAYMENTS — one-time certification purchases
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind                       payment_kind   NOT NULL,
  status                     payment_status NOT NULL DEFAULT 'pending',
  amount                     INTEGER        NOT NULL DEFAULT 0,  -- minor units (cents)
  currency                   TEXT           NOT NULL DEFAULT 'usd',
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id   TEXT,
  created_at                 TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_profile_id_idx ON payments(profile_id);
CREATE INDEX IF NOT EXISTS payments_status_idx     ON payments(status);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users may read their own payments. Writes are service-role only (webhook).
CREATE POLICY "payments_select_own"
  ON payments FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "payments_select_admin"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND suspended = FALSE
    )
  );

COMMENT ON TABLE payments IS
  'One-time certification purchases (beginner course / experienced test). Written by the Stripe webhook.';

-- ============================================================
-- SUBSCRIPTIONS — recurring organizer subscription
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                 subscription_status NOT NULL,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id        TEXT,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One active subscription record per profile (upserted by the webhook).
  UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_profile_id_idx ON subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx     ON subscriptions(status);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users may read their own subscription. Writes are service-role only (webhook).
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "subscriptions_select_admin"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND suspended = FALSE
    )
  );

COMMENT ON TABLE subscriptions IS
  'Recurring organizer subscription, mirrored from Stripe by the webhook. One row per profile.';
