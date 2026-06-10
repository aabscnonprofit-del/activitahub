import 'server-only'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { buildAlertNotification } from './templates'
import { sendWebPush } from './push'
import { ANTI_SPAM } from './constants'

export type DispatchActivity = {
  id: string
  organizer_id: string
  title: string
  category: string | null
  city: string | null
  country: string | null
  status: string
  alerts_sent_at?: string | null
}

type Pref = {
  profile_id: string
  language: string | null
  frequency: string
  city: string | null
  in_app: boolean
  push: boolean
}

/**
 * Fan a newly published activity out to opted-in, matching participants.
 * Matching (v1): category overlap AND city-level location AND not-paused AND not
 * the organizer. Respects per-user daily cap and per-activity dedup. Immediate
 * users get an in-app notification (+ web push); daily-digest users are queued
 * for the digest cron. Idempotent via activities.alerts_sent_at. Never throws —
 * returns the reached count, or null if it could not run (e.g. migration 019 not
 * yet applied).
 */
export async function dispatchActivityAlerts(activity: DispatchActivity): Promise<{ reached: number } | null> {
  if (activity.status !== 'published' || !activity.category) return null

  let admin: ReturnType<typeof createServiceClient>
  try {
    admin = createServiceClient()
  } catch {
    return null
  }

  try {
    // Idempotency — dispatch a given activity only once.
    const { data: act, error: actErr } = await admin
      .from('activities')
      .select('alerts_sent_at')
      .eq('id', activity.id)
      .single()
    if (actErr || !act || (act as { alerts_sent_at?: string | null }).alerts_sent_at) return null

    // Candidate participants: opted in for this category, active.
    const { data: prefsData } = await admin
      .from('alert_preferences')
      .select('profile_id, language, frequency, city, in_app, push')
      .contains('categories', [activity.category])
      .eq('paused', false)
      .neq('profile_id', activity.organizer_id)

    const actCity = activity.city?.trim().toLowerCase() || null
    const prefs = ((prefsData ?? []) as Pref[]).filter((p) => {
      const pc = p.city?.trim().toLowerCase() || null
      if (!pc) return true // participant didn't restrict location
      return actCity != null && pc === actCity // city-level match (radius is v1.1)
    })

    // Localized category label per distinct locale (cached).
    const labelCache = new Map<string, string>()
    const label = async (locale: string) => {
      if (labelCache.has(locale)) return labelCache.get(locale) as string
      let l = activity.category as string
      try {
        const t = await getTranslations({ locale, namespace: 'marketplace' })
        l = t(`categories.${activity.category}` as 'categories.birthday')
      } catch {
        /* fall back to the key */
      }
      labelCache.set(locale, l)
      return l
    }

    const reached: string[] = []
    const pushUsers: { profile_id: string; locale: string }[] = []
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const nowIso = new Date().toISOString()

    for (const p of prefs) {
      // Anti-spam: per-user daily cap.
      const { count } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', p.profile_id)
        .eq('type', 'activity_alert')
        .gte('created_at', since)
      if ((count ?? 0) >= ANTI_SPAM.maxPerDay) continue

      const digest = p.frequency === 'daily_digest'

      // Dedup: one delivery row per (activity, participant). Conflict → skip.
      const { error: delErr } = await admin.from('activity_alert_deliveries').insert({
        activity_id: activity.id,
        profile_id: p.profile_id,
        channel: 'in_app',
        status: digest ? 'pending' : 'sent',
        sent_at: digest ? null : nowIso,
      })
      if (delErr) continue

      if (digest) {
        reached.push(p.profile_id) // the daily digest cron will deliver
        continue
      }

      const locale = p.language || 'en'
      if (p.in_app !== false) {
        const note = buildAlertNotification(locale, await label(locale), activity.city)
        await admin.from('notifications').insert({
          profile_id: p.profile_id,
          type: 'activity_alert',
          title: note.title,
          body: note.body,
          data: { activity_id: activity.id, category: activity.category, city: activity.city },
        })
      }
      reached.push(p.profile_id)
      if (p.push) pushUsers.push({ profile_id: p.profile_id, locale })
    }

    // Web push for immediate, push-enabled users.
    if (pushUsers.length) {
      const ids = pushUsers.map((u) => u.profile_id)
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('profile_id, endpoint, p256dh, auth')
        .in('profile_id', ids)
      const localeByUser = Object.fromEntries(pushUsers.map((u) => [u.profile_id, u.locale]))
      for (const s of (subs ?? []) as { profile_id: string; endpoint: string; p256dh: string; auth: string }[]) {
        const locale = localeByUser[s.profile_id] || 'en'
        const note = buildAlertNotification(locale, await label(locale), activity.city)
        await sendWebPush([{ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }], {
          title: note.title,
          body: note.body,
          url: `/${locale}/marketplace/${activity.id}`,
        })
      }
    }

    await admin
      .from('activities')
      .update({ alerts_sent_at: nowIso, alerts_reached_count: reached.length })
      .eq('id', activity.id)

    return { reached: reached.length }
  } catch {
    return null
  }
}
