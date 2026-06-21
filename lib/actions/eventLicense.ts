'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { getOneEventLicensePriceId } from '@/lib/stripe/config'
import { absoluteUrl } from '@/lib/utils'

// One Event License (Activity Planner $9.99) checkout.
//
// Uses the EXISTING platform-checkout architecture — identical pattern to
// createCertificationCheckout: a platform `mode:'payment'` Checkout Session, the
// buyer pays the PLATFORM (never a connected account / no Stripe-Account header).
// The entitlement row is written by the webhook on checkout.session.completed
// (kind='one_event_license'); this action only mints the session. Does not touch
// the organizer subscription, certification checkout, or Stripe Connect.

/** Start a one-time $9.99 One Event License checkout for the signed-in user. */
export async function createOneEventLicenseCheckout(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const back = (q: string) => redirect(`/${locale}/plan-an-event?purchase=${q}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Purchase requires an account — the entitlement is recorded against the profile.
  if (!user) {
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/plan-an-event`)}`)
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, email, stripe_customer_id')
    .eq('id', user.id)
    .single()
  const profile = profileRow as { id: string; email: string | null; stripe_customer_id: string | null } | null
  if (!profile) return back('error')

  const stripe = getStripe()
  const priceId = getOneEventLicensePriceId()

  // Reuse the profile's Stripe customer if present; otherwise create + persist one
  // (a user may set their own stripe_customer_id under RLS).
  let customerId = profile.stripe_customer_id ?? undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email ?? undefined,
      metadata: { profile_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { profile_id: user.id, kind: 'one_event_license' },
    payment_intent_data: { metadata: { profile_id: user.id, kind: 'one_event_license' } },
    success_url: absoluteUrl(`/${locale}/plan-an-event?purchase=success`),
    cancel_url: absoluteUrl(`/${locale}/plan-an-event?purchase=cancelled`),
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  redirect(session.url)
}
