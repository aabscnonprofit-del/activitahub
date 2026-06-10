import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { buildDigestNotification } from '@/lib/alerts/templates'
import { sendWebPush } from '@/lib/alerts/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily-digest assembler. Rolls up all `pending` activity-alert deliveries into a
 * single notification (+ web push) per participant. Intended to be hit once a day
 * by Vercel Cron (see vercel.json). Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  let admin: ReturnType<typeof createServiceClient>
  try {
    admin = createServiceClient()
  } catch {
    return Response.json({ ok: false, reason: 'not_configured' })
  }

  try {
    const { data: pending } = await admin
      .from('activity_alert_deliveries')
      .select('id, profile_id, activity_id')
      .eq('status', 'pending')
      .limit(5000)

    const byUser = new Map<string, { ids: string[] }>()
    for (const d of (pending ?? []) as { id: string; profile_id: string }[]) {
      const e = byUser.get(d.profile_id) ?? { ids: [] }
      e.ids.push(d.id)
      byUser.set(d.profile_id, e)
    }

    let users = 0
    for (const [profileId, { ids }] of byUser) {
      const { data: pref } = await admin
        .from('alert_preferences')
        .select('language, in_app, push')
        .eq('profile_id', profileId)
        .maybeSingle()
      const p = pref as { language?: string | null; in_app?: boolean; push?: boolean } | null
      const locale = p?.language || 'en'
      const note = buildDigestNotification(locale, ids.length)

      if (p?.in_app !== false) {
        await admin.from('notifications').insert({
          profile_id: profileId,
          type: 'activity_alert',
          title: note.title,
          body: note.body,
          data: { digest: true, count: ids.length },
        })
      }
      if (p?.push) {
        const { data: subs } = await admin
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('profile_id', profileId)
        for (const s of (subs ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
          await sendWebPush([s], { title: note.title, body: note.body, url: `/${locale}/marketplace` })
        }
      }

      await admin
        .from('activity_alert_deliveries')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .in('id', ids)
      users++
    }

    return Response.json({ ok: true, users })
  } catch {
    return Response.json({ ok: false }, { status: 200 })
  }
}
