'use server'

// Project Participants — server actions. The participant Join Flow (driven by the Project's Join Policy) and
// the organizer's approve/decline of pending join requests. Participants are Project data (project_participants,
// migration 061). This stage is ONLY the participant model: no Ticket / Registration / Purchase / Payment /
// Check-in / Attendance, no messaging/notifications. (Distinct from the legacy activity-participants in
// lib/actions/participants.ts — this is the Project-world participant model.)

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject, getPublicProject, getProjectJoinPolicy, getProjectTicketType } from '@/lib/projects/store'
import { initialParticipantStatus, type ParticipantStatus } from '@/lib/participants/model'
import { joinProject, getParticipantForAccount, setParticipantStatus } from '@/lib/participants/store'

export type JoinProjectResult =
  | { ok: true; outcome: ParticipantStatus | 'paid' | 'donation' }
  | { ok: false; error: 'not_authenticated' | 'not_available' | 'failed' }

/**
 * Join a Project from its Activity Page. Server-authoritative on the Join Policy (and, when the policy is
 * 'ticket', on the ticket type — the Ticket System sits on top of Participants):
 *   instant                 → participant created as 'approved'
 *   approval                → participant created as 'pending' (a join request)
 *   ticket + free           → participant created as 'approved' (free ticket granted immediately)
 *   ticket + paid           → NO participant yet (future Checkout System) — outcome 'paid'
 *   ticket + donation       → NO participant yet (future Donation flow)   — outcome 'donation'
 * Requires authentication and a published (joinable) Project. Idempotent — a repeat Join returns the existing
 * participation. Creates no checkout/payment.
 */
export async function joinProjectAction(projectId: string, locale: string): Promise<JoinProjectResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Only a published Project (a real Local Activity, reachable in Public Space) can be joined.
  const project = await getPublicProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_available' }

  const joinPolicy = await getProjectJoinPolicy(supabase, projectId)

  // Ticket policy → the Ticket System decides. Only a FREE ticket creates a participant now; paid/donation wait
  // for the future Checkout/Donation flow (server-authoritative — a crafted request never creates a participant).
  let status: ParticipantStatus
  if (joinPolicy === 'ticket') {
    const ticketType = await getProjectTicketType(supabase, projectId)
    if (ticketType !== 'free') return { ok: true, outcome: ticketType } // 'paid' | 'donation' → no participant yet
    status = 'approved'
  } else {
    status = initialParticipantStatus(joinPolicy) ?? 'pending' // instant → approved, approval → pending
  }

  const participant = await joinProject(supabase, projectId, user.id, status)
  if (!participant) return { ok: false, error: 'failed' }

  revalidatePath(`/${locale}/p/${projectId}`)
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true, outcome: participant.status }
}

export type ParticipantActionResult = { ok: true } | { ok: false; error: 'not_authenticated' | 'not_authorized' | 'failed' }

/** Organizer transitions a participant's status (approve/decline). Owner-only (getProject is owner-RLS). */
async function ownerSetStatus(projectId: string, participantId: string, status: ParticipantStatus, locale: string): Promise<ParticipantActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }
  if (!(await setParticipantStatus(supabase, projectId, participantId, status))) return { ok: false, error: 'failed' }
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}

/** Organizer approves a pending participant → 'approved'. */
export async function approveParticipantAction(projectId: string, participantId: string, locale: string): Promise<ParticipantActionResult> {
  return ownerSetStatus(projectId, participantId, 'approved', locale)
}

/** Organizer declines a pending participant → 'declined'. */
export async function declineParticipantAction(projectId: string, participantId: string, locale: string): Promise<ParticipantActionResult> {
  return ownerSetStatus(projectId, participantId, 'declined', locale)
}

/** Participant cancels their own participation → 'cancelled' (self RLS scopes it to their own row). */
export async function cancelParticipationAction(projectId: string, locale: string): Promise<ParticipantActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }
  const mine = await getParticipantForAccount(supabase, projectId, user.id)
  if (!mine) return { ok: true } // nothing to cancel
  if (!(await setParticipantStatus(supabase, projectId, mine.id, 'cancelled'))) return { ok: false, error: 'failed' }
  revalidatePath(`/${locale}/p/${projectId}`)
  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}
