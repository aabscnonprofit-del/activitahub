-- ============================================================
-- ONE-OFF APPLY SCRIPT (local helper, not a migration)
-- Paste into Supabase SQL Editor and Run. Order matters.
-- 015 is the only one actually missing in the target DB;
-- 016 (ADD VALUE IF NOT EXISTS) and phase9 (ON CONFLICT) are idempotent.
-- ============================================================

-- ░░░░░░░░░░ 015_organizer_slugs.sql ░░░░░░░░░░
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

-- ░░░░░░░░░░ 016_marketplace_categories.sql ░░░░░░░░░░
-- ============================================================
-- 016_marketplace_categories.sql — Phase 9: emotional category taxonomy
-- Depends on: 007 (activity_category enum)
-- ============================================================
--
-- Extends activity_category with scenario/occasion-based values across three
-- discovery layers (Personal & Family, Communities & Groups, Premium & Niche).
-- Additive only — the original generic values are kept so existing activities
-- and requests keep working. Must be applied BEFORE the Phase 9 seed (which
-- inserts activities using these values) and before deploying the frontend that
-- offers them in the create forms.
-- ============================================================

-- A — Personal & Family Events
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'birthday';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'kids_party';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'wedding';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'anniversary';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'baby_shower';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'reunion';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'graduation';

-- B — Community & Identity Gatherings
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'hiking_club';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'language_meetup';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'cultural_community';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'faith_community';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'hobby_group';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'alumni';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'fan_community';

-- C — Premium / Extreme / Niche Experiences
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'luxury_picnic';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'sunset_yacht';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'private_chef';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'glamping';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'volcano_dinner';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'survival_camp';
ALTER TYPE activity_category ADD VALUE IF NOT EXISTS 'underwater_photography';

-- ░░░░░░░░░░ seed/phase9_marketplace.sql ░░░░░░░░░░
-- ============================================================
-- phase9_marketplace.sql — Phase 9: marketplace density & emotional diversity
-- Apply AFTER migration 016 (the new category enum values must exist first).
-- ============================================================
--
-- Adds curated DEMO organizers + a globally diverse set of example activities
-- across the new emotional categories. This is demo/example content for visual
-- richness ONLY — no fake reviews, bookings, users-counts, or live metrics.
-- Safe to re-run (idempotent via ON CONFLICT).
-- ============================================================

