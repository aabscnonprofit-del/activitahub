-- 071_occurrence_registration_contract.sql — STEP 2 of 2 (CONTRACT).
--
-- Apply this ONLY AFTER the occurrence-aware code is deployed and verified live. That code makes
-- every write constraint-agnostic (check-then-write instead of ON CONFLICT on the old keys), so
-- dropping the old constraints here is safe and enables true per-occurrence uniqueness (a
-- participant can register for multiple occurrences of one project independently).

-- ── project_participants: swap (project, account) uniqueness for (occurrence, account) ──
ALTER TABLE project_participants
  DROP CONSTRAINT IF EXISTS project_participants_project_id_account_id_key;

-- One registration per (occurrence, account). NULL-occurrence rows are distinct here (Postgres
-- default NULLS DISTINCT) and are deduped by the partial index below instead.
CREATE UNIQUE INDEX IF NOT EXISTS project_participants_occurrence_account_uidx
  ON project_participants (occurrence_id, account_id);

-- Project-level joins (free/instant/approval, occurrence_id IS NULL): still one per (project, account).
CREATE UNIQUE INDEX IF NOT EXISTS project_participants_project_account_nullocc_uidx
  ON project_participants (project_id, account_id) WHERE occurrence_id IS NULL;

-- ── participant_arrival_preferences: re-key from (project, account) to per-occurrence ──
-- 068 keyed one preference per (project, account). Move to a surrogate id + per-occurrence
-- uniqueness so ride coordination is occurrence-specific; legacy NULL-occurrence rows remain
-- valid as project-level preferences (deduped by the partial index).
ALTER TABLE participant_arrival_preferences
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
UPDATE participant_arrival_preferences SET id = uuid_generate_v4() WHERE id IS NULL;
ALTER TABLE participant_arrival_preferences ALTER COLUMN id SET NOT NULL;
ALTER TABLE participant_arrival_preferences DROP CONSTRAINT IF EXISTS participant_arrival_preferences_pkey;
ALTER TABLE participant_arrival_preferences ADD PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS participant_arrival_preferences_occurrence_account_uidx
  ON participant_arrival_preferences (occurrence_id, account_id);
CREATE UNIQUE INDEX IF NOT EXISTS participant_arrival_preferences_project_account_nullocc_uidx
  ON participant_arrival_preferences (project_id, account_id) WHERE occurrence_id IS NULL;
