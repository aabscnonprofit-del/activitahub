'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { VendorRequest } from '@/lib/types'

// ── Vendor Sourcing actions (migration 030) ─────────────────────────────────
// Organizer side is owner-only RLS CRUD over vendor_requests / vendor_quotes; the
// vendor side is the token RPC vendor_quote_submit (no account). Reuses Provider
// Profiles (vendors) and ope_plans needs. No OPE/pricing/lifecycle/proposal changes.

const cents = (raw: FormDataEntryValue | null): number | null => {
  const v = (raw as string)?.trim()
  if (!v) return null
  const n = Math.round(parseFloat(v) * 100)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Load the plan's sourcing requests with their quotes (owner-scoped, for the panel). */
export async function getVendorSourcing(planId: string): Promise<VendorRequest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('vendor_requests')
    .select('*, vendor_quotes(*)')
    .eq('plan_id', planId)
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  return (data ?? []) as VendorRequest[]
}

/**
 * Create a sourcing request for a plan resource need and invite the selected vendor
 * profiles. Each invited vendor becomes a token-based vendor_quote (token auto-generated).
 * Owner-scoped throughout (RLS + explicit organizer_id).
 */
export async function createVendorRequest(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const planId = (formData.get('plan_id') as string) || ''
  const locale = (formData.get('locale') as string) || 'en'
  const resourceLabel = (formData.get('resource_label') as string)?.trim()
  const vendorIds = formData.getAll('vendor_id').map(String).filter(Boolean)
  if (!planId || !resourceLabel || vendorIds.length === 0) return

  const { data: req } = await supabase
    .from('vendor_requests')
    .insert({
      organizer_id: user.id,
      plan_id: planId,
      resource_label: resourceLabel,
      resource_item_key: (formData.get('resource_item_key') as string)?.trim() || null,
      spec: (formData.get('spec') as string)?.trim() || null,
      budget_cents: cents(formData.get('budget')),
      status: 'open',
    })
    .select('id')
    .single()
  if (!req) return

  // Snapshot the invited vendor profiles (owner-scoped) into quote rows.
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, company_name, email')
    .eq('organizer_id', user.id)
    .in('id', vendorIds)

  const rows = (vendors ?? []).map((v) => ({
    vendor_request_id: req.id as string,
    vendor_id: v.id as string,
    vendor_name: (v.company_name as string) || (v.name as string),
    vendor_email: (v.email as string) || null,
  }))
  if (rows.length > 0) await supabase.from('vendor_quotes').insert(rows)

  revalidatePath(`/${locale}/dashboard/plans/${planId}`)
}

/** Select one quote: mark it selected, record it on the request, close the request. */
export async function selectVendorQuote(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const requestId = (formData.get('request_id') as string) || ''
  const quoteId = (formData.get('quote_id') as string) || ''
  const planId = (formData.get('plan_id') as string) || ''
  const locale = (formData.get('locale') as string) || 'en'
  if (!requestId || !quoteId) return

  await supabase.from('vendor_quotes').update({ status: 'selected' }).eq('id', quoteId)
  await supabase
    .from('vendor_requests')
    .update({ selected_quote_id: quoteId, status: 'closed' })
    .eq('id', requestId)
    .eq('organizer_id', user.id)

  if (planId) revalidatePath(`/${locale}/dashboard/plans/${planId}`)
}

/** Public-page read: the brief + current state for a vendor token (no auth). */
export async function vendorQuoteLookup(token: string): Promise<Record<string, unknown> | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('vendor_quote_lookup', { p_token: token })
  return (data as Record<string, unknown>) ?? null
}

/** Public-page write: the vendor submits a quote or declines (token-gated RPC). */
export async function submitVendorQuote(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const token = (formData.get('token') as string) || ''
  const locale = (formData.get('locale') as string) || 'en'
  const decline = (formData.get('decline') as string) === 'true'
  if (!token) return

  await supabase.rpc('vendor_quote_submit', {
    p_token: token,
    p_price_cents: decline ? null : cents(formData.get('price')),
    p_message: (formData.get('message') as string)?.trim() || null,
    p_decline: decline,
  })

  revalidatePath(`/${locale}/vendor-quote/${token}`)
}
