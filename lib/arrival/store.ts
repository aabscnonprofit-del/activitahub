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

/** The caller's own arrival preference for a Project, or null (tolerant). */
export async function getArrivalPreference(supabase: ServerClient, projectId: string, accountId: string): Promise<ArrivalPreference | null> {
  try {
    const { data, error } = await supabase
      .from('participant_arrival_preferences')
      .select('needs_ride, can_offer_ride, pickup_zip, seats_available, note')
      .eq('project_id', projectId)
      .eq('account_id', accountId)
      .maybeSingle()
    if (error || !data) return null
    const r = data as Row
    return { needsRide: !!r.needs_ride, canOfferRide: !!r.can_offer_ride, pickupZip: r.pickup_zip, seatsAvailable: r.seats_available, note: r.note }
  } catch {
    return null
  }
}

/** Upsert the caller's OWN arrival preference (RLS: own row + approved participant). Returns true on success. */
export async function setArrivalPreference(supabase: ServerClient, projectId: string, accountId: string, pref: ArrivalPreference): Promise<boolean> {
  const { error } = await supabase.from('participant_arrival_preferences').upsert(
    {
      project_id: projectId,
      account_id: accountId,
      needs_ride: pref.needsRide,
      can_offer_ride: pref.canOfferRide,
      pickup_zip: pref.pickupZip,
      seats_available: pref.seatsAvailable,
      note: pref.note,
    },
    { onConflict: 'project_id,account_id' },
  )
  return !error
}

/**
 * The Project's arrival summary — aggregate counts + safe per-row details (ZIP / seats / note only; no identity).
 * Only meaningful rows are included (needs a ride OR offers a ride). Read via the admin client; the CALLER gates
 * who may see it (owner or approved participant). Graceful empty summary on error/absence.
 */
export async function getArrivalSummary(projectId: string): Promise<ArrivalSummary> {
  try {
    const admin = await createAdminClient()
    const { data } = await admin
      .from('participant_arrival_preferences')
      .select('needs_ride, can_offer_ride, pickup_zip, seats_available, note')
      .eq('project_id', projectId)
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
