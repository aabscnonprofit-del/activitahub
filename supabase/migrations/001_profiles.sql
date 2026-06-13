-- ============================================================
-- 001_profiles.sql — Phase 1: Core auth and profile schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'guest',
  'student',
  'certified_organizer',
  'admin'
);

CREATE TYPE onboarding_status AS ENUM (
  'not_started',
  'path_selected',
  'payment_pending',
  'payment_complete',
  'certified',
  'subscribed'
);

CREATE TYPE onboarding_path AS ENUM (
  'beginner',
  'experienced'
);

-- ============================================================
-- UTILITY TRIGGERS
-- ============================================================

-- Reusable trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROFILES TABLE
-- ============================================================

CREATE TABLE profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role               user_role        NOT NULL DEFAULT 'student',
  onboarding_status  onboarding_status NOT NULL DEFAULT 'not_started',
  selected_path      onboarding_path,
  full_name          TEXT,
  email              TEXT,
  avatar_url         TEXT,
  timezone           TEXT             NOT NULL DEFAULT 'UTC',
  preferred_locale   TEXT             NOT NULL DEFAULT 'en',
  suspended          BOOLEAN          NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- Index for common query patterns
CREATE INDEX profiles_role_idx              ON profiles(role);
CREATE INDEX profiles_onboarding_status_idx ON profiles(onboarding_status);
CREATE INDEX profiles_email_idx             ON profiles(email);
CREATE INDEX profiles_suspended_idx         ON profiles(suspended) WHERE suspended = TRUE;

-- Auto-update updated_at on any row change
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON AUTH USER CREATION
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
-- Role and suspension can only be changed by admin (enforced via separate admin policy)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent users from elevating their own role or unsuspending themselves
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND suspended = (SELECT suspended FROM profiles WHERE id = auth.uid())
  );

-- Admin can read all profiles
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND suspended = FALSE
    )
  );

-- Admin can update all profiles (role changes, suspensions)
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND suspended = FALSE
    )
  );

-- Service role can insert profiles (used by the trigger)
CREATE POLICY "profiles_insert_service"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE profiles IS 'User profiles extending auth.users. One row per authenticated user.';
COMMENT ON COLUMN profiles.role IS 'Platform role. Upgraded to certified_organizer after certification + active subscription.';
COMMENT ON COLUMN profiles.onboarding_status IS 'Tracks user progress through the onboarding funnel.';
COMMENT ON COLUMN profiles.selected_path IS 'Chosen certification path: beginner ($99.99 course) or experienced ($39.99 test).';
COMMENT ON COLUMN profiles.suspended IS 'When TRUE, admin has blocked all platform access.';
COMMENT ON COLUMN profiles.timezone IS 'IANA timezone string, e.g. Europe/Madrid. All dates displayed in this timezone.';
