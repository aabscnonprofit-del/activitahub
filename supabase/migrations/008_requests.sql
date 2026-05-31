-- ============================================================
-- 008_requests.sql — Phase 5: Notifications, requests, matching, proposals
-- Depends on: 006 (activities/profiles), 002 (subscriptions), 005 (is_admin)
-- ============================================================
--
-- The customer→organizer demand side:
--   notifications      — in-app notification foundation (read/unread)
--   customer_requests  — a customer's brief
--   request_matches    — organizers the matching engine distributed a request to
--   proposals          — organizer offers against a request
--
-- Matching, proposal sending, and all cross-user notification writes run inside
-- SECURITY DEFINER functions. RLS uses SECURITY DEFINER predicate helpers
-- (owns_request / is_matched_organizer) to express cross-table visibility
-- WITHOUT mutually-recursive policies.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('open', 'matched', 'booked', 'closed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('sent', 'accepted', 'declined', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'request_match', 'proposal_received', 'proposal_accepted', 'proposal_declined',
    'booking_created', 'booking_confirmed', 'booking_cancelled', 'booking_completed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Tables ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_profile_idx ON notifications(profile_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type        activity_category NOT NULL,
  city              TEXT,
  country           TEXT,
  desired_date      DATE,
  participant_count INTEGER,
  age_min           INTEGER,
  age_max           INTEGER,
  budget_cents      INTEGER,
  currency          TEXT NOT NULL DEFAULT 'usd',
  notes             TEXT,
  status            request_status NOT NULL DEFAULT 'open',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customer_requests_customer_idx ON customer_requests(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS request_matches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id   UUID NOT NULL REFERENCES customer_requests(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, organizer_id)
);
CREATE INDEX IF NOT EXISTS request_matches_organizer_idx ON request_matches(organizer_id);

CREATE TABLE IF NOT EXISTS proposals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id    UUID NOT NULL REFERENCES customer_requests(id) ON DELETE CASCADE,
  organizer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id   UUID REFERENCES activities(id) ON DELETE SET NULL,
  message       TEXT,
  price_cents   INTEGER,
  currency      TEXT NOT NULL DEFAULT 'usd',
  proposed_date DATE,
  status        proposal_status NOT NULL DEFAULT 'sent',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, organizer_id)
);
CREATE INDEX IF NOT EXISTS proposals_request_idx   ON proposals(request_id);
CREATE INDEX IF NOT EXISTS proposals_organizer_idx ON proposals(organizer_id);

