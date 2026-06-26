-- 041_projects.sql — Project: the root domain object of the event lifecycle.
-- Depends on: 001 (profiles + update_updated_at_column), uuid-ossp (uuid_generate_v4).
--
-- Project is the AGGREGATE ROOT. Per docs/OPE_MODULAR_PIPELINE_PRINCIPLE.md, Discovery,
-- Future Event Description, OPE, Marketplace and Execution are MODULES that attach to a
-- Project (via project_id) in later work. This migration introduces ONLY the minimal
-- root: identity, ownership, status, and current workflow step. No module data is stored
-- here, and no existing table or module is changed.
--
-- status / current_step are TEXT (not enums) so the workflow vocabulary can evolve WITHOUT
-- a type migration. Documented values (open set):
--   status:       'active' (default)  · later: 'completed' | 'archived' | 'cancelled'
--   current_step: 'discovery' (default) · 'description' · 'planning' · 'plan_ready'
--                 · later: 'marketplace' · 'execution'

CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'active',
  current_step  TEXT NOT NULL DEFAULT 'discovery',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- List a user's projects, newest-edited first.
CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects (owner_id, updated_at DESC);

-- updated_at maintained by the shared trigger (as in 021/035/...).
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: owner-only read/write (mirrors ope_plans / participants / venues convention).
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_owner_rw" ON projects;
CREATE POLICY "projects_owner_rw" ON projects FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
