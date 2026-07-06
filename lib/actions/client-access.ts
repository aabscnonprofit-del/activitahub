'use server'

// Client access server actions — organizer controls for attaching Clients and managing their Client View access
// (ADR_012). They run entirely on the SHARED Project Access layer (access_type = 'client'); token generation,
// revocation, and invitation logic are NOT reimplemented here. Owner-gated. No new route/model.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { createAccessRelationship, revokeAccess, removeAccess, regenerateToken } from '@/lib/project-access/store'

export type ClientAccessResult =
  | { ok: true }
  | { ok: false; reason: 'not_authenticated' | 'not_authorized' | 'invalid_contact' | 'failed' }

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

/** Attach a Client by email and/or phone; generates a project-scoped invite link (status invited). */
export async function addClientAction(projectId: string, email: string, phone: string, locale: string): Promise<ClientAccessResult> {
  const e = typeof email === 'string' && email.trim() ? email.trim() : null
  const p = typeof phone === 'string' && phone.trim() ? phone.trim() : null
  if (!e && !p) return { ok: false, reason: 'invalid_contact' }

  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }

  const row = await createAccessRelationship(ctx.supabase, { projectId, accessType: 'client', email: e, phone: p })
  if (!row) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Revoke a Client's access (the invite link stops resolving to the Client View). */
export async function revokeClientAction(projectId: string, clientId: string, locale: string): Promise<ClientAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await revokeAccess(ctx.supabase, projectId, clientId, new Date().toISOString()))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Detach a Client entirely. */
export async function removeClientAction(projectId: string, clientId: string, locale: string): Promise<ClientAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await removeAccess(ctx.supabase, projectId, clientId))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Resend the invitation: issue a fresh project-scoped token (the old link stops resolving) + re-activate. */
export async function resendInvitationAction(projectId: string, clientId: string, locale: string): Promise<ClientAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await regenerateToken(ctx.supabase, projectId, clientId))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}
