'use server'

// Participant access server actions — organizer controls for attaching Participants and managing their
// Participant View access (ADR_012). They run entirely on the SHARED Project Access layer (access_type =
// 'participant'); token generation, revocation, expiry, and invitation logic are NOT reimplemented here.
// Owner-gated. No new route/model/access stack.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { createAccessRelationship, revokeAccess, removeAccess, regenerateToken } from '@/lib/project-access/store'

export type ParticipantAccessResult =
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

/** Attach a Participant by email and/or phone; generates a project-scoped invite link (status invited). */
export async function addParticipantAction(projectId: string, email: string, phone: string, locale: string): Promise<ParticipantAccessResult> {
  const e = typeof email === 'string' && email.trim() ? email.trim() : null
  const p = typeof phone === 'string' && phone.trim() ? phone.trim() : null
  if (!e && !p) return { ok: false, reason: 'invalid_contact' }

  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }

  const row = await createAccessRelationship(ctx.supabase, { projectId, accessType: 'participant', email: e, phone: p })
  if (!row) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Revoke a Participant's access (the invite link stops resolving to the Participant View). */
export async function revokeParticipantAction(projectId: string, participantId: string, locale: string): Promise<ParticipantAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await revokeAccess(ctx.supabase, projectId, participantId, new Date().toISOString()))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Detach a Participant entirely. */
export async function removeParticipantAction(projectId: string, participantId: string, locale: string): Promise<ParticipantAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await removeAccess(ctx.supabase, projectId, participantId))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Regenerate the Participant Link: issue a fresh project-scoped token (old link stops resolving) + re-activate. */
export async function regenerateParticipantLinkAction(projectId: string, participantId: string, locale: string): Promise<ParticipantAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await regenerateToken(ctx.supabase, projectId, participantId))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}
