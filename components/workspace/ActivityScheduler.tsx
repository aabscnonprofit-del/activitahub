'use client'

// Activity scheduler — the VISIBLE, obvious way an organizer sets an approved Project's real date(s). Supports
// a one-time date or a weekly repeat, with an explicit time zone and an optional end time, plus the occurrence's
// location / capacity / price. Builds a ScheduleSpec + occurrence meta and calls the owner/approval-gated
// setActivityScheduleAction, which writes the canonical Occurrence(s) — the sole date/time source of truth.
// No clock/randomness at module scope → no hydration mismatch (the detected time zone is applied after mount).

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Repeat } from 'lucide-react'
import { setActivityScheduleAction } from '@/lib/actions/schedule'
import type { ScheduleSpec, Weekday } from '@/lib/scheduling/schedule'

/** A small curated time-zone list; the viewer's detected zone is added/selected after mount. */
const BASE_ZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
]

export interface SchedulerInitial {
  location?: string | null
  capacity?: number | null
  priceCents?: number | null
  title?: string | null
}

const REASON_TEXT: Record<string, string> = {
  no_future_occurrence: 'Pick a date in the future.',
  invalid_timezone: 'Choose a valid time zone.',
  until_before_from: 'The end date must be on or after the start date.',
  unbounded_series: 'Set an end date for the repeat.',
  project_not_approved: 'Approve the project before scheduling.',
}

export function ActivityScheduler({
  projectId,
  locale,
  initial,
}: {
  projectId: string
  locale: string
  initial?: SchedulerInitial
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [kind, setKind] = useState<'one_time' | 'weekly'>('one_time')
  const [timeZone, setTimeZone] = useState('UTC')
  // one-time
  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:00')
  // weekly
  const [weekday, setWeekday] = useState<Weekday>(1)
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')
  // common
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [capacity, setCapacity] = useState(initial?.capacity != null ? String(initial.capacity) : '')
  const [price, setPrice] = useState(initial?.priceCents != null ? (initial.priceCents / 100).toString() : '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  // Apply the viewer's detected time zone after mount (SSR renders 'UTC' → no hydration mismatch).
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) setTimeZone(tz)
    } catch {
      /* keep UTC */
    }
  }, [])

  const zones = useMemo(() => {
    const set = new Set(BASE_ZONES)
    if (timeZone) set.add(timeZone)
    return [...set].sort()
  }, [timeZone])

  function buildSpec(): ScheduleSpec | null {
    const duration = endTime ? ({ kind: 'until', endTime } as const) : ({ kind: 'none' } as const)
    if (kind === 'one_time') {
      if (!date) {
        setError('Pick a date.')
        return null
      }
      return { kind: 'one_time', timeZone, start: { date, time }, duration }
    }
    if (!from || !until) {
      setError('Set the start and end dates for the repeat.')
      return null
    }
    return { kind: 'weekly', timeZone, weekday, time, duration, from, until }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(null)
    const spec = buildSpec()
    if (!spec) return
    const meta = {
      location: location.trim() ? location.trim() : null,
      capacity: capacity.trim() ? Math.max(0, Math.round(Number(capacity))) : null,
      priceCents: price.trim() ? Math.max(0, Math.round(Number(price) * 100)) : null,
    }
    startTransition(async () => {
      const res = await setActivityScheduleAction(projectId, spec, meta, locale)
      if (res.ok) {
        setSaved(res.count > 1 ? `Scheduled ${res.count} dates${res.truncated ? ' (capped at 52)' : ''}.` : 'Date saved.')
        router.refresh()
      } else {
        setError(res.detail && REASON_TEXT[res.detail] ? REASON_TEXT[res.detail] : REASON_TEXT[res.reason] ?? 'Could not save the schedule. Please try again.')
      }
    })
  }

  const inputCls = 'mt-0.5 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm'
  const labelCls = 'text-xs font-medium text-slate-500'

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* One-time vs repeating */}
      <div className="flex flex-wrap gap-2">
        {([
          { k: 'one_time', label: 'One-time', icon: CalendarDays },
          { k: 'weekly', label: 'Repeats weekly', icon: Repeat },
        ] as const).map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              kind === k ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {kind === 'one_time' ? (
          <>
            <label className={labelCls}>
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Start time
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
            </label>
          </>
        ) : (
          <>
            <label className={labelCls}>
              Repeats on
              <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value) as Weekday)} className={inputCls}>
                {WEEKDAYS.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Start time
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              First date
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Until (last date)
              <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className={inputCls} />
            </label>
          </>
        )}

        <label className={labelCls}>
          End time <span className="text-slate-400">(optional)</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
        </label>
        <label className={labelCls}>
          Time zone
          <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Occurrence details shown publicly (location / capacity / price). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={labelCls}>
          Location <span className="text-slate-400">(optional)</span>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Magic Island" className={inputCls} />
        </label>
        <label className={labelCls}>
          Capacity <span className="text-slate-400">(optional)</span>
          <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} />
        </label>
        <label className={labelCls}>
          Price per person <span className="text-slate-400">(optional)</span>
          <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className={inputCls} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save schedule'}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {saved && !error && <span className="text-sm text-emerald-600">{saved}</span>}
      </div>
    </form>
  )
}
