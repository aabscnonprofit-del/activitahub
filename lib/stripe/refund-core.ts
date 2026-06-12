import type Stripe from 'stripe'
import type { createAdminClient } from '@/lib/supabase/server'
import { idOf, mapRefundStatus } from './refund-mapping'

// Refund-sync implementation. NO `server-only` import (so it is unit-testable and
// script-reusable); it is only imported by the webhook route, which is itself
// server-only. Writes use the service-role admin client (bypasses RLS), matching the
// existing booking-paid path in the webhook.
//
// Purpose: keep Supabase consistent with Stripe refunds that originate ANYWHERE —
// the in-app processRefund flow, the Stripe Dashboard, a manual API refund, or an
// async refund whose status settles later. The booking (linked by
// stripe_payment_intent_id) is the reconciled source of truth; any in-app
// refund_requests row is synced alongside it.

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

export interface RefundSyncArgs {
  /** PaymentIntent the refund belongs to — the link to a booking. */
  paymentIntentId: string | null
  /** The Stripe Refund id, when known. */
  stripeRefundId: string | null
  /** Raw Stripe refund status (may be non-terminal). */
  refundStatus: Stripe.Refund['status'] | null
  /** Whether the underlying charge is now FULLY refunded. */
  chargeFullyRefunded: boolean
}

/**
 * Reconcile one refund into Supabase. Idempotent: re-delivery / replay converges to
 * the same state. A booking is flipped to `refunded` only on a SUCCESSFUL, FULL
 * refund (the schema has no partial-refund state); a failed refund only marks the
 * in-app request `failed` and leaves the booking paid.
 */
export async function syncRefund(admin: AdminClient, args: RefundSyncArgs): Promise<void> {
  if (!args.paymentIntentId) return

  const mapped = mapRefundStatus(args.refundStatus)
  if (!mapped) return // pending / requires_action — nothing terminal to write yet

  const { data: booking } = await admin
    .from('bookings')
    .select('id, payment_status, status, calendar_event_id')
    .eq('stripe_payment_intent_id', args.paymentIntentId)
    .maybeSingle()
  if (!booking) return // refund for a charge we don't own (not a booking)

  const now = new Date().toISOString()

  // 1. Booking — flip to refunded only on a successful, full refund (idempotent).
  if (mapped === 'refunded' && args.chargeFullyRefunded && booking.payment_status !== 'refunded') {
    await admin
      .from('bookings')
      .update({ payment_status: 'refunded', status: 'refunded', updated_at: now })
      .eq('id', booking.id)
    if (booking.calendar_event_id) {
      await admin.from('calendar_events').delete().eq('id', booking.calendar_event_id)
    }
  }

  // 2. refund_requests — sync an in-app request row if one exists. Prefer an exact
  //    Stripe-refund-id match; otherwise settle any in-progress request for this
  //    booking. Externally-initiated refunds have no request row → no match, which
  //    is fine: the booking above carries the reconciled state.
  let patched = false
  if (args.stripeRefundId) {
    const { data } = await admin
      .from('refund_requests')
      .update({ status: mapped, stripe_refund_id: args.stripeRefundId, updated_at: now })
      .eq('booking_id', booking.id)
      .eq('stripe_refund_id', args.stripeRefundId)
      .select('id')
    patched = Array.isArray(data) && data.length > 0
  }
  if (!patched) {
    await admin
      .from('refund_requests')
      .update({
        status: mapped,
        ...(args.stripeRefundId ? { stripe_refund_id: args.stripeRefundId } : {}),
        updated_at: now,
      })
      .eq('booking_id', booking.id)
      .in('status', ['requested', 'approved'])
  }
}

/** `charge.refunded` — the charge object carries the PaymentIntent + full/partial flag. */
export async function handleChargeRefunded(admin: AdminClient, charge: Stripe.Charge): Promise<void> {
  const latest = charge.refunds?.data?.[0]
  await syncRefund(admin, {
    paymentIntentId: idOf(charge.payment_intent),
    stripeRefundId: latest?.id ?? null,
    refundStatus: latest?.status ?? 'succeeded',
    chargeFullyRefunded: charge.refunded === true,
  })
}

/**
 * `charge.refund.updated` — a single Refund's lifecycle (e.g. pending → succeeded /
 * failed). Retrieve the parent charge to learn whether it is now fully refunded, so
 * an async refund that settles later still flips the booking correctly.
 */
export async function handleChargeRefundUpdated(
  admin: AdminClient,
  stripe: Stripe,
  refund: Stripe.Refund
): Promise<void> {
  let chargeFullyRefunded = false
  const chargeId = idOf(refund.charge)
  if (chargeId) {
    try {
      const ch = await stripe.charges.retrieve(chargeId)
      chargeFullyRefunded = ch.refunded === true
    } catch {
      /* best effort — if the charge can't be read, fall back to request-only sync */
    }
  }
  await syncRefund(admin, {
    paymentIntentId: idOf(refund.payment_intent),
    stripeRefundId: refund.id,
    refundStatus: refund.status,
    chargeFullyRefunded,
  })
}
