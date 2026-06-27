-- 045_backfill_ope_plan_projects.sql — Project-centric migration, Phase 1 / Commit 2
-- Depends on: 044 (ope_plans.project_id), 041 (projects), 026 (ope_plans.source_request_id).
--
-- Backfill: give every existing OPE plan a Project (the keystone link's data step).
--   Pass 1 — plans sharing (organizer_id, source_request_id) are alternative approaches
--            for one engagement → they SHARE one Project.
--   Pass 2 — organizer-authored plans (source_request_id IS NULL) → one Project EACH.
-- Every Project is owned by the same organizer as its plan(s) (owner_id = organizer_id).
--
-- Idempotent: every selection/update is guarded by project_id IS NULL, so a second run
-- links 0 plans and creates 0 Projects. Atomic: the whole DO block is one transaction —
-- any failure rolls the entire backfill back (no orphan Projects, no partial links).
-- No schema change here (the column + index already exist from 044); DML only.
-- Minimal Project insert (owner_id only) — status/current_step/id/timestamps all default.

DO $$
DECLARE
  r RECORD;
  v_project_id UUID;
BEGIN
  -- Pass 1: request-derived plans → one Project per (organizer, request)
  FOR r IN
    SELECT DISTINCT organizer_id, source_request_id
    FROM ope_plans
    WHERE project_id IS NULL
      AND source_request_id IS NOT NULL
  LOOP
    INSERT INTO projects (owner_id) VALUES (r.organizer_id)
    RETURNING id INTO v_project_id;

    UPDATE ope_plans
    SET project_id = v_project_id
    WHERE project_id IS NULL
      AND organizer_id = r.organizer_id
      AND source_request_id = r.source_request_id;
  END LOOP;

  -- Pass 2: organizer-authored plans (no request) → one Project each
  FOR r IN
    SELECT id, organizer_id
    FROM ope_plans
    WHERE project_id IS NULL
      AND source_request_id IS NULL
  LOOP
    INSERT INTO projects (owner_id) VALUES (r.organizer_id)
    RETURNING id INTO v_project_id;

    UPDATE ope_plans
    SET project_id = v_project_id
    WHERE id = r.id;
  END LOOP;
END $$;
