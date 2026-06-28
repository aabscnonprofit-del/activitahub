-- 043_project_delivery_components.sql — Project delivery components (normalized child records).
-- Depends on: 001 (profiles + update_updated_at_column), 041 (projects), uuid-ossp (uuid_generate_v4).
--
-- A Project's cost-bearing DELIVERY COMPONENTS (resource_need / role_need), stored as normalized child
-- rows keyed by project_id — NOT a JSONB blob on `projects`, and NOT only inside a plan/proposal
-- snapshot (the industry pattern: requirements are live, parent-keyed, referenceable rows; cf. tasks/
-- line-items in Jira/Asana/Cvent/Tripleseat). These are the live source of truth for scope that the
-- Budget overlay mirrors into Budget Lines via SourceComponentRef {project_id, project_version,
-- item_kind, item_id}. A WorkPackage is a planning container and is NEVER a delivery component — the
-- item_kind CHECK enforces that at the DB level.

CREATE TABLE IF NOT EXISTS project_delivery_components (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_version INTEGER NOT NULL,
  item_kind       TEXT NOT NULL CHECK (item_kind IN ('resource_need', 'role_need')),
  item_id         TEXT NOT NULL,
  label           TEXT NOT NULL,
  basis           TEXT,
  quantity        NUMERIC,
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, project_version, item_kind, item_id)
);

-- Indexes: list a project's components; resolve a single SourceComponentRef.
CREATE INDEX IF NOT EXISTS project_delivery_components_project_idx
  ON project_delivery_components (project_id);
CREATE INDEX IF NOT EXISTS project_delivery_components_lookup_idx
  ON project_delivery_components (project_id, project_version, item_kind, item_id);

-- updated_at maintained by the shared trigger (as in 041/042).
DROP TRIGGER IF EXISTS project_delivery_components_updated_at ON project_delivery_components;
CREATE TRIGGER project_delivery_components_updated_at BEFORE UPDATE ON project_delivery_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: owner-only, derived through projects.owner_id (same pattern as 042's overlay tables).
ALTER TABLE project_delivery_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_delivery_components_owner_rw" ON project_delivery_components;
CREATE POLICY "project_delivery_components_owner_rw" ON project_delivery_components FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_delivery_components.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_delivery_components.project_id AND p.owner_id = auth.uid()));
