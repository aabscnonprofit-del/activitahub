/**
 * Stripe Connect status derivation + the receive-payments entitlement gate.
 *
 * Pure and dependency-free (mirrors lib/auth/organizer-access.ts): safe to import
 * from server actions, route handlers, and UI. Reads only the persisted Connect
 * capability flags (migration 035) — it never calls Stripe. Those flags are kept
 * in sync from Stripe by the account.updated webhook (a later commit).
 *
 * Fail-closed: an absent account or anything short of charges_enabled means the
 * organizer cannot yet receive customer funds.
 */

import type { OrganizerConnectAccount } from '@/lib/types'

/** Organizer-facing Connect state, derived from the capability flags. */
export type ConnectStatus =
  | 'none' // no connected account yet
  | 'onboarding' // account exists but hosted onboarding not finished
  | 'restricted' // onboarding submitted but Stripe has not enabled charges (needs more info)
  | 'enabled' // charges enabled — ready to receive customer payments

/**
 * Derive the organizer's Connect status from their account row (or null).
 * charges_enabled implies onboarding is complete, so it takes precedence.
 */
export function deriveConnectStatus(account: OrganizerConnectAccount | null | undefined): ConnectStatus {
  if (!account || !account.stripe_account_id) return 'none'
  if (account.charges_enabled) return 'enabled'
  if (account.details_submitted) return 'restricted'
  return 'onboarding'
}

/**
 * The hard gate for accepting customer money: true only when a connected account
 * exists AND Stripe has enabled charges on it. Equivalent to status === 'enabled'.
 */
export function organizerCanReceivePayments(account: OrganizerConnectAccount | null | undefined): boolean {
  return Boolean(account?.stripe_account_id) && account?.charges_enabled === true
}
