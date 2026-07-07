// Project store — the AGGREGATE ROOT of the event lifecycle.
//
// CANONICAL (Phase 0.2 — Single Project Declaration): this module — the `projects` table (migration 041)
// — is the SINGLE **Living Project root entity** (Product Canon §4; one of the two durable root entities).
// The assembly-domain `Project` in lib/project/* is NOT a second root; it is Project Assembly support that
// operates on this root. There is exactly one Project root, and it is here.
//
// Per docs/OPE_MODULAR_PIPELINE_PRINCIPLE.md, Discovery / Future Event Description / OPE /
// Marketplace / Execution are modules that operate ON a Project. This module owns ONLY the
// minimal root (id, owner, status, current_step, timestamps) and does NOT contain any
// module logic — it never plans, discovers, or sources. Future modules attach to a Project
// via project_id; they import these helpers rather than becoming the system root.
//
// Plain server helpers over the RLS-owner-only `projects` table (migration 041). Callers
// pass their own RLS-scoped supabase client so every read/write is owner-restricted.

import type { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** The minimal Project root. status/current_step are open TEXT (vocabulary may evolve). */
export interface Project {
  id: string
  owner_id: string
  status: string
  current_step: string
  /** Approval STATE (migration 049); null until approved. The approved Operational Configuration is NOT
   *  stored here — it is a separate immutable artifact (project_approved_snapshots). */
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

const COLS = 'id, owner_id, status, current_step, approved_at, approved_by, created_at, updated_at'

/** Create a Project owned by `ownerId`. Returns null on any error (caller decides). */
export async function createProject(
  supabase: ServerClient,
  ownerId: string,
  init?: { status?: string; current_step?: string },
): Promise<Project | null> {
  const { data } = await supabase
    .from('projects')
    .insert({
      owner_id: ownerId,
      ...(init?.status ? { status: init.status } : {}),
      ...(init?.current_step ? { current_step: init.current_step } : {}),
    })
    .select(COLS)
    .single()
  return (data as Project) ?? null
}

/**
 * Resolve the Project a NEW OPE plan should belong to. The Project service owns this policy
 * (creation/reuse) so the plan component never writes the `projects` table itself. Returns the
 * project_id to attach, or null on failure (the caller maps null to a typed error).
 *
 *  A. projectId given → reuse it, but only if it is owned by the organizer (RLS + explicit match).
 *  B. requestId given → reuse the Project already linked to one of this organizer's plans for that
 *     request; otherwise create one (→ one Project per (organizer, request); matches the 045 backfill).
 *  C. neither given   → create one new standalone Project (1:1).
 */
export async function resolveProjectForPlan(
  supabase: ServerClient,
  args: {
    organizerId: string
    requestId?: string | null
    projectId?: string | null
    init?: { status?: string; current_step?: string } // applied only when a Project is created
  },
): Promise<string | null> {
  const { organizerId, requestId, projectId, init } = args

  // A. Explicit reuse — validate ownership (RLS scopes the read; owner_id match is belt-and-suspenders).
  if (projectId) {
    const existing = await getProject(supabase, projectId)
    return existing && existing.owner_id === organizerId ? existing.id : null
  }

  // B. Request grouping — reuse the request's Project if any of the organizer's plans already carries one.
  if (requestId) {
    const { data } = await supabase
      .from('ope_plans')
      .select('project_id')
      .eq('organizer_id', organizerId)
      .eq('source_request_id', requestId)
      .not('project_id', 'is', null)
      .limit(1)
      .maybeSingle()
    if (data?.project_id) return data.project_id as string
  }

  // B (none found) / C. Create a new Project owned by the organizer.
  const created = await createProject(supabase, organizerId, init)
  return created ? created.id : null
}

/** Load one Project (RLS restricts to the owner). */
export async function getProject(supabase: ServerClient, id: string): Promise<Project | null> {
  const { data } = await supabase.from('projects').select(COLS).eq('id', id).single()
  return (data as Project) ?? null
}

/** Public-safe projection of a Project for Public Space (no owner_id / no internal data). */
export interface PublicProject {
  id: string
  status: string
  created_at: string
}

/** Public-safe projection of an Occurrence for Public Space. */
export interface PublicOccurrence {
  id: string
  title: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  status: string
}

/**
 * Load a Project for PUBLIC display (Public Space — the read-only public projection of a Project).
 * The Project Service owns the public-read policy: it returns ONLY public-safe existing fields, and ONLY
 * when the Project is PUBLISHED (public-read RLS exposes only `is_published` rows via the regular client;
 * the explicit filter is belt-and-suspenders). Returns null for missing or unpublished Projects — so
 * non-public Projects are never reachable through Public Space. (Approved subset of Proposal 046: no
 * title/subtitle/description/cover/location columns on Project.)
 */
export async function getPublicProject(supabase: ServerClient, id: string): Promise<PublicProject | null> {
  const { data } = await supabase
    .from('projects')
    .select('id, status, created_at')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()
  return (data as PublicProject) ?? null
}

/**
 * List a Project's FUTURE Occurrences for Public Space (public-read RLS exposes only Occurrences of a
 * published Project). `nowIso` is supplied by the caller. Ordered soonest-first.
 */
export async function listPublicFutureOccurrences(
  supabase: ServerClient,
  projectId: string,
  nowIso: string,
): Promise<PublicOccurrence[]> {
  const { data } = await supabase
    .from('occurrences')
    .select('id, title, starts_at, ends_at, location, status')
    .eq('project_id', projectId)
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true })
  return (data as PublicOccurrence[]) ?? []
}

