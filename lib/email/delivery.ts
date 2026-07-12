// Email delivery reliability — the pure state machine the worker applies to each queue row after a
// send attempt. Kept pure (no I/O) so retry, cap, and permanent-failure rules are directly testable.

import type { SendResult } from './provider'

/** Max delivery attempts before a transient failure becomes permanent ('failed'). */
export const MAX_ATTEMPTS = 5

export interface DeliveryState {
  status: 'sent' | 'queued' | 'failed'
  attempts: number
  last_error: string | null
}

/**
 * Given the provider result and how many attempts a row has already had, decide its next state:
 *   - success           → 'sent'
 *   - permanent failure → 'failed' (retrying won't help)
 *   - transient failure → 'queued' to retry, until MAX_ATTEMPTS is reached → 'failed'
 */
export function nextDeliveryState(result: SendResult, currentAttempts: number): DeliveryState {
  const attempts = currentAttempts + 1
  if (result.ok) return { status: 'sent', attempts, last_error: null }
  if (!result.transient) return { status: 'failed', attempts, last_error: result.error }
  if (attempts >= MAX_ATTEMPTS) return { status: 'failed', attempts, last_error: `max_attempts: ${result.error}` }
  return { status: 'queued', attempts, last_error: result.error }
}
