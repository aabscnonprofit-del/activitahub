// Email provider — the approved provider (Resend) called via its REST API (no SDK dependency).
// Sends ONE email; classifies the outcome so the delivery worker can retry transient failures and
// record permanent ones. It owns no queue logic and no templates — just the provider call.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  /** Stable key (the queue row id) — sent as an idempotency key so a retry never double-sends. */
  idempotencyKey: string
}

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; transient: boolean; error: string }

/** Whether the email provider is configured (both the key and a From address are required). */
export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM
}

/**
 * Send one email through Resend. Returns a classified result:
 *   - ok            → delivered (mark 'sent')
 *   - transient=true → network error / 429 / 5xx (leave 'queued' to retry, up to the cap)
 *   - transient=false → 4xx client error (mark 'failed' — retrying will not help)
 * Never throws.
 */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) return { ok: false, transient: true, error: 'email_not_configured' }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Resend honours an idempotency key so a retried queue row is never delivered twice.
        'Idempotency-Key': msg.idempotencyKey,
      },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html }),
      signal: AbortSignal.timeout(10_000),
    })

    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { id?: string } | null
      return { ok: true, id: data?.id ?? null }
    }

    const bodyText = await res.text().catch(() => '')
    const error = `resend_${res.status}: ${bodyText.slice(0, 300)}`
    // 429 (rate limit) and 5xx are transient → retry; other 4xx are permanent (bad address, etc.).
    const transient = res.status === 429 || res.status >= 500
    return { ok: false, transient, error }
  } catch (e) {
    // Network/timeout errors are transient.
    return { ok: false, transient: true, error: `exception:${(e as Error)?.name || 'Error'}` }
  }
}
