// Scheduling domain — pure expansion + timezone/DST correctness + validation.
// The Occurrence is the single date/time source of truth; this proves the spec→windows expander is correct
// and DST-safe (each produced instant reads back as the exact local wall-clock the organizer entered).
//
//   Run:  npx tsx scripts/scheduling-domain-test.mts

import {
  expandSchedule,
  validateSchedule,
  zonedWallClockToUtcIso,
  MAX_SERIES_OCCURRENCES,
  type ScheduleSpec,
} from '../lib/scheduling/schedule.ts'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else {
    failures++
    console.log(`  FAIL ${name}`)
  }
}

/** The local wall-clock an instant reads as, in a given tz: 'YYYY-MM-DD HH:MM' + weekday. */
function localWallClock(iso: string, timeZone: string): { dt: string; weekday: string } {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  let hh = p.hour === '24' ? '00' : p.hour
  return { dt: `${p.year}-${p.month}-${p.day} ${hh}:${p.minute}`, weekday: p.weekday }
}

// ── 1. Timezone conversion (DST-correct absolute instants) ────────────────────────────────────────────────
check('NY summer 18:00 (EDT, UTC-4) → 22:00Z', zonedWallClockToUtcIso(2026, 7, 13, 18, 0, 'America/New_York') === '2026-07-13T22:00:00.000Z')
check('NY winter 18:00 (EST, UTC-5) → 23:00Z', zonedWallClockToUtcIso(2026, 1, 13, 18, 0, 'America/New_York') === '2026-01-13T23:00:00.000Z')
check('Honolulu 18:00 (UTC-10) → next-day 04:00Z', zonedWallClockToUtcIso(2026, 7, 13, 18, 0, 'Pacific/Honolulu') === '2026-07-14T04:00:00.000Z')
check('UTC 18:00 → 18:00Z', zonedWallClockToUtcIso(2026, 7, 13, 18, 0, 'UTC') === '2026-07-13T18:00:00.000Z')

// ── 2. One-time expansion ────────────────────────────────────────────────────────────────────────────────
const oneTime: ScheduleSpec = {
  kind: 'one_time', timeZone: 'America/New_York',
  start: { date: '2026-07-13', time: '18:00' }, duration: { kind: 'minutes', minutes: 90 },
}
const ot = expandSchedule(oneTime)
check('one-time yields exactly one window', ot.windows.length === 1 && !ot.truncated)
check('one-time start is the correct instant', ot.windows[0].startsAt === '2026-07-13T22:00:00.000Z')
check('one-time end = start + 90m', ot.windows[0].endsAt === '2026-07-13T23:30:00.000Z')
check('one-time reads back as 18:00 local', localWallClock(ot.windows[0].startsAt, 'America/New_York').dt === '2026-07-13 18:00')

// one-time with an explicit end time
const otUntil = expandSchedule({ kind: 'one_time', timeZone: 'UTC', start: { date: '2026-07-13', time: '18:00' }, duration: { kind: 'until', endTime: '20:30' } })
check('one-time until end time', otUntil.windows[0].endsAt === '2026-07-13T20:30:00.000Z')

// ── 3. Weekly expansion (bounded + DST-correct across a boundary) ─────────────────────────────────────────
// Weekly Mondays 18:00 America/New_York across the Nov 2026 fall-back (Nov 1). Each instant must read as
// exactly Monday 18:00 local — proving the series recomputes the offset per week.
const weekly: ScheduleSpec = {
  kind: 'weekly', timeZone: 'America/New_York', weekday: 1 /* Mon */, time: '18:00',
  duration: { kind: 'minutes', minutes: 60 }, from: '2026-10-20', until: '2026-11-16',
}
const wk = expandSchedule(weekly)
check('weekly produced multiple windows', wk.windows.length >= 4)
check('every weekly window reads as Monday 18:00 local (DST-correct)', wk.windows.every((w) => {
  const l = localWallClock(w.startsAt, 'America/New_York')
  return l.weekday === 'Mon' && l.dt.endsWith(' 18:00')
}))
// UTC gap is 7 days ± 1h across a DST boundary (the LOCAL wall-clock is preserved — that IS DST-correctness).
check('weekly windows are one week apart (7 days ± DST hour)', wk.windows.every((w, i) => {
  if (i === 0) return true
  const gap = new Date(w.startsAt).getTime() - new Date(wk.windows[i - 1].startsAt).getTime()
  return Math.abs(gap - 7 * 24 * 3600 * 1000) <= 3600 * 1000
}))
check('weekly respects the until bound (none past 2026-11-16)', wk.windows.every((w) => w.startsAt <= '2026-11-17'))
check('weekly UTC hour shifts across DST (both 22:00Z and 23:00Z present)',
  wk.windows.some((w) => w.startsAt.includes('T22:00')) && wk.windows.some((w) => w.startsAt.includes('T23:00')))

// count-bounded + safety cap
const counted = expandSchedule({ kind: 'weekly', timeZone: 'UTC', weekday: 3, time: '09:00', duration: { kind: 'none' }, from: '2026-01-01', count: 3 })
check('weekly count bound yields exactly 3', counted.windows.length === 3)
const capped = expandSchedule({ kind: 'weekly', timeZone: 'UTC', weekday: 3, time: '09:00', duration: { kind: 'none' }, from: '2026-01-01', count: 999 })
check('weekly is capped at MAX_SERIES_OCCURRENCES and reports truncation', capped.windows.length === MAX_SERIES_OCCURRENCES && capped.truncated)

// ── 4. Validation (readiness — must yield a FUTURE occurrence) ───────────────────────────────────────────
const now = '2026-07-01T00:00:00.000Z'
check('future one-time validates', validateSchedule(oneTime, now).ok)
const past = validateSchedule({ kind: 'one_time', timeZone: 'UTC', start: { date: '2020-01-01', time: '10:00' }, duration: { kind: 'none' } }, now)
check('past one-time is rejected (no_future_occurrence)', !past.ok && past.reason === 'no_future_occurrence')
const unbounded = validateSchedule({ kind: 'weekly', timeZone: 'UTC', weekday: 1, time: '18:00', duration: { kind: 'none' }, from: '2026-08-01' } as ScheduleSpec, now)
check('unbounded weekly is rejected', !unbounded.ok && unbounded.reason === 'unbounded_series')
const badTz = validateSchedule({ kind: 'one_time', timeZone: 'Mars/Phobos', start: { date: '2026-08-01', time: '18:00' }, duration: { kind: 'none' } }, now)
check('unknown timezone is rejected', !badTz.ok && badTz.reason === 'invalid_timezone')
const badDate = validateSchedule({ kind: 'one_time', timeZone: 'UTC', start: { date: '2026-02-30', time: '18:00' }, duration: { kind: 'none' } }, now)
check('impossible calendar date is rejected', !badDate.ok)

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
