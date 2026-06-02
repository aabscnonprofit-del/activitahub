-- ============================================================
-- 015_organizer_slugs.sql — Clean shareable organizer profile URLs
-- Depends on: 006 (organizer_profiles), 007 + 011 (marketplace RPCs)
-- ============================================================
--
-- Adds a unique, lowercase, URL-safe `slug` to organizer_profiles so each
-- organizer gets a shareable public URL like /o/maria-barcelona instead of a
-- UUID. Slugs are auto-generated from display name + city when missing, are
-- protected against duplicates and reserved words, and are exposed through the
-- public marketplace / organizer RPCs so links can prefer them.
-- ============================================================

-- ── Slug helpers ──────────────────────────────────────────────────────────────

-- Lowercase, collapse any run of non-alphanumerics to a single hyphen, trim.
-- Note: non-Latin scripts (e.g. Cyrillic) collapse to ''; callers fall back.
CREATE OR REPLACE FUNCTION slugify(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Slugs that collide with app routes must never be assigned to an organizer.
CREATE OR REPLACE FUNCTION is_reserved_slug(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT p_slug = ANY (ARRAY[
    'admin','api','auth','dashboard','marketplace','pricing','onboarding',
    'account','academy','requests','bookings','notifications','o',
    'organizers','sign-in','sign-up','billing','reset-password','verify',
    'privacy-policy','terms-of-service','settings','profile','calendar',
    'clients','venues','proposals','analytics'
  ]);
$$;

-- Produce a unique, non-reserved slug for an organizer from a free-text base.
-- SECURITY DEFINER: the uniqueness scan must see ALL organizers, not just the
-- caller's own RLS-visible row.
CREATE OR REPLACE FUNCTION generate_organizer_slug(p_user_id UUID, p_base TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base TEXT;
  v_candidate TEXT;
  v_n INT := 1;
BEGIN
  v_base := slugify(p_base);
  IF v_base IS NULL OR v_base = '' THEN
    v_base := 'organizer-' || substr(replace(p_user_id::text, '-', ''), 1, 8);
  END IF;
  IF is_reserved_slug(v_base) THEN
    v_base := v_base || '-' || substr(replace(p_user_id::text, '-', ''), 1, 6);
  END IF;

  v_candidate := v_base;
  WHILE EXISTS (
    SELECT 1 FROM organizer_profiles
    WHERE slug = v_candidate AND user_id <> p_user_id
  ) LOOP
    v_n := v_n + 1;
    v_candidate := v_base || '-' || v_n;
  END LOOP;

  RETURN v_candidate;
END;
$$;

-- ── Column + uniqueness ───────────────────────────────────────────────────────

ALTER TABLE organizer_profiles ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS organizer_profiles_slug_key
  ON organizer_profiles (slug) WHERE slug IS NOT NULL;

-- ── Auto-generate / normalise slug on write ───────────────────────────────────
-- Blank slug → generate from display name + city. Non-blank → normalise; if it
-- normalises to empty or a reserved word, fall back to a generated one. An
-- explicit duplicate is rejected by the unique index above (surfaced to the UI).

CREATE OR REPLACE FUNCTION organizer_profiles_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
    NEW.slug := generate_organizer_slug(
      NEW.user_id, coalesce(NEW.display_name, '') || ' ' || coalesce(NEW.city, '')
    );
  ELSE
    NEW.slug := slugify(NEW.slug);
    IF NEW.slug = '' OR is_reserved_slug(NEW.slug) THEN
      NEW.slug := generate_organizer_slug(
        NEW.user_id, coalesce(NEW.display_name, '') || ' ' || coalesce(NEW.city, '')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizer_profiles_slug ON organizer_profiles;
CREATE TRIGGER organizer_profiles_slug
  BEFORE INSERT OR UPDATE ON organizer_profiles
  FOR EACH ROW EXECUTE FUNCTION organizer_profiles_set_slug();

-- ── Backfill existing organizers ──────────────────────────────────────────────

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT user_id, display_name, city FROM organizer_profiles WHERE slug IS NULL LOOP
    UPDATE organizer_profiles
      SET slug = generate_organizer_slug(r.user_id, coalesce(r.display_name, '') || ' ' || coalesce(r.city, ''))
      WHERE user_id = r.user_id;
  END LOOP;
END $$;

-- ── Expose slug through the public RPCs (CREATE OR REPLACE keeps grants) ───────

-- Organizer profile by user id — now includes slug.
CREATE OR REPLACE FUNCTION get_public_organizer(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN op.user_id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', op.user_id, 'slug', op.slug, 'display_name', op.display_name, 'bio', op.bio,
    'city', op.city, 'country', op.country, 'languages', op.languages, 'website', op.website,
    'certified', EXISTS (SELECT 1 FROM certificates c WHERE c.profile_id = op.user_id),
    'member_since', p.created_at,
    'rating', (SELECT round(avg(r.rating), 1) FROM reviews r WHERE r.organizer_id = op.user_id AND r.status = 'approved'),
    'review_count', (SELECT count(*) FROM reviews r WHERE r.organizer_id = op.user_id AND r.status = 'approved'),
    'activities', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'title', a.title, 'category', a.category,
        'price_cents', a.price_cents, 'currency', a.currency, 'city', a.city) ORDER BY a.title)
      FROM activities a WHERE a.organizer_id = op.user_id AND a.status = 'published'), '[]'::jsonb)
  ) END
  FROM organizer_profiles op JOIN profiles p ON p.id = op.user_id
  WHERE op.user_id = p_user_id AND op.status = 'published';
$$;

-- Organizer profile by slug — same shape, looked up by the shareable slug.
CREATE OR REPLACE FUNCTION get_public_organizer_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT get_public_organizer(op.user_id)
  FROM organizer_profiles op
  WHERE op.slug = p_slug AND op.status = 'published'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_organizer_by_slug(TEXT) TO anon, authenticated;

-- search_marketplace — add organizer_slug to each card.
CREATE OR REPLACE FUNCTION search_marketplace(p_filters JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
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
      'organizer_slug', op.slug,
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

-- get_marketplace_activity — add slug to the organizer object.
CREATE OR REPLACE FUNCTION get_marketplace_activity(p_id UUID)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
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
      'slug', op.slug,
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

COMMENT ON COLUMN organizer_profiles.slug IS 'Unique URL-safe slug for the public profile at /o/<slug>. Auto-generated when blank; reserved words and duplicates are blocked.';
