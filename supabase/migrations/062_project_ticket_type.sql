-- 062_project_ticket_type.sql — Ticket System (ticket configuration).
-- Depends on: 001 / 041 (projects). Idempotent (ADD COLUMN IF NOT EXISTS).
--
-- The Ticket System is a Project subsystem built ON TOP OF Participants. Join Policy (060) only decides WHETHER
-- a ticket is required (join_policy = 'ticket'); this ticket_type decides WHAT ticket is required and how it is
-- obtained. It matters only when join_policy = 'ticket'.
--
--   free     → participant receives a ticket immediately → a Participant is created (approved)
--   paid     → requires the future Checkout System → NO Participant yet
--   donation → requires the future Donation flow      → NO Participant yet
--
-- Default 'free'. This stage adds ONLY the ticket configuration attribute — no checkout, no payment provider
-- (Stripe/Apple Pay/Google Pay/PayPal), no refunds/promo/coupons/QR/check-in/seat/tax/invoice. Participants
-- remain the canonical attendance model; the Ticket System is only one path that (for free tickets) creates a
-- Participant. Touches no lifecycle/planning/budget/execution/publication/visibility.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS ticket_type TEXT NOT NULL DEFAULT 'free'
  CHECK (ticket_type IN ('free', 'paid', 'donation'));
