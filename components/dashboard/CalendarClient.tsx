'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Clock,
  MapPin,
  Layers,
} from 'lucide-react'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/actions/events'
import type { CalendarEvent, CalendarEventType } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Toaster, useToast } from '@/components/ui/Toast'
import { formatTime } from '@/lib/utils'

type Ref = { id: string; label: string }
type Props = {
  initialEvents: CalendarEvent[]
  activities: Ref[]
  venues: Ref[]
  locale: string
  todayKey: string
}
type View = 'month' | 'week' | 'day'
type FormMode =
  | { type: 'create'; date: string }
  | { type: 'edit'; event: CalendarEvent }

// ── Date helpers (local-time, string-keyed to avoid TZ drift) ────────────────
const pad = (n: number) => String(n).padStart(2, '0')
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const addMonths = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(1)
  x.setMonth(x.getMonth() + n)
  return x
}
// Monday-start week
const startOfWeek = (d: Date) => {
  const x = new Date(d)
  const wd = (x.getDay() + 6) % 7
  return addDays(x, -wd)
}

const TYPE_STYLES: Record<CalendarEventType, string> = {
  session: 'bg-brand-100 text-brand-800 border-brand-200',
  block: 'bg-slate-200 text-slate-700 border-slate-300',
  personal: 'bg-amber-100 text-amber-800 border-amber-200',
}

