-- ============================================================
-- 004_course_visibility.sql — Phase 3A fix
-- Depends on: 003_academy.sql
-- ============================================================
--
-- Fixes a chicken-and-egg deadlock in the original courses RLS:
--   003 made a course readable ONLY when the user is already enrolled.
--   But enrollment requires first reading the course (to resolve which course
--   matches the user's selected_path). Result: a new paid student could never
--   read their course, so the enrollment was never created and the academy
--   showed "No course available".
--
-- Fix: the course CATALOG (title/description/path) is readable by academy-
-- eligible users (those who have paid for certification) and by anyone already
-- enrolled, plus admins. Lesson CONTENT (modules/lessons/quizzes) stays
-- enrollment-gated — student access control is unchanged.
-- ============================================================

DROP POLICY IF EXISTS "courses_select_enrolled" ON courses;
DROP POLICY IF EXISTS "courses_select_eligible" ON courses;

CREATE POLICY "courses_select_eligible"
  ON courses FOR SELECT
  USING (
    is_admin()
    -- Academy-eligible users may browse the published catalogue so they can
    -- resolve their course and enroll.
    OR (
      published = TRUE
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.suspended = FALSE
          AND p.onboarding_status IN ('payment_complete', 'certified', 'subscribed')
      )
    )
    -- Already-enrolled users can always read their course (covers edge cases).
    OR EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = courses.id AND e.profile_id = auth.uid()
    )
  );
