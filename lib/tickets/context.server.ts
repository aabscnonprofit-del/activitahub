import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { organizerCanReceivePayments } from '@/lib/billing/connect'
import type { OrganizerConnectAccount } from '@/lib/types'

export type TicketOccurrence = {
  id: string
  title: string | null
  startsAt: string
  endsAt: string | null
  priceCents: number | null
  capacity: number | null
  /** null capacity → unlimited (remaining null); otherwise capacity − approved registrations. */
  remaining: number | null
  full: boolean
}

export type TicketContext = {
  ownerId: string
  ticketType: 'free' | 'paid' | 'donation'
  joinPolicy: 'instant' | 'approval' | 'ticket'
  canReceivePayments: boolean
  occurrences: TicketOccurrence[]
}

// Authoritative ticket context for a Project, read via the service role: the payee organizer, the
// ticket configuration, the Connect receive-payments gate, and the PURCHASABLE OCCURRENCES — each
// with its own date, price (occurrences.price_cents, reused; no separate ticket price) and
// per-occurrence remaining capacity (occurrences.capacity − approved registrations). Registration
// is occurrence-bound: the buyer selects one occurrence and pays for that occurrence only.
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

  const nowIso = new Date().toISOString()
  const { data: occRows } = await admin
    .from('occurrences')
    .select('id, title, starts_at, ends_at, price_cents, capacity, status')
    .eq('project_id', projectId)
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true })

  const occurrences: TicketOccurrence[] = []
  for (const o of (occRows ?? []) as {
    id: string; title: string | null; starts_at: string; ends_at: string | null
    price_cents: number | null; capacity: number | null; status: string
  }[]) {
    let remaining: number | null = null
    let full = false
    if (o.capacity != null) {
      const { count } = await admin
        .from('project_participants')
        .select('id', { count: 'exact', head: true })
        .eq('occurrence_id', o.id)
        .eq('status', 'approved')
      const approved = count ?? 0
      remaining = Math.max(0, o.capacity - approved)
      full = remaining <= 0
    }
    occurrences.push({
      id: o.id,
      title: o.title,
      startsAt: o.starts_at,
      endsAt: o.ends_at,
      priceCents: o.price_cents,
      capacity: o.capacity,
      remaining,
      full,
    })
  }

  const { data: acct } = await admin
    .from('organizer_connect_accounts')
    .select('*')
    .eq('organizer_id', p.owner_id)
    .maybeSingle()

  return {
    ownerId: p.owner_id,
    ticketType: p.ticket_type,
    joinPolicy: p.join_policy,
    canReceivePayments: organizerCanReceivePayments(acct as OrganizerConnectAccount | null),
    occurrences,
  }
}
