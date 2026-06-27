-- 046_project_public_space.sql — Public Space foundation (APPROVED SUBSET of Proposal 046).
-- Depends on: 041 (projects), 001 (update_updated_at_column).
--
-- Additive only: a publish gate on the Root Project + the Occurrences table (the accepted Occurrence
-- model), with public-read RLS. Existing Projects default to unpublished and stay invisible to Public
-- Space. NOT included (rejected in partial approval — source-of-truth duplication / future Media model):
-- projects.title / subtitle / description / cover_image_url / location.

-- 1. Publish gate on the Root Project.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Public read for PUBLISHED Projects (added alongside the existing owner-only FOR ALL policy; RLS
-- policies are OR'd, so owners still read their own drafts and anyone reads published Projects).
DROP POLICY IF EXISTS "projects_public_read" ON projects;
CREATE POLICY "projects_public_read" ON projects FOR SELECT
  USING (is_published);

-- 2. Occurrences — the concrete time-bound execution units of a Project (one Project → many Occurrences).
CREATE TABLE IF NOT EXISTS occurrences (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ,
  location    TEXT,
  capacity    INTEGER,
  price_cents INTEGER,
  status      TEXT NOT NULL DEFAULT 'scheduled',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS occurrences_project_idx ON occurrences (project_id, starts_at);

ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;

-- Owners manage their own Occurrences (via the parent Project's owner).
DROP POLICY IF EXISTS "occurrences_owner_rw" ON occurrences;
CREATE POLICY "occurrences_owner_rw" ON occurrences FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = occurrences.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = occurrences.project_id AND p.owner_id = auth.uid()));

-- Public read: anyone may read the Occurrences of a PUBLISHED Project.
DROP POLICY IF EXISTS "occurrences_public_read" ON occurrences;
CREATE POLICY "occurrences_public_read" ON occurrences FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = occurrences.project_id AND p.is_published));

-- 4. updated_at trigger (reuses the shared function).
DROP TRIGGER IF EXISTS occurrences_updated_at ON occurrences;
CREATE TRIGGER occurrences_updated_at BEFORE UPDATE ON occurrences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
