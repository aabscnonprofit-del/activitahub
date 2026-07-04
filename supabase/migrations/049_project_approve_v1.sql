-- 049_project_approve_v1.sql — Approve Project V1 (truthful approval; separate immutable snapshot).
-- Depends on: 041 (projects), uuid-ossp (uuid_generate_v4).
--
-- Per docs/PROJECT_LIFECYCLE.md ("Approval state vs the Approved Project Snapshot") + ADR_004: the PROJECT
-- owns the approval STATE (approved_at / approved_by); the approved Operational Configuration is a SEPARATE
-- IMMUTABLE ARTIFACT, never a column on projects. For V1 the Operational Configuration is the current
-- EventPlanV2 ONLY (Budget / Proposal / Participants / Vendors / Timeline / Communications / Attachments are
-- their own records or live data — not frozen here).
--
--  1. Approval STATE on the Project root — additive columns.
--  2. Approved Project Snapshot — a separate immutable artifact table (insert-only; no updated_at trigger),
--     keyed by (project_id, project_version), holding the EventPlanV2 captured at approval. Follows the
--     project_* artifact naming + owner-only RLS convention (cf. 043 / 047).
--
-- Does NOT add a snapshot column to projects, version history / revision support, status/current_step
-- changes, Publish changes, or Execution. Existing Projects default to NULL (not approved).

-- 1. Approval state on the Project root.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID NULL;

-- 2. Approved Project Snapshot — the separate immutable artifact (Operational Configuration = EventPlanV2).
CREATE TABLE IF NOT EXISTS project_approved_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_version INTEGER NOT NULL,                       -- the operational-config version captured
  approved_by     UUID NOT NULL,                          -- the approving authority at issue (ADR_010)
  approved_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),     -- when the artifact was issued
  snapshot        JSONB NOT NULL,                         -- the EventPlanV2, frozen at approval (immutable)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, project_version)
);

-- No updated_at trigger: the artifact is INSERT-ONLY / immutable (it preserves historical truth).
CREATE INDEX IF NOT EXISTS project_approved_snapshots_project_idx
  ON project_approved_snapshots (project_id);

-- RLS: owner-only, derived through projects.owner_id (same pattern as 043 / 047).
ALTER TABLE project_approved_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_approved_snapshots_owner_rw" ON project_approved_snapshots;
CREATE POLICY "project_approved_snapshots_owner_rw" ON project_approved_snapshots FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_approved_snapshots.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_approved_snapshots.project_id AND p.owner_id = auth.uid()));
