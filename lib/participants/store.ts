// Project Participants — the store (I/O over project_participants, migration 061). Graceful degradation: reads
// return [] / null when the table is absent (migration not yet applied), so pages never crash before deploy.
// RLS owns authorization: the Project owner manages all rows of their Projects; a participant may join/read/
// cancel their OWN row. No Ticket/Registration/Purchase entity — this is only the participant model.

import { createAdminClient } from '@/lib/supabase/server'
import type { createClient } from '@/lib/supabase/server'
import { type ParticipantStatus, type ProjectParticipant, isParticipantStatus } from './model'

type ServerClient = Awaited<ReturnType<typeof createClient>>

const COLS = 'id, project_id, account_id, status, created_at, updated_at'

interface Row {
  id: string
  project_id: string
  account_id: string
  status: string
  created_at: string
  updated_at: string
}

function toParticipant(r: Row): ProjectParticipant {
  return {
    id: r.id,
    projectId: r.project_id,
    accountId: r.account_id,
    status: isParticipantStatus(r.status) ? r.status : 'pending',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** List a Project's participants (owner RLS: only the owner sees all). Graceful [] when the table is absent. */
export async function listProjectParticipants(supabase: ServerClient, projectId: string): Promise<ProjectParticipant[]> {
  try {
    const { data, error } = await supabase.from('project_participants').select(COLS).eq('project_id', projectId).order('created_at', { ascending: false })
    if (error || !data) return []
    return (data as Row[]).map(toParticipant)
  } catch {
    return []
  }
}

/** The caller's own participation in a Project, or null (never joined / table absent). */
export async function getParticipantForAccount(supabase: ServerClient, projectId: string, accountId: string): Promise<ProjectParticipant | null> {
  try {
    const { data, error } = await supabase.from('project_participants').select(COLS).eq('project_id', projectId).eq('account_id', accountId).maybeSingle()
    if (error || !data) return null
    return toParticipant(data as Row)
  } catch {
    return null
  }
}

/**
 * Create the caller's participation at the given status (their Join). Idempotent by design: the UNIQUE
 * (project_id, account_id) constraint means a repeat Join returns the existing row rather than duplicating.
 * Returns the participant, or null on error (incl. table absent).
 */
export async function joinProject(supabase: ServerClient, projectId: string, accountId: string, status: ParticipantStatus): Promise<ProjectParticipant | null> {
  const existing = await getParticipantForAccount(supabase, projectId, accountId)
  if (existing) return existing
  try {
    const { data, error } = await supabase
      .from('project_participants')
      .insert({ project_id: projectId, account_id: accountId, status })
      .select(COLS)
      .single()
    if (error || !data) return await getParticipantForAccount(supabase, projectId, accountId)
    return toParticipant(data as Row)
  } catch {
    return null
  }
}

/** Set a participant's status (owner: approve/decline; participant self: cancel). Owner/self RLS scopes it. */
export async function setParticipantStatus(supabase: ServerClient, projectId: string, participantId: string, status: ParticipantStatus): Promise<boolean> {
  const { error } = await supabase.from('project_participants').update({ status }).eq('id', participantId).eq('project_id', projectId)
  return !error
}

/** Remove a participant from the Project (owner RLS scopes it). Hard delete — they may re-join later. */
export async function removeParticipant(supabase: ServerClient, projectId: string, participantId: string): Promise<boolean> {
  const { error } = await supabase.from('project_participants').delete().eq('id', participantId).eq('project_id', projectId)
  return !error
}

/** A participant's account profile (name + email) for the participant card. No phone: profiles store none. */
export interface ParticipantProfile {
  accountId: string
  fullName: string | null
  email: string | null
}

/**
 * Load participant account profiles (name + email) by account id, for the organizer's Participant Workspace.
 * Reads profiles via the admin client (the caller has already owner-gated the Project). Graceful {} on error.
 */
export async function getParticipantProfiles(accountIds: string[]): Promise<Record<string, ParticipantProfile>> {
  const ids = [...new Set(accountIds)]
  if (ids.length === 0) return {}
  try {
    const admin = await createAdminClient()
    const { data } = await admin.from('profiles').select('id, full_name, email').in('id', ids)
    return Object.fromEntries(
      ((data ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((r) => [r.id, { accountId: r.id, fullName: r.full_name, email: r.email }]),
    )
  } catch {
    return {}
  }
}
