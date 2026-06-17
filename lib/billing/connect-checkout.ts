import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { getStripe, isStripeConfigured } from '@/lib/stripe/client'
import { deriveConnectStatus, organizerCanReceivePayments } from '@/lib/billing/connect'
import type { OrganizerConnectAccount } from '@/lib/types'

// ── Shared Stripe Connect checkout helper (Invoice MVP Commit 3) ────────────
// Builds a destination-charge Checkout Session that settles to the ORGANIZER's
// connected account (transfer_data.destination + on_behalf_of). Generic plumbing:
// it takes already-trusted, server-resolved values (amount/currency/name come
// from the DB row, never from the client) and is the single place that loads the
// organizer's connect account and enforces the receive-payments gate.
//
// Destination charges are created on the PLATFORM account (no stripeAccount), so
// the existing platform webhook still receives checkout.session.completed.
//
// Scope: does not read/write invoices, does not touch the webhook, no UI, no
// application_fee (100% to organizer), no booking-checkout change.

export type ConnectCheckoutInput = {
  /** Payee — server-resolved (e.g. invoices.organizer_id); never from the client. */
  organizerId: string
  /** Line item, resolved by the caller from the DB row (never client-supplied). */
  amountCents: number
  currency: string
  name: string
  /** Optional guest email for the receipt (no platform Customer is created). */
  customerEmail?: string | null
  /** Caller metadata; the invoice caller passes { kind: 'invoice', invoice_id }. */
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
  /** Optional Stripe idempotency seed (e.g. `invoice_checkout_<id>`). */
  idempotencyKey?: string
}

export type ConnectCheckoutResult =
  | { ok: true; url: string; sessionId: string; accountId: string }
  | {
      ok: false
      reason:
        | 'not_connected'
        | 'onboarding'
        | 'restricted'
        | 'invalid_amount'
        | 'stripe_unconfigured'
        | 'lookup_error'
        | 'stripe_error'
        | 'no_session_url'
    }

/**
 * Create a Connect destination-charge Checkout Session for one organizer.
 * Returns a discriminated result (never throws into the caller) so an anonymous
 * pay action can redirect gracefully on any failure.
 */
export async function createConnectCheckoutSession(
  input: ConnectCheckoutInput
): Promise<ConnectCheckoutResult> {
  // Defensive: the DB CHECK already guarantees amount_cents > 0, but never trust
  // an unresolved/zero amount through to Stripe.
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || !input.currency) {
    return { ok: false, reason: 'invalid_amount' }
  }
  if (!isStripeConfigured()) return { ok: false, reason: 'stripe_unconfigured' }

  // Load the organizer's connect account via the service role: the payer is
  // anonymous and the row is RLS owner-only, so an owner-scoped read is unavailable.
  const admin = await createAdminClient()
  const { data: account, error: lookupErr } = await admin
    .from('organizer_connect_accounts')
    .select('*')
    .eq('organizer_id', input.organizerId)
    .maybeSingle()

  if (lookupErr) return { ok: false, reason: 'lookup_error' }

  const acct = (account as OrganizerConnectAccount) ?? null

  // Money gate: never mint a payable session for an organizer Stripe cannot pay.
  if (!organizerCanReceivePayments(acct)) {
    // Not payable, so status is none/onboarding/restricted ('enabled' is unreachable here).
    const status = deriveConnectStatus(acct)
    const reason =
      status === 'restricted' ? 'restricted' : status === 'onboarding' ? 'onboarding' : 'not_connected'
    return { ok: false, reason }
  }

  const accountId = acct!.stripe_account_id
  const stripe = getStripe()

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: input.customerEmail ?? undefined,
        line_items: [
          {
            price_data: {
              currency: input.currency,
              product_data: { name: input.name },
              unit_amount: input.amountCents,
            },
            quantity: 1,
          },
        ],
        metadata: input.metadata,
        payment_intent_data: {
          // Destination charge: funds settle to the organizer's connected account,
          // which is also the settlement merchant (on_behalf_of). No platform fee.
          transfer_data: { destination: accountId },
          on_behalf_of: accountId,
          metadata: input.metadata,
        },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    )

    if (!session.url) return { ok: false, reason: 'no_session_url' }
    return { ok: true, url: session.url, sessionId: session.id, accountId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error(`[connect-checkout] session create failed for ${input.organizerId}: ${message}`)
    return { ok: false, reason: 'stripe_error' }
  }
}
