-- 059_project_visibility.sql
--
-- Adds Project VISIBILITY — an additional discovery attribute, INDEPENDENT of publication.
--   * Publication ("Is this Project published?")  → projects.is_published
--   * Visibility  ("Who can discover and join it?") → projects.visibility  (this migration)
--
-- Local Activities is NOT a new entity — it is the participant-facing catalog of published PUBLIC Projects:
--
--     Local Activities = published Projects WHERE visibility = 'public'
--
-- Default 'private', so every existing Project (and every new one) starts private and is NOT discoverable
-- until the organizer explicitly opts in to public. A private Project is reachable only by invitation / direct
-- link (the existing access model is unchanged). Visibility is only a Project attribute used for discovery —
-- it adds no entity and touches no Planning / Budget / Execution / lifecycle / approval.
--
-- Depends on: 001 / 041 (projects). Idempotent (ADD COLUMN IF NOT EXISTS).

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));
