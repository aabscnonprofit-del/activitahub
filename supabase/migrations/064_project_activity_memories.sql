-- 064_project_activity_memories.sql — Activity Memories storage layer.
-- Depends on: 001 (update_updated_at_column), 041 (projects), 059 (projects.visibility), 063
-- (projects.organizer_story). Idempotent.
--
-- Activity Memories is the public historical CONTENT layer attached to a completed public Project — so the
-- Project (the source of truth for the activity) does not become a dumping ground for every future memory
-- field. This stage moves the FIRST memory (Organizer Story) off projects into its own container. It is NOT a
-- new Activity entity and adds NO lifecycle; future memories (photos/videos/participant stories/reviews/results/
-- links/documents) extend THIS table later — none are added now.
--
-- One row per Project. Owner-only writes; public read is exposed only for PUBLISHED + PUBLIC Projects (the
-- "completed" gate stays in the UI/projection, exactly as before). Private / unpublished / draft Projects never
-- expose memories.

CREATE TABLE IF NOT EXISTS project_activity_memories (
  project_id      UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  organizer_story TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS project_activity_memories_updated_at ON project_activity_memories;
CREATE TRIGGER project_activity_memories_updated_at BEFORE UPDATE ON project_activity_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE project_activity_memories ENABLE ROW LEVEL SECURITY;

-- The Project owner (organizer) reads + writes their memories.
DROP POLICY IF EXISTS "project_activity_memories_owner_rw" ON project_activity_memories;
CREATE POLICY "project_activity_memories_owner_rw" ON project_activity_memories FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_activity_memories.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_activity_memories.project_id AND p.owner_id = auth.uid()));

-- Public READ only for a PUBLISHED + PUBLIC Project (never private/unpublished/draft).
DROP POLICY IF EXISTS "project_activity_memories_public_read" ON project_activity_memories;
CREATE POLICY "project_activity_memories_public_read" ON project_activity_memories FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_activity_memories.project_id AND p.is_published = TRUE AND p.visibility = 'public'));

-- Move the existing Organizer Story off projects into the new container, then drop the legacy column. Guarded so
-- it only runs while projects.organizer_story still exists (idempotent — a re-run after the drop is a no-op).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'organizer_story') THEN
    INSERT INTO project_activity_memories (project_id, organizer_story)
      SELECT id, organizer_story FROM projects WHERE organizer_story IS NOT NULL
      ON CONFLICT (project_id) DO UPDATE SET organizer_story = EXCLUDED.organizer_story;
    ALTER TABLE projects DROP COLUMN organizer_story;
  END IF;
END $$;
