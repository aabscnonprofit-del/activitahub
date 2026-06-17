-- ============================================================
-- 036_invoices.sql — Invoice MVP (Commit 1): the money-request entity
-- ============================================================
-- Depends on: 001 (profiles, update_updated_at_column), 003 (is_admin),
--   006 (organizer_profiles.display_name), 008 (notification_type, customer_requests),
--   009 (bookings), 008 (proposals), 021 (ope_plans), 020 (RSVP token pattern),
--   030 (vendor_quote_lookup definer-RPC pattern), 035 (Stripe Connect).
--
-- MODEL: all customer payments flow through invoices. A Booking is the agreement;
-- an Invoice is a money request; a Payment is a Stripe charge against an invoice
-- that settles to the ORGANIZER's connected account (destination + on_behalf_of,
-- handled in later commits). This migration adds ONLY the table + token + RLS +
-- the public lookup RPC + one notification enum value.
--
-- SECURITY INVARIANT: the organizer (owner) can create/edit/void their own
-- invoices but can NEVER write a paid state or any payment field — `status='paid'`,
-- `paid_at`, and the stripe_* ids are written exclusively by the service role
-- (the checkout.session.completed webhook, a later commit). Anonymous customers
-- read ONLY the curated fields returned by invoice_lookup() — never the table.
--
-- Scope: additive only. No UI, no Stripe code, no booking-checkout changes; no
-- mutation of bookings/proposals/plans/profiles (referenced by FK only).
-- Refunds are DEFERRED — no refund status in this migration.
-- ============================================================

-- Organizer notified when an invoice is paid (used by the webhook, a later commit).
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invoice_paid';

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Payee. RESTRICT (not CASCADE): invoices are financial records and must not
  -- vanish automatically if an organizer profile is deleted.
  organizer_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Payer identity (informational / receipt). Soft links so deleting a related
  -- record never destroys the money record.
  customer_id                   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_email                TEXT,

  -- Provenance / prefill (all optional).
  plan_id                       UUID REFERENCES ope_plans(id) ON DELETE SET NULL,
  booking_id                    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  proposal_id                   UUID REFERENCES proposals(id) ON DELETE SET NULL,
  request_id                    UUID REFERENCES customer_requests(id) ON DELETE SET NULL,

  kind                          TEXT NOT NULL CHECK (kind IN ('deposit', 'final', 'full', 'additional')),
  title                         TEXT NOT NULL,
  description                   TEXT,

  amount_cents                  INTEGER NOT NULL CHECK (amount_cents > 0),
  currency                      TEXT NOT NULL DEFAULT 'usd',

  -- Lifecycle. 'paid' is written only by the service role. Refunds deferred (no
  -- 'refunded' value yet — a future CHECK extension, not ALTER TYPE).
  status                        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void')),

  -- Durable public payment-link handle (RSVP idiom; ~122-bit, unguessable). The
  -- sole anonymous handle; never returned by invoice_lookup().
  token                         TEXT NOT NULL UNIQUE DEFAULT replace(uuid_generate_v4()::text, '-', ''),

  -- Stripe references (written by the service role at/after payment).
  stripe_checkout_session_id    TEXT,
  stripe_payment_intent_id      TEXT,
  stripe_destination_account_id TEXT, -- snapshot of the organizer acct used (audit)

  paid_at                       TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoices_organizer_id_idx ON invoices(organizer_id);
CREATE INDEX IF NOT EXISTS invoices_plan_id_idx      ON invoices(plan_id);
CREATE INDEX IF NOT EXISTS invoices_booking_id_idx   ON invoices(booking_id);
-- token already has a UNIQUE index from the column constraint.

COMMENT ON TABLE invoices IS
  'Money request against the all-invoice payment rail. Owner manages own rows (RLS); paid state + stripe_* fields are service-role-only (webhook). Anonymous payment via the token + invoice_lookup() RPC. Settles to the organizer connected account (later commits).';
COMMENT ON COLUMN invoices.organizer_id IS 'Payee. ON DELETE RESTRICT — financial records must not auto-delete.';
COMMENT ON COLUMN invoices.kind IS 'deposit | final | full | additional (additional = change order / extra charge).';
COMMENT ON COLUMN invoices.status IS 'draft | open | paid | void. paid is set only by the service role. Refunds deferred.';
COMMENT ON COLUMN invoices.token IS 'Durable public payment-link handle (RSVP pattern). Never exposed by invoice_lookup().';

-- Auto-maintain updated_at (reuses the shared trigger fn from 001).
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- SELECT: organizer (owner), the named customer, or admin.
DROP POLICY IF EXISTS "invoices_select_owner" ON invoices;
CREATE POLICY "invoices_select_owner"
  ON invoices FOR SELECT
  USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "invoices_select_customer" ON invoices;
CREATE POLICY "invoices_select_customer"
  ON invoices FOR SELECT
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "invoices_select_admin" ON invoices;
CREATE POLICY "invoices_select_admin"
  ON invoices FOR SELECT
  USING (is_admin());

-- INSERT: owner only, and never into a paid/payment state.
DROP POLICY IF EXISTS "invoices_insert_owner" ON invoices;
CREATE POLICY "invoices_insert_owner"
  ON invoices FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id
    AND status IN ('draft', 'open')
    AND paid_at IS NULL
    AND stripe_payment_intent_id IS NULL
  );

-- UPDATE: owner only; the WITH CHECK forbids the owner ever writing a paid state
-- or any payment field. Marking paid is the service role's job (webhook).
DROP POLICY IF EXISTS "invoices_update_owner" ON invoices;
CREATE POLICY "invoices_update_owner"
  ON invoices FOR UPDATE
  USING (auth.uid() = organizer_id)
  WITH CHECK (
    auth.uid() = organizer_id
    AND status <> 'paid'
    AND paid_at IS NULL
    AND stripe_payment_intent_id IS NULL
  );

-- No DELETE policy (use 'void' — preserves the financial audit trail).
-- No anon policy: anonymous customers read ONLY via invoice_lookup() below.
-- The service role bypasses RLS and is the sole writer of the paid transition.

-- ============================================================
-- PUBLIC LOOKUP RPC (token-gated, no account)
-- ============================================================
-- Curated fields only — no customer PII, no internal/FK ids, no stripe_* ids,
-- no token. Mirrors vendor_quote_lookup (030). NULL when not found.
CREATE OR REPLACE FUNCTION invoice_lookup(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  SELECT jsonb_build_object(
    'title',          i.title,
    'description',    i.description,
    'amount_cents',   i.amount_cents,
    'currency',       i.currency,
    'kind',           i.kind,
    'status',         i.status,
    'organizer_name', COALESCE(op.display_name, p.full_name)
  ) INTO v
  FROM invoices i
  JOIN profiles p ON p.id = i.organizer_id
  LEFT JOIN organizer_profiles op ON op.user_id = i.organizer_id
  WHERE i.token = p_token;
  RETURN v; -- NULL if not found
END;
$$;

GRANT EXECUTE ON FUNCTION invoice_lookup(TEXT) TO anon, authenticated;
