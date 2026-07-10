'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import { getMyConnectAccount } from '@/lib/billing/connect.server'
import { organizerCanReceivePayments, deriveConnectStatus } from '@/lib/billing/connect'
import { createConnectCheckoutSession } from '@/lib/billing/connect-checkout'
import { absoluteUrl } from '@/lib/utils'
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
  if (!user) redirect(`/${locale}/sign-in`)

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
  if (!user) redirect(`/${locale}/sign-in`)
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

// ── Public token-gated payment flow (Commit 5) ──────────────────────────────
// Anonymous customers pay an invoice via its durable token. No login. The lookup
// returns only curated fields (SECURITY DEFINER invoice_lookup RPC); the checkout
// reads the full row via the service role (anon cannot RLS-read invoices) and pays
// through the shared Connect helper so funds settle to the organizer's account.
// All customer money flows through invoices — Booking is agreement only.

/** Public read of an invoice's safe fields by token (no auth). NULL if not found. */
export async function invoiceLookup(token: string): Promise<Record<string, unknown> | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('invoice_lookup', { p_token: token })
  return (data as Record<string, unknown>) ?? null
}

/**
 * Anonymous, token-gated: create a Stripe Checkout Session for an open invoice and
 * redirect the payer to Stripe. Re-validates payability server-side; amount/currency/
 * payee all come from the DB row, never the client. Funds settle to the organizer's
 * connected account via createConnectCheckoutSession (destination + on_behalf_of).
 */
export async function createInvoiceCheckout(formData: FormData): Promise<void> {
  const token = (formData.get('token') as string) || ''
  const locale = (formData.get('locale') as string) || 'en'
  const pay = (reason: string) => redirect(`/${locale}/invoice/${token}?pay=${reason}`)
  if (!token) redirect(`/${locale}`)

  // Anonymous reader: the invoices table has no anon RLS policy, so read the row
  // we need via the service role (token is the capability).
  const admin = await createAdminClient()
  const { data: inv, error } = await admin
    .from('invoices')
    .select('id, organizer_id, amount_cents, currency, title, status, customer_email')
    .eq('token', token)
    .maybeSingle()
  if (error) return pay('lookup_error')
  if (!inv) return pay('notfound')
  if (inv.status === 'paid') redirect(`/${locale}/invoice/${token}?paid=1`)
  if (inv.status !== 'open') return pay('not_payable') // draft or void cannot be paid

  const result = await createConnectCheckoutSession({
    organizerId: inv.organizer_id as string,
    amountCents: inv.amount_cents as number,
    currency: inv.currency as string,
    name: inv.title as string,
    customerEmail: (inv.customer_email as string | null) ?? undefined,
    metadata: { kind: 'invoice', invoice_id: inv.id as string },
    successUrl: absoluteUrl(`/${locale}/invoice/${token}?paid=1`),
    cancelUrl: absoluteUrl(`/${locale}/invoice/${token}`),
    idempotencyKey: `invoice_checkout_${inv.id as string}`,
  })
  if (!result.ok) return pay(result.reason)

  // Best-effort audit: persist the session + destination snapshot (service role,
  // pay-time fields). Never block payment on this write — the webhook marks paid by
  // metadata.invoice_id regardless.
  const { error: upErr } = await admin
    .from('invoices')
    .update({
      stripe_checkout_session_id: result.sessionId,
      stripe_destination_account_id: result.accountId,
    })
    .eq('id', inv.id)
  if (upErr) console.warn(`[invoice checkout] session persist failed for ${inv.id}: ${upErr.message}`)

  redirect(result.url)
}
