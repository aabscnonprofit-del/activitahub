-- 070_occurrence_registration_expand.sql — STEP 1 of 2 (EXPAND).
--
-- Binds ticket registration (and ride coordination) to a specific Occurrence, using an
-- expand→migrate→contract rollout so nothing breaks during deployment.
--
-- This EXPAND step is ADDITIVE ONLY and is fully compatible with the CURRENTLY-DEPLOYED code:
--   * it adds the nullable occurrence_id column + counting indexes;
--   * it KEEPS UNIQUE(project_id, account_id) / the arrival PK that the live webhook + arrival
--     upsert still use as ON CONFLICT targets.
-- Apply this BEFORE deploying the occurrence-aware code. The contract step (071) — which drops
-- the old constraints — is applied ONLY AFTER that code is live and no longer depends on them.
--
-- No new entity: reuses project_participants (registration) + occurrences (capacity/price) +
-- participant_arrival_preferences (ride coordination, which already has occurrence_id since 068).

-- ── Registration → Occurrence (nullable; NULL = project-level join) ───────────
ALTER TABLE project_participants
  ADD COLUMN IF NOT EXISTS occurrence_id UUID REFERENCES occurrences(id) ON DELETE CASCADE;

-- Per-occurrence roster + capacity counting.
CREATE INDEX IF NOT EXISTS project_participants_occurrence_status_idx
  ON project_participants (occurrence_id, status);

COMMENT ON COLUMN project_participants.occurrence_id IS
  'Specific Occurrence for paid/donation ticket registrations. NULL = a project-level join (free/instant/approval) that applies to the whole Project. Uniqueness is enforced by the indexes added in migration 071.';

-- ── Ride coordination → Occurrence (occurrence_id already exists since 068) ────
CREATE INDEX IF NOT EXISTS participant_arrival_preferences_occurrence_idx
  ON participant_arrival_preferences (occurrence_id);

-- NOTE: the old constraints are intentionally left in place here:
--   * project_participants UNIQUE(project_id, account_id)
--   * participant_arrival_preferences PRIMARY KEY(project_id, account_id)
-- They are dropped/replaced in 071_occurrence_registration_contract.sql, after the
-- constraint-agnostic occurrence code is deployed.
