'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import {
  getCertificationPriceId,
  getSubscriptionPriceId,
} from '@/lib/stripe/config'
import { absoluteUrl } from '@/lib/utils'
import type { Profile } from '@/lib/types'

type CheckoutProfile = Pick<
  Profile,
  'id' | 'email' | 'full_name' | 'selected_path' | 'onboarding_status' | 'stripe_customer_id'
>

/**
 * Returns the profile's Stripe customer id, creating the customer on first use
 * and persisting it back to the profile. The write goes through the user's own
 * RLS-scoped client (a user may set their own stripe_customer_id).
 */
async function ensureStripeCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: CheckoutProfile
): Promise<string> {
  if (profile.stripe_customer_id) return profile.stripe_customer_id

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email: profile.email ?? undefined,
    name: profile.full_name ?? undefined,
    metadata: { profile_id: profile.id },
  })

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', profile.id)

  return customer.id
}

async function getAuthedProfile(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  profile: CheckoutProfile
  locale: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, selected_path, onboarding_status, stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!data) throw new Error('Profile not found')

  return { supabase, profile: data as CheckoutProfile, locale: 'en' }
}

/**
 * Onboarding → Stripe: one-time certification payment.
 * Creates a Checkout Session (mode=payment) for the user's selected path and
 * marks onboarding as payment_pending. The webhook flips it to payment_complete.
 */
export async function createCertificationCheckout(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const { supabase, profile } = await getAuthedProfile()

  if (!profile.selected_path) {
    redirect(`/${locale}/onboarding`)
  }
  const path = profile.selected_path

  // B1: experienced path may pay only AFTER the review application is activated.
  // Rejected/redirected applicants never reach checkout, so are not charged.
  if (path === 'experienced') {
    const { data: app } = await supabase.rpc('get_experienced_application')
    if ((app as { status?: string } | null)?.status !== 'activated') {
      redirect(`/${locale}/onboarding/experienced`)
    }
  }

  const customerId = await ensureStripeCustomer(supabase, profile)
  const priceId = getCertificationPriceId(path)

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { profile_id: profile.id, kind: 'certification', path },
    payment_intent_data: {
      metadata: { profile_id: profile.id, kind: 'certification', path },
    },
    success_url: absoluteUrl(`/${locale}/onboarding?checkout=success`),
    cancel_url: absoluteUrl(`/${locale}/onboarding?checkout=cancelled`),
  })

  // Mark intent to pay. The webhook is authoritative for completion.
  await supabase
    .from('profiles')
    .update({ onboarding_status: 'payment_pending' })
    .eq('id', profile.id)

  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  redirect(session.url)
}

/**
 * Billing → Stripe: recurring subscription checkout.
 * Creates a Checkout Session (mode=subscription). The webhook upserts the
 * subscription row and upgrades the profile to a subscribed organizer.
 */
export async function createSubscriptionCheckout(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const { supabase, profile } = await getAuthedProfile()

  // No subscription before certification — certification is the gateway to the
  // Organizer Platform. A non-certified profile (status not yet 'certified' or
  // 'subscribed') is routed back to onboarding instead of being charged.
  if (
    profile.onboarding_status !== 'certified' &&
    profile.onboarding_status !== 'subscribed'
  ) {
    redirect(`/${locale}/onboarding`)
  }

  const customerId = await ensureStripeCustomer(supabase, profile)
  const priceId = getSubscriptionPriceId()

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { profile_id: profile.id, kind: 'subscription' },
    subscription_data: {
      metadata: { profile_id: profile.id, kind: 'subscription' },
    },
    // Subscription active → land the organizer in their Dashboard, not on the Billing page. (Billing
    // stays reachable via nav.) If the activating webhook hasn't landed yet, the /dashboard gate
    // routes to /billing as before — never worse than the prior behavior, and no new loop.
    success_url: absoluteUrl(`/${locale}/dashboard?checkout=success`),
    cancel_url: absoluteUrl(`/${locale}/billing?checkout=cancelled`),
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  redirect(session.url)
}

/**
 * Billing → Stripe Customer Portal: manage / update / cancel subscription.
 */
export async function createBillingPortalSession(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const { profile } = await getAuthedProfile()

  if (!profile.stripe_customer_id) {
    redirect(`/${locale}/billing`)
  }

  const stripe = getStripe()
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: absoluteUrl(`/${locale}/billing`),
  })

  redirect(portal.url)
}
