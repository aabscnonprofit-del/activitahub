-- 034_worker_profile_fields.sql — Worker Profile Fields Patch
-- Depends on: 031 (worker_profiles), 033 (add_worker / update_unclaimed_worker).
--
-- Adds gender + date_of_birth to worker_profiles, and threads them through the organizer
-- add/update RPCs. roles is ALREADY TEXT[] (no column migration) — add_worker is widened
-- from a single role to p_roles TEXT[]. DOB "not in the future" is enforced IN the RPCs
-- (a CHECK using CURRENT_DATE is non-immutable and not allowed); no NOT-empty constraint
-- on roles (existing rows may have empty roles — non-empty is enforced in forms/actions).
-- Minor status is DERIVED from date_of_birth in the app (identify + flag only, no block).
-- No RLS / staffing / event-assignment changes.

ALTER TABLE worker_profiles
  ADD COLUMN IF NOT EXISTS gender        TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Immutable sanity floor only (a "<= CURRENT_DATE" CHECK is impossible — non-immutable).
ALTER TABLE worker_profiles
  DROP CONSTRAINT IF EXISTS worker_profiles_dob_floor_chk;
ALTER TABLE worker_profiles
  ADD CONSTRAINT worker_profiles_dob_floor_chk
  CHECK (date_of_birth IS NULL OR date_of_birth >= DATE '1900-01-01');

-- ── add_worker: p_role TEXT → p_roles TEXT[], + gender / date_of_birth (DROP first) ──
DROP FUNCTION IF EXISTS add_worker(TEXT, TEXT, TEXT, TEXT);
CREATE FUNCTION add_worker(
  p_name TEXT, p_email TEXT, p_phone TEXT, p_roles TEXT[], p_gender TEXT, p_date_of_birth DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_email  TEXT;
  v_id     UUID;
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN RAISE EXCEPTION 'Name required'; END IF;
  v_email := lower(btrim(p_email));
  IF v_email = '' THEN RAISE EXCEPTION 'Email required'; END IF;  -- dedupe key
  IF p_date_of_birth IS NOT NULL AND p_date_of_birth > CURRENT_DATE THEN
    RAISE EXCEPTION 'date_of_birth cannot be in the future';
  END IF;

  -- Dedupe: reuse existing (claimed or unclaimed). No duplicate. No contact data returned.
  SELECT id, status INTO v_id, v_status FROM worker_profiles WHERE email_normalized = v_email;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_id,
      'outcome', CASE WHEN v_status = 'claimed' THEN 'reused_claimed' ELSE 'reused_unclaimed' END);
  END IF;

  INSERT INTO worker_profiles (status, email_normalized, email, phone, display_name, roles, gender, date_of_birth, created_by_organizer_id)
  VALUES ('unclaimed', v_email, btrim(p_email), NULLIF(btrim(p_phone), ''), btrim(p_name),
          COALESCE(p_roles, '{}'::TEXT[]), NULLIF(btrim(p_gender), ''), p_date_of_birth, v_uid)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'outcome', 'created');
END;
$$;

-- ── update_unclaimed_worker: + gender / date_of_birth (signature change → DROP first) ──
DROP FUNCTION IF EXISTS update_unclaimed_worker(UUID, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT[], INTEGER, TEXT);
CREATE FUNCTION update_unclaimed_worker(
  p_id UUID, p_display_name TEXT, p_phone TEXT, p_roles TEXT[],
  p_city TEXT, p_country TEXT, p_languages TEXT[], p_pay_rate_cents INTEGER, p_bio TEXT,
  p_gender TEXT, p_date_of_birth DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_n INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_date_of_birth IS NOT NULL AND p_date_of_birth > CURRENT_DATE THEN
    RAISE EXCEPTION 'date_of_birth cannot be in the future';
  END IF;

  UPDATE worker_profiles SET
    display_name   = COALESCE(NULLIF(btrim(p_display_name), ''), display_name),
    phone          = NULLIF(btrim(p_phone), ''),
    roles          = COALESCE(p_roles, '{}'::TEXT[]),
    city           = NULLIF(btrim(p_city), ''),
    country        = NULLIF(btrim(p_country), ''),
    languages      = p_languages,
    pay_rate_cents = p_pay_rate_cents,
    bio            = NULLIF(btrim(p_bio), ''),
    gender         = NULLIF(btrim(p_gender), ''),
    date_of_birth  = p_date_of_birth,
    updated_at     = NOW()
  WHERE id = p_id AND created_by_organizer_id = v_uid AND status = 'unclaimed';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', v_n > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION add_worker(TEXT, TEXT, TEXT, TEXT[], TEXT, DATE)                                          TO authenticated;
GRANT EXECUTE ON FUNCTION update_unclaimed_worker(UUID, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT[], INTEGER, TEXT, TEXT, DATE) TO authenticated;
