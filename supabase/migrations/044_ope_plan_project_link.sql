-- 044_ope_plan_project_link.sql — Project-centric migration, Phase 1 / Commit 1
-- Depends on: 021/022/026 (ope_plans), 041 (projects).
--
-- Keystone link for the Project-centric architecture: an OPE plan becomes the
-- planning component of a Project. This commit ONLY adds the nullable back-reference
-- column + a lookup index. It is purely additive and non-breaking:
--   * existing plans keep project_id = NULL (no backfill here),
--   * no writer is changed (createPlan / planner flow untouched),
--   * vendor_requests.plan_id and invoices.plan_id are unchanged.
-- ON DELETE SET NULL: deleting a Project never cascades into / deletes its plans.
-- RLS is unchanged: ope_plans stays organizer-owned; the FK only requires the
-- projects row to exist (Project ownership is enforced on the projects table).

ALTER TABLE ope_plans
  ADD COLUMN IF NOT EXISTS project_id UUID
    REFERENCES projects(id) ON DELETE SET NULL;

-- Organizer/project lookup (find the plan(s) belonging to a Project).
CREATE INDEX IF NOT EXISTS ope_plans_project_idx
  ON ope_plans (organizer_id, project_id);
