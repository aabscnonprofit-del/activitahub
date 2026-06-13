-- ============================================================
-- 024_fix_grant_access_onboarding_cast.sql
-- Bugfix: production final-exam submission failed (after 023 fixed
-- gen_random_bytes) with:
--   column "onboarding_status" is of type onboarding_status
--   but expression is of type text
--
-- Cause: the certificates_grant_access trigger function
-- grant_organizer_access_on_certification() (017_organizer_access.sql) assigns:
--   onboarding_status =
--     CASE WHEN onboarding_status = 'subscribed' THEN 'subscribed' ELSE 'certified' END
-- Both CASE branches are bare string literals, so PostgreSQL resolves the CASE
-- result type to TEXT, and assigning text to the onboarding_status ENUM column
-- without a cast errors. (The sibling `role` CASE is fine because one branch is
-- the typed `role` column, which anchors the result to the user_role enum.)
--
-- This only surfaced now: before 023, submit_exam() died at gen_random_bytes
-- BEFORE inserting the certificate, so this AFTER INSERT trigger never fired.
-- Once the certificate INSERT succeeded, the trigger ran and hit the bug.
--
-- Fix (minimal): cast the CASE result to ::onboarding_status. No other logic
-- changes — role grant, the COALESCE 30-day window, and the trigger itself are
-- untouched. Depends on: 017.
-- ============================================================

CREATE OR REPLACE FUNCTION grant_organizer_access_on_certification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
     SET
       -- Certification grants the certified_organizer role (never demote admin).
       role = CASE WHEN role = 'admin' THEN role ELSE 'certified_organizer' END,
       -- Advance to 'certified' but never demote a profile already 'subscribed'.
       -- FIX: both CASE branches are literals → cast the result to the enum.
       onboarding_status =
         (CASE WHEN onboarding_status = 'subscribed' THEN 'subscribed' ELSE 'certified' END)::onboarding_status,
       -- Set the 30-day window ONCE — COALESCE keeps any existing value. The
       -- window is anchored to the certificate's issued_at (defaults to now()
       -- for live exam passes) so historical / demo / imported certificates do
       -- not mint a fresh 30 days from migration time.
       organizer_access_until = COALESCE(
         organizer_access_until,
         COALESCE(NEW.issued_at, now()) + INTERVAL '30 days'
       ),
       updated_at = now()
   WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$;
