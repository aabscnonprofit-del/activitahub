'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { absoluteUrl } from '@/lib/utils'

/**
 * Customer pays for a confirmed booking via Stripe Checkout (real PaymentIntent,
 * dynamic price). The webhook flips payment_status → 'paid' on completion.
 */
export async function createBookingCheckout(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const bookingId = formData.get('booking_id') as string
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const { data: b } = await supabase
    .from('bookings')
    .select('id, amount_cents, currency, status, payment_status, customer_id, activity_id')
    .eq('id', bookingId)
    .maybeSingle()
  if (!b || b.customer_id !== user.id) redirect(`/${locale}/bookings`)
  if (b.payment_status === 'paid') redirect(`/${locale}/bookings`)
  if (!b.amount_cents || b.amount_cents <= 0) redirect(`/${locale}/bookings?payment=noamount`)

  const { data: prof } = await supabase
    .from('profiles')
    .select('email, full_name, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const stripe = getStripe()
  let customerId = prof?.stripe_customer_id as string | null | undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: prof?.email ?? undefined,
      name: prof?.full_name ?? undefined,
      metadata: { profile_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  let name = 'Activity booking'
  if (b.activity_id) {
    const { data: act } = await supabase.from('activities').select('title').eq('id', b.activity_id).maybeSingle()
    if (act?.title) name = act.title
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: (b.currency as string) || 'usd',
          product_data: { name },
          unit_amount: b.amount_cents,
        },
        quantity: 1,
      },
    ],
    metadata: { booking_id: b.id, kind: 'booking' },
    payment_intent_data: { metadata: { booking_id: b.id, kind: 'booking' } },
    success_url: absoluteUrl(`/${locale}/bookings?payment=success`),
    cancel_url: absoluteUrl(`/${locale}/bookings?payment=cancelled`),
  })

  await supabase.rpc('start_booking_payment', { p_booking_id: b.id, p_session_id: session.id })
  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  redirect(session.url)
}

/** Customer or organizer requests a refund on a paid booking. */
export async function requestRefund(formData: FormData): Promise<void> {
  const bookingId = formData.get('booking_id') as string
  const reason = (formData.get('reason') as string)?.trim() || null
  const supabase = await createClient()
  await supabase.rpc('request_refund', { p_booking_id: bookingId, p_reason: reason })
  revalidatePath('/bookings')
  revalidatePath('/dashboard/bookings')
}

/**
 * Organizer/admin processes a refund: real stripe.refunds.create on the
 * booking's PaymentIntent, then finalize_refund() flips the DB state.
 */
export async function processRefund(formData: FormData): Promise<void> {
  const refundId = formData.get('refund_id') as string
  const bookingId = formData.get('booking_id') as string
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: b } = await supabase
    .from('bookings')
    .select('stripe_payment_intent_id')
    .eq('id', bookingId)
    .maybeSingle()
  const pi = (b as { stripe_payment_intent_id: string | null } | null)?.stripe_payment_intent_id
  if (!pi) return

  const stripe = getStripe()
  const refund = await stripe.refunds.create({ payment_intent: pi })
  await supabase.rpc('finalize_refund', { p_refund_id: refundId, p_stripe_refund_id: refund.id })
  revalidatePath('/dashboard/bookings')
  revalidatePath('/bookings')
}

export async function rejectRefund(formData: FormData): Promise<void> {
  const refundId = formData.get('refund_id') as string
  const supabase = await createClient()
  await supabase.rpc('reject_refund', { p_refund_id: refundId })
  revalidatePath('/dashboard/bookings')
}