/** List the caller's Projects, newest-edited first. */
export async function listProjects(supabase: ServerClient): Promise<Project[]> {
  const { data } = await supabase.from('projects').select(COLS).order('updated_at', { ascending: false })
  return (data as Project[]) ?? []
}

/** Update a Project's status / current workflow step / approval STATE. Returns null on any error. */
export async function updateProject(
  supabase: ServerClient,
  id: string,
  patch: { status?: string; current_step?: string; approved_at?: string; approved_by?: string },
): Promise<Project | null> {
  const { data } = await supabase.from('projects').update(patch).eq('id', id).select(COLS).single()
  return (data as Project) ?? null
}

/**
 * The assigned Lead Organizer id of a project, or null (owner is the lead). Read via a dedicated query — NOT
 * the core column list — and degrades to null on error (e.g. before migration 055 is applied), so getProject
 * and every core read keep working until the column exists.
 */
export async function getProjectLeadOrganizerId(supabase: ServerClient, projectId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('projects').select('lead_organizer_id').eq('id', projectId).maybeSingle()
    if (error || !data) return null
    return (data as { lead_organizer_id?: string | null }).lead_organizer_id ?? null
  } catch {
    return null
  }
}

/** Set (or clear, with null) a project's assigned Lead Organizer. Returns true on success (owner RLS scopes it). */
export async function setProjectLeadOrganizer(supabase: ServerClient, projectId: string, leadOrganizerId: string | null): Promise<boolean> {
  const { error } = await supabase.from('projects').update({ lead_organizer_id: leadOrganizerId }).eq('id', projectId)
  return !error
}

/** A Project's discovery visibility (migration 059). Independent of publication. */
export type ProjectVisibility = 'private' | 'public'

/**
 * Read a Project's discovery visibility. Tolerant: defaults to 'private' when the column is absent (migration
 * 059 not yet applied) or on any error — so a Project is NEVER accidentally treated as publicly discoverable.
 */
export async function getProjectVisibility(supabase: ServerClient, projectId: string): Promise<ProjectVisibility> {
  try {
    const { data, error } = await supabase.from('projects').select('visibility').eq('id', projectId).maybeSingle()
    if (error || !data) return 'private'
    return (data as { visibility?: string }).visibility === 'public' ? 'public' : 'private'
  } catch {
    return 'private'
  }
}

/** Set a Project's discovery visibility (owner RLS scopes it). Returns true on success. */
export async function setProjectVisibility(supabase: ServerClient, projectId: string, visibility: ProjectVisibility): Promise<boolean> {
  const { error } = await supabase.from('projects').update({ visibility }).eq('id', projectId)
  return !error
}

/** How a participant joins a Project (migration 060). Project-level behavior only — no Join/Ticket entity. */
export type JoinPolicy = 'instant' | 'approval' | 'ticket'

/**
 * Read a Project's join policy. Tolerant: defaults to 'approval' when the column is absent (migration 060 not
 * yet applied) or on any error — the safe default (participants request; the organizer approves). Works in both
 * the owner context (RLS scopes to the owner) and Public Space (RLS exposes published Projects).
 */
export async function getProjectJoinPolicy(supabase: ServerClient, projectId: string): Promise<JoinPolicy> {
  try {
    const { data, error } = await supabase.from('projects').select('join_policy').eq('id', projectId).maybeSingle()
    if (error || !data) return 'approval'
    const v = (data as { join_policy?: string }).join_policy
    return v === 'instant' || v === 'ticket' ? v : 'approval'
  } catch {
    return 'approval'
  }
}

/** Set a Project's join policy (owner RLS scopes it). Returns true on success. */
export async function setProjectJoinPolicy(supabase: ServerClient, projectId: string, joinPolicy: JoinPolicy): Promise<boolean> {
  const { error } = await supabase.from('projects').update({ join_policy: joinPolicy }).eq('id', projectId)
  return !error
}

/** Ticket type (migration 062) — the ticket configuration; matters only when join_policy = 'ticket'. */
export type TicketType = 'free' | 'paid' | 'donation'

/**
 * Read a Project's ticket type. Tolerant: defaults to 'free' when the column is absent (migration 062 not yet
 * applied) or on any error. Works in both the owner context and Public Space (RLS exposes published Projects).
 */
