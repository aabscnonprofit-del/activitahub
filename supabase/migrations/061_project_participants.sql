-- 061_project_participants.sql — Project Participants (the canonical participant model).
-- Depends on: 001 (update_updated_at_column), 041 (projects, profiles), uuid-ossp (uuid_generate_v4).
--
-- Every person who JOINS a Project becomes a Project Participant. Participants are Project data — one row per
-- (project, account). Join Policy (060) only decides HOW a participant reaches the Project; after joining every
-- participant is represented identically here, with a status:
--   pending   → waiting for organizer action (created by an approval-policy Join)
--   approved  → accepted into the Project (created directly by an instant-policy Join, or by organizer approval)
--   declined  → organizer rejected the request
--   cancelled → participant cancelled their participation
-- (checked-in / attended / no-show are NOT here — they belong to the future Check-in System.)
--
-- This stage defines ONLY the participant model: NO Ticket / Registration / Purchase / Payment / Check-in /
-- Attendance entity, no payment. Future systems (Ticketing, Check-in, Payments, Messaging, Notifications) build
-- on THIS model rather than creating parallel participant representations. Idempotent.

CREATE TABLE IF NOT EXISTS project_participants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  account_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, account_id)
);

CREATE INDEX IF NOT EXISTS project_participants_project_status_idx ON project_participants (project_id, status);

DROP TRIGGER IF EXISTS project_participants_updated_at ON project_participants;
CREATE TRIGGER project_participants_updated_at BEFORE UPDATE ON project_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE project_participants ENABLE ROW LEVEL SECURITY;

-- The Project owner sees and manages (approve / decline) every participant of their Projects.
DROP POLICY IF EXISTS "project_participants_owner_rw" ON project_participants;
CREATE POLICY "project_participants_owner_rw" ON project_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_participants.project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_participants.project_id AND p.owner_id = auth.uid()));

-- A participant may JOIN (insert their own row), SEE their own participation, and UPDATE it (e.g. cancel).
DROP POLICY IF EXISTS "project_participants_self_insert" ON project_participants;
CREATE POLICY "project_participants_self_insert" ON project_participants FOR INSERT
  WITH CHECK (account_id = auth.uid());
DROP POLICY IF EXISTS "project_participants_self_select" ON project_participants;
CREATE POLICY "project_participants_self_select" ON project_participants FOR SELECT
  USING (account_id = auth.uid());
DROP POLICY IF EXISTS "project_participants_self_update" ON project_participants;
CREATE POLICY "project_participants_self_update" ON project_participants FOR UPDATE
  USING (account_id = auth.uid()) WITH CHECK (account_id = auth.uid());
