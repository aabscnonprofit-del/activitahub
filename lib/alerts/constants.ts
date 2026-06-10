// Activity Alerts — shared constants + anti-spam rules.

export const ALERT_RADII_MILES = [5, 25, 50, 100] as const
export type AlertRadiusMiles = (typeof ALERT_RADII_MILES)[number]
export const milesToKm = (m: number) => Math.round(m * 1.60934)
export const kmToMiles = (km: number) => Math.round(km / 1.60934)

export const ALERT_FREQUENCIES = ['immediate', 'daily_digest'] as const

/**
 * Anti-spam rules (enforced in lib/alerts/dispatch.ts):
 *  - maxPerDay: at most N `activity_alert` in-app notifications per participant
 *    per rolling 24h.
 *  - dedup: a participant is alerted at most once per activity, enforced by the
 *    UNIQUE(activity_id, profile_id) constraint on activity_alert_deliveries.
 *  - consent: only participants with an alert_preferences row and paused=false
 *    are ever considered (no notifications without opt-in).
 *  - never notify the organizer about their own activity.
 *  - one dispatch per activity (activities.alerts_sent_at idempotency guard).
 */
export const ANTI_SPAM = {
  maxPerDay: 8,
} as const

export const DEFAULT_PREFERENCES = {
  categories: [] as string[],
  language: null as string | null,
  radius_km: 40,
  frequency: 'immediate' as (typeof ALERT_FREQUENCIES)[number],
  city: null as string | null,
  country: null as string | null,
  in_app: true,
  push: false,
  paused: false,
}
