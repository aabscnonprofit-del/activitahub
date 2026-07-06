-- 057_project_workers.sql — Worker Project Access (second implementation of the Project Access Model, ADR_012).
-- ⚠️ LEGACY / DORMANT — SUPERSEDED by 058_project_access.sql (the shared Project Access layer). No production
-- code depends on this table. Kept (not dropped) for migration-history integrity; not applied to live DBs.
-- Depends on: 001 (update_updated_at_column), 041 (projects, profiles), uuid-ossp (uuid_generate_v4).
--
-- Attaches Workers to a Project as a per-Project RELATIONSHIP (ADR_012): each row grants access to the
-- Project's WORKER VIEW only, via a project-scoped, revocable invitation token. It creates NO new Project
-- model — the Worker View is a projection of the same Project. `role_id` REFERENCES a canonical project role
-- (the plan's staffing roles, the same ids Team/Delivery use) — it does NOT redefine roles or hold an
-- assignment (Team/Delivery remain canonical for assignments). `confirmed_at` records the worker's work
-- confirmation from the Worker View.
--
-- Organizer (owner) manages its rows via owner RLS; the Worker View resolves by token server-side (admin
-- client), so there is no worker-facing RLS policy. NEW, independent table; changes no existing table.

CREATE TABLE IF NOT EXISTS project_workers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email          TEXT,
  phone          TEXT,
  worker_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role_id        TEXT,                                    -- reference to a canonical project role id (nullable)
  invite_token   TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_workers_project_idx ON project_workers (project_id);

DROP TRIGGER IF EXISTS project_workers_updated_at ON project_workers;
CREATE TRIGGER project_workers_updated_at BEFORE UPDATE ON project_workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE project_workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_workers_owner_rw" ON project_workers;
CREATE POLICY "project_workers_owner_rw" ON project_workers FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_workers.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_workers.project_id AND p.owner_id = auth.uid()));
