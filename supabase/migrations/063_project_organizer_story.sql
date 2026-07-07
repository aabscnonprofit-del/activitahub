-- 063_project_organizer_story.sql — Organizer Story (the first Activity Memory).
-- Depends on: 001 / 041 (projects). Idempotent (ADD COLUMN IF NOT EXISTS).
--
-- The organizer's own public reflection on a COMPLETED PUBLIC activity — the first real content inside Activity
-- Memories. It is a simple PROPERTY of one completed public Project (not a Story/Memory entity, not a reusable
-- organizer biography, not on the Organizer profile). Plain text, nullable (NULL = no story yet → the
-- "Coming soon" placeholder). Owner-only writes are enforced by the existing owner RLS on projects; it is shown
-- only in the Public Activity Space (published + visibility = public + completed). Adds no lifecycle state.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organizer_story TEXT;
