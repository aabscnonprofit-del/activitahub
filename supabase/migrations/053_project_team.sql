-- 053_project_team.sql — Project Team Workspace.
-- Depends on: 001 (update_updated_at_column), 041 (projects), uuid-ossp (uuid_generate_v4).
--
-- Persists the Project Team for a project: the team members (people) and the assignment of members to the
-- project's roles. The `team` column holds the ProjectTeamState verbatim as JSONB:
--   { "members": [ { "id", "name", "availability": 'available'|'tentative'|'unavailable' } ],
--     "assignments": { "<roleId>": "<memberId>" | null } }
-- The project ROLES themselves are projected (pure) from the approved EventPlanV2 staffing (the same source
-- Delivery uses) — only the team + assignments are stored here. A missing row means "no team yet" (callers
-- fall back to an empty team). Team is project-level (people are shared across occurrences).
--
-- NEW, independent table. Changes no Planning, Occurrence, Execution, Delivery, or existing table. Owner-only
-- via projects.owner_id (same pattern as 050 / 052).

CREATE TABLE IF NOT EXISTS project_team (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team       JSONB NOT NULL DEFAULT '{"members":[],"assignments":{}}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id)
);

DROP TRIGGER IF EXISTS project_team_updated_at ON project_team;
CREATE TRIGGER project_team_updated_at BEFORE UPDATE ON project_team
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE project_team ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_team_owner_rw" ON project_team;
CREATE POLICY "project_team_owner_rw" ON project_team FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_team.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_team.project_id AND p.owner_id = auth.uid()));
