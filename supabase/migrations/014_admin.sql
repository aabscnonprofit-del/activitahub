-- ============================================================
-- 014_admin.sql — Phase 6: Admin moderation
-- Depends on: 001 (profiles.suspended), 005 (is_admin)
-- ============================================================
--
-- Admins read across the platform through the existing is_admin() RLS branches
-- (profiles/reviews/bookings/refund_requests/etc.). The only new privileged
-- WRITE not already covered by a function is suspending an organizer; review
-- moderation uses moderate_review() (011) and refunds use the 012 functions.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_set_suspended(p_user_id UUID, p_suspended BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE profiles SET suspended = p_suspended, updated_at = NOW() WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_suspended(UUID, BOOLEAN) TO authenticated;
