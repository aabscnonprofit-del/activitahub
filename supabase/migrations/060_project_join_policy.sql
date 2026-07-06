-- 060_project_join_policy.sql
--
-- Adds Project JOIN POLICY — how a participant joins a Project once they find it in Local Activities.
-- This stage defines only the Project-level behavior (the policy); it creates NO Join / Ticket / Registration
-- / Purchase entity and implements NO payment. Those belong to future stages.
--
--   instant  → participant joins immediately
--   approval → participant submits a join request; the organizer approves or rejects
--   ticket   → participant must complete a ticket purchase before joining (architecture only, no payment)
--
-- Default 'approval', so every existing Project (and every new one) starts requiring organizer approval.
-- Join policy is only a Project attribute driving the participant Join action — it changes no Planning /
-- Budget / Execution / Publication / Visibility / lifecycle, and Local Activities filtering is unchanged
-- (still: published Projects WHERE visibility = 'public').
--
-- Depends on: 001 / 041 (projects). Idempotent (ADD COLUMN IF NOT EXISTS).

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS join_policy TEXT NOT NULL DEFAULT 'approval'
  CHECK (join_policy IN ('instant', 'approval', 'ticket'));
