-- 050_project_execution_status.sql — Execution Persistence Slice 1.
-- Depends on: 001 (update_updated_at_column), 041 (projects), 046 (occurrences), uuid-ossp (uuid_generate_v4).
--
-- Persists the Execution runtime's ExecutionStatusModel for a (project, occurrence). The `status` column
-- holds the model's `byItemId` map verbatim (monitoring item id -> 'pending' | 'active' | 'blocked' |
-- 'completed'), so the Organizer Workspace can read REAL execution status instead of a computed all-pending
-- default. A missing row means "no execution state yet" — callers fall back to the pending default.
--
-- This is a NEW, independent table. It changes no Planning, Execution, Occurrence, or Workspace model, and no
-- existing table. Owner-only via projects.owner_id (same pattern as 047).

CREATE TABLE IF NOT EXISTS project_execution_status (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  occurrence_id UUID NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  status        JSONB NOT NULL DEFAULT '{}'::jsonb,     -- the ExecutionStatusModel `byItemId` map (verbatim)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, occurrence_id)
);

CREATE INDEX IF NOT EXISTS project_execution_status_project_idx
  ON project_execution_status (project_id);

-- updated_at maintained by the shared trigger (as in 041/047).
DROP TRIGGER IF EXISTS project_execution_status_updated_at ON project_execution_status;
CREATE TRIGGER project_execution_status_updated_at BEFORE UPDATE ON project_execution_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: owner-only, derived through projects.owner_id (same pattern as 047).
ALTER TABLE project_execution_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_execution_status_owner_rw" ON project_execution_status;
CREATE POLICY "project_execution_status_owner_rw" ON project_execution_status FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_execution_status.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_execution_status.project_id AND p.owner_id = auth.uid()));
