import type Stripe from 'stripe'
import type { SubscriptionStatus } from '@/lib/types'

/**
 * Pure Stripe-subscription → DB mapping. No I/O, no secrets, NO `server-only`, so
 * it is safely importable by the webhook, the reconcile script, and tests alike.
 * The actual DB writes live in lib/stripe/sync.ts (server-only).
 */

/** Stripe status → our enum. Only spelling difference: 'canceled' → 'cancelled'. */
export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'canceled') return 'cancelled'
  return status as SubscriptionStatus
}

/** Extract the customer id string from a Stripe object's `customer` field. */
export function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer
): string {
  return typeof customer === 'string' ? customer : customer.id
}

export interface SubscriptionFields {
  customerId: string
  status: SubscriptionStatus
  stripe_subscription_id: string
  stripe_price_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

/**
 * Flatten a Stripe Subscription into the columns we persist.
 *
 * `current_period_end` moved from the Subscription to its items in newer Stripe
 * API versions (clover). Read the item value first, fall back to the legacy
 * top-level field — correct whether the object arrived via a raw webhook payload
 * (account default version) or an SDK retrieve (our pinned version).
 */
export function subscriptionFields(subscription: Stripe.Subscription): SubscriptionFields {
  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id ?? null

  const periodEndUnix =
    (firstItem as { current_period_end?: number })?.current_period_end ??
    (subscription as { current_period_end?: number }).current_period_end
  const current_period_end =
    typeof periodEndUnix === 'number' ? new Date(periodEndUnix * 1000).toISOString() : null

  return {
    customerId: customerIdOf(subscription.customer),
    status: mapStripeStatus(subscription.status),
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    current_period_end,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }
}

export type ProfileGrantInput = { role?: string | null; onboarding_status?: string | null }

/**
 * A subscription NEVER confers certification. Grant the certified_organizer role +
 * 'subscribed' status only to a profile that is ALREADY certified (signalled by
 * onboarding_status or the role already present) AND whose subscription is live.
 * We never downgrade here.
 */
export function shouldGrantOrganizer(profile: ProfileGrantInput, status: SubscriptionStatus): boolean {
  if (status !== 'active' && status !== 'trialing') return false
  return (
    profile.onboarding_status === 'certified' ||
    profile.onboarding_status === 'subscribed' ||
    profile.role === 'certified_organizer'
  )
}