export async function getProjectTicketType(supabase: ServerClient, projectId: string): Promise<TicketType> {
  try {
    const { data, error } = await supabase.from('projects').select('ticket_type').eq('id', projectId).maybeSingle()
    if (error || !data) return 'free'
    const v = (data as { ticket_type?: string }).ticket_type
    return v === 'paid' || v === 'donation' ? v : 'free'
  } catch {
    return 'free'
  }
}

/** Set a Project's ticket type (owner RLS scopes it). Returns true on success. */
export async function setProjectTicketType(supabase: ServerClient, projectId: string, ticketType: TicketType): Promise<boolean> {
  const { error } = await supabase.from('projects').update({ ticket_type: ticketType }).eq('id', projectId)
  return !error
}

/**
 * Read a Project's Organizer Story from the Activity Memories storage layer (project_activity_memories,
 * migration 064) — the organizer's public reflection on a completed public activity. Tolerant: null when the
 * table is absent (064 not yet applied), no memories row exists, on error, or when empty. Public content
 * readable for a published + public Project (public-read RLS); the "completed" gate stays in the UI.
 */
export async function getProjectOrganizerStory(supabase: ServerClient, projectId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('project_activity_memories').select('organizer_story').eq('project_id', projectId).maybeSingle()
    if (error || !data) return null
    const s = (data as { organizer_story?: string | null }).organizer_story
    return typeof s === 'string' && s.trim().length > 0 ? s : null
  } catch {
    return null
  }
}

/**
 * Set (or clear, with null) a Project's Organizer Story in the Activity Memories storage layer. Upserts the
 * single per-Project memories row (owner RLS scopes it). Returns true on success.
 */
export async function setProjectOrganizerStory(supabase: ServerClient, projectId: string, story: string | null): Promise<boolean> {
  const { error } = await supabase.from('project_activity_memories').upsert({ project_id: projectId, organizer_story: story }, { onConflict: 'project_id' })
  return !error
}

/**
 * Insert the Approved Project Snapshot — the SEPARATE IMMUTABLE ARTIFACT capturing the Operational
 * Configuration (the EventPlanV2) at approval (docs/PROJECT_LIFECYCLE.md). Insert-only: on conflict
 * (project_id, project_version) it is left unchanged (never overwritten), so the artifact preserves
 * historical truth and the operation is idempotent. `snapshot` is opaque JSONB (typed `unknown` so the root
 * store stays free of module/planning types). Returns true on success.
 */
export async function insertApprovedProjectSnapshot(
  supabase: ServerClient,
  args: { projectId: string; projectVersion: number; approvedBy: string; approvedAt: string; snapshot: unknown },
): Promise<boolean> {
  const { error } = await supabase.from('project_approved_snapshots').upsert(
    {
      project_id: args.projectId,
      project_version: args.projectVersion,
      approved_by: args.approvedBy,
      approved_at: args.approvedAt,
      snapshot: args.snapshot,
    },
    { onConflict: 'project_id,project_version', ignoreDuplicates: true },
  )
  return !error
}

/** Read-only projection of the Approved Project Snapshot artifact — METADATA ONLY (the frozen EventPlanV2
 *  JSONB is intentionally NOT selected here). */
export interface ApprovedProjectSnapshotRow {
  id: string
  project_id: string
  project_version: number
  approved_by: string
  approved_at: string
  created_at: string
}

/**
 * Read the Approved Project Snapshot artifact for a (project, version) — READ-ONLY (owner RLS). Returns the
 * artifact's metadata (never the frozen snapshot JSONB), or null when the Project has no snapshot yet. This
 * is a plain SELECT: it never inserts, updates, deletes, or upserts.
 */
export async function getApprovedProjectSnapshot(
  supabase: ServerClient,
  projectId: string,
  projectVersion = 1,
): Promise<ApprovedProjectSnapshotRow | null> {
  const { data } = await supabase
    .from('project_approved_snapshots')
    .select('id, project_id, project_version, approved_by, approved_at, created_at')
    .eq('project_id', projectId)
    .eq('project_version', projectVersion)
    .maybeSingle()
  return (data as ApprovedProjectSnapshotRow) ?? null
}

/** Whether a Project is currently published (visible in Public Space). Owner-scoped read (RLS). */
export async function getProjectPublishState(supabase: ServerClient, id: string): Promise<boolean> {
  const { data } = await supabase.from('projects').select('is_published').eq('id', id).maybeSingle()
  return Boolean((data as { is_published?: boolean } | null)?.is_published)
}

/**
 * Publish a Project — make it visible in Public Space by setting `is_published = true`. Owner-only
 * (the owner RLS policy scopes the update; callers also verify ownership). Idempotent: setting it true
 * when already true is a no-op. Returns true on success. Changes nothing else.
 */
export async function publishProject(supabase: ServerClient, id: string): Promise<boolean> {
  const { error } = await supabase.from('projects').update({ is_published: true }).eq('id', id)
  return !error
}
