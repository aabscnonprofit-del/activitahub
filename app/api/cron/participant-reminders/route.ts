import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { buildReminderNotification } from '@/lib/alerts/templates'
import { sendWebPush } from '@/lib/alerts/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Participant reminder sender. Hourly: for upcoming events, notify confirmed /
 * maybe participants (with a platform account) at each of the activity's
 * configured offsets (default 7d / 24h / 2h). Deduped via participant_reminders.
 * Reuses the existing notifications table + web push. Guarded by CRON_SECRET.
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
    const now = Date.now()
    const today = new Date(now).toISOString().slice(0, 10)
    const in8d = new Date(now + 8 * 86400_000).toISOString().slice(0, 10)

    const { data: events } = await admin
      .from('calendar_events')
      .select('activity_id, date, start_time')
      .gte('date', today)
      .lte('date', in8d)
      .not('activity_id', 'is', null)

    let sent = 0
    for (const ev of (events ?? []) as { activity_id: string; date: string }[]) {
      const { data: act } = await admin
        .from('activities')
        .select('title, reminder_offsets_hours')
        .eq('id', ev.activity_id)
        .single()
      const a = act as { title?: string; reminder_offsets_hours?: number[] } | null
      const offsets = a?.reminder_offsets_hours ?? [168, 24, 2]

      // Day-granularity (Vercel Hobby allows daily crons only): send on the day
      // that is round(offset/24) days before the event — e.g. 168h→7 days,
      // 24h→1 day, 2h→day-of.
      const due = offsets.filter((h) => {
        const daysBefore = Math.round(h / 24)
        const target = new Date(new Date(`${ev.date}T00:00:00Z`).getTime() - daysBefore * 86400_000)
          .toISOString()
          .slice(0, 10)
        return target === today
      })
      if (!due.length) continue

      const { data: parts } = await admin
        .from('participants')
        .select('id, profile_id')
        .eq('activity_id', ev.activity_id)
        .in('status', ['confirmed', 'maybe'])
        .not('profile_id', 'is', null)

      for (const p of (parts ?? []) as { id: string; profile_id: string }[]) {
        for (const h of due) {
          // Dedup ledger.
          const { error: ledgerErr } = await admin
            .from('participant_reminders')
            .insert({ participant_id: p.id, offset_hours: h })
          if (ledgerErr) continue // already sent

          const { data: prof } = await admin
            .from('profiles')
            .select('preferred_locale')
            .eq('id', p.profile_id)
            .maybeSingle()
          const locale = (prof as { preferred_locale?: string } | null)?.preferred_locale || 'en'
          const note = buildReminderNotification(locale, a?.title || 'Activity')

          await admin.from('notifications').insert({
            profile_id: p.profile_id,
            type: 'event_reminder',
            title: note.title,
            body: note.body,
            data: { activity_id: ev.activity_id, reminder: true, offset_hours: h },
          })
          const { data: subs } = await admin
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth')
            .eq('profile_id', p.profile_id)
          for (const s of (subs ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
            await sendWebPush([s], { title: note.title, body: note.body, url: `/${locale}/marketplace/${ev.activity_id}` })
          }
          sent++
        }
      }
    }

    return Response.json({ ok: true, sent })
  } catch {
    return Response.json({ ok: false }, { status: 200 })
  }
}
