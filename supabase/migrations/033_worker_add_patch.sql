-- 033_worker_add_patch.sql — Organizer Add Worker Backend Patch
-- Depends on: 031 (worker_profiles, add_worker), 032 (verified + provenance RLS).
--
-- 1. Replace add_worker to RETURN JSONB { id, outcome } so the organizer gets honest
--    three-case feedback (created | reused_unclaimed | reused_claimed). Dedupe stays by
--    email_normalized; never a duplicate; NEVER returns claimed-worker contact data
--    (only id + outcome leave the function).
-- 2. Add a minimal organizer correction path for UNCLAIMED rows they created, via two
--    SECURITY DEFINER RPCs (column-precise — RLS can't restrict columns). They update a
--    fixed allowed set (never email_normalized / status / user_id) and only when the row
--    is still 'unclaimed' AND created_by the caller. Claimed profiles are untouchable.

-- ── add_worker → JSONB { id, outcome } (return type changes → must DROP first) ──
DROP FUNCTION IF EXISTS add_worker(TEXT, TEXT, TEXT, TEXT);
CREATE FUNCTION add_worker(p_name TEXT, p_email TEXT, p_phone TEXT, p_role TEXT)
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

  -- Dedupe: reuse existing (claimed or unclaimed). No duplicate. No contact data returned.
  SELECT id, status INTO v_id, v_status FROM worker_profiles WHERE email_normalized = v_email;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_id,
      'outcome', CASE WHEN v_status = 'claimed' THEN 'reused_claimed' ELSE 'reused_unclaimed' END);
  END IF;

  INSERT INTO worker_profiles (status, email_normalized, email, phone, display_name, roles, created_by_organizer_id)
  VALUES ('unclaimed', v_email, btrim(p_email), NULLIF(btrim(p_phone), ''), btrim(p_name),
          CASE WHEN COALESCE(btrim(p_role), '') = '' THEN '{}'::TEXT[] ELSE ARRAY[btrim(p_role)] END, v_uid)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'outcome', 'created');
END;
$$;

-- ── Organizer correction: update only an UNCLAIMED row they created ───────────
-- Allowed fields only; NEVER email_normalized / status / user_id. No-op on claimed
-- rows or rows created by another organizer (guarded in the WHERE clause).
CREATE OR REPLACE FUNCTION update_unclaimed_worker(
  p_id UUID, p_display_name TEXT, p_phone TEXT, p_roles TEXT[],
  p_city TEXT, p_country TEXT, p_languages TEXT[], p_pay_rate_cents INTEGER, p_bio TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_n INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE worker_profiles SET
    display_name   = COALESCE(NULLIF(btrim(p_display_name), ''), display_name),
    phone          = NULLIF(btrim(p_phone), ''),
    roles          = COALESCE(p_roles, '{}'::TEXT[]),
    city           = NULLIF(btrim(p_city), ''),
    country        = NULLIF(btrim(p_country), ''),
    languages      = p_languages,
    pay_rate_cents = p_pay_rate_cents,
    bio            = NULLIF(btrim(p_bio), ''),
    updated_at     = NOW()
  WHERE id = p_id AND created_by_organizer_id = v_uid AND status = 'unclaimed';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', v_n > 0);
END;
$$;

-- ── Organizer correction: delete only an UNCLAIMED row they created ───────────
CREATE OR REPLACE FUNCTION delete_unclaimed_worker(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_n INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM worker_profiles
   WHERE id = p_id AND created_by_organizer_id = v_uid AND status = 'unclaimed';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('ok', v_n > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION add_worker(TEXT, TEXT, TEXT, TEXT)                                  TO authenticated;
GRANT EXECUTE ON FUNCTION update_unclaimed_worker(UUID, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT[], INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_unclaimed_worker(UUID)                                       TO authenticated;
