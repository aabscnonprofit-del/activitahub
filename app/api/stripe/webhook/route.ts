import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { pathToPaymentKind } from '@/lib/stripe/config'
import { syncSubscription, syncSubscriptionById } from '@/lib/stripe/sync'
import { customerIdOf } from '@/lib/stripe/subscription-mapping'
import { handleChargeRefunded, handleChargeRefundUpdated } from '@/lib/stripe/refund-core'
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
  // Two Stripe webhook endpoints deliver to this URL, each with its own signing secret:
  //  - the platform ("Your account") endpoint → billing events (checkout/subscription/invoice/refund);
  //  - the Connected-accounts endpoint (connect=true) → connected-account `account.updated`.
  // A Stripe endpoint's scope is a single boolean, so a second endpoint (not a scope change on the
  // first, which would drop the platform events) is required to receive Connect events. We verify the
  // signature against whichever secret matches. STRIPE_WEBHOOK_SECRET_CONNECT is optional — when unset,
  // behavior is identical to the single platform-secret configuration.
  const webhookSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_CONNECT,
  ].filter((s): s is string => Boolean(s))
  if (webhookSecrets.length === 0) {
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

  // Accept the event if it verifies against any configured endpoint secret.
  let event: Stripe.Event | null = null
  let lastError = 'Invalid signature'
  const stripe = getStripe()
  for (const secret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret)
      break
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Invalid signature'
    }
  }
  if (!event) {
    return NextResponse.json({ error: lastError }, { status: 400 })
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
        // Re-retrieve from Stripe rather than trusting the (possibly stale /
        // out-of-order) event payload, so an old 'incomplete' event can't regress
        // an 'active' row and revoke a paid organizer's access.
        await syncSubscriptionById(admin, stripe, event.data.object.id)
        break
      }

      case 'invoice.payment_failed':
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        await handleInvoice(admin, stripe, event.data.object)
        break
      }

      case 'charge.refunded': {
        // A charge was refunded (in-app, Dashboard, or API) — reconcile the booking.
        await handleChargeRefunded(admin, event.data.object as Stripe.Charge)
        break
      }

      case 'charge.refund.updated': {
        // An individual refund's status settled (e.g. async pending → succeeded).
        await handleChargeRefundUpdated(admin, stripe, event.data.object as Stripe.Refund)
        break
      }

      case 'account.updated': {
        // A connected (organizer) account's capabilities changed — sync the flags
        // that gate receiving customer funds. Sync-only; never creates rows.
        await handleAccountUpdated(admin, event.data.object as Stripe.Account)
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

  // Booking payment — mark the booking paid (no profile_id in metadata).
  if (kind === 'booking') {
    const bookingId = session.metadata?.booking_id
    if (bookingId) {
      await admin
        .from('bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
          stripe_payment_intent_id:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
    }
    return
  }

  // Invoice payment — all customer money flows through invoices (Booking is the
  // agreement, not a payment rail). Flip the open invoice to paid; no profile_id
  // (the payer is anonymous), so this must run before the profile_id guard below.
  if (kind === 'invoice') {
    const invoiceId = session.metadata?.invoice_id
    if (!invoiceId) return // nothing to reconcile — ignore safely

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null)

    // Only an 'open' invoice transitions to paid, so reprocessing the same event
    // (or a paid/void invoice) is a harmless no-op.
    const { data, error } = await admin
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq('id', invoiceId)
      .eq('status', 'open')
      .select('organizer_id')

    // Surface DB failures so Stripe retries rather than silently losing paid state.
    if (error) {
      throw new Error(`invoice paid-sync failed for ${invoiceId}: ${error.message}`)
    }

    // Notify the organizer once, only on the actual open→paid transition (a
    // duplicate delivery flips nothing, so it won't re-notify). Best-effort: a
    // failed notification never blocks acknowledging the payment.
    const organizerId = data?.[0]?.organizer_id as string | undefined
    if (organizerId) {
      const { error: notifyErr } = await admin.from('notifications').insert({
        profile_id: organizerId,
        type: 'invoice_paid',
        title: 'Invoice paid',
        body: 'A customer paid an invoice.',
        data: { invoice_id: invoiceId },
      })
      if (notifyErr) {
        console.warn(`[stripe webhook] invoice_paid notification failed for ${invoiceId}: ${notifyErr.message}`)
      }
    }
    return
  }

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

  // One Event License (Activity Planner $9.99) — record the consumable entitlement
  // (one purchase = one active license). Idempotent: keyed on the Checkout Session id.
  if (kind === 'one_event_license') {
    await admin.from('event_licenses').upsert(
      {
        profile_id: profileId,
        status: 'active',
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

/**
 * account.updated — keep an organizer's Stripe Connect (Express) capability flags
 * in sync (migration 035). Mirrors Stripe's own state onto the row; the derived
 * receive-payments gate (organizerCanReceivePayments) follows automatically.
 *
 * Sync-only: keyed on stripe_account_id (UNIQUE), it UPDATEs an existing row and
 * NEVER inserts — the onboarding action is the sole creator of rows. An
 * account.updated for an untracked acct_ is acknowledged and ignored (no row
 * created, no error → Stripe stops retrying). Reprocessing the same event
 * converges to the same values (idempotent).
 */
async function handleAccountUpdated(
  admin: AdminClient,
  account: Stripe.Account
): Promise<void> {
  const { data, error } = await admin
    .from('organizer_connect_accounts')
    .update({
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
      disabled_reason: account.requirements?.disabled_reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id)
    .select('organizer_id')

  // A real DB failure must NOT be acknowledged: throw so the outer catch returns
  // 500 and Stripe retries, otherwise a capability change (e.g. a restriction
  // flipping charges_enabled to false) could be silently lost.
  if (error) {
    throw new Error(`account.updated sync failed for ${account.id}: ${error.message}`)
  }

  if (!data || data.length === 0) {
    // Untracked connected account — acknowledge without creating a row.
    console.warn(`[stripe webhook] account.updated for untracked account ${account.id}; ignoring`)
  }
}
