'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'

const CATEGORIES = new Set([
  // legacy
  'sports', 'arts', 'music', 'education', 'outdoor',
  'wellness', 'workshop', 'party', 'food', 'other',
  // Phase 9 emotional taxonomy (migration 016)
  'birthday', 'kids_party', 'wedding', 'anniversary', 'baby_shower', 'reunion', 'graduation',
  'hiking_club', 'language_meetup', 'cultural_community', 'faith_community', 'hobby_group', 'alumni', 'fan_community',
  'luxury_picnic', 'sunset_yacht', 'private_chef', 'glamping', 'volcano_dinner', 'survival_camp', 'underwater_photography',
])

function cents(raw: string | null): number | null {
  const v = raw?.trim()
  if (!v) return null
  const n = Math.round(parseFloat(v) * 100)
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 100_000_000) : null
}
function int(raw: string | null, max = 100_000): number | null {
  const v = raw?.trim()
  if (!v) return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null
}
function cap(raw: string | null, max: number): string | null {
  const v = raw?.trim()
  return v ? v.slice(0, max) : null
}

/**
 * Creates a customer request, then runs the server-side matching engine
 * (match_request) which distributes it to eligible organizers and notifies them.
 */
export async function createRequest(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const eventType = (formData.get('event_type') as string)?.trim()
  // Validate against the known category set — never trust the raw value.
  if (!eventType || !CATEGORIES.has(eventType)) redirect(`/${locale}/requests/new`)

  const { data: row, error } = await supabase
    .from('customer_requests')
    .insert({
      customer_id: user.id,
      event_type: eventType,
      city: cap(formData.get('city') as string, 120),
      country: cap(formData.get('country') as string, 120),
      desired_date: (formData.get('desired_date') as string) || null,
      participant_count: int(formData.get('participant_count') as string, 100_000),
      age_min: int(formData.get('age_min') as string, 150),
      age_max: int(formData.get('age_max') as string, 150),
      budget_cents: cents(formData.get('budget') as string),
      notes: cap(formData.get('notes') as string, 2000),
    })
    .select('id')
    .single()

  if (error || !row) {
    console.error('[createRequest] insert failed:', error?.message)
    redirect(`/${locale}/requests/new?error=1`)
  }

  // Server-side matching + distribution.
  await supabase.rpc('match_request', { p_request_id: row.id })

  redirect(`/${locale}/requests/${row.id}`)
}

export async function cancelRequest(id: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('customer_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('customer_id', user.id)
  revalidatePath('/requests')
}

/** Organizer sends/updates a proposal for a matched request. */
export async function sendProposal(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  // Organizer entitlement: only certified organizers with a live included
  // window or active/trialing subscription may pursue bookings.
  if (!(await userHasOrganizerAccess(supabase, user.id))) {
    redirect(`/${locale}/billing`)
  }

  const requestId = formData.get('request_id') as string
  const { error } = await supabase.rpc('send_proposal', {
    p_request_id: requestId,
    p_activity_id: (formData.get('activity_id') as string) || null,
    p_message: (formData.get('message') as string)?.trim() || null,
    p_price_cents: cents(formData.get('price') as string),
    p_proposed_date: (formData.get('proposed_date') as string) || null,
  })
  if (error) redirect(`/${locale}/dashboard/requests?error=${encodeURIComponent(error.message)}`)
  revalidatePath(`/${locale}/dashboard/requests`)
  redirect(`/${locale}/dashboard/proposals`)
}

/** Customer accepts a proposal → accept_proposal creates the booking. */
export async function acceptProposal(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const proposalId = formData.get('proposal_id') as string
  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_proposal', { p_proposal_id: proposalId })
  if (error) {
    const reqId = formData.get('request_id') as string
    redirect(`/${locale}/requests/${reqId}?error=${encodeURIComponent(error.message)}`)
  }
  redirect(`/${locale}/bookings`)
}

/** Customer declines a proposal. */
export async function declineProposal(formData: FormData): Promise<void> {
  const proposalId = formData.get('proposal_id') as string
  const supabase = await createClient()
  await supabase.rpc('decline_proposal', { p_proposal_id: proposalId })
  revalidatePath('/requests')
}