-- ── Demo organizers (auth users — pre-confirmed) ─────────────────────────────
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'd9d90000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'aloha.demo@activlife.test',
   crypt('ActivLifeDemo123!', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Leilani Demo"}', NOW(), NOW(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd9d90000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'tokyo.demo@activlife.test',
   crypt('ActivLifeDemo123!', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Haruto Demo"}', NOW(), NOW(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd9d90000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'cape.demo@activlife.test',
   crypt('ActivLifeDemo123!', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Thabo Demo"}', NOW(), NOW(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd9d90000-0000-4000-8000-000000000004',
   'authenticated', 'authenticated', 'reykjavik.demo@activlife.test',
   crypt('ActivLifeDemo123!', gen_salt('bf')), NOW(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Sigrun Demo"}', NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'd9d90000-0000-4000-8000-000000000001', '{"sub":"d9d90000-0000-4000-8000-000000000001","email":"aloha.demo@activlife.test"}', 'email', 'd9d90000-0000-4000-8000-000000000001', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'd9d90000-0000-4000-8000-000000000002', '{"sub":"d9d90000-0000-4000-8000-000000000002","email":"tokyo.demo@activlife.test"}', 'email', 'd9d90000-0000-4000-8000-000000000002', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'd9d90000-0000-4000-8000-000000000003', '{"sub":"d9d90000-0000-4000-8000-000000000003","email":"cape.demo@activlife.test"}', 'email', 'd9d90000-0000-4000-8000-000000000003', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'd9d90000-0000-4000-8000-000000000004', '{"sub":"d9d90000-0000-4000-8000-000000000004","email":"reykjavik.demo@activlife.test"}', 'email', 'd9d90000-0000-4000-8000-000000000004', NOW(), NOW(), NOW())
ON CONFLICT (provider, provider_id) DO NOTHING;

UPDATE profiles SET role='certified_organizer', onboarding_status='subscribed', selected_path='experienced', full_name=COALESCE(full_name,'Leilani Demo') WHERE id='d9d90000-0000-4000-8000-000000000001';
UPDATE profiles SET role='certified_organizer', onboarding_status='subscribed', selected_path='experienced', full_name=COALESCE(full_name,'Haruto Demo')  WHERE id='d9d90000-0000-4000-8000-000000000002';
UPDATE profiles SET role='certified_organizer', onboarding_status='subscribed', selected_path='experienced', full_name=COALESCE(full_name,'Thabo Demo')   WHERE id='d9d90000-0000-4000-8000-000000000003';
UPDATE profiles SET role='certified_organizer', onboarding_status='subscribed', selected_path='experienced', full_name=COALESCE(full_name,'Sigrun Demo')  WHERE id='d9d90000-0000-4000-8000-000000000004';

INSERT INTO subscriptions (profile_id, status, current_period_end, cancel_at_period_end) VALUES
  ('d9d90000-0000-4000-8000-000000000001','active', NOW() + INTERVAL '30 days', FALSE),
  ('d9d90000-0000-4000-8000-000000000002','active', NOW() + INTERVAL '30 days', FALSE),
  ('d9d90000-0000-4000-8000-000000000003','active', NOW() + INTERVAL '30 days', FALSE),
  ('d9d90000-0000-4000-8000-000000000004','active', NOW() + INTERVAL '30 days', FALSE)
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO organizer_profiles (user_id, display_name, bio, city, country, languages, website, status) VALUES
  ('d9d90000-0000-4000-8000-000000000001', 'Aloha Gatherings',
   'Island celebrations and golden-hour experiences along the shores of O''ahu — intimate, warm, and unhurried.',
   'Honolulu', 'United States', ARRAY['English'], NULL, 'published'),
  ('d9d90000-0000-4000-8000-000000000002', 'Tokyo Circle',
   'A friendly community host bringing people together for language, culture, and shared hobbies across Tokyo.',
   'Tokyo', 'Japan', ARRAY['English','Japanese'], NULL, 'published'),
  ('d9d90000-0000-4000-8000-000000000003', 'Cape Coast Collective',
   'Mountain hikes, winelands escapes, and chef-led evenings around the Cape — adventure with a sense of place.',
   'Cape Town', 'South Africa', ARRAY['English'], NULL, 'published'),
  ('d9d90000-0000-4000-8000-000000000004', 'Reykjavík Wild',
   'Small-group expeditions to volcanoes, glaciers, and the northern lights — for travelers chasing the extraordinary.',
   'Reykjavík', 'Iceland', ARRAY['English','Icelandic'], NULL, 'published')
ON CONFLICT (user_id) DO NOTHING;

-- Certificates → the "verified / certified organizer" badge.
INSERT INTO courses (id, slug, path, title, description, sort_order, published) VALUES
  ('c0c0c0c0-0000-4000-8000-000000000001', 'foundations', 'beginner',
   'ActivLife Certified Organizer — Foundations', 'Foundations course.', 1, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO certificates (id, profile_id, course_id, certificate_code, score, issued_at) VALUES
  ('d9c00000-0000-4000-8000-000000000001','d9d90000-0000-4000-8000-000000000001','c0c0c0c0-0000-4000-8000-000000000001','AH-DEMOALOHA01', 95, NOW() - INTERVAL '60 days'),
  ('d9c00000-0000-4000-8000-000000000002','d9d90000-0000-4000-8000-000000000002','c0c0c0c0-0000-4000-8000-000000000001','AH-DEMOTOKYO01', 90, NOW() - INTERVAL '50 days'),
  ('d9c00000-0000-4000-8000-000000000003','d9d90000-0000-4000-8000-000000000003','c0c0c0c0-0000-4000-8000-000000000001','AH-DEMOCAPE001', 93, NOW() - INTERVAL '70 days'),
  ('d9c00000-0000-4000-8000-000000000004','d9d90000-0000-4000-8000-000000000004','c0c0c0c0-0000-4000-8000-000000000001','AH-DEMOREYK001', 97, NOW() - INTERVAL '80 days')
ON CONFLICT (id) DO NOTHING;

-- ── Globally diverse demo activities (no cover photo → warm category art) ─────
INSERT INTO activities (id, organizer_id, title, description, status, category, price_cents, currency,
                        languages, min_age, max_age, city, country, indoor_outdoor, venue_id, duration_minutes) VALUES
  -- Aloha Gatherings (Honolulu) — premium & personal, golden-hour
  ('d9a00000-0000-4000-8000-000000000001','d9d90000-0000-4000-8000-000000000001','Catamaran Sunset Sail off Waikīkī','Glide past Diamond Head as the sky turns gold. A small-group sail with calm water, light bites, and the kind of view you remember for years.','published','sunset_yacht', 8900,'usd',ARRAY['English'],10,99,'Honolulu','United States','outdoor',NULL,120),
  ('d9a00000-0000-4000-8000-000000000002','d9d90000-0000-4000-8000-000000000001','Golden-Hour Beach Picnic for Two','A styled blanket setup with island fruit, fresh flowers, and a quiet stretch of sand reserved just for you and someone special.','published','luxury_picnic',12000,'usd',ARRAY['English'],18,99,'Honolulu','United States','outdoor',NULL,90),
  ('d9a00000-0000-4000-8000-000000000003','d9d90000-0000-4000-8000-000000000001','Barefoot Beach Vow Renewal','An intimate shoreline ceremony with a local officiant, a lei exchange, and your toes in the sand as the sun goes down.','published','wedding',45000,'usd',ARRAY['English'],18,99,'Honolulu','United States','outdoor',NULL,90),
  ('d9a00000-0000-4000-8000-000000000004','d9d90000-0000-4000-8000-000000000001','Tropical Garden Baby Shower','A relaxed celebration under the palms with an island grazing table, soft music, and gentle styling for the parents-to-be.','published','baby_shower',30000,'usd',ARRAY['English'],0,99,'Honolulu','United States','outdoor',NULL,180),
  ('d9a00000-0000-4000-8000-000000000005','d9d90000-0000-4000-8000-000000000001','Reef Snorkel & Underwater Photo Session','Snorkel a protected bay with a guide while an underwater photographer captures the colors and the smiles you''ll want to keep.','published','underwater_photography', 9500,'usd',ARRAY['English'],8,70,'Honolulu','United States','outdoor',NULL,150),

  -- Tokyo Circle — community & identity, mostly free/low-cost
  ('d9a00000-0000-4000-8000-000000000006','d9d90000-0000-4000-8000-000000000002','Shibuya Language Exchange Evening','A warm, low-pressure evening to swap English and Japanese over coffee. Bring curiosity; leave with new friends.','published','language_meetup', 0,'jpy',ARRAY['English','Japanese'],16,99,'Tokyo','Japan','indoor',NULL,120),
  ('d9a00000-0000-4000-8000-000000000007','d9d90000-0000-4000-8000-000000000002','Tea Ceremony for Newcomers','Learn the calm rituals of matcha in a traditional room. No experience needed — just a willingness to slow down.','published','cultural_community', 4500,'jpy',ARRAY['English','Japanese'],12,99,'Tokyo','Japan','indoor',NULL,75),
  ('d9a00000-0000-4000-8000-000000000008','d9d90000-0000-4000-8000-000000000002','Analog Photography Backstreet Walk','Wander quiet alleys with a film camera and a small group of enthusiasts. We finish over coffee and shared frames.','published','hobby_group', 3000,'jpy',ARRAY['English','Japanese'],15,99,'Tokyo','Japan','outdoor',NULL,150),
  ('d9a00000-0000-4000-8000-000000000009','d9d90000-0000-4000-8000-000000000002','Film-Score Listening Night','A cozy listening party for fans of anime and cinema soundtracks. Comfy seats, good speakers, kindred spirits.','published','fan_community', 2500,'jpy',ARRAY['English','Japanese'],16,99,'Tokyo','Japan','indoor',NULL,120),
  ('d9a00000-0000-4000-8000-000000000010','d9d90000-0000-4000-8000-000000000002','Tokyo Alumni Mixer','Reconnect with fellow graduates over izakaya bites and easy conversation. Open to alumni of any school.','published','alumni', 4000,'jpy',ARRAY['English','Japanese'],22,99,'Tokyo','Japan','indoor',NULL,150),

  -- Cape Coast Collective — adventure, community & premium
  ('d9a00000-0000-4000-8000-000000000011','d9d90000-0000-4000-8000-000000000003','Lion''s Head Full-Moon Hike','Join the regulars for the city''s favorite full-moon climb. A friendly group, a head torch, and a view worth the effort.','published','hiking_club', 0,'zar',ARRAY['English'],14,70,'Cape Town','South Africa','outdoor',NULL,180),
  ('d9a00000-0000-4000-8000-000000000012','d9d90000-0000-4000-8000-000000000003','Cape Malay Private Chef Dinner','A multi-course Cape Malay feast cooked in your space by a local chef who tells the story behind every dish.','published','private_chef', 9500,'zar',ARRAY['English'],12,99,'Cape Town','South Africa','indoor',NULL,180),
  ('d9a00000-0000-4000-8000-000000000013','d9d90000-0000-4000-8000-000000000003','Winelands Luxury Glamping Weekend','Stargazing tents among the vineyards, slow mornings, and breakfast hampers at the edge of the mountains.','published','glamping',18000,'zar',ARRAY['English'],10,99,'Stellenbosch','South Africa','outdoor',NULL,1440),
  ('d9a00000-0000-4000-8000-000000000014','d9d90000-0000-4000-8000-000000000003','Coastal Bushcraft Day','Learn fire-making, shelter, and foraging on a wild stretch of coast with a patient, experienced guide.','published','survival_camp', 6500,'zar',ARRAY['English'],16,60,'Cape Town','South Africa','outdoor',NULL,360),
  ('d9a00000-0000-4000-8000-000000000015','d9d90000-0000-4000-8000-000000000003','Rooftop Graduation Celebration','A styled rooftop gathering to mark the milestone — city views, good food, and a moment to be proud.','published','graduation',12000,'zar',ARRAY['English'],16,99,'Cape Town','South Africa','outdoor',NULL,240),
  ('d9a00000-0000-4000-8000-000000000016','d9d90000-0000-4000-8000-000000000003','Sunday Hillside Worship Gathering','An open-hearted outdoor gathering with music and reflection, welcoming anyone who''d like to share the morning.','published','faith_community', 0,'zar',ARRAY['English'],0,99,'Cape Town','South Africa','outdoor',NULL,90),

  -- Reykjavík Wild — extreme & premium
  ('d9a00000-0000-4000-8000-000000000017','d9d90000-0000-4000-8000-000000000004','Dinner Beside a Glowing Lava Field','A guided evening to a safe vantage over molten rock, with a warm meal served under a wide northern sky.','published','volcano_dinner',22000,'isk',ARRAY['English','Icelandic'],14,70,'Reykjavík','Iceland','outdoor',NULL,240),
  ('d9a00000-0000-4000-8000-000000000018','d9d90000-0000-4000-8000-000000000004','Glacier-Edge Glamping Night','A heated dome at the edge of the ice, hot drinks, and — if the sky agrees — the auroras overhead.','published','glamping',35000,'isk',ARRAY['English'],12,99,'Vík','Iceland','outdoor',NULL,720),
  ('d9a00000-0000-4000-8000-000000000019','d9d90000-0000-4000-8000-000000000004','Highlands Winter Survival Skills','A guided day learning to stay warm, navigate, and stay safe in the Icelandic wild. Real skills, real wilderness.','published','survival_camp',14000,'isk',ARRAY['English'],18,55,'Reykjavík','Iceland','outdoor',NULL,420),
  ('d9a00000-0000-4000-8000-000000000020','d9d90000-0000-4000-8000-000000000004','Northern Lights Anniversary Escape','A private aurora chase with a cozy lookout, blankets, and hot cocoa — just the two of you and the sky.','published','anniversary',19000,'isk',ARRAY['English'],18,99,'Reykjavík','Iceland','outdoor',NULL,240),
  ('d9a00000-0000-4000-8000-000000000021','d9d90000-0000-4000-8000-000000000004','Private Hot-Spring Friends Reunion','Reserve a quiet geothermal soak for your group — the easiest way to catch up after too long apart.','published','reunion', 9000,'isk',ARRAY['English','Icelandic'],16,99,'Reykjavík','Iceland','outdoor',NULL,150),

  -- Personal & family via existing demo organizers (Barcelona / Berlin)
  ('d9a00000-0000-4000-8000-000000000022','d1d1d1d1-0000-4000-8000-000000000001','Rooftop Birthday Celebration, Barcelona','A relaxed rooftop party with city views, a grazing table, and a playlist that keeps the evening going.','published','birthday', 9000,'eur',ARRAY['English','Spanish'],16,99,'Barcelona','Spain','outdoor',NULL,240),
  ('d9a00000-0000-4000-8000-000000000023','d1d1d1d1-0000-4000-8000-000000000002','Superhero Kids Party','A high-energy afternoon of capes, games, and giggles — fully hosted so the grown-ups can relax too.','published','kids_party', 4500,'eur',ARRAY['English','German'],4,10,'Berlin','Germany','indoor',NULL,120),
  ('d9a00000-0000-4000-8000-000000000024','d1d1d1d1-0000-4000-8000-000000000002','Neighbourhood Languages Café','A weekly drop-in where neighbours practice German, English, and more over cake. All levels welcome.','published','language_meetup', 0,'eur',ARRAY['English','German'],14,99,'Berlin','Germany','indoor',NULL,120)
ON CONFLICT (id) DO NOTHING;
