-- 069_email_delivery_retry.sql — complete the Email Delivery module (retry + failure recording).
--
-- The email queue (email_notifications, migration 013) is populated by the notifications trigger.
-- This migration adds the delivery worker's bookkeeping so delivery is reliable: an attempt counter
-- (retry after transient failures, capped) and the last error (permanent-failure recording). No new
-- notification concept, no schema redesign — only the columns the worker needs.
-- Idempotent.

ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS attempts   INT  NOT NULL DEFAULT 0;
ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE email_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- The worker claims the oldest queued rows first; this index keeps that scan cheap.
CREATE INDEX IF NOT EXISTS email_notifications_queued_idx
  ON email_notifications (created_at)
  WHERE status = 'queued';

COMMENT ON COLUMN email_notifications.attempts   IS 'Delivery attempts so far; the worker retries queued rows until a max, then marks failed.';
COMMENT ON COLUMN email_notifications.last_error IS 'Last delivery error (transient or permanent) recorded by the worker.';
