-- ============================================================
-- 005_certification.sql — Phase 3B: Final exam, grading, certificates
-- Depends on: 003_academy.sql, 004_course_visibility.sql
-- ============================================================
--
-- Builds the certification layer on top of the Phase 3A quiz structure:
--   * quizzes gain a course-level "final_exam" kind (was lesson-only)
--   * exam_attempts        — every graded submission
--   * certificates         — issued on a passing final exam
--
-- Grading and exam delivery go through SECURITY DEFINER functions so that:
--   * answer keys (quiz_options.is_correct) are NEVER sent to the client,
--   * grading happens server-side in the database (no service-role key needed),
--   * passing a final exam atomically records the attempt, issues the
--     certificate, and advances the profile to onboarding_status = 'certified'.
--
-- Public verification reads through verify_certificate() (granted to anon),
-- exposing only safe certificate fields.
-- ============================================================

-- ── Generalise quizzes: lesson knowledge-checks OR course final exams ─────────
DO $$ BEGIN
  CREATE TYPE quiz_kind AS ENUM ('lesson', 'final_exam');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS kind quiz_kind NOT NULL DEFAULT 'lesson';
ALTER TABLE quizzes ALTER COLUMN lesson_id DROP NOT NULL;

-- Replace the old unconditional UNIQUE(lesson_id) with partial uniqueness, and
-- enforce that a quiz attaches to exactly one parent (a lesson OR a course).
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_lesson_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS quizzes_lesson_id_uniq
  ON quizzes(lesson_id) WHERE lesson_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS quizzes_final_exam_uniq
  ON quizzes(course_id) WHERE kind = 'final_exam';

ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_parent_chk;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_parent_chk
  CHECK ((lesson_id IS NOT NULL)::int + (course_id IS NOT NULL)::int = 1);

-- Enrolled students may read quiz META for both lesson quizzes and the course
-- final exam (title/passing_score only — questions/options stay admin-only and
-- are delivered without answers via get_exam()).
DROP POLICY IF EXISTS "quizzes_select_enrolled" ON quizzes;
CREATE POLICY "quizzes_select_enrolled"
  ON quizzes FOR SELECT
  USING (
    is_admin()
    OR (
      lesson_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM lessons l
        JOIN modules m     ON m.id = l.module_id
        JOIN enrollments e ON e.course_id = m.course_id
        WHERE l.id = quizzes.lesson_id AND e.profile_id = auth.uid()
      )
    )
    OR (
      course_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.course_id = quizzes.course_id AND e.profile_id = auth.uid()
      )
    )
  );

-- ── exam_attempts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_attempts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id    UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL,
  passed     BOOLEAN NOT NULL,
  answers    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exam_attempts_profile_id_idx ON exam_attempts(profile_id);
CREATE INDEX IF NOT EXISTS exam_attempts_quiz_id_idx    ON exam_attempts(quiz_id);

ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exam_attempts_select_own" ON exam_attempts;
CREATE POLICY "exam_attempts_select_own"
  ON exam_attempts FOR SELECT
  USING (auth.uid() = profile_id OR is_admin());
-- Writes happen only via submit_exam() (SECURITY DEFINER); no direct INSERT.

-- ── certificates ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  exam_attempt_id  UUID REFERENCES exam_attempts(id) ON DELETE SET NULL,
  certificate_code TEXT UNIQUE NOT NULL,
  score            INTEGER NOT NULL,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, course_id)
);
CREATE INDEX IF NOT EXISTS certificates_profile_id_idx ON certificates(profile_id);
CREATE INDEX IF NOT EXISTS certificates_code_idx       ON certificates(certificate_code);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "certificates_select_own" ON certificates;
CREATE POLICY "certificates_select_own"
  ON certificates FOR SELECT
  USING (auth.uid() = profile_id OR is_admin());
-- Public verification is via verify_certificate(); no public table policy.

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Deliver an exam to an enrolled student WITHOUT answer keys.
CREATE OR REPLACE FUNCTION get_exam(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_course_id UUID;
  v_result    JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT course_id INTO v_course_id FROM quizzes WHERE id = p_quiz_id AND kind = 'final_exam';
  IF v_course_id IS NULL THEN RAISE EXCEPTION 'Exam not found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM enrollments e WHERE e.course_id = v_course_id AND e.profile_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not enrolled';
  END IF;

  SELECT jsonb_build_object(
    'id', q.id,
    'title', q.title,
    'description', q.description,
    'passing_score', q.passing_score,
    'questions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', qq.id,
          'prompt', qq.prompt,
          'type', qq.type,
          'options', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', qo.id, 'label', qo.label) ORDER BY qo.sort_order)
            FROM quiz_options qo WHERE qo.question_id = qq.id
          ), '[]'::jsonb)
        ) ORDER BY qq.sort_order
      )
      FROM quiz_questions qq WHERE qq.quiz_id = q.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM quizzes q WHERE q.id = p_quiz_id;

  RETURN v_result;
END;
$$;

