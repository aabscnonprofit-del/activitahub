-- ============================================================
-- 013_analytics_email.sql — Phase 6: Analytics + email foundation
-- Depends on: bookings/proposals/requests/reviews/subscriptions, is_admin
-- ============================================================
--
-- Real, query-backed analytics exposed via SECURITY DEFINER functions
-- (organizer-scoped or admin-only), plus an email-notification FOUNDATION:
-- every in-app notification is mirrored into an email queue (status 'queued')
-- by a trigger. A future provider worker reads queued rows, renders the
-- template (= notification type) with the payload, sends, and marks 'sent'.
-- No SMTP is wired here — this is provider-ready storage only.
-- ============================================================

-- ── Email queue ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE email_status AS ENUM ('queued', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS email_notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_email   TEXT,
  template   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  status     email_status NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS email_notifications_status_idx ON email_notifications(status, created_at);

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_notifications_select" ON email_notifications;
CREATE POLICY "email_notifications_select" ON email_notifications FOR SELECT
  USING (auth.uid() = profile_id OR is_admin());

-- Mirror every in-app notification into the email queue.
CREATE OR REPLACE FUNCTION enqueue_email_for_notification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO email_notifications (profile_id, to_email, template, subject, payload, status)
  VALUES (NEW.profile_id, (SELECT email FROM profiles WHERE id = NEW.profile_id),
          NEW.type::text, NEW.title, NEW.data, 'queued');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_enqueue_email ON notifications;
CREATE TRIGGER notifications_enqueue_email AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION enqueue_email_for_notification();

-- ── Organizer analytics (organizer-scoped or admin) ─────────────────────────
CREATE OR REPLACE FUNCTION organizer_analytics(p_organizer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() <> p_organizer_id AND NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN jsonb_build_object(
    'total_bookings',     (SELECT count(*) FROM bookings WHERE organizer_id = p_organizer_id),
    'completed_bookings', (SELECT count(*) FROM bookings WHERE organizer_id = p_organizer_id AND status = 'completed'),
    'completion_rate',    (SELECT CASE WHEN count(*) = 0 THEN 0
                             ELSE round(100.0 * count(*) FILTER (WHERE status = 'completed') / count(*)) END
                           FROM bookings WHERE organizer_id = p_organizer_id),
    'revenue_cents',      (SELECT COALESCE(sum(amount_cents), 0) FROM bookings WHERE organizer_id = p_organizer_id AND payment_status = 'paid'),
    'proposals_sent',     (SELECT count(*) FROM proposals WHERE organizer_id = p_organizer_id),
    'proposals_accepted', (SELECT count(*) FROM proposals WHERE organizer_id = p_organizer_id AND status = 'accepted'),
    'proposal_conversion',(SELECT CASE WHEN count(*) = 0 THEN 0
                             ELSE round(100.0 * count(*) FILTER (WHERE status = 'accepted') / count(*)) END
                           FROM proposals WHERE organizer_id = p_organizer_id),
    'repeat_customers',   (SELECT count(*) FROM (SELECT customer_id FROM bookings WHERE organizer_id = p_organizer_id GROUP BY customer_id HAVING count(*) > 1) s),
    'avg_rating',         (SELECT round(avg(rating), 1) FROM reviews WHERE organizer_id = p_organizer_id AND status = 'approved'),
    'revenue_by_month',   COALESCE((SELECT jsonb_agg(jsonb_build_object('month', to_char(m, 'Mon'), 'revenue_cents', rev) ORDER BY m)
                            FROM (SELECT date_trunc('month', b.date)::date AS m, COALESCE(sum(b.amount_cents), 0) AS rev
                                  FROM bookings b WHERE b.organizer_id = p_organizer_id AND b.payment_status = 'paid'
                                    AND b.date >= (CURRENT_DATE - INTERVAL '6 months') GROUP BY 1) t), '[]'::jsonb),
    'activity_popularity',COALESCE((SELECT jsonb_agg(jsonb_build_object('title', a.title, 'bookings', cnt) ORDER BY cnt DESC)
                            FROM (SELECT activity_id, count(*) cnt FROM bookings WHERE organizer_id = p_organizer_id AND activity_id IS NOT NULL GROUP BY activity_id) bc
                            JOIN activities a ON a.id = bc.activity_id), '[]'::jsonb)
  );
END;
$$;

-- ── Platform analytics (admin only) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION platform_analytics()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN jsonb_build_object(
    'gmv_cents',          (SELECT COALESCE(sum(amount_cents), 0) FROM bookings WHERE payment_status = 'paid'),
    'active_organizers',  (SELECT count(*) FROM profiles p JOIN subscriptions s ON s.profile_id = p.id AND s.status = 'active' WHERE p.role = 'certified_organizer'),
    'active_customers',   (SELECT count(DISTINCT customer_id) FROM bookings),
    'total_requests',     (SELECT count(*) FROM customer_requests),
    'total_bookings',     (SELECT count(*) FROM bookings),
    'marketplace_conversion', (SELECT CASE WHEN (SELECT count(*) FROM customer_requests) = 0 THEN 0
                                 ELSE round(100.0 * (SELECT count(*) FROM bookings) / (SELECT count(*) FROM customer_requests)) END),
    'top_categories',     COALESCE((SELECT jsonb_agg(jsonb_build_object('category', category, 'count', cnt) ORDER BY cnt DESC)
                            FROM (SELECT category, count(*) cnt FROM activities WHERE status = 'published' AND category IS NOT NULL GROUP BY category) c), '[]'::jsonb),
    'bookings_by_month',  COALESCE((SELECT jsonb_agg(jsonb_build_object('month', to_char(m, 'Mon'), 'count', cnt) ORDER BY m)
                            FROM (SELECT date_trunc('month', created_at)::date m, count(*) cnt FROM bookings WHERE created_at >= (CURRENT_DATE - INTERVAL '6 months') GROUP BY 1) t), '[]'::jsonb),
    'total_reviews',      (SELECT count(*) FROM reviews WHERE status = 'approved'),
    'pending_reviews',    (SELECT count(*) FROM reviews WHERE status = 'pending')
  );
END;
$$;

-- ── Customer history / lifetime value (own data) ─────────────────────────────
CREATE OR REPLACE FUNCTION customer_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v UUID := auth.uid();
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN jsonb_build_object(
    'total_bookings',    (SELECT count(*) FROM bookings WHERE customer_id = v),
    'completed',         (SELECT count(*) FROM bookings WHERE customer_id = v AND status = 'completed'),
    'total_spent_cents', (SELECT COALESCE(sum(amount_cents), 0) FROM bookings WHERE customer_id = v AND payment_status = 'paid'),
    'organizers',        (SELECT count(DISTINCT organizer_id) FROM bookings WHERE customer_id = v),
    'repeat_organizers', (SELECT count(*) FROM (SELECT organizer_id FROM bookings WHERE customer_id = v GROUP BY organizer_id HAVING count(*) > 1) s)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION organizer_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION platform_analytics()      TO authenticated;
GRANT EXECUTE ON FUNCTION customer_stats()          TO authenticated;

COMMENT ON TABLE email_notifications IS 'Email queue foundation. Auto-populated from notifications; a future provider worker sends queued rows.';
