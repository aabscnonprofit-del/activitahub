-- 054_organizer_capacity_level.sql — Organizer Capacity Gates.
-- Depends on: profiles (existing).
--
-- Records an organizer's capacity LEVEL (1..4) — the qualification level that bounds how large a project they
-- may independently LEAD. This is a single scalar on the organizer's profile; it is NOT a qualification /
-- certification system (levels are set out of band). New organizers default to Level 1 (up to 20 participants).
--
-- Additive column only. Changes no Planning, Project, Delivery, Team, or Execution table, and no behavior on
-- its own — the Organizer Capacity Gate reads this level.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organizer_capacity_level SMALLINT NOT NULL DEFAULT 1
  CHECK (organizer_capacity_level BETWEEN 1 AND 4);
