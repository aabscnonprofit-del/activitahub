-- ============================================================
-- 017_organizer_access.sql
-- Certification-triggered 30-day Organizer Platform access.
--
-- Business decision (2026-06-07):
--   * Passing certification (receiving the ActivLife Organizer Certificate)
--     grants 30 days of Organizer Platform access — NOT payment time.
--   * No publishing privileges before certification.
--   * After the included 30 days, an active subscription is required.
--   * Retakes / re-certification must NOT extend or re-grant the window.
--
-- Depends on: 001_profiles.sql (profiles), 005_certification.sql (certificates).
-- Idempotent / non-destructive: adds one nullable column + one trigger.
-- ============================================================

-- 1. Included-access window (NULL until first certification).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS organizer_access_until TIMESTAMPTZ;

COMMENT ON COLUMN profiles.organizer_access_until IS
  'End of the 30-day Organizer Platform access included with certification. Set once at first certification; never extended on retake. NULL = no included window.';

-- 2. Grant role + window when a certificate is first issued.
-- Fires from the SECURITY DEFINER submit_exam() certificate INSERT. The
-- COALESCE guard makes it idempotent and prevents retakes from re-granting:
-- organizer_access_until is set only when currently NULL.
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
       onboarding_status =
         CASE WHEN onboarding_status = 'subscribed' THEN 'subscribed' ELSE 'certified' END,
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

DROP TRIGGER IF EXISTS certificates_grant_access ON certificates;
CREATE TRIGGER certificates_grant_access
  AFTER INSERT ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION grant_organizer_access_on_certification();
