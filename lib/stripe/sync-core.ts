import type Stripe from 'stripe'
import type { createAdminClient } from '@/lib/supabase/server'
import { shouldGrantOrganizer, subscriptionFields } from './subscription-mapping'

// Subscription-sync implementation. Intentionally has NO `server-only` import so it
// is unit-testable and reusable by maintenance scripts; the server-only guard lives
// on the public re-export (lib/stripe/sync.ts), which is what app/runtime code imports.

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

/**
 * Mirrors a Stripe subscription into our `subscriptions` table and keeps the owning
 * profile's role / onboarding_status in sync. Stripe is the source of truth; this is
 * the single writer of subscription state. Idempotent: upserts on profile_id.
 *
 * OUT-OF-ORDER SAFETY: pass a subscription that reflects Stripe's CURRENT state — a
 * freshly-retrieved one, not a raw webhook payload (which may be stale / out of
 * order). Webhook callers use `syncSubscriptionById`; checkout/invoice already pass
 * an SDK-retrieved subscription.
 *
 * Writes use the passed-in service-role admin client (bypasses RLS).
 */
export async function syncSubscription(
  admin: AdminClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const f = subscriptionFields(subscription)

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, onboarding_status')
    .eq('stripe_customer_id', f.customerId)
    .maybeSingle()

  if (!profile) {
    // No profile for this customer yet — nothing to mirror.
    return
  }

  await admin.from('subscriptions').upsert(
    {
      profile_id: profile.id,
      status: f.status,
      stripe_customer_id: f.customerId,
      stripe_subscription_id: f.stripe_subscription_id,
      stripe_price_id: f.stripe_price_id,
      current_period_end: f.current_period_end,
      cancel_at_period_end: f.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' }
  )

  // Upgrade only an already-certified profile on a live subscription. Never downgrade
  // (access is revoked at access-time by hasOrganizerAccess reading the row status).
  if (shouldGrantOrganizer(profile, f.status)) {
    await admin
      .from('profiles')
      .update({ role: 'certified_organizer', onboarding_status: 'subscribed' })
      .eq('id', profile.id)
  }
}

/**
 * Out-of-order-safe sync: re-RETRIEVE the subscription from Stripe (current truth)
 * and mirror that, ignoring whatever (possibly stale) status the triggering webhook
 * event carried. This is the fix for the "active → incomplete" regression — a late
 * `customer.subscription.created` (incomplete) can no longer overwrite an `active`
 * row, because we always write Stripe's present state.
 */
export async function syncSubscriptionById(
  admin: AdminClient,
  stripe: Stripe,
  subscriptionId: string
): Promise<void> {
  const fresh = await stripe.subscriptions.retrieve(subscriptionId)
  await syncSubscription(admin, fresh)
}
