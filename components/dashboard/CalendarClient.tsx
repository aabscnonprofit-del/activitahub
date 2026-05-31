'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Calendar, Pencil, Trash2, Clock } from 'lucide-react'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/actions/events'
import type { CalendarEvent } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Toaster, useToast } from '@/components/ui/Toast'
import { formatTime, isUpcoming } from '@/lib/utils'

type Props = { initialEvents: CalendarEvent[]; locale: string }
type FormMode = { type: 'create' } | { type: 'edit'; event: CalendarEvent }

export default function CalendarClient({ initialEvents }: Props) {
  const t = useTranslations('calendar')
  const tCommon = useTranslations('common')
  const { toasts, addToast, dismiss } = useToast()

  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
  const [pending, setPending] = useState(false)

  async function handleCreate(formData: FormData) {
    setPending(true)
    try {
      await createCalendarEvent(formData)
      const ev: CalendarEvent = {
        id: Math.random().toString(36).slice(2),
        organizer_id: '',
        title: formData.get('title') as string,
        date: formData.get('date') as string,
        start_time: (formData.get('start_time') as string) || null,
        end_time: (formData.get('end_time') as string) || null,
        notes: (formData.get('notes') as string) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setEvents((prev) =>
        [...prev, ev].sort((a, b) => a.date.localeCompare(b.date))
      )
      setFormMode(null)
      addToast('success', `Event "${ev.title}" created`)
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
      const updated: CalendarEvent = {
        ...formMode.event,
        title: formData.get('title') as string,
        date: formData.get('date') as string,
        start_time: (formData.get('start_time') as string) || null,
        end_time: (formData.get('end_time') as string) || null,
        notes: (formData.get('notes') as string) || null,
        updated_at: new Date().toISOString(),
      }
      setEvents((prev) =>
        prev
          .map((e) => (e.id === updated.id ? updated : e))
          .sort((a, b) => a.date.localeCompare(b.date))
      )
      setFormMode(null)
      addToast('success', 'Event updated')
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
      addToast('success', 'Event deleted')
    } catch {
      addToast('error', tCommon('error'))
    } finally {
      setPending(false)
    }
  }

  const isEditing = formMode?.type === 'edit'
  const editEvent = isEditing ? formMode.event : null

  const upcoming = events.filter((e) => isUpcoming(e.date))
  const past = events.filter((e) => !isUpcoming(e.date))

  function EventCard({ event }: { event: CalendarEvent }) {
    const d = new Date(event.date + 'T00:00:00')
    return (
      <div className="card p-5 flex items-start gap-4 group hover:shadow-md transition-shadow">
        {/* Date badge */}
        <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-indigo-500 uppercase">
            {d.toLocaleDateString('en', { month: 'short' })}
          </span>
          <span className="text-xl font-extrabold text-indigo-700 leading-none">
            {d.getDate()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{event.title}</p>
          {(event.start_time || event.end_time) && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {event.start_time ? formatTime(event.start_time) : ''}
              {event.start_time && event.end_time ? ' – ' : ''}
              {event.end_time ? formatTime(event.end_time) : ''}
            </p>
          )}
          {event.notes && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{event.notes}</p>
          )}
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setFormMode({ type: 'edit', event })}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(event)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('subtitle')}</p>
        </div>
        <button onClick={() => setFormMode({ type: 'create' })} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('create')}
        </button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={t('empty')}
          description={t('emptyDesc')}
          action={
            <button onClick={() => setFormMode({ type: 'create' })} className="btn-primary text-sm">
              <Plus className="w-4 h-4" />
              {t('create')}
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {t('upcoming')} ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                {t('past')} ({past.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {past.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

          <div>
            <label className="label-base">{t('form.date')} *</label>
            <input
              name="date"
              type="date"
              required
              defaultValue={editEvent?.date ?? ''}
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">{t('form.startTime')}</label>
              <input
                name="start_time"
                type="time"
                defaultValue={editEvent?.start_time ?? ''}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">{t('form.endTime')}</label>
              <input
                name="end_time"
                type="time"
                defaultValue={editEvent?.end_time ?? ''}
                className="input-base"
              />
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
