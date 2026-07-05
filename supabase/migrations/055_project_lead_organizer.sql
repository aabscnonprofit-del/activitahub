-- 055_project_lead_organizer.sql — Lead Organizer Assignment.
-- Depends on: 041 (projects, profiles).
--
-- Records the assigned Lead Organizer of a project. When set, this organizer (not the owner) is the EFFECTIVE
-- lead whose capacity the Organizer Capacity Gate validates — so an over-capacity owner can keep a valid
-- project and have a qualified Lead Organizer lead it. Null = the owner is the lead (the default). ON DELETE
-- SET NULL so a removed profile falls back to the owner as effective lead.
--
-- Additive column only. Changes no Planning, Occurrence, Execution, Delivery, or Team table. Read via a
-- dedicated resilient accessor (NOT the core projects column list), so getProject keeps working before this
-- migration is applied.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_organizer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
