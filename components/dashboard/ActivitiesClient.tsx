'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Layers, Pencil, Trash2 } from 'lucide-react'
import {
  createActivity,
  updateActivity,
  deleteActivity,
} from '@/lib/actions/activities'
import type { Activity } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Toaster, useToast } from '@/components/ui/Toast'

type Props = {
  initialActivities: Activity[]
  locale: string
}

type FormMode = { type: 'create' } | { type: 'edit'; activity: Activity }

export default function ActivitiesClient({ initialActivities }: Props) {
  const t = useTranslations('activities')
  const tCommon = useTranslations('common')
  const { toasts, addToast, dismiss } = useToast()

  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null)
  const [pending, setPending] = useState(false)

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
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
        <form action={isEditing ? handleUpdate : handleCreate} className="space-y-4">
          <div>
            <label className="label-base">{t('form.title')} *</label>
            <input
              name="title"
              required
              defaultValue={editActivity?.title ?? ''}
              placeholder={t('form.titlePlaceholder')}
              className="input-base"
              autoFocus
            />
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
          </div>

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

      {/* Delete confirm */}
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
