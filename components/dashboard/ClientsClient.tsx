'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Users, Pencil, Trash2, Mail, Phone } from 'lucide-react'
import {
  createClientRecord,
  updateClientRecord,
  deleteClientRecord,
} from '@/lib/actions/clients'
import type { Client } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Toaster, useToast } from '@/components/ui/Toast'

type Props = { initialClients: Client[]; locale: string }
type FormMode = { type: 'create' } | { type: 'edit'; client: Client }

export default function ClientsClient({ initialClients }: Props) {
  const t = useTranslations('clients')
  const tCommon = useTranslations('common')
  const { toasts, addToast, dismiss } = useToast()

  const [clients, setClients] = useState<Client[]>(initialClients)
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [pending, setPending] = useState(false)
  const [search, setSearch] = useState('')

  async function handleCreate(formData: FormData) {
    setPending(true)
    try {
      await createClientRecord(formData)
      const c: Client = {
        id: Math.random().toString(36).slice(2),
        organizer_id: '',
        full_name: formData.get('full_name') as string,
        email: (formData.get('email') as string) || null,
        phone: (formData.get('phone') as string) || null,
        notes: (formData.get('notes') as string) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setClients((prev) => [c, ...prev])
      setFormMode(null)
      addToast('success', `Client "${c.full_name}" added`)
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
      await updateClientRecord(formMode.client.id, formData)
      const updated: Client = {
        ...formMode.client,
        full_name: formData.get('full_name') as string,
        email: (formData.get('email') as string) || null,
        phone: (formData.get('phone') as string) || null,
        notes: (formData.get('notes') as string) || null,
        updated_at: new Date().toISOString(),
      }
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setFormMode(null)
      addToast('success', 'Client updated')
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
      await deleteClientRecord(deleteTarget.id)
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
      addToast('success', 'Client removed')
    } catch {
      addToast('error', tCommon('error'))
    } finally {
      setPending(false)
    }
  }

  const isEditing = formMode?.type === 'edit'
  const editClient = isEditing ? formMode.client : null

  const filtered = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  )

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

      {clients.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base max-w-sm"
          />
        </div>
      )}

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('empty')}
          description={t('emptyDesc')}
          action={
            <button onClick={() => setFormMode({ type: 'create' })} className="btn-primary text-sm">
              <Plus className="w-4 h-4" />
              {t('create')}
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No results for &ldquo;{search}&rdquo;</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="card p-4 flex items-center gap-4 group hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                {client.full_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{client.full_name}</p>
                <div className="flex flex-wrap gap-3 mt-0.5">
                  {client.email && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {client.phone}
                    </span>
                  )}
                </div>
                {client.notes && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{client.notes}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => setFormMode({ type: 'edit', client })}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(client)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formMode !== null}
        onClose={() => setFormMode(null)}
        title={isEditing ? t('editTitle') : t('createTitle')}
      >
        <form action={isEditing ? handleUpdate : handleCreate} className="space-y-4">
          <div>
            <label className="label-base">{t('form.fullName')} *</label>
            <input
              name="full_name"
              required
              defaultValue={editClient?.full_name ?? ''}
              placeholder={t('form.fullNamePlaceholder')}
              className="input-base"
              autoFocus
            />
          </div>
          <div>
            <label className="label-base">{t('form.email')}</label>
            <input
              name="email"
              type="email"
              defaultValue={editClient?.email ?? ''}
              placeholder={t('form.emailPlaceholder')}
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">{t('form.phone')}</label>
            <input
              name="phone"
              defaultValue={editClient?.phone ?? ''}
              placeholder={t('form.phonePlaceholder')}
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">{t('form.notes')}</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={editClient?.notes ?? ''}
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
