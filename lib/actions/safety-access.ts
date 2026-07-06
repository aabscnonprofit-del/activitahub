'use server'

// Safety access server actions — organizer controls for creating project-scoped Safety access and managing
// Safety Links (ADR_012 / ADR_013). They run entirely on the SHARED Project Access layer (access_type =
// 'safety'); token generation, revocation, expiry, and invitation logic are NOT reimplemented here. Owner-gated.
// No new route/model/access stack. Safety relationships are Project relationships, not global user roles.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { createAccessRelationship, revokeAccess, removeAccess, regenerateToken } from '@/lib/project-access/store'

export type SafetyAccessResult =
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

/** Create project-scoped Safety access by email and/or phone; generates a project-scoped Safety Link. */
export async function addSafetyAccessAction(projectId: string, email: string, phone: string, locale: string): Promise<SafetyAccessResult> {
  const e = typeof email === 'string' && email.trim() ? email.trim() : null
  const p = typeof phone === 'string' && phone.trim() ? phone.trim() : null
  if (!e && !p) return { ok: false, reason: 'invalid_contact' }

  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }

  const row = await createAccessRelationship(ctx.supabase, { projectId, accessType: 'safety', email: e, phone: p })
  if (!row) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Revoke Safety access (the Safety Link stops resolving to the Safety View). */
export async function revokeSafetyAccessAction(projectId: string, safetyId: string, locale: string): Promise<SafetyAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await revokeAccess(ctx.supabase, projectId, safetyId, new Date().toISOString()))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Remove a Safety relationship entirely. */
export async function removeSafetyAccessAction(projectId: string, safetyId: string, locale: string): Promise<SafetyAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await removeAccess(ctx.supabase, projectId, safetyId))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Regenerate the Safety Link: issue a fresh project-scoped token (old link stops resolving) + re-activate. */
export async function regenerateSafetyLinkAction(projectId: string, safetyId: string, locale: string): Promise<SafetyAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await regenerateToken(ctx.supabase, projectId, safetyId))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}
