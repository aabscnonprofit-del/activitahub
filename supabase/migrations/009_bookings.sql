-- ============================================================
-- 009_bookings.sql — Phase 5: Booking engine
-- Depends on: 008 (proposals/requests/notifications), 006 (calendar_events,
--             activities, venues), 005 (is_admin)
-- ============================================================
--
-- A booking is created when a customer ACCEPTS a proposal. accept_proposal()
-- runs the whole transaction atomically as SECURITY DEFINER:
--   1. double-booking guard — refuse if the organizer already has a
--      pending/confirmed booking on that date,
--   2. create an organizer calendar_event (integrates with Phase 4 calendar),
--   3. create the booking (status 'confirmed'),
--   4. decline the request's other proposals,
--   5. mark the request 'booked' and notify everyone.
--
-- Stripe booking-payment is FOUNDATION ONLY: bookings carry amount_cents /
-- currency / stripe_payment_intent_id for a later real Checkout/PaymentIntent
-- flow. No charge is faked here.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS bookings (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organizer_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id              UUID REFERENCES activities(id) ON DELETE SET NULL,
  proposal_id              UUID REFERENCES proposals(id) ON DELETE SET NULL,
  request_id               UUID REFERENCES customer_requests(id) ON DELETE SET NULL,
  venue_id                 UUID REFERENCES venues(id) ON DELETE SET NULL,
  calendar_event_id        UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  date                     DATE NOT NULL,
  start_time               TIME,
  end_time                 TIME,
  participant_count        INTEGER,
  amount_cents             INTEGER,
  currency                 TEXT NOT NULL DEFAULT 'usd',
  status                   booking_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bookings_customer_idx  ON bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_organizer_idx ON bookings(organizer_id, date);

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_select" ON bookings;
CREATE POLICY "bookings_select" ON bookings FOR SELECT
  USING (auth.uid() = customer_id OR auth.uid() = organizer_id OR is_admin());
-- All writes happen through SECURITY DEFINER transition functions below.

-- ── Accept a proposal → create a booking ─────────────────────────────────────
CREATE OR REPLACE FUNCTION accept_proposal(p_proposal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prop     proposals%rowtype;
  v_req      customer_requests%rowtype;
  v_title    TEXT;
  v_venue    UUID;
  v_event_id UUID;
  v_booking_id UUID;
BEGIN
  SELECT * INTO v_prop FROM proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposal not found'; END IF;

  SELECT * INTO v_req FROM customer_requests WHERE id = v_prop.request_id;
  IF v_req.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Not your request'; END IF;
  IF v_req.status = 'booked' THEN RAISE EXCEPTION 'Request already booked'; END IF;
  IF v_prop.status NOT IN ('sent', 'accepted') THEN RAISE EXCEPTION 'Proposal not available'; END IF;

  -- 1. Double-booking guard: organizer must be free that date.
  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.organizer_id = v_prop.organizer_id
      AND b.date = COALESCE(v_prop.proposed_date, v_req.desired_date)
      AND b.status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'Organizer is already booked on that date';
  END IF;

  SELECT title, venue_id INTO v_title, v_venue FROM activities WHERE id = v_prop.activity_id;

  -- 2. Organizer calendar event (Phase 4 calendar integration).
  INSERT INTO calendar_events (organizer_id, title, event_type, activity_id, venue_id, date, notes)
  VALUES (v_prop.organizer_id, COALESCE('Booking — ' || v_title, 'Booked session'),
          'session', v_prop.activity_id, v_venue,
          COALESCE(v_prop.proposed_date, v_req.desired_date, CURRENT_DATE),
          'Auto-created from accepted proposal')
  RETURNING id INTO v_event_id;

  -- 3. Booking.
  INSERT INTO bookings (customer_id, organizer_id, activity_id, proposal_id, request_id,
                        venue_id, calendar_event_id, date, participant_count, amount_cents, currency, status)
  VALUES (auth.uid(), v_prop.organizer_id, v_prop.activity_id, v_prop.id, v_prop.request_id,
          v_venue, v_event_id, COALESCE(v_prop.proposed_date, v_req.desired_date, CURRENT_DATE),
          v_req.participant_count, v_prop.price_cents, v_prop.currency, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- 4. This proposal accepted; the rest declined.
  UPDATE proposals SET status = 'accepted', updated_at = NOW() WHERE id = p_proposal_id;
  UPDATE proposals SET status = 'declined', updated_at = NOW()
    WHERE request_id = v_prop.request_id AND id <> p_proposal_id AND status = 'sent';

  -- 5. Request booked + notifications.
  UPDATE customer_requests SET status = 'booked' WHERE id = v_prop.request_id;

  INSERT INTO notifications (profile_id, type, title, body, data) VALUES
    (v_prop.organizer_id, 'proposal_accepted', 'Proposal accepted',
     'A customer accepted your proposal and booked you.',
     jsonb_build_object('request_id', v_prop.request_id, 'booking_id', v_booking_id)),
    (v_prop.organizer_id, 'booking_created', 'New booking',
     'You have a new confirmed booking.', jsonb_build_object('booking_id', v_booking_id));

  INSERT INTO notifications (profile_id, type, title, body, data)
  SELECT pr.organizer_id, 'proposal_declined', 'Proposal declined',
         'Another organizer was selected for this request.',
         jsonb_build_object('request_id', v_prop.request_id)
  FROM proposals pr
  WHERE pr.request_id = v_prop.request_id AND pr.id <> p_proposal_id AND pr.status = 'declined';

  RETURN jsonb_build_object('booking_id', v_booking_id, 'calendar_event_id', v_event_id);
END;
$$;

-- ── Lifecycle transitions ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b bookings%rowtype; v_other UUID;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF auth.uid() NOT IN (v_b.customer_id, v_b.organizer_id) THEN RAISE EXCEPTION 'Not your booking'; END IF;
  IF v_b.status NOT IN ('pending', 'confirmed') THEN RAISE EXCEPTION 'Cannot cancel this booking'; END IF;

  UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = p_booking_id;
  -- Free the organizer's calendar slot.
  IF v_b.calendar_event_id IS NOT NULL THEN
    DELETE FROM calendar_events WHERE id = v_b.calendar_event_id;
  END IF;

  v_other := CASE WHEN auth.uid() = v_b.customer_id THEN v_b.organizer_id ELSE v_b.customer_id END;
  INSERT INTO notifications (profile_id, type, title, body, data)
  VALUES (v_other, 'booking_cancelled', 'Booking cancelled',
          'A booking was cancelled.', jsonb_build_object('booking_id', p_booking_id));
END;
$$;

CREATE OR REPLACE FUNCTION complete_booking(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b bookings%rowtype;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF auth.uid() <> v_b.organizer_id AND NOT is_admin() THEN RAISE EXCEPTION 'Only the organizer can complete'; END IF;
  IF v_b.status <> 'confirmed' THEN RAISE EXCEPTION 'Only confirmed bookings can be completed'; END IF;

  UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = p_booking_id;
  INSERT INTO notifications (profile_id, type, title, body, data)
  VALUES (v_b.customer_id, 'booking_completed', 'Booking completed',
          'Your activity has been marked completed.', jsonb_build_object('booking_id', p_booking_id));
END;
$$;

CREATE OR REPLACE FUNCTION refund_booking(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b bookings%rowtype;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF auth.uid() <> v_b.organizer_id AND NOT is_admin() THEN RAISE EXCEPTION 'Only the organizer can refund'; END IF;
  IF v_b.status NOT IN ('cancelled', 'confirmed') THEN RAISE EXCEPTION 'Cannot refund this booking'; END IF;
  -- NOTE: the actual Stripe refund is wired in a later phase; status only here.
  UPDATE bookings SET status = 'refunded', updated_at = NOW() WHERE id = p_booking_id;
  INSERT INTO notifications (profile_id, type, title, body, data)
  VALUES (v_b.customer_id, 'booking_cancelled', 'Booking refunded',
          'Your booking was refunded.', jsonb_build_object('booking_id', p_booking_id));
END;
$$;

GRANT EXECUTE ON FUNCTION accept_proposal(UUID)   TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION complete_booking(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION refund_booking(UUID)    TO authenticated;

COMMENT ON TABLE bookings IS 'Confirmed engagements. Created by accept_proposal(); transitions via cancel/complete/refund functions. Payment fields are a Stripe foundation for a later phase.';
