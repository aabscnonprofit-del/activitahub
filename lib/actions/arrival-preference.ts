'use server'

// Arrival Coordination — server action. An APPROVED participant sets their own "need a ride / offer a ride"
// preference for an activity. Server-authoritative: only approved participants may submit (pending / declined /
// cancelled cannot); never reads the Ticket System. No maps / exact address / phone / payment / matching.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getParticipantForAccount } from '@/lib/participants/store'
import { setArrivalPreference } from '@/lib/arrival/store'

export const ARRIVAL_NOTE_MAX = 280
export const ARRIVAL_ZIP_MAX = 20
export const ARRIVAL_SEATS_MAX = 20

export interface ArrivalPreferenceInput {
  needsRide: boolean
  canOfferRide: boolean
  pickupZip: string
  seatsAvailable: number | null
  note: string
}

export type ArrivalResult = { ok: true } | { ok: false; error: 'not_authenticated' | 'not_approved' | 'invalid' | 'failed' }

/**
 * Save the caller's own arrival preference. Only an APPROVED participant may submit. Seats apply only to offers.
 * Free-text is length-capped; no address/phone is collected. Revalidates the activity page.
 */
export async function setArrivalPreferenceAction(projectId: string, input: ArrivalPreferenceInput, locale: string): Promise<ArrivalResult> {
  if (typeof input?.pickupZip !== 'string' || input.pickupZip.length > ARRIVAL_ZIP_MAX) return { ok: false, error: 'invalid' }
  if (typeof input?.note !== 'string' || input.note.length > ARRIVAL_NOTE_MAX) return { ok: false, error: 'invalid' }
  if (input.seatsAvailable != null && (!Number.isInteger(input.seatsAvailable) || input.seatsAvailable < 0 || input.seatsAvailable > ARRIVAL_SEATS_MAX)) {
    return { ok: false, error: 'invalid' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Only APPROVED participants may submit (participation is the source of truth; the Ticket System is never read).
  const mine = await getParticipantForAccount(supabase, projectId, user.id)
  if (mine?.status !== 'approved') return { ok: false, error: 'not_approved' }

  const ok = await setArrivalPreference(supabase, projectId, user.id, {
    needsRide: !!input.needsRide,
    canOfferRide: !!input.canOfferRide,
    pickupZip: input.pickupZip.trim() || null,
    seatsAvailable: input.canOfferRide ? input.seatsAvailable ?? null : null,
    note: input.note.trim() || null,
  })
  if (!ok) return { ok: false, error: 'failed' }

  revalidatePath(`/${locale}/p/${projectId}`)
  return { ok: true }
}
