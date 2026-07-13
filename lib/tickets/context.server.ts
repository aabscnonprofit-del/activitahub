import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { organizerCanReceivePayments } from '@/lib/billing/connect'
import type { OrganizerConnectAccount } from '@/lib/types'

export type TicketContext = {
  ownerId: string
  ticketType: 'free' | 'paid' | 'donation'
  joinPolicy: 'instant' | 'approval' | 'ticket'
  priceCents: number | null // representative (soonest upcoming) occurrence price
  canReceivePayments: boolean
}

// Authoritative ticket context for a Project, read via the service role: the payee organizer, the
// ticket configuration, the representative occurrence price, and the Connect receive-payments gate.
// PRICING IS REUSED FROM THE OCCURRENCE MODEL (occurrences.price_cents) — the soonest upcoming
// occurrence is the project's representative ticket price. No separate project-level ticket price
// exists or is introduced. Used by the public activity page (to render the buy/donate CTA) and by
// the ticket checkout action. Service-role read because the payee organizer's Connect row and the
// occurrence rows are not owner-readable by an arbitrary public viewer.
export async function getTicketContext(projectId: string): Promise<TicketContext | null> {
  const admin = await createAdminClient()

  const { data: project } = await admin
    .from('projects')
    .select('owner_id, ticket_type, join_policy')
    .eq('id', projectId)
    .maybeSingle()
  if (!project) return null
  const p = project as {
    owner_id: string
    ticket_type: TicketContext['ticketType']
    join_policy: TicketContext['joinPolicy']
  }

  const { data: occ } = await admin
    .from('occurrences')
    .select('price_cents')
    .eq('project_id', projectId)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: acct } = await admin
    .from('organizer_connect_accounts')
    .select('*')
    .eq('organizer_id', p.owner_id)
    .maybeSingle()

  return {
    ownerId: p.owner_id,
    ticketType: p.ticket_type,
    joinPolicy: p.join_policy,
    priceCents: (occ as { price_cents: number | null } | null)?.price_cents ?? null,
    canReceivePayments: organizerCanReceivePayments(acct as OrganizerConnectAccount | null),
  }
}
