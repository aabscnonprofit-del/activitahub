-- ============================================================
-- 006_organizer_core.sql — Phase 4: Organizer Platform Core
-- Depends on: 001_profiles.sql (profiles, update_updated_at_column, uuid-ossp,
--             is_admin from 003)
-- ============================================================
--
-- The organizer's working data: extended profile, activities, venues (+ photos
-- in Supabase Storage), clients, and a calendar. These tables were referenced
-- by the Phase 1 dashboard UI but never had a canonical numbered migration.
--
-- Calendar design note (forward-compatibility with the future booking system):
--   calendar_events is the ORGANIZER'S OWN schedule — sessions they run, blocked
--   time, and personal notes. It is intentionally separate from bookings (a
--   later phase): an event may OPTIONALLY link to an activity/venue via
--   activity_id/venue_id, but carries no buyer/payment semantics. Bookings will
--   live in their own table and may reference activities and/or create events,
--   without changing this schema.
--
-- RLS: every table is owner-scoped (organizer_id / user_id = auth.uid()), plus
-- admin. Published activities are additionally world-readable (the "publish"
-- effect, forward-compatible with the marketplace). Venue photos live in a
-- public Storage bucket but are writable only within the owner's folder.
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE organizer_status AS ENUM ('draft', 'published', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE activity_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE location_type AS ENUM ('indoor', 'outdoor', 'both');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE calendar_event_type AS ENUM ('session', 'block', 'personal');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizer_profiles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT,
  bio          TEXT,
  city         TEXT,
  country      TEXT,
  languages    TEXT[],
  phone        TEXT,
  website      TEXT,
  status       organizer_status NOT NULL DEFAULT 'draft',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       activity_status NOT NULL DEFAULT 'draft',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activities_organizer_id_idx ON activities(organizer_id);
CREATE INDEX IF NOT EXISTS activities_status_idx       ON activities(status);

CREATE TABLE IF NOT EXISTS venues (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  address        TEXT,
  city           TEXT,
  country        TEXT,
  capacity       INTEGER,
  indoor_outdoor location_type,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS venues_organizer_id_idx ON venues(organizer_id);

CREATE TABLE IF NOT EXISTS venue_photos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id     UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS venue_photos_venue_id_idx ON venue_photos(venue_id, sort_order);

CREATE TABLE IF NOT EXISTS clients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS clients_organizer_id_idx ON clients(organizer_id);

CREATE TABLE IF NOT EXISTS calendar_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  event_type   calendar_event_type NOT NULL DEFAULT 'session',
  activity_id  UUID REFERENCES activities(id) ON DELETE SET NULL,
  venue_id     UUID REFERENCES venues(id) ON DELETE SET NULL,
  date         DATE NOT NULL,
  start_time   TIME,
  end_time     TIME,
  all_day      BOOLEAN NOT NULL DEFAULT FALSE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS calendar_events_organizer_id_idx ON calendar_events(organizer_id, date);

-- ── updated_at triggers ──────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS organizer_profiles_updated_at ON organizer_profiles;
CREATE TRIGGER organizer_profiles_updated_at BEFORE UPDATE ON organizer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS activities_updated_at ON activities;
CREATE TRIGGER activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS venues_updated_at ON venues;
CREATE TRIGGER venues_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS calendar_events_updated_at ON calendar_events;
CREATE TRIGGER calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE organizer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues             ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_photos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events    ENABLE ROW LEVEL SECURITY;

-- organizer_profiles: owner manages own; published profiles are world-readable.
DROP POLICY IF EXISTS "organizer_profiles_select" ON organizer_profiles;
CREATE POLICY "organizer_profiles_select" ON organizer_profiles FOR SELECT
  USING (auth.uid() = user_id OR is_admin() OR status = 'published');
DROP POLICY IF EXISTS "organizer_profiles_modify" ON organizer_profiles;
CREATE POLICY "organizer_profiles_modify" ON organizer_profiles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- activities: owner manages own; published activities are world-readable.
DROP POLICY IF EXISTS "activities_select" ON activities;
CREATE POLICY "activities_select" ON activities FOR SELECT
  USING (auth.uid() = organizer_id OR is_admin() OR status = 'published');
DROP POLICY IF EXISTS "activities_modify" ON activities;
CREATE POLICY "activities_modify" ON activities FOR ALL
  USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

-- venues: owner only.
DROP POLICY IF EXISTS "venues_select" ON venues;
CREATE POLICY "venues_select" ON venues FOR SELECT
  USING (auth.uid() = organizer_id OR is_admin());
DROP POLICY IF EXISTS "venues_modify" ON venues;
CREATE POLICY "venues_modify" ON venues FOR ALL
  USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

-- venue_photos: owner only.
DROP POLICY IF EXISTS "venue_photos_select" ON venue_photos;
CREATE POLICY "venue_photos_select" ON venue_photos FOR SELECT
  USING (auth.uid() = organizer_id OR is_admin());
DROP POLICY IF EXISTS "venue_photos_modify" ON venue_photos;
CREATE POLICY "venue_photos_modify" ON venue_photos FOR ALL
  USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

-- clients: owner only (private CRM data).
DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT
  USING (auth.uid() = organizer_id OR is_admin());
DROP POLICY IF EXISTS "clients_modify" ON clients;
CREATE POLICY "clients_modify" ON clients FOR ALL
  USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

-- calendar_events: owner only.
DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
CREATE POLICY "calendar_events_select" ON calendar_events FOR SELECT
  USING (auth.uid() = organizer_id OR is_admin());
DROP POLICY IF EXISTS "calendar_events_modify" ON calendar_events;
CREATE POLICY "calendar_events_modify" ON calendar_events FOR ALL
  USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);

-- ── Storage: venue photos ────────────────────────────────────────────────────
-- Public bucket so photos render via getPublicUrl; writes confined to the
-- owner's top-level folder ("<uid>/...").
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-photos', 'venue-photos', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "venue_photos_public_read" ON storage.objects;
CREATE POLICY "venue_photos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'venue-photos');

DROP POLICY IF EXISTS "venue_photos_owner_insert" ON storage.objects;
CREATE POLICY "venue_photos_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'venue-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "venue_photos_owner_delete" ON storage.objects;
CREATE POLICY "venue_photos_owner_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'venue-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Comments ─────────────────────────────────────────────────────────────────
COMMENT ON TABLE activities      IS 'Organizer activity offerings. Published rows are world-readable (marketplace-ready).';
COMMENT ON TABLE calendar_events IS 'Organizer-owned schedule (sessions/blocks/notes). Separate from the future bookings table; may optionally link an activity/venue.';
COMMENT ON TABLE venue_photos    IS 'Pointers to objects in the venue-photos Storage bucket.';
