-- 021_ope_plans.sql — OPE Organizer Workspace: saved plans (M5 PlanStore, WP1)
-- Depends on: 001 (profiles + update_updated_at_column), uuid-ossp (uuid_generate_v4).
--
-- An organizer-owned, persisted OPE plan. The deterministic engine
-- (lib/ope generatePlan) remains the source of truth for `result`; `input` is the
-- source of truth for recompute. `corrections`/`prep_state` are workspace state
-- preserved across reload and recompute. JSON columns are opaque payloads — the
-- store persists and returns them; it does not model their internals.
-- This adds the ORGANIZER-side saved plan only; the public consumer planner
-- (/plan-an-event) is unchanged and remains in-memory.

-- Organizer-facing lifecycle phase (see OPE_EVENT_LIFECYCLE). Future-proofed for
-- M5.1 (live/completed). M5.0 sets planning/preparation/ready.
DO $$ BEGIN
  CREATE TYPE ope_plan_phase AS ENUM
    ('planning', 'preparation', 'ready', 'live', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ope_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT,                                  -- human label for the event (nullable)
  input         JSONB NOT NULL,                        -- the PlannerInput (source of truth for recompute)
  result        JSONB NOT NULL,                        -- the generated { status, coverage, plan, questions }
  corrections   JSONB NOT NULL DEFAULT '{}'::jsonb,    -- current-plan-only budget line overrides
  prep_state    JSONB NOT NULL DEFAULT '{}'::jsonb,    -- tasks_done / risks_handled / resources_sourced
  phase         ope_plan_phase NOT NULL DEFAULT 'planning',
  version       INTEGER NOT NULL DEFAULT 1,            -- bumped on save (simple versioning; no history)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- List an organizer's plans, newest-edited first.
CREATE INDEX IF NOT EXISTS ope_plans_organizer_idx ON ope_plans (organizer_id, updated_at DESC);

-- updated_at maintained by the shared trigger (as in 003/008/011/012/020).
DROP TRIGGER IF EXISTS ope_plans_updated_at ON ope_plans;
CREATE TRIGGER ope_plans_updated_at BEFORE UPDATE ON ope_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: owner-only read/write (mirrors participants/venues convention).
ALTER TABLE ope_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ope_plans_organizer_rw" ON ope_plans;
CREATE POLICY "ope_plans_organizer_rw" ON ope_plans FOR ALL
  USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);
