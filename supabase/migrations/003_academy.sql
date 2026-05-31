-- ============================================================
-- 003_academy.sql — Phase 3A: Academy LMS foundation
-- Depends on: 001_profiles.sql (profiles, onboarding_path, onboarding_status,
--             update_updated_at_column, uuid-ossp)
-- ============================================================
--
-- Adds the learning-management layer:
--   courses → modules → lessons         (content, seeded separately)
--   enrollments                         (student access to a course)
--   lesson_progress                     (per-student lesson tracking)
--   quizzes → quiz_questions → quiz_options  (structure only — Phase 3B
--                                             builds the exam/grading on top)
--
-- Access model (RLS):
--   * A student may enroll only after paying for certification
--     (onboarding_status in payment_complete / certified / subscribed).
--   * Course/module/lesson CONTENT is readable only by enrolled students
--     (or admins). No enrollment → no content.
--   * Progress rows are writable only by their owner AND only for lessons
--     in a course they are enrolled in. No enrollment → no progress.
--   * Quiz ANSWER KEYS (questions/options) are admin-only in Phase 3A — there
--     is no student-facing exam yet, so correct answers are never exposed.
--
-- NOTE: all tables are created first, then all RLS policies. Policy
-- expressions reference sibling tables (e.g. courses → enrollments), which
-- must already exist when the policy is created.
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE lesson_progress_status AS ENUM ('in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE quiz_question_type AS ENUM ('single_choice', 'multiple_choice', 'true_false');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Helper: TRUE when the current user is an active admin. SECURITY DEFINER so it
-- reads profiles without recursing through other tables' RLS.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND suspended = FALSE
  );
$$;

-- ============================================================
-- TABLES  (all created before any policy)
-- ============================================================

CREATE TABLE IF NOT EXISTS courses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,
  path        onboarding_path NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  published   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS courses_path_idx ON courses(path);

CREATE TABLE IF NOT EXISTS modules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS modules_course_id_idx ON modules(course_id, sort_order);

CREATE TABLE IF NOT EXISTS lessons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id        UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  slug             TEXT NOT NULL,
  title            TEXT NOT NULL,
  content          TEXT NOT NULL,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  duration_minutes INTEGER     NOT NULL DEFAULT 5,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lessons_module_id_idx ON lessons(module_id, sort_order);

CREATE TABLE IF NOT EXISTS enrollments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status       enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, course_id)
);
CREATE INDEX IF NOT EXISTS enrollments_profile_id_idx ON enrollments(profile_id);
CREATE INDEX IF NOT EXISTS enrollments_course_id_idx  ON enrollments(course_id);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status       lesson_progress_status NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS lesson_progress_profile_id_idx ON lesson_progress(profile_id);
CREATE INDEX IF NOT EXISTS lesson_progress_lesson_id_idx  ON lesson_progress(lesson_id);

CREATE TABLE IF NOT EXISTS quizzes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id     UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  passing_score INTEGER     NOT NULL DEFAULT 70,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id)
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id    UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  prompt     TEXT NOT NULL,
  type       quiz_question_type NOT NULL DEFAULT 'single_choice',
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quiz_questions_quiz_id_idx ON quiz_questions(quiz_id, sort_order);

CREATE TABLE IF NOT EXISTS quiz_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  is_correct  BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quiz_options_question_id_idx ON quiz_options(question_id, sort_order);

-- ============================================================
-- updated_at TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS courses_updated_at ON courses;
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS modules_updated_at ON modules;
CREATE TRIGGER modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS lessons_updated_at ON lessons;
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS enrollments_updated_at ON enrollments;
CREATE TRIGGER enrollments_updated_at BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS quizzes_updated_at ON quizzes;
CREATE TRIGGER quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE courses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options    ENABLE ROW LEVEL SECURITY;

-- ── courses: readable by enrolled students or admins ──────────────────────────
DROP POLICY IF EXISTS "courses_select_enrolled" ON courses;
CREATE POLICY "courses_select_enrolled"
  ON courses FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = courses.id AND e.profile_id = auth.uid()
    )
  );

