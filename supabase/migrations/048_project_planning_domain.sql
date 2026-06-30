-- 048_project_planning_domain.sql — Planning Domain (Planning Layer Migration, Stage 5e).
-- Depends on: 001 (profiles + update_updated_at_column), 041 (projects), uuid-ossp (uuid_generate_v4).
--
-- The PLANNING DOMAIN of Project State: the durable, editable planning inputs (intention + planning
-- parameters) that Planning Engine V2 recalculates EventPlanV2 from. This is the recompute source of
-- truth in the Project World. The FED is only the startup handoff that seeds the initial Planning Domain;
-- it is NOT persisted as the source of truth. Per Decision A, NOTHING here stores or derives PlannerInput.
--
-- Owned by the Project (one durable root). A planning-relevant change to this domain triggers recompute;
-- non-planning domains are stored elsewhere and never invoke Planning Engine.

CREATE TABLE IF NOT EXISTS project_planning_domain (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_version INTEGER NOT NULL,
  domain          JSONB NOT NULL,                        -- the durable Planning Domain (planning inputs)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, project_version)
);

CREATE INDEX IF NOT EXISTS project_planning_domain_project_idx
  ON project_planning_domain (project_id);

DROP TRIGGER IF EXISTS project_planning_domain_updated_at ON project_planning_domain;
CREATE TRIGGER project_planning_domain_updated_at BEFORE UPDATE ON project_planning_domain
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: owner-only, derived through projects.owner_id (same pattern as 043/047).
ALTER TABLE project_planning_domain ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_planning_domain_owner_rw" ON project_planning_domain;
CREATE POLICY "project_planning_domain_owner_rw" ON project_planning_domain FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_planning_domain.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_planning_domain.project_id AND p.owner_id = auth.uid()));
