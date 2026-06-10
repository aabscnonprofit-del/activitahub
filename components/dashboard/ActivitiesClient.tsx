'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Layers, Pencil, Trash2, Eye, EyeOff, Sparkles, Megaphone } from 'lucide-react'
import {
  createActivity,
  updateActivity,
  deleteActivity,
  setActivityStatus,
} from '@/lib/actions/activities'
import type { Activity, ActivityCategory } from '@/lib/types'
import { CATEGORY_GROUPS, CATEGORIES_BY_GROUP } from '@/lib/categories'
import Modal from '@/components/ui/Modal'
import PromotionPackageModal from '@/components/dashboard/PromotionPackageModal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Toaster, useToast } from '@/components/ui/Toast'

type Props = {
  initialActivities: Activity[]
  venues: { id: string; name: string }[]
  locale: string
}

type FormMode = { type: 'create' } | { type: 'edit'; activity: Activity }

/** Friendly section header inside the activity form. */
function SectionLabel({
  children,
  optionalText,
}: {
  children: React.ReactNode
  optionalText?: string
}) {
  return (
    <div className="flex items-center gap-2 border-t border-slate-100 pt-5 first:border-0 first:pt-0">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{children}</span>
      {optionalText && (
        <span className="text-xs font-medium normal-case text-slate-300">· {optionalText}</span>
      )}
    </div>
  )
}

// Parses the marketplace fields from the form for optimistic UI.
function marketplaceFields(formData: FormData) {
  const priceRaw = (formData.get('price') as string)?.trim()
  const langRaw = (formData.get('languages') as string)?.trim()
  const minAge = (formData.get('min_age') as string)?.trim()
  const maxAge = (formData.get('max_age') as string)?.trim()
  const duration = (formData.get('duration_minutes') as string)?.trim()
  return {
    category: ((formData.get('category') as string) || null) as ActivityCategory | null,
    price_cents: priceRaw ? Math.round(parseFloat(priceRaw) * 100) : null,
    currency: 'usd',
    languages: langRaw ? langRaw.split(',').map((s) => s.trim()).filter(Boolean) : null,
    min_age: minAge ? parseInt(minAge) : null,
    max_age: maxAge ? parseInt(maxAge) : null,
    city: (formData.get('city') as string)?.trim() || null,
    country: (formData.get('country') as string)?.trim() || null,
    indoor_outdoor: ((formData.get('indoor_outdoor') as string) || null) as Activity['indoor_outdoor'],
    venue_id: (formData.get('venue_id') as string) || null,
    duration_minutes: duration ? parseInt(duration) : null,
  }
}

