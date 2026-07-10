// Scheduling — PURE expansion of an organizer's scheduling choice into concrete Occurrence windows.
//
// The Occurrence (migration 046) is the SINGLE date/time source of truth. This module owns NO storage and
// writes NO Project/Plan date: it turns a ScheduleSpec (what the organizer selected — a one-time date or a
// weekly repeat) into absolute UTC occurrence windows, so the SAME logic serves both Quick Activity creation
// and the workspace Schedule section.
//
// Deterministic + pure: a `now` is always passed in, never read, and it uses only numeric Date math + Intl
// (no argless `new Date()` / Date.now()). That makes it unit-testable and free of any hydration mismatch.

/** A wall-clock time exactly as the organizer entered it — LOCAL to `timeZone`, minute precision. */
export interface WallClock {
  /** 'YYYY-MM-DD' */
  date: string
  /** 'HH:MM' (24-hour) */
  time: string
}

/** JS getUTCDay() convention: 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** How long each occurrence lasts. `until` = an explicit end time (same local day, rolling to the next if it is
 *  not after the start); `minutes` = a fixed duration; `none` = no end recorded. */
export type Duration =
  | { kind: 'until'; endTime: string }
  | { kind: 'minutes'; minutes: number }
  | { kind: 'none' }

/** A single dated activity — exactly one Occurrence. */
export interface OneTimeSpec {
  kind: 'one_time'
  timeZone: string
  start: WallClock
  duration: Duration
}

/** A weekly-repeating activity, materialized into concrete Occurrences (no recurrence source of truth). */
export interface WeeklySpec {
  kind: 'weekly'
  timeZone: string
  weekday: Weekday
  /** 'HH:MM' */
  time: string
  duration: Duration
  /** 'YYYY-MM-DD' — the first eligible date. */
  from: string
  /** 'YYYY-MM-DD' inclusive last date (bounds the series). Optional if `count` is given. */
  until?: string
  /** Cap on the number of occurrences (a safety cap always applies regardless). */
  count?: number
}

export type ScheduleSpec = OneTimeSpec | WeeklySpec

/** A concrete, absolute occurrence window (UTC ISO instants) ready to persist onto `occurrences`. */
export interface OccurrenceWindow {
  startsAt: string
  endsAt: string | null
}

/** Hard safety cap on materialized weekly occurrences (a year of weekly). Truncation is surfaced by the caller. */
export const MAX_SERIES_OCCURRENCES = 52

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function isValidTime(time: string): boolean {
  return TIME_RE.test(time)
}

// ── Timezone conversion ─────────────────────────────────────────────────────────────────────────────────
// Wall-clock (in an IANA time zone) → absolute UTC instant, DST-correct. Uses the standard Intl offset
// technique: the offset is evaluated AT the target instant (so the same 'HH:MM' on two dates can map to
// different UTC offsets across a DST boundary), with a second pass to settle the boundary itself.

function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0')
  let hour = get('hour')
  if (hour === 24) hour = 0 // some engines emit '24' for midnight under h23
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
  return asUtc - instant.getTime()
}

/** Convert a local wall-clock (y, mo[1-12], d, h, mi) in `timeZone` to its absolute UTC ISO instant. */
export function zonedWallClockToUtcIso(y: number, mo: number, d: number, h: number, mi: number, timeZone: string): string {
  const guessUtc = Date.UTC(y, mo - 1, d, h, mi)
  const off1 = tzOffsetMs(new Date(guessUtc), timeZone)
  let utc = guessUtc - off1
  const off2 = tzOffsetMs(new Date(utc), timeZone)
  if (off2 !== off1) utc = guessUtc - off2
  return new Date(utc).toISOString()
}

function wallClockToUtc(date: string, time: string, timeZone: string): string {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return zonedWallClockToUtcIso(y, mo, d, h, mi, timeZone)
}

// ── Date helpers (pure; numeric Date math only) ─────────────────────────────────────────────────────────

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function addDaysToDate(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}

function firstOnOrAfter(date: string, weekday: Weekday): string {
  let cur = date
  for (let i = 0; i < 7; i++) {
    if (weekdayOf(cur) === weekday) return cur
    cur = addDaysToDate(cur, 1)
  }
  return cur
}

function endFor(startDate: string, startIso: string, duration: Duration, timeZone: string): string | null {
  if (duration.kind === 'none') return null
  if (duration.kind === 'minutes') {
    return new Date(new Date(startIso).getTime() + duration.minutes * 60_000).toISOString()
  }
  // 'until' — the end time on the same local date; if it is not after the start, it rolls to the next day.
  let endIso = wallClockToUtc(startDate, duration.endTime, timeZone)
  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    endIso = wallClockToUtc(addDaysToDate(startDate, 1), duration.endTime, timeZone)
  }
  return endIso
}

