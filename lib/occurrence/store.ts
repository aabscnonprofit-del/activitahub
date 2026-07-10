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

/** All of a project's occurrences (owner-scoped), soonest first — for the workspace Schedule display. */
export async function listProjectOccurrences(supabase: ServerClient, projectId: string): Promise<Occurrence[]> {
  const { data } = await supabase
    .from('occurrences')
    .select(OCC_COLS)
    .eq('project_id', projectId)
    .order('starts_at', { ascending: true })
  return (data as Occurrence[]) ?? []
}

/** All of a project's occurrences, in created order — the explicit basis for resolution (private). */
async function listOccurrences(supabase: ServerClient, projectId: string): Promise<Occurrence[]> {
  const { data } = await supabase
    .from('occurrences')
    .select(OCC_COLS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  return (data as Occurrence[]) ?? []
}

/**
 * Outcome of resolving a project's CURRENT execution occurrence.
 *   - `resolved`  — a specific occurrence is the current one (by explicit id, or the project's sole occurrence);
 *   - `created`   — none existed and one was created (create-or-get) as the current occurrence;
 *   - `none`      — no occurrence and none requested/allowed to create, or the given id was not found;
 *   - `ambiguous` — the project has MULTIPLE occurrences and no explicit selection was given. Resolution
 *                   deliberately refuses to guess (there is NO implicit "first occurrence" anchor); the caller
 *                   must pass an explicit `occurrenceId`.
 */
export interface OccurrenceResolution {
  occurrence: Occurrence | null
  reason: 'resolved' | 'created' | 'none' | 'ambiguous'
}

/**
 * Resolve the project's CURRENT execution occurrence — the single explicit anchor for the execution pipeline.
 * Selection order:
 *   1. `occurrenceId` given → that occurrence (verified to belong to the project), else `none`.
 *   2. exactly ONE occurrence → that one (unambiguous current occurrence).
 *   3. NONE → create one at `createAtIfMissing` (create-or-get) if provided, else `none`.
 *   4. MULTIPLE without an id → `ambiguous` (never implicitly picks the first — safe for multi-occurrence
 *      projects; a future occurrence selector supplies the id).
 * This replaces the implicit "first occurrence" model. Execution status stays keyed by the resolved
 * occurrence id.
 */
export async function resolveCurrentOccurrence(
  supabase: ServerClient,
  projectId: string,
  opts: { occurrenceId?: string; createAtIfMissing?: string } = {},
): Promise<OccurrenceResolution> {
  const occurrences = await listOccurrences(supabase, projectId)

  if (opts.occurrenceId) {
    const selected = occurrences.find((o) => o.id === opts.occurrenceId) ?? null
    return { occurrence: selected, reason: selected ? 'resolved' : 'none' }
  }
  if (occurrences.length === 1) return { occurrence: occurrences[0], reason: 'resolved' }
  if (occurrences.length === 0) {
    if (!opts.createAtIfMissing) return { occurrence: null, reason: 'none' }
    const res = await createOrGetOccurrence(supabase, { projectId, startsAt: opts.createAtIfMissing })
    return res.ok ? { occurrence: res.occurrence, reason: 'created' } : { occurrence: null, reason: 'none' }
  }
  return { occurrence: null, reason: 'ambiguous' }
}

/**
 * Whether the project has at least one occurrence starting at/after `nowIso` — the readiness signal for
 * publication (a publicly discoverable activity must have a real future date). Owner- or admin-scoped read.
 */
export async function hasFutureOccurrence(supabase: ServerClient, projectId: string, nowIso: string): Promise<boolean> {
  const { data } = await supabase
    .from('occurrences')
    .select('id')
    .eq('project_id', projectId)
    .gte('starts_at', nowIso)
    .limit(1)
  return Array.isArray(data) && data.length > 0
}

/** Public-safe metadata carried on an occurrence (date/time live in the window; these are the rest). */
export interface OccurrenceMeta {
  location?: string | null
  capacity?: number | null
  priceCents?: number | null
  title?: string | null
}

export type ApplyScheduleResult =
  | { ok: true; occurrences: Occurrence[] }
  | { ok: false; reason: 'project_not_found' | 'project_not_approved' | 'empty' | 'error' }

/**
 * Apply concrete occurrence WINDOWS (absolute UTC instants, produced by lib/scheduling) to an APPROVED project
 * — the real scheduling write. The Occurrence stays the sole date/time source of truth; no Project/Plan date is
 * ever written.
 *   - `mode: 'one_time'` with exactly ONE existing occurrence → update it IN PLACE (its id + persisted
 *     execution status survive the reschedule).
 *   - otherwise → REPLACE the project's FUTURE occurrences (starts_at ≥ now) with the given windows; already
 *     started/past occurrences are left untouched. Deleting a future occurrence cascades its (not-yet-relevant)
 *     execution/delivery status and detaches arrival prefs — safe for a reschedule.
 * Dedup on (project, starts_at) is guaranteed by the unique index (migration 051).
 */
export async function applyOccurrenceWindows(
  supabase: ServerClient,
  projectId: string,
  windows: { startsAt: string; endsAt: string | null }[],
  meta: OccurrenceMeta,
  nowIso: string,
  mode: 'one_time' | 'series',
): Promise<ApplyScheduleResult> {
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, reason: 'project_not_found' }
  if (!project.approved_at) return { ok: false, reason: 'project_not_approved' }
  if (windows.length === 0) return { ok: false, reason: 'empty' }

  // Only set the columns the caller actually provided (undefined = leave as-is; null = clear).
  const metaCols: Record<string, unknown> = {}
  if (meta.location !== undefined) metaCols.location = meta.location
  if (meta.capacity !== undefined) metaCols.capacity = meta.capacity
  if (meta.priceCents !== undefined) metaCols.price_cents = meta.priceCents
  if (meta.title !== undefined) metaCols.title = meta.title

  const existing = await listOccurrences(supabase, projectId)

  // In-place reschedule of a single-occurrence project — preserves the occurrence id + its execution status.
  if (mode === 'one_time' && existing.length === 1 && windows.length === 1) {
    const w = windows[0]
    const { data, error } = await supabase
      .from('occurrences')
      .update({ starts_at: w.startsAt, ends_at: w.endsAt, ...metaCols })
      .eq('id', existing[0].id)
      .select(OCC_COLS)
      .single()
    if (error || !data) return { ok: false, reason: 'error' }
    return { ok: true, occurrences: [data as Occurrence] }
  }

  // Replace FUTURE occurrences (keep any that have already started).
  const nowMs = new Date(nowIso).getTime()
  const futureIds = existing.filter((o) => new Date(o.starts_at).getTime() >= nowMs).map((o) => o.id)
  if (futureIds.length > 0) {
    const { error: delErr } = await supabase.from('occurrences').delete().in('id', futureIds)
    if (delErr) return { ok: false, reason: 'error' }
  }

  const rows = windows.map((w) => ({ project_id: projectId, starts_at: w.startsAt, ends_at: w.endsAt, ...metaCols }))
  const { data, error } = await supabase.from('occurrences').insert(rows).select(OCC_COLS)
  if (error || !data) return { ok: false, reason: 'error' }
  return { ok: true, occurrences: data as Occurrence[] }
}

