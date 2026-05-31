-- ============================================================
-- 012_booking_payments.sql — Phase 6: Booking payments + refunds
-- Depends on: 009 (bookings), 008 (notifications), 005 (is_admin)
-- ============================================================
--
-- Adds real payment lifecycle to bookings (Stripe Checkout/PaymentIntent —
-- wired in the app, NOT faked) plus a refund-request lifecycle:
--   bookings.payment_status: unpaid → processing → paid → refunded (/ failed)
--   refund_requests:         requested → refunded | rejected
--
-- All state writes are SECURITY DEFINER functions; the real Stripe calls happen
-- in Server Actions / the webhook. The webhook (service role) flips a booking to
-- 'paid' on checkout.session.completed; finalize_refund() flips it to 'refunded'
-- after stripe.refunds.create succeeds.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE booking_payment_status AS ENUM ('unpaid', 'processing', 'paid', 'refunded', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('requested', 'approved', 'rejected', 'refunded', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status booking_payment_status NOT NULL DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

CREATE TABLE IF NOT EXISTS refund_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requested_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason           TEXT,
  status           refund_status NOT NULL DEFAULT 'requested',
  stripe_refund_id TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refund_requests_booking_idx ON refund_requests(booking_id);

DROP TRIGGER IF EXISTS refund_requests_updated_at ON refund_requests;
CREATE TRIGGER refund_requests_updated_at BEFORE UPDATE ON refund_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "refund_requests_select" ON refund_requests;
CREATE POLICY "refund_requests_select" ON refund_requests FOR SELECT
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = refund_requests.booking_id
               AND (b.customer_id = auth.uid() OR b.organizer_id = auth.uid()))
  );
-- Writes via functions below.

-- ── Mark a booking's payment as processing (customer started Checkout) ───────
CREATE OR REPLACE FUNCTION start_booking_payment(p_booking_id UUID, p_session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b bookings%rowtype;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_b.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Not your booking'; END IF;
  IF v_b.payment_status = 'paid' THEN RAISE EXCEPTION 'Already paid'; END IF;
  IF v_b.status NOT IN ('pending', 'confirmed') THEN RAISE EXCEPTION 'Booking not payable'; END IF;
  UPDATE bookings SET payment_status = 'processing', stripe_checkout_session_id = p_session_id, updated_at = NOW()
  WHERE id = p_booking_id;
END;
$$;

-- ── Request a refund (customer or organizer, on a paid booking) ──────────────
CREATE OR REPLACE FUNCTION request_refund(p_booking_id UUID, p_reason TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b bookings%rowtype; v_id UUID; v_notify UUID;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF auth.uid() NOT IN (v_b.customer_id, v_b.organizer_id) THEN RAISE EXCEPTION 'Not your booking'; END IF;
  IF v_b.payment_status <> 'paid' THEN RAISE EXCEPTION 'Only paid bookings can be refunded'; END IF;
  IF EXISTS (SELECT 1 FROM refund_requests WHERE booking_id = p_booking_id AND status IN ('requested', 'approved')) THEN
    RAISE EXCEPTION 'A refund is already in progress';
  END IF;

  INSERT INTO refund_requests (booking_id, requested_by, reason, status)
  VALUES (p_booking_id, auth.uid(), p_reason, 'requested')
  RETURNING id INTO v_id;

  v_notify := CASE WHEN auth.uid() = v_b.customer_id THEN v_b.organizer_id ELSE v_b.customer_id END;
  INSERT INTO notifications (profile_id, type, title, body, data)
  VALUES (v_notify, 'booking_cancelled', 'Refund requested',
          'A refund was requested for a booking.', jsonb_build_object('booking_id', p_booking_id));
  RETURN v_id;
END;
$$;

-- ── Finalize a refund AFTER stripe.refunds.create succeeds (organizer/admin) ─
CREATE OR REPLACE FUNCTION finalize_refund(p_refund_id UUID, p_stripe_refund_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_r refund_requests%rowtype; v_b bookings%rowtype;
BEGIN
  SELECT * INTO v_r FROM refund_requests WHERE id = p_refund_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund request not found'; END IF;
  SELECT * INTO v_b FROM bookings WHERE id = v_r.booking_id;
  IF auth.uid() <> v_b.organizer_id AND NOT is_admin() THEN RAISE EXCEPTION 'Only the organizer or an admin can refund'; END IF;

  UPDATE refund_requests SET status = 'refunded', stripe_refund_id = p_stripe_refund_id, updated_at = NOW()
  WHERE id = p_refund_id;
  UPDATE bookings SET payment_status = 'refunded', status = 'refunded', updated_at = NOW()
  WHERE id = v_r.booking_id;
  IF v_b.calendar_event_id IS NOT NULL THEN
    DELETE FROM calendar_events WHERE id = v_b.calendar_event_id;
  END IF;

  INSERT INTO notifications (profile_id, type, title, body, data)
  VALUES (v_b.customer_id, 'booking_cancelled', 'Refund processed',
          'Your booking has been refunded.', jsonb_build_object('booking_id', v_r.booking_id));
END;
$$;

-- ── Reject a refund request (organizer/admin) ────────────────────────────────
CREATE OR REPLACE FUNCTION reject_refund(p_refund_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_r refund_requests%rowtype; v_b bookings%rowtype;
BEGIN
  SELECT * INTO v_r FROM refund_requests WHERE id = p_refund_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund request not found'; END IF;
  SELECT * INTO v_b FROM bookings WHERE id = v_r.booking_id;
  IF auth.uid() <> v_b.organizer_id AND NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE refund_requests SET status = 'rejected', updated_at = NOW() WHERE id = p_refund_id;
  INSERT INTO notifications (profile_id, type, title, body, data)
  VALUES (v_r.requested_by, 'booking_cancelled', 'Refund declined',
          'Your refund request was declined.', jsonb_build_object('booking_id', v_r.booking_id));
END;
$$;

GRANT EXECUTE ON FUNCTION start_booking_payment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION request_refund(UUID, TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_refund(UUID, TEXT)       TO authenticated;
GRANT EXECUTE ON FUNCTION reject_refund(UUID)               TO authenticated;

COMMENT ON TABLE refund_requests IS 'Refund lifecycle. finalize_refund() runs after the real stripe.refunds.create() call in the app.';
