'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function cents(raw: string | null): number | null {
  const v = raw?.trim()
  return v ? Math.round(parseFloat(v) * 100) : null
}
function int(raw: string | null): number | null {
  const v = raw?.trim()
  return v ? parseInt(v) : null
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

  const eventType = formData.get('event_type') as string
  if (!eventType) redirect(`/${locale}/requests/new`)

  const { data: row, error } = await supabase
    .from('customer_requests')
    .insert({
      customer_id: user.id,
      event_type: eventType,
      city: (formData.get('city') as string)?.trim() || null,
      country: (formData.get('country') as string)?.trim() || null,
      desired_date: (formData.get('desired_date') as string) || null,
      participant_count: int(formData.get('participant_count') as string),
      age_min: int(formData.get('age_min') as string),
      age_max: int(formData.get('age_max') as string),
      budget_cents: cents(formData.get('budget') as string),
      notes: (formData.get('notes') as string)?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !row) redirect(`/${locale}/requests/new?error=1`)

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
