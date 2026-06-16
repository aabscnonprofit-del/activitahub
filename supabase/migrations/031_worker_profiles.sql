-- 031_worker_profiles.sql — Worker Network MVP Slice 1: Worker Profiles + Claim Foundation
-- Depends on: 001 (profiles, is_admin).
--
-- Workers are PLATFORM PARTICIPANTS, not organizer-owned records. A worker_profile is
-- owned by the worker (user_id) once claimed. Two creation paths:
--   1. self-registration → status='claimed', user_id = self;
--   2. organizer adds (add_worker RPC) → status='unclaimed', user_id = NULL, referenced
--      (created_by_organizer_id is provenance, NOT ownership).
-- Dedupe by NORMALIZED email (lower(trim(email))) → one record per person platform-wide.
-- A worker claims an unclaimed profile by signing up with the matching email
-- (claim_worker_by_email). No directory/search, staffing, or invitations in this slice.

CREATE TABLE IF NOT EXISTS worker_profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- owner once claimed
  status                  TEXT NOT NULL DEFAULT 'unclaimed',                -- 'unclaimed' | 'claimed'
  email_normalized        TEXT NOT NULL UNIQUE,                             -- dedupe key: lower(trim(email))
  email                   TEXT,
  phone                   TEXT,
  display_name            TEXT NOT NULL,
  roles                   TEXT[] NOT NULL DEFAULT '{}',
  city                    TEXT,
  country                 TEXT,
  languages               TEXT[],
  pay_rate_cents          INTEGER,
  bio                     TEXT,
  available               BOOLEAN NOT NULL DEFAULT TRUE,
  published               BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_organizer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- provenance, NOT ownership
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One worker profile per platform user (owner). Unclaimed rows have NULL user_id.
CREATE UNIQUE INDEX IF NOT EXISTS worker_profiles_user_uidx ON worker_profiles (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS worker_profiles_roles_gin   ON worker_profiles USING GIN (roles);
CREATE INDEX IF NOT EXISTS worker_profiles_location_idx ON worker_profiles (city, country);

-- ── RLS — self-owned; organizer who created an unclaimed row may read it. ─────
-- No broad "published" SELECT here: discovery is a curated RPC in a later slice,
-- so worker contacts never leak through the table.
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_profiles_select" ON worker_profiles;
CREATE POLICY "worker_profiles_select" ON worker_profiles FOR SELECT
  USING (user_id = auth.uid() OR created_by_organizer_id = auth.uid() OR is_admin());

-- Self-registration only; organizer creation goes through add_worker (SECURITY DEFINER).
DROP POLICY IF EXISTS "worker_profiles_insert_self" ON worker_profiles;
CREATE POLICY "worker_profiles_insert_self" ON worker_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'claimed');

DROP POLICY IF EXISTS "worker_profiles_update_self" ON worker_profiles;
CREATE POLICY "worker_profiles_update_self" ON worker_profiles FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "worker_profiles_delete_self" ON worker_profiles;
CREATE POLICY "worker_profiles_delete_self" ON worker_profiles FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- ── Claim: a signed-in user claims any unclaimed profile matching their email ─
CREATE OR REPLACE FUNCTION claim_worker_by_email()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_email TEXT;
  v_id    UUID;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;

  SELECT lower(btrim(email)) INTO v_email FROM profiles WHERE id = v_uid;
  IF v_email IS NULL OR v_email = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'no_email'); END IF;

  -- Already own a profile → nothing to claim.
  IF EXISTS (SELECT 1 FROM worker_profiles WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', true, 'claimed', false, 'reason', 'already_owns');
  END IF;

  UPDATE worker_profiles
     SET user_id = v_uid, status = 'claimed', updated_at = NOW()
   WHERE email_normalized = v_email AND status = 'unclaimed'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN RETURN jsonb_build_object('ok', true, 'claimed', false); END IF;
  RETURN jsonb_build_object('ok', true, 'claimed', true, 'id', v_id);
END;
$$;

-- ── Organizer adds a worker (dedupe by normalized email; reuse if it exists) ──
-- Returns the existing or newly-created worker_profile id. Creates an UNCLAIMED row
-- (no ownership) when none exists. The caller (action) enforces organizer entitlement.
CREATE OR REPLACE FUNCTION add_worker(p_name TEXT, p_email TEXT, p_phone TEXT, p_role TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_email TEXT;
  v_id    UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN RAISE EXCEPTION 'Name required'; END IF;
  v_email := lower(btrim(p_email));
  IF v_email = '' THEN RAISE EXCEPTION 'Email required'; END IF;  -- email is the dedupe key

  -- Dedupe: reuse the existing profile (claimed or unclaimed). No duplicate created.
  SELECT id INTO v_id FROM worker_profiles WHERE email_normalized = v_email;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO worker_profiles (status, email_normalized, email, phone, display_name, roles, created_by_organizer_id)
  VALUES ('unclaimed', v_email, btrim(p_email), NULLIF(btrim(p_phone), ''), btrim(p_name),
          CASE WHEN COALESCE(btrim(p_role), '') = '' THEN '{}'::TEXT[] ELSE ARRAY[btrim(p_role)] END, v_uid)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_worker_by_email()                  TO authenticated;
GRANT EXECUTE ON FUNCTION add_worker(TEXT, TEXT, TEXT, TEXT)        TO authenticated;

COMMENT ON TABLE worker_profiles IS 'Worker-owned platform participant profiles. Self-registered (claimed) or organizer-added (unclaimed, referenced). Deduped by email_normalized. Owner = user_id; created_by_organizer_id is provenance only.';
