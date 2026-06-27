// Project store — the AGGREGATE ROOT of the event lifecycle.
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
  created_at: string
  updated_at: string
}

const COLS = 'id, owner_id, status, current_step, created_at, updated_at'

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

/** List the caller's Projects, newest-edited first. */
export async function listProjects(supabase: ServerClient): Promise<Project[]> {
  const { data } = await supabase.from('projects').select(COLS).order('updated_at', { ascending: false })
  return (data as Project[]) ?? []
}

/** Update a Project's status / current workflow step. Returns null on any error. */
export async function updateProject(
  supabase: ServerClient,
  id: string,
  patch: { status?: string; current_step?: string },
): Promise<Project | null> {
  const { data } = await supabase.from('projects').update(patch).eq('id', id).select(COLS).single()
  return (data as Project) ?? null
}
