-- 056_project_clients.sql — Client Project Access (first implementation of the Project Access Model, ADR_012).
-- ⚠️ LEGACY / DORMANT — SUPERSEDED by 058_project_access.sql (the shared Project Access layer). No production
-- code depends on this table. Kept (not dropped) for migration-history integrity; not applied to live DBs.
-- Depends on: 001 (update_updated_at_column), 041 (projects, profiles), uuid-ossp (uuid_generate_v4).
--
-- Attaches Clients to a Project as a per-Project RELATIONSHIP (ADR_012): each row grants access to the
-- Project's CLIENT VIEW only, via a project-scoped, revocable invitation token. It creates NO new Project
-- model — the Client View is a projection of the same Project. Attach identity is an email and/or phone
-- (and optionally an existing account); registration is not required to open the invite link.
--
-- Organizer (owner) manages its rows via owner RLS; the Client View itself is resolved server-side by token
-- (admin client), so there is no client-facing RLS policy. NEW, independent table; changes no existing table.

CREATE TABLE IF NOT EXISTS project_clients (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email          TEXT,
  phone          TEXT,
  client_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invite_token   TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_clients_project_idx ON project_clients (project_id);

DROP TRIGGER IF EXISTS project_clients_updated_at ON project_clients;
CREATE TRIGGER project_clients_updated_at BEFORE UPDATE ON project_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Organizer (owner) manages the client relationships of their own projects.
ALTER TABLE project_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_clients_owner_rw" ON project_clients;
CREATE POLICY "project_clients_owner_rw" ON project_clients FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_clients.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_clients.project_id AND p.owner_id = auth.uid()));
