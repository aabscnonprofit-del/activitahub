import type Stripe from 'stripe'

/**
 * Pure Stripe-refund → DB mapping. No I/O, no `server-only`, so it is importable by
 * the webhook, scripts, and tests. The DB writes live in lib/stripe/refund-core.ts.
 */

/** Our terminal refund states (refund_requests.refund_status). */
export type RefundDbStatus = 'refunded' | 'failed'

/**
 * Map a Stripe refund status to our terminal status, or null when it is not yet
 * terminal (`pending` / `requires_action`) — in which case we write nothing and
 * wait for the next `charge.refund.updated`.
 */
export function mapRefundStatus(
  status: Stripe.Refund['status'] | null | undefined
): RefundDbStatus | null {
  if (status === 'succeeded') return 'refunded'
  if (status === 'failed' || status === 'canceled') return 'failed'
  return null
}

/** Extract an id string from a Stripe field that may be an id or an expanded object. */
export function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref.id
}
