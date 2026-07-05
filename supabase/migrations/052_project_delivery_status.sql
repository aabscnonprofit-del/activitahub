-- 052_project_delivery_status.sql — Project Delivery Workspace.
-- Depends on: 001 (update_updated_at_column), 041 (projects), 046 (occurrences), uuid-ossp (uuid_generate_v4).
--
-- Persists the Delivery state (status + assignment) of a project's delivery components for a (project,
-- occurrence). The `state` column holds the DeliveryStateModel `byComponentId` map verbatim
-- (component id -> { "status": 'pending' | 'assigned' | 'confirmed' | 'delivered', "assignee": string|null }),
-- so the Organizer Workspace reads REAL delivery state instead of a computed all-pending default. A missing
-- row means "no delivery state yet" — callers fall back to the pending default (nothing assigned).
--
-- The delivery COMPONENTS themselves are projected (pure) from the approved EventPlanV2 (resources + staffing);
-- only their per-occurrence STATE is stored here. This is a NEW, independent table. It changes no Planning,
-- Execution, Occurrence, or existing Workspace model, and no existing table. Owner-only via projects.owner_id
-- (same pattern as 050).

CREATE TABLE IF NOT EXISTS project_delivery_status (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  occurrence_id UUID NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  state         JSONB NOT NULL DEFAULT '{}'::jsonb,     -- the DeliveryStateModel `byComponentId` map (verbatim)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, occurrence_id)
);

CREATE INDEX IF NOT EXISTS project_delivery_status_project_idx ON project_delivery_status (project_id);

DROP TRIGGER IF EXISTS project_delivery_status_updated_at ON project_delivery_status;
CREATE TRIGGER project_delivery_status_updated_at BEFORE UPDATE ON project_delivery_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE project_delivery_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_delivery_status_owner_rw" ON project_delivery_status;
CREATE POLICY "project_delivery_status_owner_rw" ON project_delivery_status FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_delivery_status.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_delivery_status.project_id AND p.owner_id = auth.uid()));