DROP TRIGGER IF EXISTS customer_requests_updated_at ON customer_requests;
CREATE TRIGGER customer_requests_updated_at BEFORE UPDATE ON customer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS proposals_updated_at ON proposals;
CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── SECURITY DEFINER predicate helpers (break RLS recursion) ─────────────────
CREATE OR REPLACE FUNCTION owns_request(p_request_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM customer_requests WHERE id = p_request_id AND customer_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_matched_organizer(p_request_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM request_matches WHERE request_id = p_request_id AND organizer_id = auth.uid());
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_matches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (auth.uid() = profile_id);
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "customer_requests_select" ON customer_requests;
CREATE POLICY "customer_requests_select" ON customer_requests FOR SELECT
  USING (auth.uid() = customer_id OR is_admin() OR is_matched_organizer(id));
DROP POLICY IF EXISTS "customer_requests_insert_own" ON customer_requests;
CREATE POLICY "customer_requests_insert_own" ON customer_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "customer_requests_update_own" ON customer_requests;
CREATE POLICY "customer_requests_update_own" ON customer_requests FOR UPDATE
  USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "request_matches_select" ON request_matches;
CREATE POLICY "request_matches_select" ON request_matches FOR SELECT
  USING (auth.uid() = organizer_id OR is_admin() OR owns_request(request_id));

DROP POLICY IF EXISTS "proposals_select" ON proposals;
CREATE POLICY "proposals_select" ON proposals FOR SELECT
  USING (auth.uid() = organizer_id OR is_admin() OR owns_request(request_id));
-- Writes go through send_proposal / decline_proposal / accept_proposal.

-- ── Matching engine ──────────────────────────────────────────────────────────
-- Distributes a request to eligible organizers and notifies them.
-- Eligibility: certified_organizer, not suspended, ACTIVE subscription,
-- geography match (a published activity in the request's city/country),
-- activity-type match (a published activity of the requested category), and
-- workload under cap (fewer than 10 outstanding 'sent' proposals).
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
    SELECT DISTINCT p.id
    FROM profiles p
    JOIN subscriptions s ON s.profile_id = p.id AND s.status = 'active'
    WHERE p.role = 'certified_organizer'
      AND p.suspended = FALSE
      AND EXISTS (
        SELECT 1 FROM activities a
        WHERE a.organizer_id = p.id
          AND a.status = 'published'
          AND a.category = v_req.event_type
          AND (
            v_req.city IS NULL OR a.city ILIKE '%' || v_req.city || '%'
            OR (v_req.country IS NOT NULL AND a.country ILIKE '%' || v_req.country || '%')
          )
      )
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

-- ── Send / update a proposal (organizer) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION send_proposal(
  p_request_id UUID, p_activity_id UUID, p_message TEXT,
  p_price_cents INTEGER, p_proposed_date DATE
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_customer   UUID;
  v_status     request_status;
  v_proposal_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM request_matches WHERE request_id = p_request_id AND organizer_id = v_uid) THEN
    RAISE EXCEPTION 'Not matched to this request';
  END IF;
  SELECT customer_id, status INTO v_customer, v_status FROM customer_requests WHERE id = p_request_id;
  IF v_status NOT IN ('open', 'matched') THEN RAISE EXCEPTION 'Request is closed'; END IF;

  INSERT INTO proposals (request_id, organizer_id, activity_id, message, price_cents, proposed_date, status)
  VALUES (p_request_id, v_uid, p_activity_id, p_message, p_price_cents, p_proposed_date, 'sent')
  ON CONFLICT (request_id, organizer_id)
  DO UPDATE SET activity_id = EXCLUDED.activity_id, message = EXCLUDED.message,
                price_cents = EXCLUDED.price_cents, proposed_date = EXCLUDED.proposed_date,
                status = 'sent', updated_at = NOW()
  RETURNING id INTO v_proposal_id;

  INSERT INTO notifications (profile_id, type, title, body, data)
  VALUES (v_customer, 'proposal_received', 'New proposal received',
    'An organizer sent you a proposal.', jsonb_build_object('request_id', p_request_id, 'proposal_id', v_proposal_id));

  RETURN v_proposal_id;
END;
$$;

-- ── Decline a proposal (customer) ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decline_proposal(p_proposal_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org UUID; v_req UUID;
BEGIN
  SELECT organizer_id, request_id INTO v_org, v_req FROM proposals WHERE id = p_proposal_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Proposal not found'; END IF;
  IF NOT owns_request(v_req) THEN RAISE EXCEPTION 'Not your request'; END IF;

  UPDATE proposals SET status = 'declined', updated_at = NOW() WHERE id = p_proposal_id;
  INSERT INTO notifications (profile_id, type, title, body, data)
  VALUES (v_org, 'proposal_declined', 'Proposal declined',
    'A customer declined your proposal.', jsonb_build_object('request_id', v_req, 'proposal_id', p_proposal_id));
END;
$$;

GRANT EXECUTE ON FUNCTION match_request(UUID)                         TO authenticated;
GRANT EXECUTE ON FUNCTION send_proposal(UUID, UUID, TEXT, INTEGER, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_proposal(UUID)                      TO authenticated;

COMMENT ON TABLE customer_requests IS 'A customer brief. Distributed to organizers by match_request().';
COMMENT ON TABLE notifications IS 'In-app notifications. Written only by SECURITY DEFINER flows; users read/mark-read their own.';
