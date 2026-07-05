-- 051_occurrence_project_start_unique.sql — Occurrence Creation Slice 1.
-- Depends on: 046 (occurrences).
--
-- Adds the dedup guarantee for create-or-get: at most one occurrence per (project_id, starts_at). Idempotent
-- and non-destructive (CREATE UNIQUE INDEX IF NOT EXISTS). No existing rows are affected — the pair is the
-- natural dedup key. Changes no column, RLS, or other table; the unique index also backs the create-or-get
-- upsert path.

CREATE UNIQUE INDEX IF NOT EXISTS occurrences_project_start_uq
  ON occurrences (project_id, starts_at);
