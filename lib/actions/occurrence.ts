'use server'

// Occurrence scheduling server action — set/update the real event start time for the CURRENT (or explicitly
// selected) occurrence of an approved project, replacing the approval-time placeholder. Owner + approval
// gated; the occurrence id is preserved (an in-place update), so persisted execution status survives. The
// selected occurrence is explicit (occurrenceId when supplied; else the project's sole occurrence) — never an
// implicit "first occurrence". Revalidates so the workspace timeline reloads. No new route or model.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { setCurrentOccurrenceStart } from '@/lib/occurrence/store'

export type ScheduleOccurrenceResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_start' | 'not_authenticated' | 'not_authorized' | 'project_not_approved' | 'ambiguous_occurrence' | 'occurrence_not_found' | 'duplicate_start' | 'error' }

/**
 * Set/update the current/selected occurrence's start time for a project. Validates the ISO instant
 * (deterministic parse, no clock), authenticates, delegates the approval gate + explicit occurrence resolution
 * + write to setCurrentOccurrenceStart, then revalidates so the workspace timeline reflects the new start.
 * `occurrenceId` selects a specific occurrence (safe for multi-occurrence projects); omitted → the sole one.
 */
export async function scheduleOccurrenceAction(
  projectId: string,
  startsAtIso: string,
  locale: string,
  occurrenceId?: string,
): Promise<ScheduleOccurrenceResult> {
  if (typeof startsAtIso !== 'string' || Number.isNaN(Date.parse(startsAtIso))) {
    return { ok: false, reason: 'invalid_start' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'not_authenticated' }

  const res = await setCurrentOccurrenceStart(supabase, projectId, startsAtIso, { occurrenceId })
  if (!res.ok) {
    const reason =
      res.reason === 'project_not_found' ? 'not_authorized'
      : res.reason === 'project_not_approved' ? 'project_not_approved'
      : res.reason === 'ambiguous_occurrence' ? 'ambiguous_occurrence'
      : res.reason === 'occurrence_not_found' ? 'occurrence_not_found'
      : res.reason === 'duplicate_start' ? 'duplicate_start'
      : 'error'
    return { ok: false, reason }
  }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  return { ok: true }
}
