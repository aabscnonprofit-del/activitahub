-- 065_project_activity_participant_memories.sql — Participant Memories storage (child of Activity Memories).
-- Depends on: 001 (update_updated_at_column), 041 (projects, profiles), 059 (projects.visibility), 061
-- (project_participants). Idempotent.
--
-- Participant Story is the first participant-generated memory: one participant's short personal reflection on a
-- completed public activity. It belongs to one participant within one completed public Project (not to the
-- organizer / organizer page / participant profile). This is the dedicated CHILD storage of the Activity
-- Memories layer — NOT a Story/Timeline/Feed entity. One row per (project, participant). No versioning /
-- reactions / comments / likes. Future participant memories (photos/videos/albums/documents/links) extend the
-- same Activity Memories layer, not a parallel system.

CREATE TABLE IF NOT EXISTS project_activity_participant_memories (
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  participant_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_story TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, participant_id)
);

CREATE INDEX IF NOT EXISTS project_activity_participant_memories_project_idx ON project_activity_participant_memories (project_id);

DROP TRIGGER IF EXISTS project_activity_participant_memories_updated_at ON project_activity_participant_memories;
CREATE TRIGGER project_activity_participant_memories_updated_at BEFORE UPDATE ON project_activity_participant_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE project_activity_participant_memories ENABLE ROW LEVEL SECURITY;

-- A participant reads/writes ONLY their OWN story; writing additionally requires they be an APPROVED participant
-- of the Project (defense-in-depth for eligibility). The organizer gets NO write policy — they cannot edit
-- participant stories.
DROP POLICY IF EXISTS "papm_self" ON project_activity_participant_memories;
CREATE POLICY "papm_self" ON project_activity_participant_memories FOR ALL
  USING (participant_id = auth.uid())
  WITH CHECK (
    participant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM project_participants pp
      WHERE pp.project_id = project_activity_participant_memories.project_id
        AND pp.account_id = auth.uid()
        AND pp.status = 'approved'
    )
  );

-- Public READ only for a PUBLISHED + PUBLIC Project (never private/unpublished/draft).
DROP POLICY IF EXISTS "papm_public_read" ON project_activity_participant_memories;
CREATE POLICY "papm_public_read" ON project_activity_participant_memories FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_activity_participant_memories.project_id AND p.is_published = TRUE AND p.visibility = 'public'));
