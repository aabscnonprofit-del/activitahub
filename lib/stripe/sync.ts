import 'server-only'
import type Stripe from 'stripe'
import type { createAdminClient } from '@/lib/supabase/server'
import type { SubscriptionStatus } from '@/lib/types'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

/**
 * Normalises a Stripe subscription status to our DB enum.
 * The only spelling difference is Stripe's 'canceled' → our 'cancelled'.
 */
export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'canceled') return 'cancelled'
  return status as SubscriptionStatus
}

/** Extracts the customer id string from a Stripe object's `customer` field. */
export function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer
): string {
  return typeof customer === 'string' ? customer : customer.id
}

/**
 * Mirrors a Stripe subscription into our `subscriptions` table and keeps the
 * owning profile's role / onboarding_status in sync.
 *
 * Stripe is the source of truth; this is the single place that writes
 * subscription state, so every webhook event funnels through here. Idempotent:
 * upserts on profile_id, so replayed events converge to the same row.
 *
 * Writes use the passed-in service-role admin client (bypasses RLS).
 */
export async function syncSubscription(
  admin: AdminClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = customerIdOf(subscription.customer)

  // Resolve the owning profile via the Stripe customer id.
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, onboarding_status')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (!profile) {
    // No profile for this customer yet — nothing to mirror. The checkout
    // handler persists stripe_customer_id before any subscription event
    // matters, so this only happens for unrelated customers.
    return
  }

  const status = mapStripeStatus(subscription.status)
  const priceId = subscription.items.data[0]?.price.id ?? null

  await admin.from('subscriptions').upsert(
    {
      profile_id: profile.id,
      status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' }
  )

  // An active/trialing subscription certifies the profile as a subscribed
  // organizer. We never auto-downgrade the role here — losing an active
  // subscription gates dashboard access (middleware) without revoking
  // certification.
  if (status === 'active' || status === 'trialing') {
    await admin
      .from('profiles')
      .update({ role: 'certified_organizer', onboarding_status: 'subscribed' })
      .eq('id', profile.id)
  }
}
