import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { emailConfigured, sendEmail } from '@/lib/email/provider'
import { renderEmail } from '@/lib/email/templates'
import { nextDeliveryState, MAX_ATTEMPTS } from '@/lib/email/delivery'

// Node runtime: outbound fetch to the email provider + service-role writes.
export const runtime = 'nodejs'

/**
 * Email delivery worker. Drains the email_notifications queue (migration 013, populated by the
 * notifications trigger) through the configured provider (Resend). Reliable by construction:
 *  - idempotent send (idempotency key = the queue row id → a retry never double-delivers);
 *  - retries transient failures (row stays 'queued', attempts++), permanent ones are recorded ('failed');
 *  - duplicate protection (only 'queued' rows are processed; marked 'sent' on success).
 * Scheduled by Vercel Cron (see vercel.json). Protected by CRON_SECRET (matches the other crons).
 */
export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // No provider configured → nothing to do (graceful; never errors).
  if (!emailConfigured()) {
    return Response.json({ ok: true, skipped: 'email_not_configured', sent: 0, failed: 0, retried: 0 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100)

  const admin = await createAdminClient()

  const { data: rows } = await admin
    .from('email_notifications')
    .select('id, profile_id, to_email, subject, payload, attempts')
    .eq('status', 'queued')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(limit)

  const queue = (rows ?? []) as {
    id: string
    profile_id: string
    to_email: string | null
    subject: string
    payload: Record<string, unknown> | null
    attempts: number
  }[]

  // Recipient languages (profiles.preferred_locale) for the email chrome, fetched once.
  const localeByProfile = new Map<string, string>()
  const ids = [...new Set(queue.map((r) => r.profile_id))]
  if (ids.length) {
    const { data: profs } = await admin.from('profiles').select('id, preferred_locale').in('id', ids)
    for (const p of (profs ?? []) as { id: string; preferred_locale: string | null }[]) {
      localeByProfile.set(p.id, p.preferred_locale ?? 'en')
    }
  }

  let sent = 0
  let failed = 0
  let retried = 0
  const nowIso = new Date().toISOString()

  for (const row of queue) {
    let state
    if (!row.to_email || !row.to_email.includes('@')) {
      // No usable address → permanent failure, no send attempt.
      state = { status: 'failed' as const, attempts: row.attempts + 1, last_error: 'no_recipient_email' }
    } else {
      const locale = localeByProfile.get(row.profile_id) ?? 'en'
      const { subject, html } = renderEmail(locale, row.subject, row.payload ?? {})
      const result = await sendEmail({ to: row.to_email, subject, html, idempotencyKey: row.id })
      state = nextDeliveryState(result, row.attempts)
    }

    const patch: Record<string, unknown> = {
      status: state.status,
      attempts: state.attempts,
      last_error: state.last_error,
      updated_at: nowIso,
    }
    if (state.status === 'sent') patch.sent_at = nowIso

    const { error } = await admin.from('email_notifications').update(patch).eq('id', row.id).eq('status', 'queued')
    if (error) {
      console.error('[email-dispatch] failed to update row', row.id, error.message)
      continue
    }
    if (state.status === 'sent') sent++
    else if (state.status === 'failed') failed++
    else retried++
  }

  return Response.json({ ok: true, processed: queue.length, sent, failed, retried })
}
