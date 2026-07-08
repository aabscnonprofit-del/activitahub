-- 068_participant_arrival_preferences.sql — Arrival Coordination (MVP).
-- Depends on: 001 (update_updated_at_column), 041 (projects, profiles), 043-ish (occurrences), 061
-- (project_participants). Idempotent.
--
-- A lightweight SOCIAL coordination layer attached to attendance: an approved participant may say "I need a ride"
-- and/or "I can offer a ride", with an optional pickup ZIP/area, seats (for offers), and a short note. This is
-- NOT transportation / rideshare / taxi — no maps, no exact address, no phone, no payment, no automatic matching.
-- One preference per participant per project (occurrence_id is nullable/informational for MVP).

CREATE TABLE IF NOT EXISTS participant_arrival_preferences (
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  occurrence_id   UUID REFERENCES occurrences(id) ON DELETE SET NULL,
  needs_ride      BOOLEAN NOT NULL DEFAULT FALSE,
  can_offer_ride  BOOLEAN NOT NULL DEFAULT FALSE,
  pickup_zip      TEXT,
  seats_available INTEGER,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, account_id)
);

CREATE INDEX IF NOT EXISTS participant_arrival_preferences_project_idx ON participant_arrival_preferences (project_id);

DROP TRIGGER IF EXISTS participant_arrival_preferences_updated_at ON participant_arrival_preferences;
CREATE TRIGGER participant_arrival_preferences_updated_at BEFORE UPDATE ON participant_arrival_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE participant_arrival_preferences ENABLE ROW LEVEL SECURITY;

-- Write: a participant sets ONLY their OWN preference, and only while an APPROVED participant of the Project.
DROP POLICY IF EXISTS "pap_self_write" ON participant_arrival_preferences;
CREATE POLICY "pap_self_write" ON participant_arrival_preferences FOR ALL
  USING (account_id = auth.uid())
  WITH CHECK (
    account_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM project_participants pp
      WHERE pp.project_id = participant_arrival_preferences.project_id AND pp.account_id = auth.uid() AND pp.status = 'approved'
    )
  );

-- Read: the Project OWNER (organizer) or an APPROVED participant of the Project. Never public.
DROP POLICY IF EXISTS "pap_read" ON participant_arrival_preferences;
CREATE POLICY "pap_read" ON participant_arrival_preferences FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = participant_arrival_preferences.project_id AND p.owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM project_participants pp
      WHERE pp.project_id = participant_arrival_preferences.project_id AND pp.account_id = auth.uid() AND pp.status = 'approved'
    )
  );
