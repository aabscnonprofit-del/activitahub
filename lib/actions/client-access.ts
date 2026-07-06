'use server'

// Client access server actions — the organizer controls for attaching Clients to a Project and managing their
// access to the Client View (ADR_012). Every action is OWNER-gated (getProject under owner RLS). Invitation
// tokens are secure and project-scoped (one token → one project_clients row → one project → the Client View
// only). No new route/model; reuses the project store + the client-access store.

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import {
  insertProjectClient, updateProjectClientStatus, updateProjectClientToken, deleteProjectClient,
} from '@/lib/client-access/store'

export type ClientAccessResult =
  | { ok: true }
  | { ok: false; reason: 'not_authenticated' | 'not_authorized' | 'invalid_contact' | 'failed' }

/** A secure, unguessable, project-scoped invitation token. */
function newInviteToken(): string {
  return randomBytes(24).toString('hex')
}

async function ownedProject(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, reason: 'not_authenticated' as const }
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false as const, reason: 'not_authorized' as const }
  return { ok: true as const, supabase }
}

/** Attach a Client to the project by email and/or phone; generates a project-scoped invite link (status invited). */
export async function addClientAction(projectId: string, email: string, phone: string, locale: string): Promise<ClientAccessResult> {
  const e = typeof email === 'string' && email.trim() ? email.trim() : null
  const p = typeof phone === 'string' && phone.trim() ? phone.trim() : null
  if (!e && !p) return { ok: false, reason: 'invalid_contact' }

  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }

  const row = await insertProjectClient(ctx.supabase, { projectId, email: e, phone: p, inviteToken: newInviteToken() })
  if (!row) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Revoke a Client's access (the invite link stops resolving to the Client View). */
export async function revokeClientAction(projectId: string, clientId: string, locale: string): Promise<ClientAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await updateProjectClientStatus(ctx.supabase, projectId, clientId, 'revoked'))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Detach a Client entirely. */
export async function removeClientAction(projectId: string, clientId: string, locale: string): Promise<ClientAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await deleteProjectClient(ctx.supabase, projectId, clientId))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Resend the invitation: issue a fresh project-scoped token (the old link stops resolving) + re-activate. */
export async function resendInvitationAction(projectId: string, clientId: string, locale: string): Promise<ClientAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  const tokenOk = await updateProjectClientToken(ctx.supabase, projectId, clientId, newInviteToken())
  const statusOk = await updateProjectClientStatus(ctx.supabase, projectId, clientId, 'invited')
  if (!tokenOk || !statusOk) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}