-- ── modules: readable by students enrolled in the parent course ───────────────
DROP POLICY IF EXISTS "modules_select_enrolled" ON modules;
CREATE POLICY "modules_select_enrolled"
  ON modules FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = modules.course_id AND e.profile_id = auth.uid()
    )
  );

-- ── lessons: readable by students enrolled in the lesson's course ─────────────
DROP POLICY IF EXISTS "lessons_select_enrolled" ON lessons;
CREATE POLICY "lessons_select_enrolled"
  ON lessons FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM modules m
      JOIN enrollments e ON e.course_id = m.course_id
      WHERE m.id = lessons.module_id AND e.profile_id = auth.uid()
    )
  );

-- ── enrollments: own rows; self-enroll only after paying ──────────────────────
DROP POLICY IF EXISTS "enrollments_select_own" ON enrollments;
CREATE POLICY "enrollments_select_own"
  ON enrollments FOR SELECT
  USING (auth.uid() = profile_id OR is_admin());

DROP POLICY IF EXISTS "enrollments_insert_paid" ON enrollments;
CREATE POLICY "enrollments_insert_paid"
  ON enrollments FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.suspended = FALSE
        AND p.onboarding_status IN ('payment_complete', 'certified', 'subscribed')
    )
  );

DROP POLICY IF EXISTS "enrollments_update_own" ON enrollments;
CREATE POLICY "enrollments_update_own"
  ON enrollments FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- ── lesson_progress: own rows; writable only for enrolled courses ─────────────
DROP POLICY IF EXISTS "lesson_progress_select_own" ON lesson_progress;
CREATE POLICY "lesson_progress_select_own"
  ON lesson_progress FOR SELECT
  USING (auth.uid() = profile_id OR is_admin());

DROP POLICY IF EXISTS "lesson_progress_insert_enrolled" ON lesson_progress;
CREATE POLICY "lesson_progress_insert_enrolled"
  ON lesson_progress FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    AND EXISTS (
      SELECT 1
      FROM lessons l
      JOIN modules m     ON m.id = l.module_id
      JOIN enrollments e ON e.course_id = m.course_id
      WHERE l.id = lesson_progress.lesson_id AND e.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lesson_progress_update_enrolled" ON lesson_progress;
CREATE POLICY "lesson_progress_update_enrolled"
  ON lesson_progress FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (
    auth.uid() = profile_id
    AND EXISTS (
      SELECT 1
      FROM lessons l
      JOIN modules m     ON m.id = l.module_id
      JOIN enrollments e ON e.course_id = m.course_id
      WHERE l.id = lesson_progress.lesson_id AND e.profile_id = auth.uid()
    )
  );

-- ── quizzes: enrolled students may see meta; questions/options admin-only ─────
DROP POLICY IF EXISTS "quizzes_select_enrolled" ON quizzes;
CREATE POLICY "quizzes_select_enrolled"
  ON quizzes FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM lessons l
      JOIN modules m     ON m.id = l.module_id
      JOIN enrollments e ON e.course_id = m.course_id
      WHERE l.id = quizzes.lesson_id AND e.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "quiz_questions_select_admin" ON quiz_questions;
CREATE POLICY "quiz_questions_select_admin"
  ON quiz_questions FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "quiz_options_select_admin" ON quiz_options;
CREATE POLICY "quiz_options_select_admin"
  ON quiz_options FOR SELECT
  USING (is_admin());

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE courses         IS 'Academy courses, one per certification path. Content seeded separately.';
COMMENT ON TABLE modules         IS 'Ordered sections within a course.';
COMMENT ON TABLE lessons         IS 'Ordered lessons within a module. content is markdown/plain text.';
COMMENT ON TABLE enrollments     IS 'A student''s access to a course. Created after certification payment.';
COMMENT ON TABLE lesson_progress IS 'Per-student lesson progression. One row per (student, lesson).';
COMMENT ON TABLE quizzes         IS 'Phase 3A structure only. Phase 3B builds the exam + grading + certification.';
