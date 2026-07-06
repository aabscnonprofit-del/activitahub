// Client access store — the Project↔Client relationship (migration 056). Organizer CRUD runs under owner RLS
// (regular client); the Client View resolves a row by its invite token server-side (admin client). No new
// Project model — this table only records who may open a Project's Client View, and how.

import type { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type ClientStatus = 'invited' | 'active' | 'revoked'

/** A persisted Project↔Client relationship. */
export interface ProjectClientRow {
  id: string
  project_id: string
  email: string | null
  phone: string | null
  client_user_id: string | null
  invite_token: string
  status: ClientStatus
  created_at: string
  updated_at: string
}

const COLS = 'id, project_id, email, phone, client_user_id, invite_token, status, created_at, updated_at'

/** List a project's attached clients (owner RLS scopes this to the project's organizer). */
export async function listProjectClients(supabase: ServerClient, projectId: string): Promise<ProjectClientRow[]> {
  const { data } = await supabase
    .from('project_clients')
    .select(COLS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  return (data as ProjectClientRow[]) ?? []
}

/** Attach a client to a project. Owner RLS enforces ownership. Returns the created row or null on error. */
export async function insertProjectClient(
  supabase: ServerClient,
  args: { projectId: string; email: string | null; phone: string | null; clientUserId?: string | null; inviteToken: string },
): Promise<ProjectClientRow | null> {
  const { data } = await supabase
    .from('project_clients')
    .insert({
      project_id: args.projectId,
      email: args.email,
      phone: args.phone,
      client_user_id: args.clientUserId ?? null,
      invite_token: args.inviteToken,
      status: 'invited',
    })
    .select(COLS)
    .single()
  return (data as ProjectClientRow) ?? null
}

/** Update a client relationship's status (e.g. revoke) — scoped to the project (owner RLS). */
export async function updateProjectClientStatus(
  supabase: ServerClient,
  projectId: string,
  clientId: string,
  status: ClientStatus,
): Promise<boolean> {
  const { error } = await supabase.from('project_clients').update({ status }).eq('id', clientId).eq('project_id', projectId)
  return !error
}

/** Replace a client's invite token (resend = a fresh, project-scoped link; the old link stops resolving). */
export async function updateProjectClientToken(
  supabase: ServerClient,
  projectId: string,
  clientId: string,
  inviteToken: string,
): Promise<boolean> {
  const { error } = await supabase.from('project_clients').update({ invite_token: inviteToken }).eq('id', clientId).eq('project_id', projectId)
  return !error
}

/** Detach a client (owner RLS). */
export async function deleteProjectClient(supabase: ServerClient, projectId: string, clientId: string): Promise<boolean> {
  const { error } = await supabase.from('project_clients').delete().eq('id', clientId).eq('project_id', projectId)
  return !error
}

/** Resolve a client relationship by its invite token — used server-side for Client View access. */
export async function getProjectClientByToken(admin: ServerClient, token: string): Promise<ProjectClientRow | null> {
  const { data } = await admin.from('project_clients').select(COLS).eq('invite_token', token).maybeSingle()
  return (data as ProjectClientRow) ?? null
}
