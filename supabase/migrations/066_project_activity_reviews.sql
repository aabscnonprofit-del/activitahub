-- 066_project_activity_reviews.sql — Activity Reviews storage (child of Activity Memories).
-- Depends on: 001 (update_updated_at_column), 041 (projects, profiles), 059 (projects.visibility), 061
-- (project_participants). Idempotent.
--
-- Activity Reviews are participant feedback attached to a completed public activity — a historical reflection
-- that belongs to the ACTIVITY (inside Activity Memories), not to the organizer/participant profile. Plain text
-- only: NO star/numeric ratings, trust/reputation score, voting, likes, comments, or moderation workflow.
-- Organizer reputation is a FUTURE projection built from this data, not modelled here. One review per
-- (project, participant); no version history.

CREATE TABLE IF NOT EXISTS project_activity_reviews (
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_text    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, participant_id)
);

CREATE INDEX IF NOT EXISTS project_activity_reviews_project_idx ON project_activity_reviews (project_id);

DROP TRIGGER IF EXISTS project_activity_reviews_updated_at ON project_activity_reviews;
CREATE TRIGGER project_activity_reviews_updated_at BEFORE UPDATE ON project_activity_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE project_activity_reviews ENABLE ROW LEVEL SECURITY;

-- A participant reads/writes ONLY their OWN review; writing additionally requires they be an APPROVED participant
-- of the Project. The organizer gets NO write policy — they cannot edit participant reviews.
DROP POLICY IF EXISTS "par_self" ON project_activity_reviews;
CREATE POLICY "par_self" ON project_activity_reviews FOR ALL
  USING (participant_id = auth.uid())
  WITH CHECK (
    participant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM project_participants pp
      WHERE pp.project_id = project_activity_reviews.project_id
        AND pp.account_id = auth.uid()
        AND pp.status = 'approved'
    )
  );

-- Public READ only for a PUBLISHED + PUBLIC Project (never private/unpublished/draft).
DROP POLICY IF EXISTS "par_public_read" ON project_activity_reviews;
CREATE POLICY "par_public_read" ON project_activity_reviews FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_activity_reviews.project_id AND p.is_published = TRUE AND p.visibility = 'public'));