-- Grade a final-exam submission, record the attempt, and (on pass) issue the
-- certificate + advance onboarding to 'certified'. Idempotent on the certificate.
CREATE OR REPLACE FUNCTION submit_exam(p_quiz_id UUID, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_course_id     UUID;
  v_passing       INTEGER;
  v_total         INTEGER;
  v_correct       INTEGER := 0;
  v_score         INTEGER;
  v_passed        BOOLEAN;
  v_attempt_id    UUID;
  v_cert_id       UUID;
  v_code          TEXT;
  v_lessons_total INTEGER;
  v_lessons_done  INTEGER;
  v_correct_set   TEXT[];
  v_selected_set  TEXT[];
  q               RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT course_id, passing_score INTO v_course_id, v_passing
  FROM quizzes WHERE id = p_quiz_id AND kind = 'final_exam';
  IF v_course_id IS NULL THEN RAISE EXCEPTION 'Exam not found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM enrollments e WHERE e.course_id = v_course_id AND e.profile_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not enrolled';
  END IF;

  -- Real-progress gate: every lesson in the course must be completed first.
  SELECT count(*) INTO v_lessons_total
  FROM lessons l JOIN modules m ON m.id = l.module_id
  WHERE m.course_id = v_course_id;

  SELECT count(*) INTO v_lessons_done
  FROM lesson_progress lp
  JOIN lessons l ON l.id = lp.lesson_id
  JOIN modules m ON m.id = l.module_id
  WHERE m.course_id = v_course_id AND lp.profile_id = v_uid AND lp.status = 'completed';

  IF v_lessons_total = 0 OR v_lessons_done < v_lessons_total THEN
    RAISE EXCEPTION 'Complete all lessons before taking the exam';
  END IF;

  -- Grade: a question is correct when the selected option set exactly matches
  -- the correct option set (works for single/multiple/true_false).
  SELECT count(*) INTO v_total FROM quiz_questions WHERE quiz_id = p_quiz_id;
  IF v_total = 0 THEN RAISE EXCEPTION 'Exam has no questions'; END IF;

  FOR q IN SELECT id FROM quiz_questions WHERE quiz_id = p_quiz_id LOOP
    SELECT array_agg(o.id::text ORDER BY o.id::text) INTO v_correct_set
    FROM quiz_options o WHERE o.question_id = q.id AND o.is_correct;

    SELECT array_agg(val ORDER BY val) INTO v_selected_set
    FROM jsonb_array_elements_text(COALESCE(p_answers -> (q.id::text), '[]'::jsonb)) AS t(val);

    v_correct_set  := COALESCE(v_correct_set, ARRAY[]::text[]);
    v_selected_set := COALESCE(v_selected_set, ARRAY[]::text[]);

    IF v_correct_set = v_selected_set THEN
      v_correct := v_correct + 1;
    END IF;
  END LOOP;

  v_score  := round(v_correct::numeric * 100 / v_total);
  v_passed := v_score >= v_passing;

  INSERT INTO exam_attempts (profile_id, quiz_id, score, passed, answers)
  VALUES (v_uid, p_quiz_id, v_score, v_passed, p_answers)
  RETURNING id INTO v_attempt_id;

  IF v_passed THEN
    SELECT id, certificate_code INTO v_cert_id, v_code
    FROM certificates WHERE profile_id = v_uid AND course_id = v_course_id;

    IF v_cert_id IS NULL THEN
      v_code := 'AH-' || upper(substring(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 12));
      INSERT INTO certificates (profile_id, course_id, exam_attempt_id, certificate_code, score)
      VALUES (v_uid, v_course_id, v_attempt_id, v_code, v_score)
      RETURNING id INTO v_cert_id;
    END IF;

    -- Advance to 'certified' only from a pre-certified state (never demote).
    UPDATE profiles SET onboarding_status = 'certified'
    WHERE id = v_uid
      AND onboarding_status IN ('not_started', 'path_selected', 'payment_pending', 'payment_complete');
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'passed', v_passed,
    'passing_score', v_passing,
    'attempt_id', v_attempt_id,
    'certificate_id', v_cert_id,
    'certificate_code', v_code
  );
END;
$$;

-- Public certificate verification — safe fields only.
CREATE OR REPLACE FUNCTION verify_certificate(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  SELECT jsonb_build_object(
    'valid', true,
    'certificate_code', c.certificate_code,
    'holder_name', p.full_name,
    'course_title', co.title,
    'score', c.score,
    'issued_at', c.issued_at
  ) INTO v
  FROM certificates c
  JOIN profiles p  ON p.id = c.profile_id
  JOIN courses  co ON co.id = c.course_id
  WHERE c.certificate_code = p_code;

  IF v IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  RETURN v;
END;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION get_exam(UUID)             TO authenticated;
GRANT EXECUTE ON FUNCTION submit_exam(UUID, JSONB)   TO authenticated;
GRANT EXECUTE ON FUNCTION verify_certificate(TEXT)   TO anon, authenticated;

COMMENT ON TABLE exam_attempts IS 'Every graded final-exam submission. Written only by submit_exam().';
COMMENT ON TABLE certificates  IS 'Issued on a passing final exam. Verified publicly via verify_certificate().';
