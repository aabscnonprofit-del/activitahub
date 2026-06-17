'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import { getMyConnectAccount } from '@/lib/billing/connect.server'
import { organizerCanReceivePayments, deriveConnectStatus } from '@/lib/billing/connect'
import type { InvoiceKind, InvoiceStatus } from '@/lib/types'

// ── Organizer invoice actions (migration 036) ───────────────────────────────
// createInvoice / voidInvoice. A Booking is the agreement; an Invoice is the money
// request. Writes go through the USER-scoped client (RLS owner write) — never the
// service role. The organizer can only ever create draft/open invoices; status='paid',
// paid_at, and stripe_* fields are service-role-only (webhook, a later commit).
//
// Scope: no Stripe Checkout session here (that is the public pay action, Commit 5),
// no webhook, no UI, no booking-checkout change, no refunds.

const INVOICE_KINDS: readonly InvoiceKind[] = ['deposit', 'final', 'full', 'additional']

const str = (v: FormDataEntryValue | null): string | null => {
  const s = (v as string)?.trim()
  return s || null
}
const cents = (raw: FormDataEntryValue | null): number | null => {
  const v = (raw as string)?.trim()
  if (!v) return null
  const n = Math.round(parseFloat(v) * 100)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Create a draft/open invoice owned by the organizer. Entitlement-gated AND
 * payment-readiness-gated: if the organizer cannot receive payments, NO row is
 * inserted. organizer_id is always auth.uid(); customer_id is derived from an
 * owned booking/request (never taken from input); token + paid/stripe fields are
 * left to the DB / service role.
 */
export async function createInvoice(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const planId = str(formData.get('plan_id'))
  const bookingId = str(formData.get('booking_id'))
  const proposalId = str(formData.get('proposal_id'))
  const requestIdIn = str(formData.get('request_id'))

  const returnPath = planId ? `/${locale}/dashboard/plans/${planId}` : `/${locale}/dashboard`
  const back = (err?: string) => redirect(`${returnPath}${err ? `?invoiceError=${err}` : ''}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)

  // Gate 1 — organizer entitlement.
  if (!(await userHasOrganizerAccess(supabase, user.id))) return back('no_access')

  // Gate 2 — payment readiness. Not ready ⇒ no row inserted at all.
  const account = await getMyConnectAccount()
  if (!organizerCanReceivePayments(account)) {
    const s = deriveConnectStatus(account)
    return back(s === 'restricted' ? 'connect_restricted' : 'connect_required')
  }

  // Validate fields.
  const kind = str(formData.get('kind')) as InvoiceKind | null
  if (!kind || !INVOICE_KINDS.includes(kind)) return back('invalid_kind')
  const title = str(formData.get('title'))
  if (!title) return back('title_required')
  const amount_cents = cents(formData.get('amount'))
  if (!amount_cents) return back('invalid_amount')
  const customerEmail = str(formData.get('customer_email'))
  if (customerEmail && !/.+@.+\..+/.test(customerEmail)) return back('invalid_email')
  const currency = (str(formData.get('currency')) ?? 'usd').toLowerCase()
  const status: InvoiceStatus = formData.get('status') === 'draft' ? 'draft' : 'open'

  // Validate optional links are organizer-owned; derive customer_id / request_id
  // (never trust them from input). RLS additionally scopes every read.
  let customerId: string | null = null
  let requestId: string | null = requestIdIn

  if (planId) {
    const { data } = await supabase
      .from('ope_plans').select('id').eq('id', planId).eq('organizer_id', user.id).maybeSingle()
    if (!data) return back('invalid_plan')
  }
  if (bookingId) {
    const { data } = await supabase
      .from('bookings').select('id, customer_id, request_id')
      .eq('id', bookingId).eq('organizer_id', user.id).maybeSingle()
    if (!data) return back('invalid_booking')
    customerId = (data.customer_id as string | null) ?? customerId
    requestId = requestId ?? (data.request_id as string | null)
  }
  if (proposalId) {
    const { data } = await supabase
      .from('proposals').select('id, request_id')
      .eq('id', proposalId).eq('organizer_id', user.id).maybeSingle()
    if (!data) return back('invalid_proposal')
    requestId = requestId ?? (data.request_id as string | null)
  }
  if (requestId) {
    // customer_requests has no organizer_id; RLS lets a matched organizer read it.
    const { data } = await supabase
      .from('customer_requests').select('id, customer_id').eq('id', requestId).maybeSingle()
    if (!data) return back('invalid_request')
    customerId = customerId ?? (data.customer_id as string | null)
  }

  // Insert via the owner RLS client. token + paid/stripe fields intentionally omitted.
  const { error } = await supabase.from('invoices').insert({
    organizer_id: user.id,
    customer_id: customerId,
    customer_email: customerEmail,
    plan_id: planId,
    booking_id: bookingId,
    proposal_id: proposalId,
    request_id: requestId,
    kind,
    title,
    description: str(formData.get('description')),
    amount_cents,
    currency,
    status,
  })
  if (error) return back('save_error')

  revalidatePath(returnPath)
  back() // clean redirect (clears any prior ?invoiceError)
}

/**
 * Void an unpaid invoice the organizer owns. Ownership-only (no entitlement gate),
 * so a lapsed organizer can still clean up. Paid invoices cannot be voided.
 */
export async function voidInvoice(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const id = str(formData.get('invoice_id'))
  const planId = str(formData.get('plan_id'))
  const returnPath = planId ? `/${locale}/dashboard/plans/${planId}` : `/${locale}/dashboard`
  const back = (err?: string) => redirect(`${returnPath}${err ? `?invoiceError=${err}` : ''}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)
  if (!id) return back()

  const { data: inv } = await supabase
    .from('invoices').select('id, status')
    .eq('id', id).eq('organizer_id', user.id).maybeSingle()
  if (!inv) return back() // not found / not owned — no-op
  if (inv.status === 'paid') return back('cannot_void_paid')
  if (inv.status === 'void') return back() // idempotent

  const { error } = await supabase
    .from('invoices').update({ status: 'void' })
    .eq('id', id).eq('organizer_id', user.id)
  if (error) return back('save_error')

  revalidatePath(returnPath)
  back()
}
