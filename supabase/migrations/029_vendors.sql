-- 029_vendors.sql — Provider Profiles MVP (Vendor Network foundation)
-- Depends on: 001 (profiles), 006 (clients/venues owner-owned record pattern, is_admin).
--
-- A vendor is the organizer's PRIVATE, organizer-owned provider record — the
-- "private organizer layer" of VENDOR_NETWORK_ARCHITECTURE §2 (owned by the
-- organizer, never exposed to others). It mirrors the clients/venues pattern and
-- adds the capability bundle (§1: a vendor is a set of capabilities, the matching
-- unit OPE/Sourcing reference later). NO account/claim, NO directory, NO search,
-- NO sourcing/quoting here — those are later phases. RLS is owner-only.
--
-- Extension point (deferred, no rework): a future nullable vendor_user_id enables
-- the §5 "claim" flow without touching this private layer.

CREATE TABLE IF NOT EXISTS vendors (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  company_name TEXT,
  email        TEXT,
  phone        TEXT,
  city         TEXT,
  country      TEXT,
  languages    TEXT[],
  capabilities TEXT[] NOT NULL DEFAULT '{}',   -- the capability bundle (matching unit)
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vendors_organizer_id_idx ON vendors(organizer_id);

-- ── RLS — owner-only (identical to clients/venues) ───────────────────────────
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_select" ON vendors;
CREATE POLICY "vendors_select" ON vendors FOR SELECT
  USING (auth.uid() = organizer_id OR is_admin());

DROP POLICY IF EXISTS "vendors_modify" ON vendors;
CREATE POLICY "vendors_modify" ON vendors FOR ALL
  USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

COMMENT ON TABLE vendors IS 'Organizer-owned private provider profiles (Vendor Network foundation). Capability-tagged; owner-only. Referenced by OPE/Vendor Sourcing in later phases.';
