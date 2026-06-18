'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'

/**
 * RETIRED (launch Task #2): the legacy booking checkout was platform-collected (no
 * Stripe Connect destination), which conflicts with the decided billing architecture —
 * a Booking is agreement-only and ALL customer money flows through invoices on Stripe
 * Connect (settling to the organizer). This action no longer creates any Stripe Checkout
 * session; it redirects back with a marker. Refunds (below) are unchanged. The
 * booking→invoice bridge is a separate, decided-but-unbuilt follow-up.
 */
export async function createBookingCheckout(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  redirect(`/${locale}/bookings?pay=via_invoice`)
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
