-- ============================================================
-- 037_experienced_applications.sql — Experienced Organizer Review Queue
-- Intake/triage that sits BEFORE payment on the experienced path
-- (ORGANIZER_ONBOARDING_SPEC_V1 §3 + EXPERIENCED_ORGANIZER_REVIEW_QUEUE_
-- IMPLEMENTATION_PLAN). B1 decision: application is submitted BEFORE payment;
-- payment/enrollment becomes available only after activation; rejected/redirected
-- applicants are not charged for the experienced route.
--
-- No redesign of certification/exam. Public links are SUPPORTING information only
-- (never required). Activation timing (`activate_after`) and its window are an
-- INTERNAL implementation detail — never exposed to users (no countdown/ETA).
-- Idempotent.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE experienced_application_status AS ENUM
    ('under_review', 'approved', 'activated', 'rejected', 'redirected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS experienced_applications (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id     UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status         experienced_application_status NOT NULL DEFAULT 'under_review',
  -- Optional supporting links (NEVER required, NEVER verified — trust-first unchanged).
  link_instagram TEXT,
  link_facebook  TEXT,
  link_meetup    TEXT,
  link_linkedin  TEXT,
  link_website   TEXT,
  link_portfolio TEXT,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  decision_note  TEXT,
  -- INTERNAL: earliest activation moment. The window and algorithm are internal and
  -- must never surface to users. NULL = no auto-activation scheduled yet.
  activate_after TIMESTAMPTZ,
  activated_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS experienced_applications_status_idx
  ON experienced_applications (status, activate_after);

ALTER TABLE experienced_applications ENABLE ROW LEVEL SECURITY;
-- Direct reads: applicant may read OWN row. All writes + privileged reads go through
-- the SECURITY DEFINER functions below (mirrors submit_exam / participants pattern).
DROP POLICY IF EXISTS "experienced_apps_self_select" ON experienced_applications;
CREATE POLICY "experienced_apps_self_select" ON experienced_applications FOR SELECT
  USING (auth.uid() = profile_id);

-- Internal-only activation window (NOT exposed). Tunable; default 1 hour review window.
-- (A constant here keeps the timing in one internal place.)
-- ── submit (applicant) ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION submit_experienced_application(
  p_instagram TEXT, p_facebook TEXT, p_meetup TEXT,
  p_linkedin TEXT, p_website TEXT, p_portfolio TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_path onboarding_path;
  v_window INTERVAL := INTERVAL '1 hour';  -- INTERNAL window, not exposed
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT selected_path INTO v_path FROM profiles WHERE id = v_uid;
  IF v_path IS DISTINCT FROM 'experienced' THEN RAISE EXCEPTION 'not_experienced_path'; END IF;

  INSERT INTO experienced_applications (
    profile_id, status,
    link_instagram, link_facebook, link_meetup, link_linkedin, link_website, link_portfolio,
    submitted_at, activate_after, reviewed_by, reviewed_at, decision_note, activated_at
  ) VALUES (
    v_uid, 'under_review',
    NULLIF(btrim(p_instagram), ''), NULLIF(btrim(p_facebook), ''), NULLIF(btrim(p_meetup), ''),
    NULLIF(btrim(p_linkedin), ''), NULLIF(btrim(p_website), ''), NULLIF(btrim(p_portfolio), ''),
    NOW(), NOW() + v_window, NULL, NULL, NULL, NULL
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    status = 'under_review',
    link_instagram = EXCLUDED.link_instagram, link_facebook = EXCLUDED.link_facebook,
    link_meetup = EXCLUDED.link_meetup, link_linkedin = EXCLUDED.link_linkedin,
    link_website = EXCLUDED.link_website, link_portfolio = EXCLUDED.link_portfolio,
    submitted_at = NOW(),
    -- Rejection durability: re-applying after a rejection returns to under_review but does
    -- NOT auto-activate — it requires an explicit admin approve (which sets activate_after).
    -- Any other prior state (fresh/under_review/approved) keeps the normal internal window.
    activate_after = CASE WHEN experienced_applications.status = 'rejected'
                          THEN NULL ELSE NOW() + v_window END,
    reviewed_by = NULL, reviewed_at = NULL, decision_note = NULL, activated_at = NULL,
    updated_at = NOW();

  RETURN jsonb_build_object('status', 'under_review');
END $$;

-- ── get own application (applicant); lazily activates when due ────────────────
CREATE OR REPLACE FUNCTION get_experienced_application()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  r experienced_applications%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO r FROM experienced_applications WHERE profile_id = v_uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'none'); END IF;

  -- Lazy activation: when the internal window has elapsed (or a manual approve set
  -- activate_after), move under_review/approved → activated. Internal; no ETA shown.
  IF r.status IN ('under_review', 'approved')
     AND r.activate_after IS NOT NULL AND NOW() >= r.activate_after THEN
    UPDATE experienced_applications
      SET status = 'activated', activated_at = NOW(), updated_at = NOW()
      WHERE profile_id = v_uid
      RETURNING * INTO r;
  END IF;

  -- NOTE: activate_after is intentionally NOT returned (internal detail).
  RETURN jsonb_build_object(
    'status', r.status,
    'links', jsonb_build_object(
      'instagram', r.link_instagram, 'facebook', r.link_facebook, 'meetup', r.link_meetup,
      'linkedin', r.link_linkedin, 'website', r.link_website, 'portfolio', r.link_portfolio),
    'submitted_at', r.submitted_at,
    'decision_note', r.decision_note
  );
END $$;

-- ── admin: list pending applications ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_list_experienced_applications()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'profile_id', ea.profile_id,
      'status', ea.status,
      'holder_name', p.full_name,
      'holder_email', p.email,
      'submitted_at', ea.submitted_at,
      'links', jsonb_build_object(
        'instagram', ea.link_instagram, 'facebook', ea.link_facebook, 'meetup', ea.link_meetup,
        'linkedin', ea.link_linkedin, 'website', ea.link_website, 'portfolio', ea.link_portfolio)
    ) ORDER BY ea.submitted_at)
    FROM experienced_applications ea
    JOIN profiles p ON p.id = ea.profile_id
    WHERE ea.status IN ('under_review', 'approved')
  ), '[]'::jsonb);