export default function ActivitiesClient({ initialActivities, venues, locale }: Props) {
  const t = useTranslations('activities')
  const tMarket = useTranslations('marketplace')
  const tCommon = useTranslations('common')
  const { toasts, addToast, dismiss } = useToast()

  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null)
  const [promoTarget, setPromoTarget] = useState<Activity | null>(null)
  const [pending, setPending] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  function fillTitle(value: string) {
    if (titleRef.current) {
      titleRef.current.value = value
      titleRef.current.focus()
    }
  }

  async function handleCreate(formData: FormData) {
    setPending(true)
    try {
      await createActivity(formData)
      // Refresh list from server action revalidation isn't reflected without router.refresh
      // So we optimistically add locally
      const title = formData.get('title') as string
      const newActivity: Activity = {
        id: Math.random().toString(36).slice(2),
        organizer_id: '',
        title,
        description: (formData.get('description') as string) || null,
        status: (formData.get('status') as 'draft') || 'draft',
        ...marketplaceFields(formData),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setActivities((prev) => [newActivity, ...prev])
      setFormMode(null)
      addToast('success', `Activity "${title}" created`)
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
      await updateActivity(formMode.activity.id, formData)
      const updated: Activity = {
        ...formMode.activity,
        title: formData.get('title') as string,
        description: (formData.get('description') as string) || null,
        status: (formData.get('status') as Activity['status']) || 'draft',
        ...marketplaceFields(formData),
        updated_at: new Date().toISOString(),
      }
      setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setFormMode(null)
      addToast('success', 'Activity updated')
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
      await deleteActivity(deleteTarget.id)
      setActivities((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      setDeleteTarget(null)
      addToast('success', 'Activity deleted')
    } catch {
      addToast('error', tCommon('error'))
    } finally {
      setPending(false)
    }
  }

  async function handleTogglePublish(activity: Activity) {
    const next = activity.status === 'published' ? 'draft' : 'published'
    // Optimistic update
    setActivities((prev) =>
      prev.map((a) => (a.id === activity.id ? { ...a, status: next } : a))
    )
    try {
      await setActivityStatus(activity.id, next)
      addToast('success', next === 'published' ? t('published') : t('unpublished'))
    } catch {
      // Roll back on failure
      setActivities((prev) =>
        prev.map((a) => (a.id === activity.id ? { ...a, status: activity.status } : a))
      )
      addToast('error', tCommon('error'))
    }
  }

  const isEditing = formMode?.type === 'edit'
  const editActivity = isEditing ? formMode.activity : null

  return (
    <>
      <Toaster toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
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

      {/* List */}
      {activities.length === 0 ? (
        <EmptyState
          icon={Layers}
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
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="card p-5 flex items-start gap-4 group hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-slate-900 truncate">{activity.title}</h3>
                  <Badge
                    label={t(`status.${activity.status}` as 'status.draft')}
                    variant={
                      activity.status === 'published'
                        ? 'success'
                        : activity.status === 'archived'
                          ? 'neutral'
                          : 'warning'
                    }
                  />
                </div>
                {activity.description && (
                  <p className="text-slate-500 text-sm line-clamp-2">{activity.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-1.5">
                  {new Date(activity.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-0.5 shrink-0 sm:gap-1">
                <button
                  onClick={() => setPromoTarget(activity)}
                  className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  title={t('promotion.button')}
                >
                  <Megaphone className="w-4 h-4" />
                </button>
                {activity.status !== 'archived' && (
                  <button
                    onClick={() => handleTogglePublish(activity)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title={activity.status === 'published' ? t('unpublish') : t('publish')}
                  >
                    {activity.status === 'published' ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => setFormMode({ type: 'edit', activity })}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title={t('edit')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(activity)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={formMode !== null}
        onClose={() => setFormMode(null)}
        title={isEditing ? t('editTitle') : t('createTitle')}
      >
        <form action={isEditing ? handleUpdate : handleCreate} className="space-y-5">
          {/* Reassuring intro — "you can start simple" */}
          {!isEditing && (
            <div className="flex items-start gap-2.5 rounded-xl bg-brand-50 p-3.5 text-sm text-slate-600">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
              <span>{t('form.intro')}</span>
            </div>
          )}

          {/* ── The basics ─────────────────────────────────────────────── */}
          <SectionLabel>{t('form.sectionBasics')}</SectionLabel>
          <div>
            <label className="label-base">{t('form.title')} *</label>
            <input
              ref={titleRef}
              name="title"
              required
              defaultValue={editActivity?.title ?? ''}
              placeholder={t('form.titlePlaceholder')}
              className="input-base"
              autoFocus
            />
            <p className="mt-1 text-xs text-slate-400">{t('form.titleHint')}</p>
            {!isEditing && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400">{t('form.examplesLabel')}</span>
                {[0, 1, 2, 3].map((i) => {
                  const ex = t(`form.examples.${i}` as 'form.examples.0')
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => fillTitle(ex)}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {ex}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div>
            <label className="label-base">{t('form.description')}</label>
            <textarea
              name="description"
              rows={4}
              defaultValue={editActivity?.description ?? ''}
              placeholder={t('form.descriptionPlaceholder')}
              className="input-base resize-none"
            />
            <p className="mt-1 text-xs text-slate-400">{t('form.descriptionHint')}</p>
          </div>

          {/* ── Activity details (optional) ────────────────────────────── */}
          <SectionLabel optionalText={t('form.optional')}>{t('form.sectionDetails')}</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-base">{t('form.category')}</label>
              <select name="category" defaultValue={editActivity?.category ?? ''} className="input-base">
                <option value="">{t('form.none')}</option>
                {CATEGORY_GROUPS.map((g) => (
                  <optgroup key={g} label={tMarket(`groups.${g}.name` as 'groups.personal.name')}>
                    {CATEGORIES_BY_GROUP[g].map((c) => (
                      <option key={c.key} value={c.key}>{tMarket(`categories.${c.key}` as 'categories.birthday')}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">{t('form.price')}</label>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editActivity?.price_cents != null ? editActivity.price_cents / 100 : ''}
                placeholder="0.00"
                className="input-base"
              />
              <p className="mt-1 text-xs text-slate-400">{t('form.priceHint')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-base">{t('form.city')}</label>
              <input name="city" defaultValue={editActivity?.city ?? ''} className="input-base" />
            </div>
            <div>
              <label className="label-base">{t('form.country')}</label>
              <input name="country" defaultValue={editActivity?.country ?? ''} className="input-base" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-base">{t('form.indoorOutdoor')}</label>
              <select name="indoor_outdoor" defaultValue={editActivity?.indoor_outdoor ?? ''} className="input-base">
                <option value="">{t('form.none')}</option>
                <option value="indoor">{t('indoorOutdoor.indoor')}</option>
                <option value="outdoor">{t('indoorOutdoor.outdoor')}</option>
                <option value="both">{t('indoorOutdoor.both')}</option>
              </select>
            </div>
            <div>
              <label className="label-base">{t('form.duration')}</label>
              <input name="duration_minutes" type="number" min="0" defaultValue={editActivity?.duration_minutes ?? ''} className="input-base" />
            </div>
          </div>
          <div>
            <label className="label-base">{t('form.venue')}</label>
            <select name="venue_id" defaultValue={editActivity?.venue_id ?? ''} className="input-base">
              <option value="">{t('form.none')}</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* ── Who it's for (optional) ────────────────────────────────── */}
          <SectionLabel optionalText={t('form.optional')}>{t('form.sectionWho')}</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-base">{t('form.minAge')}</label>
              <input name="min_age" type="number" min="0" defaultValue={editActivity?.min_age ?? ''} className="input-base" />
            </div>
            <div>
              <label className="label-base">{t('form.maxAge')}</label>
              <input name="max_age" type="number" min="0" defaultValue={editActivity?.max_age ?? ''} className="input-base" />
            </div>
          </div>
          <div>
            <label className="label-base">{t('form.languages')}</label>
            <input
              name="languages"
              defaultValue={editActivity?.languages?.join(', ') ?? ''}
              placeholder="English, Spanish"
              className="input-base"
            />
          </div>

          {/* ── Visibility + marketplace connection ────────────────────── */}
          <SectionLabel>{t('form.sectionVisibility')}</SectionLabel>
          <div>
            <label className="label-base">{t('form.status')}</label>
            <select
              name="status"
              defaultValue={editActivity?.status ?? 'draft'}
              className="input-base"
            >
              <option value="draft">{t('status.draft')}</option>
              <option value="published">{t('status.published')}</option>
              <option value="archived">{t('status.archived')}</option>
            </select>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{t('form.statusHint')}</p>
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-4">
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('delete')}
        message={t('confirmDelete')}
        loading={pending}
      />

      {/* Promotion package generator */}
      <PromotionPackageModal
        activity={promoTarget}
        uiLocale={locale}
        open={promoTarget !== null}
        onClose={() => setPromoTarget(null)}
      />
    </>
  )
}
