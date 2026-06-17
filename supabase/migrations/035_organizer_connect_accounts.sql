-- ============================================================
-- 035_organizer_connect_accounts.sql — Stripe Connect Foundation (Commit 1)
-- ============================================================
-- One row per organizer holding their Stripe Connect (Express) state.
--
-- WHY A DEDICATED TABLE (not columns on profiles):
--   profiles_update_own (001) lets a user UPDATE most of their own profile
--   columns; its WITH CHECK only locks `role` and `suspended`. Connect
--   capability flags gate whether an organizer may receive customer money, so
--   they MUST NOT be self-writable. This table grants the owner SELECT only and
--   defines NO owner INSERT/UPDATE/DELETE policy — every write goes through the
--   service-role client (onboarding action + account.updated webhook), which
--   bypasses RLS. The flags are therefore structurally un-self-settable.
--
-- Fail-closed: all capability booleans default FALSE — a fresh row cannot accept
-- payments until the webhook flips charges_enabled from Stripe's real account state.
--
-- Scope: this migration is additive only. No profiles changes, no invoices, no
-- booking-payment changes, no onboarding code, no UI, no staffing.
-- ============================================================

CREATE TABLE IF NOT EXISTS organizer_connect_accounts (
  organizer_id       UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_account_id  TEXT        NOT NULL UNIQUE,              -- acct_…; UNIQUE doubles as the account.updated webhook lookup key
  account_type       TEXT        NOT NULL DEFAULT 'express' CHECK (account_type = 'express'),
  charges_enabled    BOOLEAN     NOT NULL DEFAULT FALSE,       -- hard gate: may accept customer funds
  payouts_enabled    BOOLEAN     NOT NULL DEFAULT FALSE,       -- may withdraw (informational)
  details_submitted  BOOLEAN     NOT NULL DEFAULT FALSE,       -- finished hosted onboarding
  disabled_reason    TEXT,                                     -- Stripe requirements.disabled_reason, for the "restricted" UI state
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizer_connect_accounts IS
  'Stripe Connect (Express) state per organizer. Owner SELECT only; all writes via service role (onboarding action + account.updated webhook). Capability flags gate receiving customer funds and must not be self-writable.';
COMMENT ON COLUMN organizer_connect_accounts.stripe_account_id IS 'Stripe connected account id (acct_…). UNIQUE; lookup key for the account.updated webhook.';
COMMENT ON COLUMN organizer_connect_accounts.charges_enabled IS 'Stripe account.charges_enabled — the hard requirement before this organizer may accept customer payments.';
COMMENT ON COLUMN organizer_connect_accounts.payouts_enabled IS 'Stripe account.payouts_enabled — whether the organizer can withdraw funds.';
COMMENT ON COLUMN organizer_connect_accounts.details_submitted IS 'Stripe account.details_submitted — whether hosted onboarding was completed.';
COMMENT ON COLUMN organizer_connect_accounts.disabled_reason IS 'Stripe requirements.disabled_reason when the account is restricted; NULL when in good standing.';

-- Auto-update updated_at on any row change (reuses the shared trigger fn from 001).
DROP TRIGGER IF EXISTS organizer_connect_accounts_updated_at ON organizer_connect_accounts;
CREATE TRIGGER organizer_connect_accounts_updated_at
  BEFORE UPDATE ON organizer_connect_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE organizer_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Owner may read their own Connect state.
DROP POLICY IF EXISTS "organizer_connect_accounts_select_own" ON organizer_connect_accounts;
CREATE POLICY "organizer_connect_accounts_select_own"
  ON organizer_connect_accounts FOR SELECT
  USING (auth.uid() = organizer_id);

-- Admin may read all (support visibility); reuses is_admin() from 003.
DROP POLICY IF EXISTS "organizer_connect_accounts_select_admin" ON organizer_connect_accounts;
CREATE POLICY "organizer_connect_accounts_select_admin"
  ON organizer_connect_accounts FOR SELECT
  USING (is_admin());

-- NO owner INSERT/UPDATE/DELETE policies, by design: all writes go through the
-- service-role client (onboarding action + account.updated webhook), which
-- bypasses RLS. This keeps the money-gating capability flags un-self-settable.
