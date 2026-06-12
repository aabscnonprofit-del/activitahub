-- 022_ope_plan_lifecycle_wp8.sql — OPE Organizer Workspace: lifecycle & freeze (WP8)
-- Depends on: 021 (ope_plans table + ope_plan_phase enum, already applied).
--
-- Brings the live 021 schema up to the WP8 canonical lifecycle:
--   old enum: planning · preparation · ready · live · completed · cancelled
--   new enum: draft · planning · ready · in_progress · completed · closed
-- and adds the append-only lifecycle audit log. A plan now starts as 'draft' and
-- auto-advances to 'planning' when the engine returns plan_ready (application logic,
-- lib/actions/opePlans.ts). Billing-active = planning…completed (draft/closed excluded).
--
-- ope_plans currently has 0 rows, so this uses the safest CLEAN TYPE-SWAP (rename old
-- type → create canonical type → re-type the column → drop old type) rather than
-- ALTER TYPE ... ADD VALUE (which cannot remove the retired values and has
-- transaction-block restrictions). A CASE map is included for correctness even if
-- rows existed. All DDL here is transactional, so the change is atomic (all-or-nothing).
-- RLS, the owner policy, the FK, the updated_at trigger and the index are untouched.

BEGIN;

-- 1. Append-only WP8 transition history.
ALTER TABLE ope_plans
  ADD COLUMN IF NOT EXISTS lifecycle_log JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Clean type-swap to the canonical phase enum.
ALTER TYPE ope_plan_phase RENAME TO ope_plan_phase_old;

CREATE TYPE ope_plan_phase AS ENUM
  ('draft', 'planning', 'ready', 'in_progress', 'completed', 'closed');

-- The default references the old type — drop it before re-typing the column.
ALTER TABLE ope_plans ALTER COLUMN phase DROP DEFAULT;

ALTER TABLE ope_plans
  ALTER COLUMN phase TYPE ope_plan_phase
  USING (
    CASE phase::text
      WHEN 'planning'    THEN 'planning'
      WHEN 'preparation' THEN 'planning'      -- retired → collapses into Planning
      WHEN 'ready'       THEN 'ready'
      WHEN 'live'        THEN 'in_progress'   -- renamed
      WHEN 'completed'   THEN 'completed'
      WHEN 'cancelled'   THEN 'closed'        -- retired → terminal Closed
      ELSE 'planning'
    END::ope_plan_phase
  );

-- WP8: a fresh plan starts as Draft.
ALTER TABLE ope_plans ALTER COLUMN phase SET DEFAULT 'draft';

DROP TYPE ope_plan_phase_old;

COMMIT;
