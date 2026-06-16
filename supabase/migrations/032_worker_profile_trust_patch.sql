-- 032_worker_profile_trust_patch.sql — Worker Profile Trust Patch
-- Depends on: 031 (worker_profiles), 001 (is_admin).
--
-- Two trust fixes ahead of any public directory/search:
--   1. Add a `verified` state (the gate a future curated search must require). Defaults
--      false; set only by an admin/verification flow later — NEVER self-set by the worker.
--   2. Tighten the SELECT policy: the organizer who added an UNCLAIMED profile may read it,
--      but once the worker CLAIMS it (status='claimed'), that organizer read is severed —
--      claimed profiles are readable only by the worker owner and admin (raw RLS). A future
--      curated search RPC (SECURITY DEFINER) will expose safe fields; this slice adds NO
--      such RPC and NO public/published read path.

ALTER TABLE worker_profiles
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Provenance read is now limited to unclaimed rows: claiming the profile removes the
-- creating organizer's lingering read access to the now self-owned profile.
DROP POLICY IF EXISTS "worker_profiles_select" ON worker_profiles;
CREATE POLICY "worker_profiles_select" ON worker_profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR (created_by_organizer_id = auth.uid() AND status = 'unclaimed')
    OR is_admin()
  );

COMMENT ON COLUMN worker_profiles.verified IS 'Platform verification state (default false). Set by admin/verification flow only — never self-set. The gate a future curated public search must require alongside status=claimed AND published.';
