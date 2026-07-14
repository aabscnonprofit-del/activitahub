import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'

// Participant Bookings — a PROJECTION over the existing registration model. A "booking" is simply
// an occurrence-bound project_participants row (occurrence_id set, status 'approved'). No booking
// entity/table: upcoming vs history is derived from the occurrence's date. Reuses project_participants
// + occurrences + projects/profiles. Read via the service role but strictly scoped to the caller's
// own account_id (this is a server-only helper called with the authenticated user's id).

export type ParticipantBooking = {
  participantId: string
  projectId: string
  occurrenceId: string
  title: string | null
  startsAt: string
  endsAt: string | null
  location: string | null
  organizerName: string | null
  status: string
}

export async function listParticipantBookings(accountId: string, mode: 'upcoming' | 'past'): Promise<ParticipantBooking[]> {
  const admin = await createAdminClient()

  const { data: regs } = await admin
    .from('project_participants')
    .select('id, project_id, occurrence_id, status')
    .eq('account_id', accountId)
    .eq('status', 'approved')
    .not('occurrence_id', 'is', null)
  const rows = (regs ?? []) as { id: string; project_id: string; occurrence_id: string; status: string }[]
  if (rows.length === 0) return []

  const occIds = [...new Set(rows.map((r) => r.occurrence_id))]
  const { data: occData } = await admin
    .from('occurrences')
    .select('id, title, starts_at, ends_at, location')
    .in('id', occIds)
  const occById = new Map(
    ((occData ?? []) as { id: string; title: string | null; starts_at: string; ends_at: string | null; location: string | null }[]).map((o) => [o.id, o]),
  )

  const projIds = [...new Set(rows.map((r) => r.project_id))]
  const { data: projData } = await admin.from('projects').select('id, owner_id').in('id', projIds)
  const ownerByProj = new Map(((projData ?? []) as { id: string; owner_id: string }[]).map((p) => [p.id, p.owner_id]))
  const ownerIds = [...new Set([...ownerByProj.values()])]
  const { data: ownerData } = ownerIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', ownerIds)
    : { data: [] as { id: string; full_name: string | null }[] }
  const nameByOwner = new Map(((ownerData ?? []) as { id: string; full_name: string | null }[]).map((o) => [o.id, o.full_name]))

  const now = Date.now()
  const out: ParticipantBooking[] = []
  for (const r of rows) {
    const occ = occById.get(r.occurrence_id)
    if (!occ) continue
    const isPast = new Date(occ.starts_at).getTime() < now
    if (mode === 'upcoming' ? isPast : !isPast) continue
    const ownerId = ownerByProj.get(r.project_id)
    out.push({
      participantId: r.id,
      projectId: r.project_id,
      occurrenceId: r.occurrence_id,
      title: occ.title,
      startsAt: occ.starts_at,
      endsAt: occ.ends_at,
      location: occ.location,
      organizerName: ownerId ? nameByOwner.get(ownerId) ?? null : null,
      status: r.status,
    })
  }
  // Upcoming: soonest first. Past: most-recent first.
  out.sort((a, b) => (mode === 'upcoming' ? 1 : -1) * (new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()))
  return out
}