/** Result of setting a current/selected occurrence's start time. */
export type SetOccurrenceStartResult =
  | { ok: true; occurrence: Occurrence }
  | { ok: false; reason: 'project_not_found' | 'project_not_approved' | 'ambiguous_occurrence' | 'occurrence_not_found' | 'duplicate_start' | 'error' }

/**
 * Set/update the start time of the project's CURRENT (or explicitly selected) occurrence for an APPROVED
 * project — the real scheduling write. Resolves the occurrence via resolveCurrentOccurrence (explicit id, or
 * the sole occurrence, or lazily created when none), then updates its `starts_at`. The occurrence id is
 * PRESERVED (in-place update), so persisted execution status (keyed by occurrence) survives rescheduling.
 * Refuses when the project has multiple occurrences and no id was selected (`ambiguous_occurrence`).
 */
export async function setCurrentOccurrenceStart(
  supabase: ServerClient,
  projectId: string,
  startsAt: string,
  opts: { occurrenceId?: string } = {},
): Promise<SetOccurrenceStartResult> {
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, reason: 'project_not_found' }
  if (!project.approved_at) return { ok: false, reason: 'project_not_approved' }

  const resolution = await resolveCurrentOccurrence(supabase, projectId, {
    occurrenceId: opts.occurrenceId,
    createAtIfMissing: project.approved_at,
  })
  if (!resolution.occurrence) {
    return { ok: false, reason: resolution.reason === 'ambiguous' ? 'ambiguous_occurrence' : 'occurrence_not_found' }
  }

  const { data, error } = await supabase
    .from('occurrences')
    .update({ starts_at: startsAt })
    .eq('id', resolution.occurrence.id)
    .select(OCC_COLS)
    .single()
  if (error) return { ok: false, reason: error.code === '23505' ? 'duplicate_start' : 'error' }
  if (!data) return { ok: false, reason: 'error' }
  return { ok: true, occurrence: data as Occurrence }
}
