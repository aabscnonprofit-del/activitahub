-- 030_vendor_sourcing.sql — Vendor Sourcing MVP
-- Depends on: 008 (notifications, is_admin), 020 (rsvp_token pattern), 021 (ope_plans),
-- 029 (vendors). Turns an OPE plan resource need into a sourcing request, invites the
-- organizer's own vendor profiles, and captures a token-based quote (no vendor account,
-- exactly like RSVP). Owner-only RLS for the organizer side; the vendor responds via
-- two SECURITY DEFINER, token-gated RPCs (granted to anon). No directory, accounts,
-- payments, ratings, AI, workers, or execution monitoring here.

-- ── Notification for a received/declined vendor quote ────────────────────────
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'vendor_quote_received';

-- ── Tables ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES ope_plans(id) ON DELETE CASCADE,
  resource_label    TEXT NOT NULL,            -- e.g. "Photographer" (from the plan line)
  resource_item_key TEXT,                     -- the plan budget item_key, when sourced from a line
  spec              TEXT,                     -- the brief / what to ask for
  budget_cents      INTEGER,                  -- target budget for this need
  status            TEXT NOT NULL DEFAULT 'open',  -- open | closed
  selected_quote_id UUID,                     -- set when the organizer selects a quote
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_quotes (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_request_id  UUID NOT NULL REFERENCES vendor_requests(id) ON DELETE CASCADE,
  vendor_id          UUID REFERENCES vendors(id) ON DELETE SET NULL,  -- the invited profile (history kept if deleted)
  vendor_name        TEXT NOT NULL,           -- snapshot at invite time
  vendor_email       TEXT,                    -- snapshot
  token              TEXT NOT NULL UNIQUE DEFAULT replace(uuid_generate_v4()::text, '-', ''),  -- like rsvp_token
  price_cents        INTEGER,
  message            TEXT,
  status             TEXT NOT NULL DEFAULT 'invited',  -- invited | quoted | declined | selected
  responded_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vendor_requests_organizer_idx ON vendor_requests (organizer_id, created_at);
CREATE INDEX IF NOT EXISTS vendor_requests_plan_idx      ON vendor_requests (plan_id);
CREATE INDEX IF NOT EXISTS vendor_quotes_request_idx     ON vendor_quotes (vendor_request_id);

-- ── SECURITY DEFINER predicate helper (breaks RLS recursion; mirrors owns_request) ──
CREATE OR REPLACE FUNCTION owns_vendor_request(p_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM vendor_requests WHERE id = p_id AND organizer_id = auth.uid());
$$;

-- ── RLS — organizer owner-only (vendor side is RPC-only) ─────────────────────
ALTER TABLE vendor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_quotes   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_requests_modify" ON vendor_requests;
CREATE POLICY "vendor_requests_modify" ON vendor_requests FOR ALL
  USING (auth.uid() = organizer_id OR is_admin())
  WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "vendor_quotes_modify" ON vendor_quotes;
CREATE POLICY "vendor_quotes_modify" ON vendor_quotes FOR ALL
  USING (owns_vendor_request(vendor_request_id) OR is_admin())
  WITH CHECK (owns_vendor_request(vendor_request_id));

-- ── Vendor token response (no account; mirrors rsvp_lookup / rsvp_respond) ────
CREATE OR REPLACE FUNCTION vendor_quote_lookup(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  SELECT jsonb_build_object(
    'vendor_name',    vq.vendor_name,
    'status',         vq.status,
    'price_cents',    vq.price_cents,
    'message',        vq.message,
    'resource_label', vr.resource_label,
    'spec',           vr.spec,
    'budget_cents',   vr.budget_cents
  ) INTO v
  FROM vendor_quotes vq
  JOIN vendor_requests vr ON vr.id = vq.vendor_request_id
  WHERE vq.token = p_token;
  RETURN v; -- NULL if not found
END;
$$;

CREATE OR REPLACE FUNCTION vendor_quote_submit(
  p_token TEXT, p_price_cents INTEGER, p_message TEXT, p_decline BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_quote   vendor_quotes%rowtype;
  v_org     UUID;
  v_label   TEXT;
  v_plan    UUID;
  v_new     TEXT;
BEGIN
  SELECT * INTO v_quote FROM vendor_quotes WHERE token = p_token;
  IF v_quote.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_quote.status = 'selected' THEN RETURN jsonb_build_object('ok', false, 'error', 'locked'); END IF;

  v_new := CASE WHEN p_decline THEN 'declined' ELSE 'quoted' END;

  UPDATE vendor_quotes
     SET status = v_new,
         price_cents = CASE WHEN p_decline THEN NULL ELSE p_price_cents END,
         message = p_message,
         responded_at = NOW()
   WHERE id = v_quote.id;

  SELECT vr.organizer_id, vr.resource_label, vr.plan_id INTO v_org, v_label, v_plan
  FROM vendor_requests vr WHERE vr.id = v_quote.vendor_request_id;

  INSERT INTO notifications (profile_id, type, title, body, data)
  VALUES (v_org, 'vendor_quote_received',
    CASE WHEN p_decline THEN 'Vendor declined' ELSE 'New vendor quote' END,
    v_quote.vendor_name || ' · ' || v_label,
    jsonb_build_object('vendor_request_id', v_quote.vendor_request_id, 'vendor_quote_id', v_quote.id, 'plan_id', v_plan));

  RETURN jsonb_build_object('ok', true, 'status', v_new);
END;
$$;

GRANT EXECUTE ON FUNCTION owns_vendor_request(UUID)                       TO authenticated;
GRANT EXECUTE ON FUNCTION vendor_quote_lookup(TEXT)                       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION vendor_quote_submit(TEXT, INTEGER, TEXT, BOOLEAN) TO anon, authenticated;

COMMENT ON TABLE vendor_requests IS 'OPE plan resource need → vendor sourcing request (owner-only). Plan-linked; quotes are token-based vendor responses.';
COMMENT ON TABLE vendor_quotes IS 'Per-invited-vendor invitation + token quote (no account; like RSVP). Written by the organizer (invite/select, RLS) and the vendor (vendor_quote_submit RPC).';
