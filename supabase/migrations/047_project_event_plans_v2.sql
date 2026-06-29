-- 047_project_event_plans_v2.sql — Migration M1 (Planning Layer Migration, Stage 4).
-- Depends on: 001 (profiles + update_updated_at_column), 041 (projects), uuid-ossp (uuid_generate_v4).
--
-- Persists the NATIVE Planning Engine V2 plan (EventPlanV2) in parallel with the existing legacy
-- planning data. This is a NEW, independent table — the legacy `ope_plans` (and `ope_plans.input`)
-- is left completely unchanged. Per Migration Decision A, NOTHING here derives or stores PlannerInput;
-- the `plan` column holds the EventPlanV2 object exactly as produced (not reduced, not converted).
--
-- During Stage 4 this table is WRITE-ONLY from the pipeline and read by NO production consumer; legacy
-- planning remains the Source of Truth. Consumers migrate to it in Stage 5; it becomes authoritative
-- only at Stage 5f.

CREATE TABLE IF NOT EXISTS project_event_plans_v2 (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_version INTEGER NOT NULL,
  plan            JSONB NOT NULL,                        -- the native EventPlanV2 (opaque; never reduced)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, project_version)
);

CREATE INDEX IF NOT EXISTS project_event_plans_v2_project_idx
  ON project_event_plans_v2 (project_id);

-- updated_at maintained by the shared trigger (as in 041/042/043).
DROP TRIGGER IF EXISTS project_event_plans_v2_updated_at ON project_event_plans_v2;
CREATE TRIGGER project_event_plans_v2_updated_at BEFORE UPDATE ON project_event_plans_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: owner-only, derived through projects.owner_id (same pattern as 043).
ALTER TABLE project_event_plans_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_event_plans_v2_owner_rw" ON project_event_plans_v2;
CREATE POLICY "project_event_plans_v2_owner_rw" ON project_event_plans_v2 FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_event_plans_v2.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_event_plans_v2.project_id AND p.owner_id = auth.uid()));
