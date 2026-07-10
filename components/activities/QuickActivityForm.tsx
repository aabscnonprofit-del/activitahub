'use client'

// Quick Activity form — "I already know what I'm creating." Collects only what a straightforward activity needs
// and calls createQuickActivityAction, which builds the SAME canonical Project the assisted path builds (no AI).
// On success it lands the organizer in the Project Workspace to Set Public + Publish. The detected time zone is
// applied after mount (SSR renders 'UTC') so there is no hydration mismatch.

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Repeat, ImageOff } from 'lucide-react'
import { createQuickActivityAction } from '@/lib/actions/quick-activity'
import type { ScheduleSpec, Weekday } from '@/lib/scheduling/schedule'

const BASE_ZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo',
  'Pacific/Honolulu', 'Europe/London', 'Europe/Paris', 'Europe/Madrid', 'Europe/Moscow', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
]
const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' }, { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' }, { value: 0, label: 'Sunday' },
]

const REASON_TEXT: Record<string, string> = {
  no_future_occurrence: 'Pick a date in the future.',
  until_before_from: 'The end date must be on or after the start date.',
  unbounded_series: 'Set an end date for the repeat.',
  invalid_timezone: 'Choose a valid time zone.',
  missing_title: 'Add a title.',
  missing_description: 'Add a description.',
}

export function QuickActivityForm({ locale }: { locale: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')
  const [pricing, setPricing] = useState<'free' | 'paid'>('free')
  const [price, setPrice] = useState('')

  const [kind, setKind] = useState<'one_time' | 'weekly'>('one_time')
  const [timeZone, setTimeZone] = useState('UTC')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:00')
  const [endTime, setEndTime] = useState('')
  const [weekday, setWeekday] = useState<Weekday>(1)
  const [from, setFrom] = useState('')
  const [until, setUntil] = useState('')

  const [error, setError] = useState<string | null>(null)

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
      setError('Set the first and last dates for the weekly repeat.')
      return null
    }
    return { kind: 'weekly', timeZone, weekday, time, duration, from, until }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Add a title.')
      return
    }
    if (!description.trim()) {
      setError('Add a description.')
      return
    }
    const spec = buildSpec()
    if (!spec) return

    startTransition(async () => {
      const res = await createQuickActivityAction(
        {
          title: title.trim(),
          description: description.trim(),
          spec,
          location: location.trim() || null,
          capacity: capacity.trim() ? Math.max(0, Math.round(Number(capacity))) : null,
          pricing,
          priceCents: pricing === 'paid' && price.trim() ? Math.max(0, Math.round(Number(price) * 100)) : null,
        },
        locale,
      )
      if (res.ok) {
        router.push(`/${locale}/dashboard/projects/${res.projectId}`)
      } else {
        setError((res.detail && REASON_TEXT[res.detail]) || REASON_TEXT[res.reason] || 'Could not create the activity. Please try again.')
      }
    })
  }

  const inputCls = 'mt-0.5 block w-full rounded border border-slate-300 px-3 py-2 text-sm'
  const labelCls = 'block text-xs font-semibold text-slate-600'

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* What it is */}
      <section className="space-y-3">
        <label className={labelCls}>
          Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Yoga at Magic Island" className={inputCls} />
        </label>
        <label className={labelCls}>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="A calm sunset yoga session on the beach for all levels." className={inputCls} />
        </label>
        <label className={labelCls}>
          Location <span className="font-normal text-slate-400">(optional)</span>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Magic Island, Honolulu" className={inputCls} />
        </label>
        {/* Image has no existing storage field yet — surfaced honestly, not silently invented. */}
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <ImageOff className="h-3.5 w-3.5" aria-hidden="true" />
          Photos aren&rsquo;t available yet — you can add them once image support ships.
        </p>
      </section>

      {/* When */}
      <section className="space-y-3">
        <p className={labelCls}>When</p>
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
            End time <span className="font-normal text-slate-400">(optional)</span>
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
      </section>

      {/* Capacity + price */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelCls}>
            Capacity <span className="font-normal text-slate-400">(optional)</span>
            <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} />
          </label>
          <div>
            <span className={labelCls}>Price</span>
            <div className="mt-1 flex gap-2">
              {(['free', 'paid'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPricing(p)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold capitalize ${
                    pricing === p ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {pricing === 'paid' && (
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price per person (e.g. 12.00)"
                className={`${inputCls} mt-2`}
              />
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create activity'}
        </button>
        <span className="text-xs text-slate-500">Next: set it public and publish in the workspace.</span>
        {error && <span className="w-full text-sm text-red-600">{error}</span>}
      </div>
    </form>
  )
}
