'use server'

// Worker access server actions — the organizer controls for attaching Workers to a Project and managing their
// access to the Worker View (ADR_012), plus the worker-facing work confirmation. Organizer actions are
// OWNER-gated; the confirm action is token-scoped (no login). Invitation tokens are secure and project-scoped
// (one token → one project_workers row → one project → the Worker View only). The worker's role is a REFERENCE
// to a canonical project role (Team/Delivery stay canonical). No new route/model.

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import {
  insertProjectWorker, updateProjectWorkerStatus, updateProjectWorkerToken, deleteProjectWorker,
  getProjectWorkerByToken, setWorkerConfirmed,
} from '@/lib/worker-access/store'

export type WorkerAccessResult =
  | { ok: true }
  | { ok: false; reason: 'not_authenticated' | 'not_authorized' | 'invalid_contact' | 'not_found' | 'failed' }

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

/** Attach a Worker by email and/or phone with a referenced role; generates a project-scoped invite link. */
export async function addWorkerAction(projectId: string, email: string, phone: string, roleId: string, locale: string): Promise<WorkerAccessResult> {
  const e = typeof email === 'string' && email.trim() ? email.trim() : null
  const p = typeof phone === 'string' && phone.trim() ? phone.trim() : null
  if (!e && !p) return { ok: false, reason: 'invalid_contact' }

  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }

  const row = await insertProjectWorker(ctx.supabase, { projectId, email: e, phone: p, roleId: roleId?.trim() || null, inviteToken: newInviteToken() })
  if (!row) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Revoke a Worker's access (the invite link stops resolving to the Worker View). */
export async function revokeWorkerAction(projectId: string, workerId: string, locale: string): Promise<WorkerAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await updateProjectWorkerStatus(ctx.supabase, projectId, workerId, 'revoked'))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Detach a Worker entirely. */
export async function removeWorkerAction(projectId: string, workerId: string, locale: string): Promise<WorkerAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  if (!(await deleteProjectWorker(ctx.supabase, projectId, workerId))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Resend the invitation: issue a fresh project-scoped token (old link stops resolving) + re-activate. */
export async function resendWorkerInvitationAction(projectId: string, workerId: string, locale: string): Promise<WorkerAccessResult> {
  const ctx = await ownedProject(projectId)
  if (!ctx.ok) return { ok: false, reason: ctx.reason }
  const tokenOk = await updateProjectWorkerToken(ctx.supabase, projectId, workerId, newInviteToken())
  const statusOk = await updateProjectWorkerStatus(ctx.supabase, projectId, workerId, 'invited')
  if (!tokenOk || !statusOk) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Worker-facing (token-scoped, no login): confirm the assigned work. Denied for a revoked/unknown token. */
export async function confirmWorkAction(token: string, locale: string): Promise<WorkerAccessResult> {
  const admin = await createAdminClient()
  const worker = await getProjectWorkerByToken(admin, token)
  if (!worker || worker.status === 'revoked') return { ok: false, reason: 'not_found' }
  if (!(await setWorkerConfirmed(admin, worker.id, new Date().toISOString()))) return { ok: false, reason: 'failed' }
  revalidatePath(`/${locale}/worker/${token}`)
  return { ok: true }
}
