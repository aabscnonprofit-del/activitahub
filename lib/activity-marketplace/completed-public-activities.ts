// Completed Public Activity — the SINGLE canonical completion rule, as a pure read-only projection over
// Project + Occurrence timestamps. No CompletedActivity/Archive entity, no "completed" Project status, no
// lifecycle/schema. This is the one shared definition that Organizer Archive, the Completed Activities count,
// Participant History, Organizer Statistics, Reviews eligibility, and Achievements must all reuse — so the rule
// `ends_at ?? starts_at < now` is defined here and nowhere else.

/** Minimal occurrence shape the completion rule needs (start, and optional end). */
export interface OccurrenceTimes {
  starts_at: string
  ends_at: string | null
}

/** An occurrence is FINISHED when its effective end (ends_at ?? starts_at) is before `now`. */
export function isOccurrenceFinished(occ: OccurrenceTimes, nowMs: number): boolean {
  return new Date(occ.ends_at ?? occ.starts_at).getTime() < nowMs
}

/**
 * A Project is COMPLETED when it HAS occurrences and EVERY one has finished. Otherwise it is CURRENT (an
 * upcoming/ongoing occurrence, or none scheduled yet). Derived only from occurrence timestamps.
 */
export function isProjectCompleted(occurrences: OccurrenceTimes[], nowMs: number): boolean {
  return occurrences.length > 0 && occurrences.every((o) => isOccurrenceFinished(o, nowMs))
}

/**
 * The occurrence that should represent a Project's card given its completion state: for a COMPLETED Project, its
 * latest-starting finished occurrence; for a CURRENT Project, its soonest-starting upcoming occurrence. Null when
 * the relevant pool is empty (e.g. a current Project with nothing scheduled yet). Order-independent.
 */
export function representativeOccurrence<T extends OccurrenceTimes>(occurrences: T[], nowMs: number, completed: boolean): T | null {
  const pool = occurrences.filter((o) => isOccurrenceFinished(o, nowMs) === completed)
  if (pool.length === 0) return null
  const startMs = (o: OccurrenceTimes) => new Date(o.starts_at).getTime()
  // completed → the latest-starting finished occurrence; current → the soonest-starting upcoming occurrence.
  return pool.reduce((best, o) => ((completed ? startMs(o) > startMs(best) : startMs(o) < startMs(best)) ? o : best))
}
