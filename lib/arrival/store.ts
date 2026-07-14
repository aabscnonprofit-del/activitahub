// Arrival Coordination — storage (participant_arrival_preferences, migration 068). An approved participant's own
// "need a ride / offer a ride" preference, plus a SAFE summary for the organizer + approved participants. The
// summary exposes only ZIP/area, seats, and note — never phone/email/exact address/private account data, and
// never the participant's identity. Graceful degradation: reads return null / an empty summary when absent.

import { createAdminClient } from '@/lib/supabase/server'
import type { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export interface ArrivalPreference {
  needsRide: boolean
  canOfferRide: boolean
  pickupZip: string | null
  seatsAvailable: number | null
  note: string | null
}

/** A single safe entry in the arrival summary — no identity, no PII (ZIP / seats / note only). */
export interface ArrivalSummaryEntry {
  needsRide: boolean
  canOfferRide: boolean
  pickupZip: string | null
  seatsAvailable: number | null
  note: string | null
}

export interface ArrivalSummary {
  needsRideCount: number
  canOfferRideCount: number
  entries: ArrivalSummaryEntry[]
}

const EMPTY_SUMMARY: ArrivalSummary = { needsRideCount: 0, canOfferRideCount: 0, entries: [] }

interface Row {
  needs_ride: boolean
  can_offer_ride: boolean
  pickup_zip: string | null
  seats_available: number | null
  note: string | null
}

/** The caller's own arrival preference for a specific Occurrence (null = project-level), or null. */
export async function getArrivalPreference(supabase: ServerClient, projectId: string, accountId: string, occurrenceId: string | null = null): Promise<ArrivalPreference | null> {
  try {
    const base = supabase
      .from('participant_arrival_preferences')
      .select('needs_ride, can_offer_ride, pickup_zip, seats_available, note')
      .eq('project_id', projectId)
      .eq('account_id', accountId)
    const { data, error } = await (occurrenceId ? base.eq('occurrence_id', occurrenceId) : base.is('occurrence_id', null)).maybeSingle()
    if (error || !data) return null
    const r = data as Row
    return { needsRide: !!r.needs_ride, canOfferRide: !!r.can_offer_ride, pickupZip: r.pickup_zip, seatsAvailable: r.seats_available, note: r.note }
  } catch {
    return null
  }
}

/** Save the caller's OWN arrival preference for one Occurrence (RLS: own row + approved participant).
 *  Constraint-agnostic check-then-write (no ON CONFLICT) so it is safe across the 070→071 arrival
 *  re-key. Returns true on success. */
export async function setArrivalPreference(supabase: ServerClient, projectId: string, accountId: string, pref: ArrivalPreference, occurrenceId: string | null = null): Promise<boolean> {
  const cols = {
    needs_ride: pref.needsRide,
    can_offer_ride: pref.canOfferRide,
    pickup_zip: pref.pickupZip,
    seats_available: pref.seatsAvailable,
    note: pref.note,
    updated_at: new Date().toISOString(),
  }
  // Scope-filtered (no `id` column dependency — it doesn't exist until 071). The (project, account,
  // occurrence-scope) filter targets exactly the caller's own row for this occurrence.
  const sel = supabase.from('participant_arrival_preferences').select('project_id').eq('project_id', projectId).eq('account_id', accountId)
  const { data: existing } = await (occurrenceId ? sel.eq('occurrence_id', occurrenceId) : sel.is('occurrence_id', null)).maybeSingle()
  if (existing) {
    const upd = supabase.from('participant_arrival_preferences').update(cols).eq('project_id', projectId).eq('account_id', accountId)
    const { error } = await (occurrenceId ? upd.eq('occurrence_id', occurrenceId) : upd.is('occurrence_id', null))
    return !error
  }
  const { error } = await supabase.from('participant_arrival_preferences').insert({ project_id: projectId, account_id: accountId, occurrence_id: occurrenceId, ...cols })
  return !error
}

/**
 * The Project's arrival summary — aggregate counts + safe per-row details (ZIP / seats / note only; no identity).
 * Only meaningful rows are included (needs a ride OR offers a ride). Read via the admin client; the CALLER gates
 * who may see it (owner or approved participant). Graceful empty summary on error/absence.
 */
export async function getArrivalSummary(projectId: string, occurrenceId: string | null = null): Promise<ArrivalSummary> {
  try {
    const admin = await createAdminClient()
    const base = admin
      .from('participant_arrival_preferences')
      .select('needs_ride, can_offer_ride, pickup_zip, seats_available, note')
      .eq('project_id', projectId)
    const { data } = await (occurrenceId ? base.eq('occurrence_id', occurrenceId) : base.is('occurrence_id', null))
    const rows = ((data ?? []) as Row[]).filter((r) => r.needs_ride || r.can_offer_ride)
    if (rows.length === 0) return EMPTY_SUMMARY
    return {
      needsRideCount: rows.filter((r) => r.needs_ride).length,
      canOfferRideCount: rows.filter((r) => r.can_offer_ride).length,
      entries: rows.map((r) => ({
        needsRide: !!r.needs_ride,
        canOfferRide: !!r.can_offer_ride,
        pickupZip: r.pickup_zip,
        seatsAvailable: r.seats_available,
        note: r.note,
      })),
    }
  } catch {
    return EMPTY_SUMMARY
  }
}
