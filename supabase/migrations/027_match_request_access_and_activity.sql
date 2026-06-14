-- 027_match_request_access_and_activity.sql
-- Forward migration — CREATE OR REPLACE of match_request() only. Does NOT edit 008.
-- Depends on: 008 (customer_requests, request_matches, proposals, notifications,
-- match_request), 017 (profiles.organizer_access_until).
--
-- Event Request Market V1 — BROAD matching (product decision). Organizer supply is
-- small, so a customer request is offered to every organizer who is eligible to
-- operate, regardless of listings, experience, category, or geography. A newly
-- trained organizer with no published activities must still receive first requests;
-- OPE then helps them build the plan once the request arrives.
--
-- Eligibility (the ONLY gates):
--   * profiles.role = 'certified_organizer'
--   * profiles.suspended = false
--   * valid organizer access: active/trialing subscription OR organizer_access_until > now()
--   * workload cap (fewer than WORKLOAD_CAP outstanding 'sent' proposals)
--
-- Explicitly NOT required: published activity, prior experience, category match,
-- city/country match. (Targeting returns later with a real capability/verification
-- system — see EVENT_REQUEST_MARKET_ARCHITECTURE; those signals do not exist yet.)
--
-- Everything else is preserved verbatim from 008: signature, SECURITY DEFINER,
-- owner/request checks, the request_matches insert (ON CONFLICT DO NOTHING), the
-- notification, the status='matched' bump, and the return value.

CREATE OR REPLACE FUNCTION match_request(p_request_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req       customer_requests%rowtype;
  v_matched   INTEGER := 0;
  v_org       UUID;
  WORKLOAD_CAP CONSTANT INTEGER := 10;
BEGIN
  SELECT * INTO v_req FROM customer_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  -- Only the owner may trigger matching for their request.
  IF v_req.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Not your request'; END IF;

  FOR v_org IN
    SELECT p.id
    FROM profiles p
    WHERE p.role = 'certified_organizer'
      AND p.suspended = FALSE
      -- Valid organizer access: active/trialing subscription OR live included window.
      AND (
        EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.profile_id = p.id AND s.status::text IN ('active', 'trialing')
        )
        OR p.organizer_access_until > now()
      )
      -- Workload cap only — no activity/experience/category/geography requirement (V1 broad).
      AND (
        SELECT count(*) FROM proposals pr
        WHERE pr.organizer_id = p.id AND pr.status = 'sent'
      ) < WORKLOAD_CAP
  LOOP
    INSERT INTO request_matches (request_id, organizer_id)
    VALUES (p_request_id, v_org)
    ON CONFLICT (request_id, organizer_id) DO NOTHING;

    IF FOUND THEN
      v_matched := v_matched + 1;
      INSERT INTO notifications (profile_id, type, title, body, data)
      VALUES (v_org, 'request_match', 'New request matched',
        'A customer is looking for ' || v_req.event_type::text || COALESCE(' in ' || v_req.city, '') || '.',
        jsonb_build_object('request_id', p_request_id));
    END IF;
  END LOOP;

  IF v_matched > 0 AND v_req.status = 'open' THEN
    UPDATE customer_requests SET status = 'matched' WHERE id = p_request_id;
  END IF;

  RETURN v_matched;
END;
$$;

GRANT EXECUTE ON FUNCTION match_request(UUID) TO authenticated;
