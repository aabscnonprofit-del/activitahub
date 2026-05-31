-- ============================================================
-- 011_reviews.sql — Phase 6: Reviews, ratings, moderation
-- Depends on: 009 (bookings), 007 (marketplace functions), 005 (is_admin)
-- ============================================================
--
-- Reviews are tied to REAL completed bookings only (one review per booking,
-- enforced by a unique constraint + the create_review guard). Ratings roll up
-- into public activity/organizer aggregates exposed through the existing
-- marketplace SECURITY DEFINER functions (extended here). Moderation states:
-- pending / approved / rejected; new reviews default to 'approved' (visible),
-- and admins can reject/re-approve via moderate_review().
-- ============================================================

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id   UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id  UUID REFERENCES activities(id) ON DELETE SET NULL,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  status       review_status NOT NULL DEFAULT 'approved',
  moderated_by UUID REFERENCES profiles(id),
  moderated_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reviews_organizer_idx ON reviews(organizer_id, status);
CREATE INDEX IF NOT EXISTS reviews_activity_idx  ON reviews(activity_id, status);
CREATE INDEX IF NOT EXISTS reviews_status_idx    ON reviews(status);

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Approved reviews are public; participants and admins see their own regardless.
DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews FOR SELECT
  USING (status = 'approved' OR auth.uid() = customer_id OR auth.uid() = organizer_id OR is_admin());
-- Writes go through create_review() / moderate_review() (SECURITY DEFINER).

-- ── Leave a review (customer, completed booking only, no duplicates) ─────────
CREATE OR REPLACE FUNCTION create_review(p_booking_id UUID, p_rating INTEGER, p_comment TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b bookings%rowtype; v_id UUID;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'Rating must be 1–5'; END IF;
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_b.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Not your booking'; END IF;
  IF v_b.status <> 'completed' THEN RAISE EXCEPTION 'You can only review a completed booking'; END IF;
  IF EXISTS (SELECT 1 FROM reviews WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'You already reviewed this booking';
  END IF;

  INSERT INTO reviews (booking_id, customer_id, organizer_id, activity_id, rating, comment, status)
  VALUES (p_booking_id, v_b.customer_id, v_b.organizer_id, v_b.activity_id, p_rating, p_comment, 'approved')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── Moderate a review (admin) ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION moderate_review(p_review_id UUID, p_status review_status)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE reviews SET status = p_status, moderated_by = auth.uid(), moderated_at = NOW(), updated_at = NOW()
  WHERE id = p_review_id;
END;
$$;

-- ── Public approved reviews for an activity / organizer ──────────────────────
CREATE OR REPLACE FUNCTION get_activity_reviews(p_activity_id UUID)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id, 'rating', r.rating, 'comment', r.comment,
    'author', split_part(COALESCE(p.full_name, 'Guest'), ' ', 1),
    'created_at', r.created_at
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  FROM reviews r JOIN profiles p ON p.id = r.customer_id
  WHERE r.activity_id = p_activity_id AND r.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION get_organizer_reviews(p_organizer_id UUID)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id, 'rating', r.rating, 'comment', r.comment,
    'author', split_part(COALESCE(p.full_name, 'Guest'), ' ', 1),
    'created_at', r.created_at
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  FROM reviews r JOIN profiles p ON p.id = r.customer_id
  WHERE r.organizer_id = p_organizer_id AND r.status = 'approved';
$$;

GRANT EXECUTE ON FUNCTION create_review(UUID, INTEGER, TEXT)     TO authenticated;
GRANT EXECUTE ON FUNCTION moderate_review(UUID, review_status)   TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_reviews(UUID)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_organizer_reviews(UUID)            TO anon, authenticated;

-- ============================================================
-- Extend marketplace reads with rating aggregates (approved reviews only)
-- ============================================================

CREATE OR REPLACE FUNCTION search_marketplace(p_filters JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(card ORDER BY card->>'title'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', a.id, 'title', a.title, 'description', a.description, 'category', a.category,
      'price_cents', a.price_cents, 'currency', a.currency, 'languages', a.languages,
      'min_age', a.min_age, 'max_age', a.max_age, 'city', a.city, 'country', a.country,
      'indoor_outdoor', a.indoor_outdoor, 'organizer_id', a.organizer_id,
      'organizer_name', op.display_name,
      'organizer_certified', EXISTS (SELECT 1 FROM certificates c WHERE c.profile_id = a.organizer_id),
      'cover_path', (SELECT vp.storage_path FROM venue_photos vp WHERE vp.venue_id = a.venue_id ORDER BY vp.sort_order LIMIT 1),
      'rating', (SELECT round(avg(r.rating), 1) FROM reviews r WHERE r.activity_id = a.id AND r.status = 'approved'),
      'review_count', (SELECT count(*) FROM reviews r WHERE r.activity_id = a.id AND r.status = 'approved')
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
            SELECT 1 FROM calendar_events ce WHERE ce.activity_id = a.id AND ce.event_type = 'session' AND ce.date = (p_filters->>'date')::date))
  ) cards;
$$;

CREATE OR REPLACE FUNCTION get_marketplace_activity(p_id UUID)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', a.id, 'title', a.title, 'description', a.description, 'category', a.category,
    'price_cents', a.price_cents, 'currency', a.currency, 'languages', a.languages,
    'min_age', a.min_age, 'max_age', a.max_age, 'city', a.city, 'country', a.country,
    'indoor_outdoor', a.indoor_outdoor, 'duration_minutes', a.duration_minutes,
    'rating', (SELECT round(avg(r.rating), 1) FROM reviews r WHERE r.activity_id = a.id AND r.status = 'approved'),
    'review_count', (SELECT count(*) FROM reviews r WHERE r.activity_id = a.id AND r.status = 'approved'),
    'organizer', jsonb_build_object(
      'id', a.organizer_id, 'name', op.display_name,
      'certified', EXISTS (SELECT 1 FROM certificates c WHERE c.profile_id = a.organizer_id)
    ),
    'venue', CASE WHEN v.id IS NULL THEN NULL ELSE jsonb_build_object(
      'name', v.name, 'city', v.city, 'country', v.country, 'indoor_outdoor', v.indoor_outdoor) END,
    'photo_paths', COALESCE((SELECT jsonb_agg(vp.storage_path ORDER BY vp.sort_order) FROM venue_photos vp WHERE vp.venue_id = a.venue_id), '[]'::jsonb),
    'upcoming', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', ce.date, 'start_time', ce.start_time) ORDER BY ce.date)
      FROM calendar_events ce WHERE ce.activity_id = a.id AND ce.event_type = 'session' AND ce.date >= CURRENT_DATE), '[]'::jsonb)
  )
  FROM activities a
  LEFT JOIN organizer_profiles op ON op.user_id = a.organizer_id
  LEFT JOIN venues v ON v.id = a.venue_id
  WHERE a.id = p_id AND a.status = 'published';
$$;

CREATE OR REPLACE FUNCTION get_public_organizer(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN op.user_id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', op.user_id, 'display_name', op.display_name, 'bio', op.bio,
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
