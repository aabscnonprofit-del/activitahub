/**
 * Organizer Platform access entitlement — the single source of truth for
 * "is this user allowed to publish / manage / accept as an organizer?".
 *
 * Pure, dependency-free, and edge-safe (imported by middleware and server
 * actions alike). Access requires the certified_organizer role AND either an
 * active/trialing paid subscription OR a live certification-included window.
 *
 * Decision (2026-06-07): the 30-day window is granted at certification, not at
 * payment; after it lapses an active subscription is required. See
 * supabase/migrations/017_organizer_access.sql.
 */

export type OrganizerAccessInput = {
  role?: string | null
  /** subscriptions.status, if any. */
  subscriptionStatus?: string | null
  /** profiles.organizer_access_until (ISO string), if any. */
  organizerAccessUntil?: string | null
  /** Override "now" (ms) for testing; defaults to Date.now(). */
  now?: number
}

/** True if the included certification window is still live. */
export function hasIncludedAccess(organizerAccessUntil?: string | null, now?: number): boolean {
  if (!organizerAccessUntil) return false
  const until = Date.parse(organizerAccessUntil)
  return !Number.isNaN(until) && until > (now ?? Date.now())
}

/** True if the user may use the Organizer Platform (publish/manage/accept). */
export function hasOrganizerAccess(input: OrganizerAccessInput): boolean {
  if (input.role === 'admin') return true
  if (input.role !== 'certified_organizer') return false

  const sub = input.subscriptionStatus
  if (sub === 'active' || sub === 'trialing') return true

  return hasIncludedAccess(input.organizerAccessUntil, input.now)
}
