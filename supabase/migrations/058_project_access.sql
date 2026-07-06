-- 058_project_access.sql — Shared Project Access Layer (consolidates Client + Worker access; ADR_012).
-- Depends on: 001 (update_updated_at_column), 041 (projects, profiles), uuid-ossp (uuid_generate_v4).
--
-- ONE canonical per-Project access RELATIONSHIP for every access type (client / worker today; safety /
-- participant / vendor / inspector / venue / emergency later). Each row grants access to exactly one Project
-- View (chosen by `access_type` via the code-level Access Policy) through a project-scoped, revocable,
-- optionally-expiring invite token. It creates NO new Project model — Views remain projections of the same
-- Project. Type-specific data (e.g. a worker's role_id / confirmed_at) lives in `metadata` (JSONB), so new
-- access types need no schema change.
--
-- Supersedes the per-type tables 056_project_clients and 057_project_workers (now LEGACY/DORMANT — no
-- production code depends on them). Organizer (owner) manages rows via owner RLS; the Views resolve by token
-- server-side (admin client), so there is no relationship-holder RLS policy.

CREATE TABLE IF NOT EXISTS project_access (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  access_type  TEXT NOT NULL CHECK (access_type IN ('client', 'worker', 'safety', 'participant', 'vendor', 'inspector', 'venue', 'emergency')),
  email        TEXT,
  phone        TEXT,
  account_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invite_token TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  expires_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_access_project_type_idx ON project_access (project_id, access_type);

DROP TRIGGER IF EXISTS project_access_updated_at ON project_access;
CREATE TRIGGER project_access_updated_at BEFORE UPDATE ON project_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_access_owner_rw" ON project_access;
CREATE POLICY "project_access_owner_rw" ON project_access FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_access.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_access.project_id AND p.owner_id = auth.uid()));
