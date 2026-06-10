-- 018_promotion_packages.sql — Organizer Marketing Automation: Promotion Package Generator v1
-- Depends on: 006 (activities), 001 (profiles)
--
-- Stores the multi-channel promotional content generated from an activity so an
-- organizer can reopen previously generated packages. Generation is deterministic
-- and runs server-side; this table is the "generate once, reuse everywhere" store.
-- Minimal schema: the seven channel assets live in a single JSONB column.

CREATE TABLE IF NOT EXISTS promotion_packages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id  UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  locale       TEXT NOT NULL,
  -- { facebook, instagram, telegram, whatsapp, email:{subject,body}, ad, description }
  assets       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS promotion_packages_activity_idx
  ON promotion_packages(activity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS promotion_packages_organizer_idx
  ON promotion_packages(organizer_id);

ALTER TABLE promotion_packages ENABLE ROW LEVEL SECURITY;

-- Owner-only: an organizer can read, create and delete their own packages.
DROP POLICY IF EXISTS "promotion_packages_select" ON promotion_packages;
CREATE POLICY "promotion_packages_select" ON promotion_packages FOR SELECT
  USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "promotion_packages_insert" ON promotion_packages;
CREATE POLICY "promotion_packages_insert" ON promotion_packages FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "promotion_packages_delete" ON promotion_packages;
CREATE POLICY "promotion_packages_delete" ON promotion_packages FOR DELETE
  USING (auth.uid() = organizer_id);
