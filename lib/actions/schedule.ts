'use server'

// Activity scheduling server action — the single, VISIBLE way an organizer sets the real date(s) of an
// approved Project. It validates the organizer's scheduling choice (one-time or weekly), expands it into
// absolute Occurrence windows (lib/scheduling — timezone/DST-correct, no clock in the pure code), and writes
// them via the Occurrence store. The Occurrence stays the sole date/time source of truth; no Project/Plan date
// is written. Owner + approval gated by the store. Revalidates the workspace, the public page, and discovery.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateSchedule, expandSchedule, type ScheduleSpec } from '@/lib/scheduling/schedule'
import { applyOccurrenceWindows, type OccurrenceMeta } from '@/lib/occurrence/store'

export type SetScheduleResult =
  | { ok: true; count: number; truncated: boolean }
  | {
      ok: false
      reason: 'not_authenticated' | 'invalid_schedule' | 'project_not_approved' | 'not_authorized' | 'error'
      detail?: string
    }

/**
 * Set an approved Project's schedule. `spec` is the organizer's choice (one-time date, or a weekly repeat);
 * `meta` carries the occurrence's location / capacity / price / title (each optional; omitted = leave as-is).
 * Validation requires at least one FUTURE occurrence, so scheduling can never produce a stale activity.
 */
export async function setActivityScheduleAction(
  projectId: string,
  spec: ScheduleSpec,
  meta: OccurrenceMeta,
  locale: string,
): Promise<SetScheduleResult> {
  const now = new Date().toISOString()

  // Cheap, auth-free validation first (also the readiness check: must yield a future occurrence).
  const valid = validateSchedule(spec, now)
  if (!valid.ok) return { ok: false, reason: 'invalid_schedule', detail: valid.reason }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'not_authenticated' }

  const { windows, truncated } = expandSchedule(spec)
  const res = await applyOccurrenceWindows(
    supabase,
    projectId,
    windows,
    meta,
    now,
    spec.kind === 'weekly' ? 'series' : 'one_time',
  )
  if (!res.ok) {
    const reason =
      res.reason === 'project_not_approved'
        ? 'project_not_approved'
        : res.reason === 'project_not_found'
          ? 'not_authorized'
          : 'error'
    return { ok: false, reason }
  }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  revalidatePath(`/${locale}/p/${projectId}`)
  revalidatePath(`/${locale}/activities`)
  return { ok: true, count: res.occurrences.length, truncated }
}
