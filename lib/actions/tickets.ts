'use server'

import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/utils'
import { createConnectCheckoutSession } from '@/lib/billing/connect-checkout'
import { getTicketContext } from '@/lib/tickets/context.server'
import { getParticipantForAccount } from '@/lib/participants/store'

// Phase 1 ticket checkout. Paid and donation tickets route a one-time Stripe Connect DESTINATION
// charge to the organizer's connected account via the existing createConnectCheckoutSession. The
// participant is admitted ONLY after the webhook confirms payment (062 design: paid/donation create
// no participant up front). Reuses the existing checkout + webhook (metadata.kind='ticket'); no new
// payment rail, no Ticket entity, no project-level ticket price (paid price = occurrence price).

export type TicketCheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false
      error:
        | 'not_authenticated'
        | 'not_available'
        | 'not_ticketed'
        | 'already_participant'
        | 'not_connected'
        | 'no_price'
        | 'invalid_amount'
        | 'checkout_failed'
    }

const MAX_DONATION_CENTS = 1_000_000 // $10,000 sanity ceiling

export async function startTicketCheckout(
  projectId: string,
  locale: string,
  donationAmountCents?: number,
): Promise<TicketCheckoutResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  const ctx = await getTicketContext(projectId)
  if (!ctx) return { ok: false, error: 'not_available' }
  if (ctx.joinPolicy !== 'ticket' || (ctx.ticketType !== 'paid' && ctx.ticketType !== 'donation')) {
    return { ok: false, error: 'not_ticketed' }
  }

  // Never charge someone who already holds a spot.
  const mine = await getParticipantForAccount(supabase, projectId, user.id)
  if (mine?.status === 'approved') return { ok: false, error: 'already_participant' }

  // Safety gate: the organizer must be able to receive payments (charges_enabled).
  if (!ctx.canReceivePayments) return { ok: false, error: 'not_connected' }

  // Amount: paid = the occurrence price; donation = the participant-entered amount.
  let amountCents: number
  if (ctx.ticketType === 'donation') {
    amountCents = Math.floor(donationAmountCents ?? 0)
    if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > MAX_DONATION_CENTS) {
      return { ok: false, error: 'invalid_amount' }
    }
  } else {
    if (!ctx.priceCents || ctx.priceCents <= 0) return { ok: false, error: 'no_price' }
    amountCents = ctx.priceCents
  }

  const result = await createConnectCheckoutSession({
    organizerId: ctx.ownerId,
    amountCents,
    currency: 'usd',
    name: ctx.ticketType === 'donation' ? 'Activity donation' : 'Activity ticket',
    customerEmail: user.email ?? null,
    metadata: { kind: 'ticket', project_id: projectId, buyer_profile_id: user.id, locale },
    successUrl: absoluteUrl(`/${locale}/p/${projectId}?ticket=success`),
    cancelUrl: absoluteUrl(`/${locale}/p/${projectId}?ticket=cancelled`),
    idempotencyKey: `ticket_${projectId}_${user.id}_${amountCents}`,
  })

  if (!result.ok) return { ok: false, error: 'checkout_failed' }
  return { ok: true, url: result.url }
}
