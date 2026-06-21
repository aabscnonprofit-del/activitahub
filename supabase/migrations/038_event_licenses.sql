-- ============================================================
-- 038_event_licenses.sql — One Event License (Activity Planner $9.99)
-- ============================================================
-- A consumable entitlement: ONE purchased license = ONE event (per the product
-- decision). Recorded via the existing PLATFORM checkout architecture (same as
-- certification one-time payments): the buyer pays the platform; the webhook
-- (checkout.session.completed, kind='one_event_license') inserts an 'active' row.
--
-- Mirrors the security stance of 035/036: owner SELECT only; ALL writes go through
-- the service role (the webhook). No owner INSERT/UPDATE — entitlements must not be
-- self-grantable. Consumption (active → consumed) is NOT wired in this migration
-- (the columns exist for a later commit); this migration only RECORDS purchases.
--
-- Scope: additive only. No Connect, no invoices, no subscription, no profiles change.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE event_license_status AS ENUM ('active', 'consumed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS event_licenses (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                      event_license_status NOT NULL DEFAULT 'active',
  amount                      INTEGER NOT NULL DEFAULT 0,        -- minor units (cents); from the Stripe session
  currency                    TEXT NOT NULL DEFAULT 'usd',
  -- Idempotency key for the webhook (one row per Checkout Session).
  stripe_checkout_session_id  TEXT UNIQUE,
  stripe_payment_intent_id    TEXT,
  -- Consumption target — the event/plan this license was used for. No FK: the
  -- planner's "event" is not necessarily an `activities` row. Wired in a later commit.
  activity_id                 UUID,
  consumed_at                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_licenses_profile_id_idx ON event_licenses(profile_id);
CREATE INDEX IF NOT EXISTS event_licenses_status_idx     ON event_licenses(status);

COMMENT ON TABLE event_licenses IS
  'One Event License (consumable): one purchase = one event. Owner SELECT only; written exclusively by the service role (checkout.session.completed webhook, kind=one_event_license). Platform charge — never a Connect/connected-account payment.';
COMMENT ON COLUMN event_licenses.status IS 'active = purchased & unused; consumed = used for one event (consumption wired later).';
COMMENT ON COLUMN event_licenses.activity_id IS 'The event/plan that consumed this license; no FK (planner output is not an activities row). NULL until consumed.';

-- Auto-maintain updated_at (reuses the shared trigger fn from 001).
DROP TRIGGER IF EXISTS event_licenses_updated_at ON event_licenses;
CREATE TRIGGER event_licenses_updated_at
  BEFORE UPDATE ON event_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE event_licenses ENABLE ROW LEVEL SECURITY;

-- Owner may read their own licenses. No owner write policy: the webhook (service
-- role) is the sole writer, so entitlements are structurally un-self-grantable.
DROP POLICY IF EXISTS "event_licenses_select_own" ON event_licenses;
CREATE POLICY "event_licenses_select_own"
  ON event_licenses FOR SELECT
  USING (auth.uid() = profile_id);
