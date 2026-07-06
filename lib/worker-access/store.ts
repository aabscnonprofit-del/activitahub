// Worker access store — the Project↔Worker relationship (migration 057). Organizer CRUD runs under owner RLS
// (regular client); the Worker View resolves a row by its invite token server-side (admin client). `role_id`
// only REFERENCES a canonical project role — it never redefines roles or holds an assignment (Team/Delivery
// remain canonical). No new Project model.

import type { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type WorkerStatus = 'invited' | 'active' | 'revoked'

/** A persisted Project↔Worker relationship. */
export interface ProjectWorkerRow {
  id: string
  project_id: string
  email: string | null
  phone: string | null
  worker_user_id: string | null
  role_id: string | null
  invite_token: string
  status: WorkerStatus
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

const COLS = 'id, project_id, email, phone, worker_user_id, role_id, invite_token, status, confirmed_at, created_at, updated_at'

/** List a project's attached workers (owner RLS scopes this to the project's organizer). */
export async function listProjectWorkers(supabase: ServerClient, projectId: string): Promise<ProjectWorkerRow[]> {
  const { data } = await supabase
    .from('project_workers')
    .select(COLS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  return (data as ProjectWorkerRow[]) ?? []
}

/** Attach a worker to a project with a referenced role. Owner RLS enforces ownership. */
export async function insertProjectWorker(
  supabase: ServerClient,
  args: { projectId: string; email: string | null; phone: string | null; roleId: string | null; inviteToken: string },
): Promise<ProjectWorkerRow | null> {
  const { data } = await supabase
    .from('project_workers')
    .insert({
      project_id: args.projectId,
      email: args.email,
      phone: args.phone,
      role_id: args.roleId,
      invite_token: args.inviteToken,
      status: 'invited',
    })
    .select(COLS)
    .single()
  return (data as ProjectWorkerRow) ?? null
}

/** Update a worker relationship's status (e.g. revoke) — scoped to the project (owner RLS). */
export async function updateProjectWorkerStatus(
  supabase: ServerClient,
  projectId: string,
  workerId: string,
  status: WorkerStatus,
): Promise<boolean> {
  const { error } = await supabase.from('project_workers').update({ status }).eq('id', workerId).eq('project_id', projectId)
  return !error
}

/** Replace a worker's invite token (resend = a fresh project-scoped link; the old link stops resolving). */
export async function updateProjectWorkerToken(
  supabase: ServerClient,
  projectId: string,
  workerId: string,
  inviteToken: string,
): Promise<boolean> {
  const { error } = await supabase.from('project_workers').update({ invite_token: inviteToken }).eq('id', workerId).eq('project_id', projectId)
  return !error
}

/** Detach a worker (owner RLS). */
export async function deleteProjectWorker(supabase: ServerClient, projectId: string, workerId: string): Promise<boolean> {
  const { error } = await supabase.from('project_workers').delete().eq('id', workerId).eq('project_id', projectId)
  return !error
}

/** Resolve a worker relationship by its invite token — used server-side for Worker View access + confirmation. */
export async function getProjectWorkerByToken(admin: ServerClient, token: string): Promise<ProjectWorkerRow | null> {
  const { data } = await admin.from('project_workers').select(COLS).eq('invite_token', token).maybeSingle()
  return (data as ProjectWorkerRow) ?? null
}

/** Record (or clear) the worker's work confirmation by id. */
export async function setWorkerConfirmed(admin: ServerClient, workerId: string, confirmedAt: string | null): Promise<boolean> {
  const { error } = await admin.from('project_workers').update({ confirmed_at: confirmedAt }).eq('id', workerId)
  return !error
}
