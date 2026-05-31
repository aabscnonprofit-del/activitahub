-- ============================================================
-- 007_marketplace.sql — Phase 5: Public marketplace + catalog
-- Depends on: 006_organizer_core.sql (activities, venues, venue_photos,
--             organizer_profiles), 003 (is_admin), 005 (certificates)
-- ============================================================
--
-- Extends activities with the fields a public catalogue needs (category,
-- price, languages, child age range, location, indoor/outdoor, primary venue),
-- then exposes the PUBLIC marketplace strictly through SECURITY DEFINER
-- functions. The underlying tables keep their existing RLS: a published
-- activity is world-readable, but venues / venue_photos / profiles /
-- certificates stay private — the functions return only curated public fields
-- (and storage PATHS, which the app turns into public URLs).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE activity_category AS ENUM (
    'sports', 'arts', 'music', 'education', 'outdoor',
    'wellness', 'workshop', 'party', 'food', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS category         activity_category;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS price_cents      INTEGER;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS currency         TEXT NOT NULL DEFAULT 'usd';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS languages        TEXT[];
ALTER TABLE activities ADD COLUMN IF NOT EXISTS min_age          INTEGER;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS max_age          INTEGER;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS city             TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS country          TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS indoor_outdoor   location_type;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS venue_id         UUID REFERENCES venues(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

CREATE INDEX IF NOT EXISTS activities_category_idx ON activities(category) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS activities_city_idx     ON activities(city)     WHERE status = 'published';

-- ── Public read: search/filter the catalogue ─────────────────────────────────
-- p_filters keys (all optional): city, country, category, language,
-- max_price (cents), indoor_outdoor, child_age, date (YYYY-MM-DD), q (text).
CREATE OR REPLACE FUNCTION search_marketplace(p_filters JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(card ORDER BY card->>'title'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'description', a.description,
      'category', a.category,
      'price_cents', a.price_cents,
      'currency', a.currency,
      'languages', a.languages,
      'min_age', a.min_age,
      'max_age', a.max_age,
      'city', a.city,
      'country', a.country,
      'indoor_outdoor', a.indoor_outdoor,
      'organizer_id', a.organizer_id,
      'organizer_name', op.display_name,
      'organizer_certified', EXISTS (SELECT 1 FROM certificates c WHERE c.profile_id = a.organizer_id),
      'cover_path', (
        SELECT vp.storage_path FROM venue_photos vp
        WHERE vp.venue_id = a.venue_id ORDER BY vp.sort_order LIMIT 1
      )
    ) AS card
    FROM activities a
    LEFT JOIN organizer_profiles op ON op.user_id = a.organizer_id
    WHERE a.status = 'published'
      AND (p_filters->>'city'        IS NULL OR a.city ILIKE '%' || (p_filters->>'city') || '%')
      AND (p_filters->>'country'     IS NULL OR a.country ILIKE '%' || (p_filters->>'country') || '%')
      AND (p_filters->>'category'    IS NULL OR a.category::text = (p_filters->>'category'))
      AND (p_filters->>'indoor_outdoor' IS NULL OR a.indoor_outdoor::text = (p_filters->>'indoor_outdoor'))
      AND (p_filters->>'language'    IS NULL OR (p_filters->>'language') = ANY(a.languages))
      AND (p_filters->>'max_price'   IS NULL OR a.price_cents IS NULL OR a.price_cents <= (p_filters->>'max_price')::int)
      AND (p_filters->>'child_age'   IS NULL OR ((p_filters->>'child_age')::int BETWEEN COALESCE(a.min_age, 0) AND COALESCE(a.max_age, 200)))
      AND (p_filters->>'q'           IS NULL OR a.title ILIKE '%' || (p_filters->>'q') || '%' OR a.description ILIKE '%' || (p_filters->>'q') || '%')
      AND (p_filters->>'date'        IS NULL OR EXISTS (
            SELECT 1 FROM calendar_events ce
            WHERE ce.activity_id = a.id AND ce.event_type = 'session'
              AND ce.date = (p_filters->>'date')::date))
  ) cards;
$$;

-- ── Public read: a single activity's detail (only if published) ──────────────
CREATE OR REPLACE FUNCTION get_marketplace_activity(p_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', a.id,
    'title', a.title,
    'description', a.description,
    'category', a.category,
    'price_cents', a.price_cents,
    'currency', a.currency,
    'languages', a.languages,
    'min_age', a.min_age,
    'max_age', a.max_age,
    'city', a.city,
    'country', a.country,
    'indoor_outdoor', a.indoor_outdoor,
    'duration_minutes', a.duration_minutes,
    'organizer', jsonb_build_object(
      'id', a.organizer_id,
      'name', op.display_name,
      'certified', EXISTS (SELECT 1 FROM certificates c WHERE c.profile_id = a.organizer_id)
    ),
    'venue', CASE WHEN v.id IS NULL THEN NULL ELSE jsonb_build_object(
      'name', v.name, 'city', v.city, 'country', v.country, 'indoor_outdoor', v.indoor_outdoor
    ) END,
    'photo_paths', COALESCE((
      SELECT jsonb_agg(vp.storage_path ORDER BY vp.sort_order)
      FROM venue_photos vp WHERE vp.venue_id = a.venue_id
    ), '[]'::jsonb),
    'upcoming', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', ce.date, 'start_time', ce.start_time) ORDER BY ce.date)
      FROM calendar_events ce
      WHERE ce.activity_id = a.id AND ce.event_type = 'session' AND ce.date >= CURRENT_DATE
    ), '[]'::jsonb)
  )
  FROM activities a
  LEFT JOIN organizer_profiles op ON op.user_id = a.organizer_id
  LEFT JOIN venues v ON v.id = a.venue_id
  WHERE a.id = p_id AND a.status = 'published';
$$;

-- ── Public read: organizer profile + their published activities ──────────────
CREATE OR REPLACE FUNCTION get_public_organizer(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN op.user_id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', op.user_id,
    'display_name', op.display_name,
    'bio', op.bio,
    'city', op.city,
    'country', op.country,
    'languages', op.languages,
    'website', op.website,
    'certified', EXISTS (SELECT 1 FROM certificates c WHERE c.profile_id = op.user_id),
    'member_since', p.created_at,
    'activities', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'title', a.title, 'category', a.category,
        'price_cents', a.price_cents, 'currency', a.currency, 'city', a.city
      ) ORDER BY a.title)
      FROM activities a WHERE a.organizer_id = op.user_id AND a.status = 'published'
    ), '[]'::jsonb)
  ) END
  FROM organizer_profiles op
  JOIN profiles p ON p.id = op.user_id
  WHERE op.user_id = p_user_id AND op.status = 'published';
$$;

GRANT EXECUTE ON FUNCTION search_marketplace(JSONB)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_marketplace_activity(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_organizer(UUID)     TO anon, authenticated;

COMMENT ON FUNCTION search_marketplace(JSONB) IS 'Public catalogue search. Returns published activities only, with curated organizer fields.';