export default function CalendarClient({
  initialEvents,
  activities,
  venues,
  locale,
  todayKey,
}: Props) {
  const t = useTranslations('calendar')
  const tCommon = useTranslations('common')
  const { toasts, addToast, dismiss } = useToast()

  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState<Date>(() => parseKey(todayKey))
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
  const [pending, setPending] = useState(false)

  function eventsOn(key: string): CalendarEvent[] {
    return events
      .filter((e) => e.date === key)
      .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async function handleCreate(formData: FormData) {
    setPending(true)
    try {
      await createCalendarEvent(formData)
      const startTime = (formData.get('start_time') as string) || null
      const ev: CalendarEvent = {
        id: Math.random().toString(36).slice(2),
        organizer_id: '',
        title: formData.get('title') as string,
        event_type: (formData.get('event_type') as CalendarEventType) || 'session',
        activity_id: (formData.get('activity_id') as string) || null,
        venue_id: (formData.get('venue_id') as string) || null,
        date: formData.get('date') as string,
        start_time: startTime,
        end_time: (formData.get('end_time') as string) || null,
        all_day: !startTime,
        notes: (formData.get('notes') as string) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setEvents((prev) => [...prev, ev])
      setFormMode(null)
      addToast('success', t('created'))
    } catch {
      addToast('error', tCommon('error'))
    } finally {
      setPending(false)
    }
  }

  async function handleUpdate(formData: FormData) {
    if (formMode?.type !== 'edit') return
    setPending(true)
    try {
      await updateCalendarEvent(formMode.event.id, formData)
      const startTime = (formData.get('start_time') as string) || null
      const updated: CalendarEvent = {
        ...formMode.event,
        title: formData.get('title') as string,
        event_type: (formData.get('event_type') as CalendarEventType) || 'session',
        activity_id: (formData.get('activity_id') as string) || null,
        venue_id: (formData.get('venue_id') as string) || null,
        date: formData.get('date') as string,
        start_time: startTime,
        end_time: (formData.get('end_time') as string) || null,
        all_day: !startTime,
        notes: (formData.get('notes') as string) || null,
        updated_at: new Date().toISOString(),
      }
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      setFormMode(null)
      addToast('success', t('updated'))
    } catch {
      addToast('error', tCommon('error'))
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setPending(true)
    try {
      await deleteCalendarEvent(deleteTarget.id)
      setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      setDeleteTarget(null)
      addToast('success', t('deleted'))
    } catch {
      addToast('error', tCommon('error'))
    } finally {
      setPending(false)
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  function nav(dir: -1 | 1) {
    setCursor((c) =>
      view === 'month' ? addMonths(c, dir) : addDays(c, dir * (view === 'week' ? 7 : 1))
    )
  }
  function goToday() {
    setCursor(parseKey(todayKey))
  }

  const periodLabel = (() => {
    if (view === 'month')
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor)
    if (view === 'day')
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(cursor)
    const ws = startOfWeek(cursor)
    const we = addDays(ws, 6)
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    return `${fmt.format(ws)} – ${fmt.format(we)}`
  })()

  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(addDays(startOfWeek(parseKey('2024-01-01')), i))
  )

  const isEditing = formMode?.type === 'edit'
  const editEvent = isEditing ? formMode.event : null
  const formDate = isEditing
    ? editEvent!.date
    : formMode?.type === 'create'
      ? formMode.date
      : todayKey

  return (
    <>
      <Toaster toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setFormMode({ type: 'create', date: todayKey })}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          {t('create')}
        </button>
      </div>

      {/* Toolbar: view switcher + navigation */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50" aria-label="Previous">
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </button>
          <button onClick={goToday} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {t('today')}
          </button>
          <button onClick={() => nav(1)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50" aria-label="Next">
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </button>
          <span className="ml-2 font-semibold capitalize text-slate-900">{periodLabel}</span>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
          {(['month', 'week', 'day'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                view === v
                  ? 'rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                  : 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100'
              }
            >
              {t(v)}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      {view === 'month' && (
        <MonthView
          cursor={cursor}
          todayKey={todayKey}
          weekdayLabels={weekdayLabels}
          eventsOn={eventsOn}
          onDayClick={(key) => setFormMode({ type: 'create', date: key })}
          onEventClick={(e) => setFormMode({ type: 'edit', event: e })}
        />
      )}
      {view === 'week' && (
        <WeekView
          cursor={cursor}
          todayKey={todayKey}
          weekdayLabels={weekdayLabels}
          eventsOn={eventsOn}
          onDayClick={(key) => setFormMode({ type: 'create', date: key })}
          onEventClick={(e) => setFormMode({ type: 'edit', event: e })}
          locale={locale}
        />
      )}
      {view === 'day' && (
        <DayView
          cursor={cursor}
          todayKey={todayKey}
          eventsOn={eventsOn}
          onEventClick={(e) => setFormMode({ type: 'edit', event: e })}
          onEdit={(e) => setFormMode({ type: 'edit', event: e })}
          onDelete={(e) => setDeleteTarget(e)}
          activities={activities}
          venues={venues}
        />
      )}

      {/* Create / Edit modal */}
      <Modal
        open={formMode !== null}
        onClose={() => setFormMode(null)}
        title={isEditing ? t('editTitle') : t('createTitle')}
      >
        <form action={isEditing ? handleUpdate : handleCreate} className="space-y-4">
          <div>
            <label className="label-base">{t('form.title')} *</label>
            <input
              name="title"
              required
              defaultValue={editEvent?.title ?? ''}
              placeholder={t('form.titlePlaceholder')}
              className="input-base"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">{t('form.type')}</label>
              <select name="event_type" defaultValue={editEvent?.event_type ?? 'session'} className="input-base">
                <option value="session">{t('eventTypes.session')}</option>
                <option value="block">{t('eventTypes.block')}</option>
                <option value="personal">{t('eventTypes.personal')}</option>
              </select>
            </div>
            <div>
              <label className="label-base">{t('form.date')} *</label>
              <input name="date" type="date" required defaultValue={formDate} className="input-base" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">{t('form.startTime')}</label>
              <input name="start_time" type="time" defaultValue={editEvent?.start_time ?? ''} className="input-base" />
            </div>
            <div>
              <label className="label-base">{t('form.endTime')}</label>
              <input name="end_time" type="time" defaultValue={editEvent?.end_time ?? ''} className="input-base" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">{t('form.activity')}</label>
              <select name="activity_id" defaultValue={editEvent?.activity_id ?? ''} className="input-base">
                <option value="">{t('form.none')}</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">{t('form.venue')}</label>
              <select name="venue_id" defaultValue={editEvent?.venue_id ?? ''} className="input-base">
                <option value="">{t('form.none')}</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label-base">{t('form.notes')}</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={editEvent?.notes ?? ''}
              placeholder={t('form.notesPlaceholder')}
              className="input-base resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(editEvent)
                  setFormMode(null)
                }}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="inline h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => setFormMode(null)} className="btn-secondary flex-1">
              {t('form.cancel')}
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={pending}>
              {pending
                ? isEditing ? t('form.saving') : t('form.creating')
                : isEditing ? t('form.save') : t('form.create')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('delete')}
        message={t('confirmDelete')}
        loading={pending}
      />
    </>
  )
}

// ── Month view ───────────────────────────────────────────────────────────────
function MonthView({
  cursor,
  todayKey,
  weekdayLabels,
  eventsOn,
  onDayClick,
  onEventClick,
}: {
  cursor: Date
  todayKey: string
  weekdayLabels: string[]
  eventsOn: (k: string) => CalendarEvent[]
  onDayClick: (k: string) => void
  onEventClick: (e: CalendarEvent) => void
}) {
  const t = useTranslations('calendar')
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const month = cursor.getMonth()

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {weekdayLabels.map((w) => (
          <div key={w} className="px-2 py-2 text-center text-xs font-semibold uppercase text-slate-500">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = toKey(d)
          const inMonth = d.getMonth() === month
          const isToday = key === todayKey
          const dayEvents = eventsOn(key)
          return (
            <button
              key={key}
              onClick={() => onDayClick(key)}
              className={`min-h-[96px] border-b border-r border-slate-100 p-1.5 text-left align-top transition-colors hover:bg-slate-50 ${
                inMonth ? 'bg-white' : 'bg-slate-50/50'
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isToday ? 'bg-brand-600 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {d.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    role="button"
                    tabIndex={0}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onEventClick(e)
                    }}
                    className={`truncate rounded border px-1 py-0.5 text-[11px] font-medium ${TYPE_STYLES[e.event_type]}`}
                  >
                    {e.start_time ? `${formatTime(e.start_time)} ` : ''}
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-[10px] text-slate-400">
                    +{dayEvents.length - 3} {t('more')}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Week view ────────────────────────────────────────────────────────────────
function WeekView({
  cursor,
  todayKey,
  weekdayLabels,
  eventsOn,
  onDayClick,
  onEventClick,
  locale,
}: {
  cursor: Date
  todayKey: string
  weekdayLabels: string[]
  eventsOn: (k: string) => CalendarEvent[]
  onDayClick: (k: string) => void
  onEventClick: (e: CalendarEvent) => void
  locale: string
}) {
  const t = useTranslations('calendar')
  const ws = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  void locale
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((d, i) => {
        const key = toKey(d)
        const isToday = key === todayKey
        const dayEvents = eventsOn(key)
        return (
          <div key={key} className="rounded-xl border border-slate-200 bg-white">
            <button
              onClick={() => onDayClick(key)}
              className={`flex w-full items-center justify-between rounded-t-xl px-3 py-2 text-left ${
                isToday ? 'bg-brand-50' : 'bg-slate-50'
              }`}
            >
              <span className="text-xs font-semibold uppercase text-slate-500">{weekdayLabels[i]}</span>
              <span className={`text-sm font-bold ${isToday ? 'text-brand-700' : 'text-slate-700'}`}>
                {d.getDate()}
              </span>
            </button>
            <div className="space-y-1.5 p-2">
              {dayEvents.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-slate-300">{t('noEvents')}</p>
              ) : (
                dayEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onEventClick(e)}
                    className={`block w-full truncate rounded border px-2 py-1 text-left text-xs font-medium ${TYPE_STYLES[e.event_type]}`}
                  >
                    {e.start_time ? `${formatTime(e.start_time)} · ` : ''}
                    {e.title}
                  </button>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Day view ─────────────────────────────────────────────────────────────────
function DayView({
  cursor,
  todayKey,
  eventsOn,
  onEdit,
  onDelete,
  activities,
  venues,
}: {
  cursor: Date
  todayKey: string
  eventsOn: (k: string) => CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onEdit: (e: CalendarEvent) => void
  onDelete: (e: CalendarEvent) => void
  activities: Ref[]
  venues: Ref[]
}) {
  const t = useTranslations('calendar')
  void todayKey
  const key = toKey(cursor)
  const dayEvents = eventsOn(key)
  const activityName = (id: string | null) => activities.find((a) => a.id === id)?.label
  const venueName = (id: string | null) => venues.find((v) => v.id === id)?.label

  if (dayEvents.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
        {t('noEvents')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {dayEvents.map((e) => (
        <div
          key={e.id}
          className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
        >
          <div className="w-16 shrink-0 text-sm font-semibold text-slate-700">
            {e.start_time ? formatTime(e.start_time) : t('allDay')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${TYPE_STYLES[e.event_type]}`}>
                {t(`eventTypes.${e.event_type}` as 'eventTypes.session')}
              </span>
              <p className="truncate font-semibold text-slate-900">{e.title}</p>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
              {e.end_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {e.start_time ? formatTime(e.start_time) : ''} – {formatTime(e.end_time)}
                </span>
              )}
              {activityName(e.activity_id) && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {activityName(e.activity_id)}
                </span>
              )}
              {venueName(e.venue_id) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {venueName(e.venue_id)}
                </span>
              )}
            </div>
            {e.notes && <p className="mt-1 text-xs text-slate-400">{e.notes}</p>}
          </div>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={() => onEdit(e)} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(e)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
