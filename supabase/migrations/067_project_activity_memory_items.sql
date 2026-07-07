-- 067_project_activity_memory_items.sql — Activity Memories UNIFIED content storage.
-- Depends on: 001 (uuid-ossp, update_updated_at_column), 041 (projects, profiles), 059 (projects.visibility),
-- 061 (project_participants), 064/065/066 (the specialized tables this consolidates). Idempotent.
--
-- Backlog note 3 trigger fired (third text memory type). This consolidates the per-type tables
-- (project_activity_memories / project_activity_participant_memories / project_activity_reviews) into ONE content
-- layer of typed memory items. Text only — organizer_story / participant_story / activity_review. NOT a new
-- Activity entity; no lifecycle. Future photos/videos/documents/links/results/achievements extend THIS table.
--
-- Author model: organizer_story → (author_type 'organizer', author_id = project owner); participant_story /
-- activity_review → (author_type 'participant', author_id = participant account). Uniqueness: the single
-- constraint UNIQUE(project_id, memory_type, author_id) enforces all three rules — one organizer_story per
-- project (one owner), one participant_story per participant per project, one activity_review per participant
-- per project — and keeps upserts clean (non-partial).

CREATE TABLE IF NOT EXISTS project_activity_memory_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL,
  author_id   UUID,
  memory_type TEXT NOT NULL,
  body        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_activity_memory_items_uniq UNIQUE (project_id, memory_type, author_id)
);

CREATE INDEX IF NOT EXISTS project_activity_memory_items_project_type_idx ON project_activity_memory_items (project_id, memory_type);

DROP TRIGGER IF EXISTS project_activity_memory_items_updated_at ON project_activity_memory_items;
CREATE TRIGGER project_activity_memory_items_updated_at BEFORE UPDATE ON project_activity_memory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE project_activity_memory_items ENABLE ROW LEVEL SECURITY;

-- Public READ only for a PUBLISHED + PUBLIC Project (never private/unpublished/draft).
DROP POLICY IF EXISTS "pami_public_read" ON project_activity_memory_items;
CREATE POLICY "pami_public_read" ON project_activity_memory_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_activity_memory_items.project_id AND p.is_published = TRUE AND p.visibility = 'public'));

-- The Project owner reads/writes the organizer_story only (they cannot write participant items).
DROP POLICY IF EXISTS "pami_organizer_story" ON project_activity_memory_items;
CREATE POLICY "pami_organizer_story" ON project_activity_memory_items FOR ALL
  USING (memory_type = 'organizer_story' AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_activity_memory_items.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (
    memory_type = 'organizer_story' AND author_type = 'organizer' AND author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_activity_memory_items.project_id AND p.owner_id = auth.uid())
  );

-- A participant reads/writes ONLY their OWN participant_story / activity_review; writing requires they be an
-- APPROVED participant of the Project. (The organizer has no write path to participant items.)
DROP POLICY IF EXISTS "pami_participant" ON project_activity_memory_items;
CREATE POLICY "pami_participant" ON project_activity_memory_items FOR ALL
  USING (memory_type IN ('participant_story', 'activity_review') AND author_id = auth.uid())
  WITH CHECK (
    memory_type IN ('participant_story', 'activity_review') AND author_type = 'participant' AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM project_participants pp
      WHERE pp.project_id = project_activity_memory_items.project_id AND pp.account_id = auth.uid() AND pp.status = 'approved'
    )
  );

-- Migrate the specialized tables into the unified layer (preserving timestamps), then drop them. Guarded so each
-- runs only while its source table still exists (idempotent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_activity_memories') THEN
    INSERT INTO project_activity_memory_items (project_id, author_type, author_id, memory_type, body, created_at, updated_at)
      SELECT m.project_id, 'organizer', p.owner_id, 'organizer_story', m.organizer_story, m.created_at, m.updated_at
      FROM project_activity_memories m JOIN projects p ON p.id = m.project_id
      WHERE m.organizer_story IS NOT NULL
      ON CONFLICT (project_id, memory_type, author_id) DO NOTHING;
    DROP TABLE project_activity_memories;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_activity_participant_memories') THEN
    INSERT INTO project_activity_memory_items (project_id, author_type, author_id, memory_type, body, created_at, updated_at)
      SELECT project_id, 'participant', participant_id, 'participant_story', participant_story, created_at, updated_at
      FROM project_activity_participant_memories
      WHERE participant_story IS NOT NULL
      ON CONFLICT (project_id, memory_type, author_id) DO NOTHING;
    DROP TABLE project_activity_participant_memories;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_activity_reviews') THEN
    INSERT INTO project_activity_memory_items (project_id, author_type, author_id, memory_type, body, created_at, updated_at)
      SELECT project_id, 'participant', participant_id, 'activity_review', review_text, created_at, updated_at
      FROM project_activity_reviews
      WHERE review_text IS NOT NULL
      ON CONFLICT (project_id, memory_type, author_id) DO NOTHING;
    DROP TABLE project_activity_reviews;
  END IF;
END $$;