END $$;

-- ── admin: decide (approve / reject / redirect) ──────────────────────────────
CREATE OR REPLACE FUNCTION admin_review_experienced_application(
  p_profile_id UUID, p_decision TEXT, p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_status experienced_application_status;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF p_decision = 'approve' THEN
    -- Approved → eligible for activation now (lazy get flips to 'activated').
    UPDATE experienced_applications SET
      status = 'approved', activate_after = NOW(),
      reviewed_by = v_uid, reviewed_at = NOW(), decision_note = p_note, updated_at = NOW()
      WHERE profile_id = p_profile_id RETURNING status INTO v_status;
  ELSIF p_decision = 'reject' THEN
    UPDATE experienced_applications SET
      status = 'rejected', reviewed_by = v_uid, reviewed_at = NOW(),
      decision_note = p_note, updated_at = NOW()
      WHERE profile_id = p_profile_id RETURNING status INTO v_status;
  ELSIF p_decision = 'redirect' THEN
    UPDATE experienced_applications SET
      status = 'redirected', reviewed_by = v_uid, reviewed_at = NOW(),
      decision_note = p_note, updated_at = NOW()
      WHERE profile_id = p_profile_id RETURNING status INTO v_status;
    -- Redirect to the standard Academy path (existing New Organizer path).
    UPDATE profiles SET selected_path = 'beginner', updated_at = NOW()
      WHERE id = p_profile_id;
  ELSE
    RAISE EXCEPTION 'invalid_decision';
  END IF;

  IF v_status IS NULL THEN RAISE EXCEPTION 'application_not_found'; END IF;
  RETURN jsonb_build_object('status', v_status);
END $$;

GRANT EXECUTE ON FUNCTION submit_experienced_application(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_experienced_application()                                 TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_experienced_applications()                         TO authenticated;
GRANT EXECUTE ON FUNCTION admin_review_experienced_application(UUID,TEXT,TEXT)          TO authenticated;
