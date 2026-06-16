'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { UserPlus, Pencil, Trash2, Mail, Phone, MapPin, Clock, AlertTriangle, Search } from 'lucide-react'
import {
  addWorkerFromOrganizer,
  updateUnclaimedWorkerFromOrganizer,
  deleteUnclaimedWorkerFromOrganizer,
} from '@/lib/actions/workerProfiles'
import { isMinor, isFutureDate, todayISO } from '@/lib/workers/age'
import type { WorkerProfile } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Toaster, useToast } from '@/components/ui/Toast'

const ROLE_KEYS = [
  'server', 'bartender', 'driver', 'mover', 'stage_crew', 'cleaner', 'instructor',
  'host', 'dj', 'guide', 'photographer', 'videographer', 'assistant', 'coordinator',
] as const
const GENDER_KEYS = ['female', 'male', 'other', 'prefer_not_to_say'] as const

export default function OrganizerWorkersClient({ initialWorkers }: { initialWorkers: WorkerProfile[] }) {
  const t = useTranslations('organizerWorkers')
  const tRoles = useTranslations('workerProfile')
  const router = useRouter()
  const { toasts, addToast, dismiss } = useToast()

  const [addPending, setAddPending] = useState(false)
  const [editTarget, setEditTarget] = useState<WorkerProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkerProfile | null>(null)
  const [pending, setPending] = useState(false)

  // ── Client-side list controls (no backend; operate on initialWorkers only) ──
  const PAGE = 25
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [ageFilter, setAgeFilter] = useState<'all' | 'adult' | 'minor' | 'unknown'>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return initialWorkers.filter((w) => {
      if (q && !`${w.display_name} ${w.email ?? ''} ${w.phone ?? ''}`.toLowerCase().includes(q)) return false
      if (roleFilter && !w.roles.includes(roleFilter)) return false
      if (genderFilter && w.gender !== genderFilter) return false
      if (ageFilter !== 'all') {
        const m = isMinor(w.date_of_birth) // true | false | null
        if (ageFilter === 'minor' && m !== true) return false
        if (ageFilter === 'adult' && m !== false) return false
        if (ageFilter === 'unknown' && m !== null) return false
      }
      return true
    })
  }, [initialWorkers, query, roleFilter, genderFilter, ageFilter])

  // Reset paging whenever the result set changes.
  useEffect(() => { setVisibleCount(PAGE) }, [query, roleFilter, genderFilter, ageFilter])

  const visible = filtered.slice(0, visibleCount)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    if (fd.getAll('roles').filter(Boolean).length === 0) { addToast('error', t('validation.rolesRequired')); return }
    if (isFutureDate(fd.get('date_of_birth') as string)) { addToast('error', t('validation.dobFuture')); return }
    setAddPending(true)
    try {
      const res = await addWorkerFromOrganizer(fd)
      if (!res) { addToast('error', t('toast.error')); return }
      if (res.outcome === 'created') addToast('success', t('outcome.created'))
      else if (res.outcome === 'reused_unclaimed') addToast('success', t('outcome.reusedUnclaimed'))
      else addToast('success', t('outcome.reusedClaimed'))
      form.reset()
      router.refresh() // reflect a newly-created unclaimed row in the list (RLS-visible only)
    } catch {
      addToast('error', t('toast.error'))
    } finally {
      setAddPending(false)
    }
  }

  async function handleEdit(formData: FormData) {
    if (!editTarget) return
    if (formData.getAll('roles').filter(Boolean).length === 0) { addToast('error', t('validation.rolesRequired')); return }
    if (isFutureDate(formData.get('date_of_birth') as string)) { addToast('error', t('validation.dobFuture')); return }
    setPending(true)
    try {
      const ok = await updateUnclaimedWorkerFromOrganizer(editTarget.id, formData)
      if (!ok) { addToast('error', t('toast.error')); return }
      setEditTarget(null)
      addToast('success', t('toast.updated'))
      router.refresh()
    } catch {
      addToast('error', t('toast.error'))
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setPending(true)
    try {
      const ok = await deleteUnclaimedWorkerFromOrganizer(deleteTarget.id)
      if (!ok) { addToast('error', t('toast.error')); return }
      setDeleteTarget(null)
      addToast('success', t('toast.deleted'))
      router.refresh()
    } catch {
      addToast('error', t('toast.error'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Toaster toasts={toasts} onDismiss={dismiss} />

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>
      </div>

      {/* Add worker (dedupe by email via add_worker; never creates a duplicate) */}
      <form onSubmit={handleAdd} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <UserPlus className="h-4 w-4" />{t('addTitle')}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label-base">{t('form.name')} *</label>
            <input name="name" required placeholder={t('form.namePlaceholder')} className="input-base" />
          </div>
          <div>
            <label className="label-base">{t('form.email')} *</label>
            <input name="email" type="email" required placeholder={t('form.emailPlaceholder')} className="input-base" />
          </div>
          <div>
            <label className="label-base">{t('form.phone')}</label>
            <input name="phone" placeholder={t('form.phonePlaceholder')} className="input-base" />
          </div>
          <div>
            <label className="label-base">{t('form.gender')}</label>
            <select name="gender" defaultValue="" className="input-base">
              <option value="">{t('form.genderUnset')}</option>
              {GENDER_KEYS.map((g) => (
                <option key={g} value={g}>{tRoles(`gender.${g}` as 'gender.female')}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label-base">{t('form.dob')}</label>
            <input name="date_of_birth" type="date" max={todayISO()} className="input-base" />
            <p className="mt-1 text-xs text-slate-400">{t('form.dobHint')}</p>
          </div>
        </div>
        <div>
          <label className="label-base">{t('form.roles')} *</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {ROLE_KEYS.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                <input type="checkbox" name="roles" value={r} className="h-3.5 w-3.5" />
                {tRoles(`roles.${r}` as 'roles.server')}
              </label>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400">{t('dedupeHint')}</p>
        <button type="submit" className="btn-primary" disabled={addPending}>
          {addPending ? t('form.adding') : t('form.add')}
        </button>
      </form>

      {/* List of the organizer's own unclaimed additions (RLS-visible only) */}
      <div className="mt-8">
        <h2 className="mb-1 text-lg font-bold text-slate-900">{t('listTitle')}</h2>
        <p className="mb-3 text-xs text-slate-400">{t('claimedNote')}</p>

        {initialWorkers.length === 0 ? (
          <EmptyState icon={UserPlus} title={t('empty')} description={t('emptyDesc')} />
        ) : (
          <>
            {/* Client-side controls — search + filters over the loaded list only. */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('filters.searchPlaceholder')}
                  className="input-base pl-9"
                />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-base w-auto">
                <option value="">{t('filters.allRoles')}</option>
                {ROLE_KEYS.map((r) => <option key={r} value={r}>{tRoles(`roles.${r}` as 'roles.server')}</option>)}
              </select>
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="input-base w-auto">
                <option value="">{t('filters.allGenders')}</option>
                {GENDER_KEYS.map((g) => <option key={g} value={g}>{tRoles(`gender.${g}` as 'gender.female')}</option>)}
              </select>
              <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value as typeof ageFilter)} className="input-base w-auto">
                <option value="all">{t('filters.ageAll')}</option>
                <option value="adult">{t('filters.ageAdult')}</option>
                <option value="minor">{t('filters.ageMinor')}</option>
                <option value="unknown">{t('filters.ageUnknown')}</option>
              </select>
            </div>

            <p className="mb-2 text-xs text-slate-400">{t('filters.showing', { shown: visible.length, total: filtered.length })}</p>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">{t('filters.noMatch')}</div>
            ) : (
              <>
                <div className="space-y-2">
                  {visible.map((w) => (
                    <div key={w.id} className="card group flex items-center gap-3 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-700">
                        {w.display_name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 truncate text-sm font-semibold text-slate-900">
                          {w.display_name}
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            <Clock className="h-3 w-3" />{t('pendingBadge')}
                          </span>
                          {isMinor(w.date_of_birth) === true && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                              <AlertTriangle className="h-3 w-3" />{t('minorBadge')}
                            </span>
                          )}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                          {w.roles.length > 0 && <span className="text-slate-500">{w.roles.map((r) => tRoles(`roles.${r}` as 'roles.server')).join(', ')}</span>}
                          {w.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{w.email}</span>}
                          {w.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{w.phone}</span>}
                          {(w.city || w.country) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[w.city, w.country].filter(Boolean).join(', ')}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setEditTarget(w)} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(w)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {visible.length < filtered.length && (
                  <div className="mt-4 text-center">
                    <button onClick={() => setVisibleCount((n) => n + PAGE)} className="btn-secondary">{t('filters.showMore')}</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Edit modal — only allowed fields (email is the immutable dedupe key) */}
      <Modal open={editTarget !== null} onClose={() => setEditTarget(null)} title={t('editTitle')}>
        {editTarget && (
          <form action={handleEdit} className="space-y-4">
            <div>
              <label className="label-base">{t('editForm.displayName')} *</label>
              <input name="display_name" required defaultValue={editTarget.display_name} className="input-base" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">{t('editForm.phone')}</label>
                <input name="phone" defaultValue={editTarget.phone ?? ''} className="input-base" />
              </div>
              <div>
                <label className="label-base">{t('editForm.payRate')}</label>
                <input name="pay_rate" type="number" min="0" step="0.01" defaultValue={editTarget.pay_rate_cents != null ? editTarget.pay_rate_cents / 100 : ''} className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">{t('editForm.gender')}</label>
                <select name="gender" defaultValue={editTarget.gender ?? ''} className="input-base">
                  <option value="">{t('form.genderUnset')}</option>
                  {GENDER_KEYS.map((g) => (
                    <option key={g} value={g}>{tRoles(`gender.${g}` as 'gender.female')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-base">{t('editForm.dob')}</label>
                <input name="date_of_birth" type="date" max={todayISO()} defaultValue={editTarget.date_of_birth ?? ''} className="input-base" />
              </div>
            </div>
            {isMinor(editTarget.date_of_birth) === true && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />{t('minorFlag')}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">{t('editForm.city')}</label>
                <input name="city" defaultValue={editTarget.city ?? ''} className="input-base" />
              </div>
              <div>
                <label className="label-base">{t('editForm.country')}</label>
                <input name="country" defaultValue={editTarget.country ?? ''} className="input-base" />
              </div>
            </div>
            <div>
              <label className="label-base">{t('editForm.languages')}</label>
              <input name="languages" defaultValue={editTarget.languages?.join(', ') ?? ''} className="input-base" />
            </div>
            <div>
              <label className="label-base">{t('editForm.roles')} *</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {ROLE_KEYS.map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                    <input type="checkbox" name="roles" value={r} defaultChecked={editTarget.roles.includes(r)} className="h-3.5 w-3.5" />
                    {tRoles(`roles.${r}` as 'roles.server')}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label-base">{t('editForm.bio')}</label>
              <textarea name="bio" rows={3} defaultValue={editTarget.bio ?? ''} className="input-base resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary flex-1">{t('editForm.cancel')}</button>
              <button type="submit" className="btn-primary flex-1" disabled={pending}>{pending ? t('editForm.saving') : t('editForm.save')}</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('delete')}
        message={t('confirmDelete')}
        loading={pending}
      />
    </div>
  )
}
