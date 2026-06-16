-- 028_messaging.sql — Messaging MVP (membership model)
-- Depends on: 008 (profiles, customer_requests, request_matches, notifications,
-- owns_request, is_matched_organizer, is_admin), 001 (profiles).
--
-- Two parties talk through a `conversation` identified by its `conversation_members`
-- (profile pairs), with an OPTIONAL context. `Request` is just one context_type, NOT
-- the key — so the same tables later support Organizer↔Organizer (no context) and
-- Organizer↔Participant-with-profile (context_type='activity') with NO migration.
-- MVP authorizes only context_type='request' in start_or_get_conversation.
--
-- Writes go through SECURITY DEFINER RPCs (mirroring send_proposal); RLS exposes
-- SELECT only. Recursion on conversation_members RLS is broken by the SECURITY
-- DEFINER helper is_conversation_member (same pattern as owns_request).
--
-- NOTE: the enum value is added first; the RPC only references it at runtime, so
-- function creation does not depend on the value being committed.

-- ── Notification type for a received message ─────────────────────────────────
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_received';

-- ── Tables ───────────────────────────────────────────────────────────────────
-- context_id is INTENTIONALLY NOT a foreign key: context is polymorphic
-- (context_type may be 'request' today, later 'activity', or NULL/contextless), and a
-- single column cannot FK-reference different tables. Consequence: deleting the
-- referenced row (e.g. a customer_requests row) does NOT cascade to the conversation
-- or its messages — the thread remains, with context_id pointing at a now-missing row
-- (an orphaned context pointer). This preserves history but means hard-delete cleanup
-- is DEFERRED: if physical deletes of requests/activities are ever introduced, orphaned
-- conversations must be cleaned up separately (e.g. a dedicated delete flow or job),
-- NOT via FK cascade here. (Today requests are cancelled by status, not hard-deleted.)
CREATE TABLE IF NOT EXISTS conversations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  context_type TEXT,                         -- 'request' (MVP); extensible, NULL = contextless
  context_id   UUID,                         -- e.g. customer_requests.id when context_type='request' (NOT a FK — see note above)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ,               -- drives unread
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, profile_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversation_members_profile_idx ON conversation_members (profile_id);
CREATE INDEX IF NOT EXISTS messages_conversation_idx        ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS conversations_context_idx        ON conversations (context_type, context_id);

-- ── SECURITY DEFINER predicate helper (breaks RLS recursion) ─────────────────
CREATE OR REPLACE FUNCTION is_conversation_member(p_conversation_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id AND profile_id = auth.uid()
  );
$$;

-- ── RLS (SELECT only — writes go through the RPCs below) ──────────────────────
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT
  USING (is_conversation_member(id) OR is_admin());

DROP POLICY IF EXISTS "conversation_members_select" ON conversation_members;
CREATE POLICY "conversation_members_select" ON conversation_members FOR SELECT
  USING (is_conversation_member(conversation_id) OR is_admin());

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (is_conversation_member(conversation_id) OR is_admin());

-- ── Start or fetch a 1:1 conversation (MVP: request context only) ────────────
CREATE OR REPLACE FUNCTION start_or_get_conversation(
  p_other_profile_id UUID, p_context_type TEXT, p_context_id UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_customer UUID;
  v_conv     UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_other_profile_id = v_uid THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;

  -- MVP authorizes only the request context: the pair must be {request owner, matched organizer}.
  IF p_context_type IS DISTINCT FROM 'request' THEN
    RAISE EXCEPTION 'Unsupported conversation context';
  END IF;

  SELECT customer_id INTO v_customer FROM customer_requests WHERE id = p_context_id;
  IF v_customer IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;

  IF NOT (
    (v_uid = v_customer
       AND EXISTS (SELECT 1 FROM request_matches WHERE request_id = p_context_id AND organizer_id = p_other_profile_id))
    OR
    (p_other_profile_id = v_customer
       AND EXISTS (SELECT 1 FROM request_matches WHERE request_id = p_context_id AND organizer_id = v_uid))
  ) THEN
    RAISE EXCEPTION 'Not a participant of this request';
  END IF;

  -- Dedup: reuse the existing thread for this context with exactly these two members.
  SELECT c.id INTO v_conv
  FROM conversations c
  WHERE c.context_type = p_context_type AND c.context_id = p_context_id
    AND EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id AND m.profile_id = v_uid)
    AND EXISTS (SELECT 1 FROM conversation_members m WHERE m.conversation_id = c.id AND m.profile_id = p_other_profile_id)
  LIMIT 1;

  IF v_conv IS NOT NULL THEN RETURN v_conv; END IF;

  INSERT INTO conversations (context_type, context_id) VALUES (p_context_type, p_context_id) RETURNING id INTO v_conv;
  INSERT INTO conversation_members (conversation_id, profile_id) VALUES (v_conv, v_uid), (v_conv, p_other_profile_id);
  RETURN v_conv;
END;
$$;

-- ── Send a message (any member) + notify the other party ─────────────────────
CREATE OR REPLACE FUNCTION send_message(p_conversation_id UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_msg UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_body IS NULL OR length(btrim(p_body)) = 0 THEN RAISE EXCEPTION 'Empty message'; END IF;
  IF NOT EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = p_conversation_id AND profile_id = v_uid) THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  INSERT INTO messages (conversation_id, sender_id, body)
  VALUES (p_conversation_id, v_uid, left(btrim(p_body), 4000))
  RETURNING id INTO v_msg;

  UPDATE conversations SET updated_at = NOW() WHERE id = p_conversation_id;

  -- Notify every other member (1:1 today → one recipient; generalizes to >2).
  INSERT INTO notifications (profile_id, type, title, body, data)
  SELECT cm.profile_id, 'message_received', 'New message', left(btrim(p_body), 140),
         jsonb_build_object('conversation_id', p_conversation_id, 'context_type', c.context_type, 'context_id', c.context_id)
  FROM conversation_members cm
  JOIN conversations c ON c.id = p_conversation_id
  WHERE cm.conversation_id = p_conversation_id AND cm.profile_id <> v_uid;

  RETURN v_msg;
END;
$$;

-- ── Mark a conversation read for the caller ──────────────────────────────────
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE conversation_members SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id AND profile_id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION is_conversation_member(UUID)                TO authenticated;
GRANT EXECUTE ON FUNCTION start_or_get_conversation(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_message(UUID, TEXT)                    TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID)               TO authenticated;

COMMENT ON TABLE conversations IS 'A 1:1 (MVP) message thread with an optional context (e.g. a customer request). Written via start_or_get_conversation/send_message.';
COMMENT ON TABLE messages IS 'Append-only messages within a conversation. Written only by the send_message SECURITY DEFINER RPC; members read their own threads.';
