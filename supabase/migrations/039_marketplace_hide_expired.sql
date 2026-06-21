-- ============================================================
-- 039_marketplace_hide_expired.sql — hide expired activities from the catalogue
-- ============================================================
-- Bug: published activities with no FUTURE session stayed in the marketplace and
-- search (search_marketplace filtered on status='published' only). A "published"
-- activity is only genuinely available if it still has at least one upcoming
-- session.
--
-- Fix: CREATE OR REPLACE search_marketplace adding ONE predicate — an EXISTS over
-- calendar_events for a session dated today or later. Reuses the exact rule the
-- detail RPC already uses for `upcoming` (date >= CURRENT_DATE). Activities with no
-- sessions at all are also excluded (nothing to attend → not listed/searchable).
--
-- Marketplace AND search share this one RPC, so this single change fixes both.
-- Idempotent (CREATE OR REPLACE). Detail RPC (get_marketplace_activity) is NOT
-- changed: direct activity URLs must remain accessible (marked expired in the UI).
--
-- Scope: additive predicate only. No OPE, no requests/events, no booking changes.
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
      -- Expired/never-scheduled activities are hidden: require at least one future session.
      AND EXISTS (
            SELECT 1 FROM calendar_events ce
            WHERE ce.activity_id = a.id
              AND ce.event_type = 'session'
              AND ce.date >= CURRENT_DATE)
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

COMMENT ON FUNCTION search_marketplace(JSONB) IS
  'Public catalogue search. Returns PUBLISHED activities that still have at least one future session (calendar_events.event_type=session AND date >= CURRENT_DATE); expired/never-scheduled activities are excluded. Curated organizer fields only.';
