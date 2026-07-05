// Occurrence Creation — Slice 1: the server/storage flow that creates or gets a live Occurrence for an
// APPROVED project.
//
// An Occurrence is a concrete, dated instance of a Project (migration 046). This is the first WRITE path for
// occurrences (until now they were read-only for Public Space). It is gated on approval — an unapproved
// project is rejected — and it is create-or-GET: it never produces a duplicate for the same (project,
// starts_at) (backed by the unique index in migration 051).
//
// It imports the Project root store only for the approval read; it changes no Planning, Execution, Occurrence
// (binding/timeline), or Organizer Workspace model.

import type { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** A full (owner-side) Occurrence row. */
export interface Occurrence {
  id: string
  project_id: string
  title: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  capacity: number | null
  price_cents: number | null
  status: string
  created_at: string
  updated_at: string
}

const OCC_COLS =
  'id, project_id, title, starts_at, ends_at, location, capacity, price_cents, status, created_at, updated_at'

/** Result of create-or-get. `created` distinguishes a fresh insert from a reused existing occurrence. */
export type CreateOccurrenceResult =
  | { ok: true; occurrence: Occurrence; created: boolean }
  | { ok: false; reason: 'project_not_found' | 'project_not_approved' | 'error' }

/**
 * Create or get the Occurrence for an approved project at a given start time.
 *   1. Ownership + APPROVAL gate — the project must exist (owner RLS) and be approved (`approved_at` set),
 *      else it is rejected (`project_not_found` / `project_not_approved`). No occurrence is created for an
 *      unapproved project.
 *   2. Dedup — if an occurrence already exists for (project_id, starts_at), it is returned (`created: false`).
 *   3. Otherwise a new occurrence is inserted with project_id + starts_at (+ optional title), `created: true`.
 * Never creates a duplicate for the same (project, start time).
 */
export async function createOrGetOccurrence(
  supabase: ServerClient,
  args: { projectId: string; startsAt: string; title?: string | null },
): Promise<CreateOccurrenceResult> {
  // 1. Approval gate (owner-scoped read).
  const project = await getProject(supabase, args.projectId)
  if (!project) return { ok: false, reason: 'project_not_found' }
  if (!project.approved_at) return { ok: false, reason: 'project_not_approved' }

  // 2. Reuse an existing occurrence for this (project, start time).
  const { data: existing } = await supabase
    .from('occurrences')
    .select(OCC_COLS)
    .eq('project_id', args.projectId)
    .eq('starts_at', args.startsAt)
    .maybeSingle()
  if (existing) return { ok: true, occurrence: existing as Occurrence, created: false }

  // 3. Create it.
  const { data, error } = await supabase
    .from('occurrences')
    .insert({
      project_id: args.projectId,
      starts_at: args.startsAt,
      ...(args.title != null ? { title: args.title } : {}),
    })
    .select(OCC_COLS)
    .single()
  if (error || !data) return { ok: false, reason: 'error' }
  return { ok: true, occurrence: data as Occurrence, created: true }
}
