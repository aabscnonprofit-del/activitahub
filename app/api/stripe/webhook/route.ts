import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { pathToPaymentKind } from '@/lib/stripe/config'
import { syncSubscription, customerIdOf } from '@/lib/stripe/sync'
import { createAdminClient } from '@/lib/supabase/server'
import type { OnboardingPath } from '@/lib/types'

// Stripe needs the Node runtime (crypto) and the raw, unbuffered request body.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe webhook — the single authoritative writer of billing state.
 *
 * Flow:
 *   1. Verify the signature against STRIPE_WEBHOOK_SECRET (rejects forgeries).
 *   2. Dispatch on event type.
 *   3. Mutate profiles / payments / subscriptions via the service-role admin
 *      client (bypasses RLS — users never write these rows directly).
 *
 * All handlers are idempotent (upserts keyed on Stripe ids), so Stripe's
 * at-least-once delivery and retries converge to the same state.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not configured' },
      { status: 500 }
    )
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const payload = await request.text()

  let event: Stripe.Event
  const stripe = getStripe()
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const admin = await createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(admin, stripe, event.data.object)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(admin, event.data.object)
        break
      }

      case 'invoice.payment_failed':
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        await handleInvoice(admin, stripe, event.data.object)
        break
      }

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break
    }
  } catch (err) {
    // Returning 500 makes Stripe retry — appropriate for transient DB errors.
    const message = err instanceof Error ? err.message : 'Webhook handler error'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

/**
 * checkout.session.completed — fired for both certification (one-time) and
 * subscription checkouts. We branch on the `kind` metadata we set at creation.
 */
async function handleCheckoutCompleted(
  admin: AdminClient,
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<void> {
  const profileId = session.metadata?.profile_id
  const kind = session.metadata?.kind
  if (!profileId) return

  // Persist the Stripe customer id on the profile (idempotent).
  if (session.customer) {
    await admin
      .from('profiles')
      .update({ stripe_customer_id: customerIdOf(session.customer) })
      .eq('id', profileId)
  }

  if (kind === 'certification') {
    const path = session.metadata?.path as OnboardingPath | undefined
    if (!path) return

    await admin.from('payments').upsert(
      {
        profile_id: profileId,
        kind: pathToPaymentKind(path),
        status: 'completed',
        amount: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_checkout_session_id' }
    )

    // Paid for certification — they advance to the academy/test step.
    await admin
      .from('profiles')
      .update({ onboarding_status: 'payment_complete' })
      .eq('id', profileId)
    return
  }

  if (kind === 'subscription' && session.subscription) {
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    await syncSubscription(admin, subscription)
  }
}

/**
 * invoice.* — recurring charges. Re-sync the underlying subscription so its
 * status (active / past_due) and period end stay current.
 */
async function handleInvoice(
  admin: AdminClient,
  stripe: Stripe,
  invoice: Stripe.Invoice
): Promise<void> {
  const sub = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription
  if (!sub) return

  const subscriptionId = typeof sub === 'string' ? sub : sub.id
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await syncSubscription(admin, subscription)
}