// ── Expansion ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * Expand a ScheduleSpec into concrete absolute occurrence windows.
 *  - one_time → exactly one window.
 *  - weekly   → one window per matching weekday from `from` to `until` (inclusive), capped by `count` and by
 *    MAX_SERIES_OCCURRENCES. Each week's instant is computed independently in the time zone, so the series is
 *    DST-correct. `truncated` (in the returned tuple) reports whether the cap cut the series short.
 */
export function expandSchedule(spec: ScheduleSpec): { windows: OccurrenceWindow[]; truncated: boolean } {
  if (spec.kind === 'one_time') {
    const startsAt = wallClockToUtc(spec.start.date, spec.start.time, spec.timeZone)
    return { windows: [{ startsAt, endsAt: endFor(spec.start.date, startsAt, spec.duration, spec.timeZone) }], truncated: false }
  }

  const cap = Math.min(spec.count ?? MAX_SERIES_OCCURRENCES, MAX_SERIES_OCCURRENCES)
  const windows: OccurrenceWindow[] = []
  let cur = firstOnOrAfter(spec.from, spec.weekday)
  let hitUntil = false
  while (windows.length < cap) {
    if (spec.until && cur > spec.until) {
      hitUntil = true
      break
    }
    const startsAt = wallClockToUtc(cur, spec.time, spec.timeZone)
    windows.push({ startsAt, endsAt: endFor(cur, startsAt, spec.duration, spec.timeZone) })
    cur = addDaysToDate(cur, 7)
  }
  // Truncated only when the CAP (not the until-bound) stopped us AND more dates remained.
  const truncated = !hitUntil && windows.length === cap && (!spec.until || cur <= spec.until)
  return { windows, truncated }
}

// ── Validation ──────────────────────────────────────────────────────────────────────────────────────────

export type ScheduleValidation = { ok: true } | { ok: false; reason: string }

function validateDuration(duration: Duration): ScheduleValidation {
  if (duration.kind === 'until') {
    if (!isValidTime(duration.endTime)) return { ok: false, reason: 'invalid_end_time' }
  } else if (duration.kind === 'minutes') {
    if (!Number.isFinite(duration.minutes) || duration.minutes <= 0 || duration.minutes > 24 * 60 * 14) {
      return { ok: false, reason: 'invalid_duration' }
    }
  }
  return { ok: true }
}

function isKnownTimeZone(tz: string): boolean {
  if (typeof tz !== 'string' || tz.length === 0) return false
  try {
    // Throws RangeError for an unknown IANA zone.
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * Validate a spec and confirm it yields at least one FUTURE occurrence (relative to `nowIso`). Pure: `now` is
 * passed in. This is the single readiness check for "can this be scheduled": a spec whose only occurrences are
 * in the past is rejected, so scheduling can never produce a stale activity.
 */
export function validateSchedule(spec: ScheduleSpec, nowIso: string): ScheduleValidation {
  if (!isKnownTimeZone(spec.timeZone)) return { ok: false, reason: 'invalid_timezone' }
  const dur = validateDuration(spec.duration)
  if (!dur.ok) return dur

  if (spec.kind === 'one_time') {
    if (!isValidDate(spec.start.date)) return { ok: false, reason: 'invalid_date' }
    if (!isValidTime(spec.start.time)) return { ok: false, reason: 'invalid_time' }
  } else {
    if (spec.weekday < 0 || spec.weekday > 6) return { ok: false, reason: 'invalid_weekday' }
    if (!isValidTime(spec.time)) return { ok: false, reason: 'invalid_time' }
    if (!isValidDate(spec.from)) return { ok: false, reason: 'invalid_from' }
    if (spec.until !== undefined && !isValidDate(spec.until)) return { ok: false, reason: 'invalid_until' }
    if (spec.until === undefined && spec.count === undefined) return { ok: false, reason: 'unbounded_series' }
    if (spec.count !== undefined && (!Number.isInteger(spec.count) || spec.count < 1)) return { ok: false, reason: 'invalid_count' }
    if (spec.until !== undefined && spec.until < spec.from) return { ok: false, reason: 'until_before_from' }
  }

  const { windows } = expandSchedule(spec)
  const nowMs = new Date(nowIso).getTime()
  const hasFuture = windows.some((w) => new Date(w.startsAt).getTime() > nowMs)
  if (!hasFuture) return { ok: false, reason: 'no_future_occurrence' }
  return { ok: true }
}
