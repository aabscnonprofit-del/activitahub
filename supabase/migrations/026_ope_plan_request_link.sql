-- 026_ope_plan_request_link.sql — OPE Task #1: Customer Request → OPE Plan
-- Depends on: 008 (customer_requests), 021/022 (ope_plans).
--
-- Persistent link from an organizer-owned OPE plan back to the customer request it
-- was generated from, plus a deterministic OPE assessment snapshot (complexity,
-- estimated budget range, automation coverage, risk level — no LLM). Both columns
-- are additive and nullable; existing plans (organizer-authored, with no source
-- request) keep source_request_id = NULL. RLS is unchanged: ope_plans stays
-- owner-only, and the FK only requires the request row to exist.

ALTER TABLE ope_plans
  ADD COLUMN IF NOT EXISTS source_request_id UUID
    REFERENCES customer_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assessment JSONB;

-- One organizer reuses one plan per request (lookup + idempotent generation).
CREATE INDEX IF NOT EXISTS ope_plans_source_request_idx
  ON ope_plans (organizer_id, source_request_id);
