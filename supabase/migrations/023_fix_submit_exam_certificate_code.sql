-- ============================================================
-- 023_fix_submit_exam_certificate_code.sql
-- Bugfix: production final-exam submission failed with
--   "function gen_random_bytes(integer) does not exist"
--
-- Cause: submit_exam() (005_certification.sql) generated the certificate_code
-- with pgcrypto's gen_random_bytes(6). pgcrypto IS declared (001), but on the
-- production database its functions live in the `extensions` schema, while
-- submit_exam runs with `SET search_path = public` — so gen_random_bytes is not
-- resolvable there and the exam submission errors out. (It worked in local dev,
-- where pgcrypto installs into `public`.)
--
-- Fix (minimal, failing path only): build the code from the CORE function
-- gen_random_uuid() (pg_catalog, always in search_path, no extension dependency,
-- available since PostgreSQL 13). The certificate_code format is unchanged:
-- 'AH-' + 12 uppercase hex characters.
--
-- This re-defines submit_exam() identically except for that one line; no other
-- behaviour, signature, security, or grading logic changes. Depends on: 005.
-- ============================================================

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
      -- FIX: core gen_random_uuid() instead of pgcrypto gen_random_bytes().
      -- Same output shape: 'AH-' + 12 uppercase hex characters.
      v_code := 'AH-' || upper(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 12));
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
