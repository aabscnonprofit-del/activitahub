-- ============================================================
-- 040_consume_event_license.sql — consume one One Event License
-- ============================================================
-- Entitlement enforcement for the Activity Planner ($9.99). event_licenses is
-- owner-SELECT-only (038): the owner cannot write it, so consumption must run
-- through a SECURITY DEFINER function. This RPC atomically takes ONE active
-- license for the calling user and marks it consumed.
--
-- Decisions wired here:
--   * one license = one successful plan generation (caller invokes only on plan_ready)
--   * consumed → status='consumed', consumed_at=now()
--   * NO plan/request/activity link yet — activity_id stays NULL (planner output is
--     not persisted)
--
-- Atomicity: FOR UPDATE SKIP LOCKED + LIMIT 1 prevents two concurrent generations
-- from consuming the same row. Returns the consumed license id, or NULL when the
-- user is unauthenticated or has no active license (caller treats NULL as
-- "event_license_required" and does not deliver the plan).
--
-- Scope: additive function only. No Stripe checkout/webhook change, no table change,
-- no subscription/certification/Connect change.
-- ============================================================

CREATE OR REPLACE FUNCTION consume_event_license()
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id  UUID;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  -- Take the oldest active license for this user; skip rows locked by a concurrent
  -- consume so two generations never burn the same license.
  SELECT id INTO v_id
  FROM event_licenses
  WHERE profile_id = v_uid AND status = 'active'
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_id IS NULL THEN RETURN NULL; END IF;

  UPDATE event_licenses
    SET status = 'consumed', consumed_at = NOW(), updated_at = NOW()
    WHERE id = v_id;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION consume_event_license() TO authenticated;
