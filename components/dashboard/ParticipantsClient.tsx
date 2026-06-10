'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft, Plus, Search, Users, Megaphone, Download, Bell, Link2, Trash2,
  UserCheck, UserX, Check,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Toaster, useToast } from '@/components/ui/Toast'
import {
  addParticipant, setParticipantStatus, deleteParticipant,
  importBookingsAsParticipants, sendEventUpdate, saveReminderOffsets,
} from '@/lib/actions/participants'
import type { Participant, ParticipantStatus } from '@/lib/types'

const STATUSES: ParticipantStatus[] = ['invited', 'confirmed', 'maybe', 'declined', 'checked_in', 'no_show']
const REMINDER_OPTIONS = [168, 24, 2] // hours: 7d / 24h / 2h

function statusClasses(s: ParticipantStatus): string {
  switch (s) {
    case 'confirmed':
    case 'checked_in':
      return 'bg-emerald-100 text-emerald-700'
    case 'maybe':
      return 'bg-amber-100 text-amber-700'
    case 'declined':
    case 'no_show':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

type Props = {
  locale: string
  activityId: string
  activityTitle: string
  reminderOffsets: number[]
  initial: Participant[]
  appUrl: string
}

export default function ParticipantsClient({
  locale,
  activityId,
  activityTitle,
  reminderOffsets,
  initial,
  appUrl,
}: Props) {
  const t = useTranslations('participants')
  const router = useRouter()
  const { toasts, addToast, dismiss } = useToast()

  const [list, setList] = useState<Participant[]>(initial)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | ParticipantStatus>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [remOpen, setRemOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [offsets, setOffsets] = useState<number[]>(reminderOffsets)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of STATUSES) c[s] = 0
    for (const p of list) c[p.status] = (c[p.status] ?? 0) + 1
    return c
  }, [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false
      if (!q) return true
      return (
        p.full_name.toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q)
      )
    })
  }, [list, search, filter])

  async function changeStatus(p: Participant, status: ParticipantStatus) {
    const prev = p.status
    setList((l) => l.map((x) => (x.id === p.id ? { ...x, status } : x)))
    const res = await setParticipantStatus(p.id, status)
    if (!res.ok) {
      setList((l) => l.map((x) => (x.id === p.id ? { ...x, status: prev } : x)))
      addToast('error', t('error'))
    }
  }

  async function remove(p: Participant) {
    setList((l) => l.filter((x) => x.id !== p.id))
    const res = await deleteParticipant(p.id)
    if (!res.ok) addToast('error', t('error'))
  }

  async function handleAdd(formData: FormData) {
    setPending(true)
    try {
      const res = await addParticipant(activityId, {
        full_name: (formData.get('full_name') as string) || '',
        email: (formData.get('email') as string) || '',
        phone: (formData.get('phone') as string) || '',
        notes: (formData.get('notes') as string) || '',
      })
      if (res.ok) {
        setAddOpen(false)
        addToast('success', t('added'))
        router.refresh()
      } else addToast('error', t('error'))
    } finally {
      setPending(false)
    }
  }

  async function handleImport() {
    setPending(true)
    try {
      const res = await importBookingsAsParticipants(activityId)
      if (res.ok) {
        addToast('success', t('imported', { count: res.added ?? 0 }))
        router.refresh()
      } else addToast('error', t('error'))
    } finally {
      setPending(false)
    }
  }

  async function handleUpdate(formData: FormData) {
    setPending(true)
    try {
      const res = await sendEventUpdate(activityId, (formData.get('message') as string) || '')
      if (res.ok) {
        setUpdateOpen(false)
        addToast('success', t('updateSent', { count: res.notified ?? 0 }))
      } else addToast('error', t('error'))
    } finally {
      setPending(false)
    }
  }

  async function saveReminders() {
    setPending(true)
    try {
      const res = await saveReminderOffsets(activityId, offsets)
      if (res.ok) {
        setRemOpen(false)
        addToast('success', t('remindersSaved'))
      } else addToast('error', t('error'))
    } finally {
      setPending(false)
    }
  }

  function copyRsvp(p: Participant) {
    const url = `${appUrl}/${locale}/rsvp/${p.rsvp_token}`
    navigator.clipboard.writeText(url).then(
      () => addToast('success', t('linkCopied')),
      () => addToast('error', t('error')),
    )
  }

  return (
    <div className="space-y-6">
      <Toaster toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div>
        <Link
          href={`/${locale}/dashboard/activities`}
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
            <p className="text-sm text-slate-500">{activityTitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleImport} disabled={pending} className="btn-secondary text-sm">
              <Download className="h-4 w-4" />
              {t('importBookings')}
            </button>
            <button onClick={() => setRemOpen(true)} className="btn-secondary text-sm">
              <Bell className="h-4 w-4" />
              {t('reminders')}
            </button>
            <button onClick={() => setUpdateOpen(true)} className="btn-secondary text-sm">
              <Megaphone className="h-4 w-4" />
              {t('sendUpdate')}
            </button>
            <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
              <Plus className="h-4 w-4" />
              {t('add')}
            </button>
          </div>
        </div>
      </div>

      {/* Stats counters */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {STATUSES.map((s) => (
          <div key={s} className="card p-3 text-center">
            <p className="text-2xl font-extrabold text-slate-900">{counts[s] ?? 0}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{t(`status.${s}` as 'status.invited')}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="input-base !pl-9"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | ParticipantStatus)} className="input-base !w-auto">
          <option value="all">{t('allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}` as 'status.invited')}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <Users className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-900">{p.full_name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClasses(p.status)}`}>
                    {t(`status.${p.status}` as 'status.invited')}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {[p.email, p.phone].filter(Boolean).join(' · ') || '—'}
                </p>
                {p.notes && <p className="mt-0.5 truncate text-xs text-slate-400">{p.notes}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  value={p.status}
                  onChange={(e) => changeStatus(p, e.target.value as ParticipantStatus)}
                  className="input-base !w-auto !py-1.5 !text-xs"
                  aria-label={t('changeStatus')}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`status.${s}` as 'status.invited')}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => changeStatus(p, 'checked_in')}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                  title={t('checkIn')}
                >
                  <UserCheck className="h-4 w-4" />
                </button>
                <button
                  onClick={() => changeStatus(p, 'no_show')}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  title={t('noShow')}
                >
                  <UserX className="h-4 w-4" />
                </button>
                <button
                  onClick={() => copyRsvp(p)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                  title={t('copyRsvp')}
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(p)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title={t('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add participant modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('add')}>
        <form action={handleAdd} className="space-y-4">
          <div>
            <label className="label-base">{t('name')} *</label>
            <input name="full_name" required className="input-base" autoFocus />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-base">{t('email')}</label>
              <input name="email" type="email" className="input-base" />
            </div>
            <div>
              <label className="label-base">{t('phone')}</label>
              <input name="phone" className="input-base" />
            </div>
          </div>
          <div>
            <label className="label-base">{t('notes')}</label>
            <textarea name="notes" rows={2} className="input-base resize-none" />
          </div>
          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary flex-1">
              {t('cancel')}
            </button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              <Check className="h-4 w-4" />
              {t('add')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Send update modal */}
      <Modal open={updateOpen} onClose={() => setUpdateOpen(false)} title={t('sendUpdate')}>
        <form action={handleUpdate} className="space-y-4">
          <p className="text-sm text-slate-500">{t('sendUpdateHint')}</p>
          <textarea name="message" rows={4} required placeholder={t('updatePlaceholder')} className="input-base resize-none" autoFocus />
          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setUpdateOpen(false)} className="btn-secondary flex-1">
              {t('cancel')}
            </button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              <Megaphone className="h-4 w-4" />
              {t('send')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reminders modal */}
      <Modal open={remOpen} onClose={() => setRemOpen(false)} title={t('reminders')}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{t('remindersHint')}</p>
          <div className="space-y-2">
            {REMINDER_OPTIONS.map((h) => (
              <label key={h} className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={offsets.includes(h)}
                  onChange={(e) =>
                    setOffsets((o) => (e.target.checked ? [...new Set([...o, h])] : o.filter((x) => x !== h)))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                {t(`offset.${h}` as 'offset.168')}
              </label>
            ))}
          </div>
          <div className="flex gap-3 border-t border-slate-100 pt-4">
            <button onClick={() => setRemOpen(false)} className="btn-secondary flex-1">
              {t('cancel')}
            </button>
            <button onClick={saveReminders} disabled={pending} className="btn-primary flex-1">
              <Check className="h-4 w-4" />
              {t('save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
