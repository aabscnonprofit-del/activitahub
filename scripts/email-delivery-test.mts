// Email Delivery — the queue worker delivers production emails reliably through the provider (Resend).
// Unit-tests the pure pieces (config check, retry/failure state machine, template rendering) and
// source-locks the worker's reliability wiring. Reuses the existing email_notifications queue.
//
//   Run:  npx tsx scripts/email-delivery-test.mts

import { readFileSync } from 'node:fs'
import { emailConfigured, sendEmail } from '../lib/email/provider.ts'
import { nextDeliveryState, MAX_ATTEMPTS } from '../lib/email/delivery.ts'
import { renderEmail } from '../lib/email/templates.ts'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

// ── Configuration ─────────────────────────────────────────────────────────────
{
  const k = process.env.RESEND_API_KEY, f = process.env.EMAIL_FROM
  delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM
  check('emailConfigured false when provider unset', emailConfigured() === false)
  process.env.RESEND_API_KEY = 're_test'; process.env.EMAIL_FROM = 'noreply@example.com'
  check('emailConfigured true when key + from set', emailConfigured() === true)
  delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM
  if (k) process.env.RESEND_API_KEY = k; if (f) process.env.EMAIL_FROM = f
}

// sendEmail short-circuits (no network) when unconfigured → a transient failure.
{
  const k = process.env.RESEND_API_KEY; delete process.env.RESEND_API_KEY
  const r = await sendEmail({ to: 'a@b.com', subject: 's', html: '<p>x</p>', idempotencyKey: 'id1' })
  check('sendEmail without config returns a transient failure (no throw, no network)', r.ok === false && r.transient === true)
  if (k) process.env.RESEND_API_KEY = k
}

// ── Retry / failure state machine ───────────────────────────────────────────────
check('success → sent', nextDeliveryState({ ok: true, id: 'x' }, 0).status === 'sent')
check('transient (attempt 0) → queued, attempts 1', (() => { const s = nextDeliveryState({ ok: false, transient: true, error: 'e' }, 0); return s.status === 'queued' && s.attempts === 1 })())
check('permanent → failed immediately', nextDeliveryState({ ok: false, transient: false, error: '4xx' }, 0).status === 'failed')
check(`transient at the cap (attempts ${MAX_ATTEMPTS - 1}) → failed`, nextDeliveryState({ ok: false, transient: true, error: 'e' }, MAX_ATTEMPTS - 1).status === 'failed')
check('permanent failure records the error', nextDeliveryState({ ok: false, transient: false, error: 'bad' }, 0).last_error === 'bad')

// ── Template rendering ──────────────────────────────────────────────────────────
{
  const { subject, html } = renderEmail('en', 'Your join request was approved', { url: '/en/p/abc' })
  check('subject is the notification title', subject === 'Your join request was approved')
  check('html contains the title', html.includes('Your join request was approved'))
  check('CTA links to the payload path', html.includes('/en/p/abc'))
  check('branded (ActivLife Hub) + responsive (viewport + max-width)', html.includes('ActivLife') && html.includes('viewport') && html.includes('max-width:600px'))
  const ru = renderEmail('ru', 'Тест', {})
  check('localized CTA label (ru)', ru.html.includes('Открыть'))
  check('falls back to notifications page when no payload url', renderEmail('en', 't', {}).html.includes('/en/notifications'))
  check('escapes HTML in the subject (no injection)', !renderEmail('en', '<script>x</script>', {}).html.includes('<script>x</script>'))
}

// ── Worker wiring (source-locked) ───────────────────────────────────────────────
const worker = read('app/api/cron/email-dispatch/route.ts')
check('worker drains only queued rows under the attempt cap', worker.includes(".eq('status', 'queued')") && worker.includes(".lt('attempts', MAX_ATTEMPTS)"))
check('worker sends with an idempotency key = the row id (no double-delivery)', worker.includes('idempotencyKey: row.id'))
check('worker applies the retry state machine', worker.includes('nextDeliveryState(result, row.attempts)'))
check('worker records status/attempts/last_error and sent_at', worker.includes('last_error: state.last_error') && worker.includes('patch.sent_at'))
check('worker is CRON_SECRET-protected and fails CLOSED (rejects when secret unset)',
  worker.includes('CRON_SECRET') && worker.includes('401') && worker.includes('if (!secret ||'))
check('worker no-ops gracefully when the provider is unconfigured', worker.includes('emailConfigured()') && worker.includes('email_not_configured'))
check('worker uses recipient preferred_locale for the email language', worker.includes('preferred_locale'))

// ── Queue schema + schedule + config ────────────────────────────────────────────
const mig = read('supabase/migrations/069_email_delivery_retry.sql')
check('migration adds retry + failure columns to the existing queue', mig.includes('attempts') && mig.includes('last_error'))
check('worker is scheduled in vercel.json', read('vercel.json').includes('/api/cron/email-dispatch'))
check('config documents RESEND_API_KEY + EMAIL_FROM as required (uncommented)',
  /^RESEND_API_KEY=/m.test(read('.env.local.example')) && /^EMAIL_FROM=/m.test(read('.env.local.example')))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
