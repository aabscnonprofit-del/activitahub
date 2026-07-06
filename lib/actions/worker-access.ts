'use server'

// Worker access server actions — organizer controls for attaching Workers and managing their Worker View access
// (ADR_012), plus the worker-facing work confirmation. They run on the SHARED Project Access layer (access_type
// = 'worker'); the worker's role and confirmation are carried in the relationship's metadata (role_id only
// REFERENCES a canonical project role — Team/Delivery stay canonical). Token/revocation/invitation logic is not
// reimplemented here. Organizer actions are owner-gated; the confirm action is token-scoped.

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { createAccessRelationship, revokeAccess, removeAccess, regenerateToken, resolveActiveByToken, setAccessMetadata } from '@/lib/project-access/store'
import { accessGrantsView } from '@/lib/project-access/policy'
import type { WorkerAccessMetadata } from '@/lib/worker-access/view'

export type WorkerAccessResult =
  | { ok: true }
  | { ok: false; reason: 'not_authenticated' | 'not_authorized' | 'invalid_contact' | 'not_found' | 'failed' }

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

/** Attach a Worker by email and/or phone with a referenced role; generates a project-scoped invite link. */
export async function addWorkerAction(projectId: string, email: string, phone: string, roleId: string, locale: string): Promise<WorkerAccessResult> {
  const e = typeof email === 'string' && email.trim() ? email.trim() : null
  const p = typeof phone === 'string' && phone.trim() ? phone.trim() : null
  if (!e && !p) return { ok: false, reason: 'invalid_contact' }

  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }

  const metadata: WorkerAccessMetadata = { roleId: roleId?.trim() || null }
  const row = await createAccessRelationship(ctx.supabase, { projectId, accessType: 'worker', email: e, phone: p, metadata: metadata as Record<string, unknown> })
  if (!row) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Revoke a Worker's access (the invite link stops resolving to the Worker View). */
export async function revokeWorkerAction(projectId: string, workerId: string, locale: string): Promise<WorkerAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await revokeAccess(ctx.supabase, projectId, workerId, new Date().toISOString()))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Detach a Worker entirely. */
export async function removeWorkerAction(projectId: string, workerId: string, locale: string): Promise<WorkerAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await removeAccess(ctx.supabase, projectId, workerId))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Resend the invitation: issue a fresh project-scoped token (old link stops resolving) + re-activate. */
export async function resendWorkerInvitationAction(projectId: string, workerId: string, locale: string): Promise<WorkerAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await regenerateToken(ctx.supabase, projectId, workerId))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Worker-facing (token-scoped, no login): confirm the assigned work. Denied for a revoked/expired/unknown token. */
export async function confirmWorkAction(token: string, locale: string): Promise<WorkerAccessResult> {
  const admin = await createAdminClient()
  const access = await resolveActiveByToken(admin, token, new Date().toISOString())
  if (!access || !accessGrantsView(access.access_type, 'worker')) return { ok: false, reason: 'not_found' }
  const nextMeta: WorkerAccessMetadata = { ...(access.metadata as WorkerAccessMetadata), confirmedAt: new Date().toISOString() }
  if (!(await setAccessMetadata(admin, access.id, nextMeta as Record<string, unknown>))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/worker/${token}`)
  return { ok: true }
}
