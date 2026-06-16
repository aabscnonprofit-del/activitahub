'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Store, Pencil, Trash2, Mail, Phone, MapPin } from 'lucide-react'
import { createVendor, updateVendor, deleteVendor } from '@/lib/actions/vendors'
import type { Vendor } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Toaster, useToast } from '@/components/ui/Toast'

// Canonical capability keys (VENDOR_NETWORK_ARCHITECTURE §1). Labels via i18n.
const CAPABILITIES = [
  'venue', 'catering', 'bakery', 'equipment', 'decoration',
  'transportation', 'photography', 'entertainment', 'cleaning', 'printing',
] as const

type Props = { initialVendors: Vendor[]; locale: string }
type FormMode = { type: 'create' } | { type: 'edit'; vendor: Vendor }

export default function VendorsClient({ initialVendors }: Props) {
  const t = useTranslations('vendors')
  const tCommon = useTranslations('common')
  const { toasts, addToast, dismiss } = useToast()

  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [pending, setPending] = useState(false)
  const [search, setSearch] = useState('')

  function vendorFromForm(formData: FormData, base?: Vendor): Vendor {
    const languages = ((formData.get('languages') as string) ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean)
    return {
      id: base?.id ?? Math.random().toString(36).slice(2),
      organizer_id: base?.organizer_id ?? '',
      name: formData.get('name') as string,
      company_name: (formData.get('company_name') as string) || null,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      city: (formData.get('city') as string) || null,
      country: (formData.get('country') as string) || null,
      languages: languages.length ? languages : null,
      capabilities: formData.getAll('capabilities').map(String).filter(Boolean),
      description: (formData.get('description') as string) || null,
      created_at: base?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  async function handleCreate(formData: FormData) {
    setPending(true)
    try {
      await createVendor(formData)
      const v = vendorFromForm(formData)
      setVendors((prev) => [v, ...prev])
      setFormMode(null)
      addToast('success', t('added', { name: v.name }))
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
      await updateVendor(formMode.vendor.id, formData)
      const updated = vendorFromForm(formData, formMode.vendor)
      setVendors((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
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
      await deleteVendor(deleteTarget.id)
      setVendors((prev) => prev.filter((v) => v.id !== deleteTarget.id))
      setDeleteTarget(null)
      addToast('success', t('removed'))
    } catch {
      addToast('error', tCommon('error'))
    } finally {
      setPending(false)
    }
  }

  const isEditing = formMode?.type === 'edit'
  const editVendor = isEditing ? formMode.vendor : null

  const filtered = vendors.filter((v) => {
    const q = search.toLowerCase()
    return (
      v.name.toLowerCase().includes(q) ||
      v.company_name?.toLowerCase().includes(q) ||
      v.capabilities.some((c) => t(`capabilities.${c}` as 'capabilities.venue').toLowerCase().includes(q))
    )
  })

  return (
    <>
      <Toaster toasts={toasts} onDismiss={dismiss} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>
        </div>
        <button onClick={() => setFormMode({ type: 'create' })} className="btn-primary">
          <Plus className="h-4 w-4" />
          {t('create')}
        </button>
      </div>

      {vendors.length > 0 && (
        <div className="mb-4">
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base max-w-sm"
          />
        </div>
      )}

      {vendors.length === 0 ? (
        <EmptyState
          icon={Store}
          title={t('empty')}
          description={t('emptyDesc')}
          action={
            <button onClick={() => setFormMode({ type: 'create' })} className="btn-primary text-sm">
              <Plus className="h-4 w-4" />
              {t('create')}
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">{t('noResults', { q: search })}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((vendor) => (
            <div key={vendor.id} className="card group flex items-start gap-4 p-4 transition-shadow hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-700">
                {vendor.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {vendor.name}
                  {vendor.company_name && <span className="ml-1 font-normal text-slate-400">· {vendor.company_name}</span>}
                </p>
                {vendor.capabilities.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {vendor.capabilities.map((c) => (
                      <span key={c} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        {t(`capabilities.${c}` as 'capabilities.venue')}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-3">
                  {vendor.email && <span className="flex items-center gap-1 text-xs text-slate-400"><Mail className="h-3 w-3" />{vendor.email}</span>}
                  {vendor.phone && <span className="flex items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" />{vendor.phone}</span>}
                  {(vendor.city || vendor.country) && (
                    <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3 w-3" />{[vendor.city, vendor.country].filter(Boolean).join(', ')}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => setFormMode({ type: 'edit', vendor })} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteTarget(vendor)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={formMode !== null} onClose={() => setFormMode(null)} title={isEditing ? t('editTitle') : t('createTitle')}>
        <form action={isEditing ? handleUpdate : handleCreate} className="space-y-4">
          <div>
            <label className="label-base">{t('form.name')} *</label>
            <input name="name" required defaultValue={editVendor?.name ?? ''} placeholder={t('form.namePlaceholder')} className="input-base" autoFocus />
          </div>
          <div>
            <label className="label-base">{t('form.companyName')}</label>
            <input name="company_name" defaultValue={editVendor?.company_name ?? ''} placeholder={t('form.companyNamePlaceholder')} className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">{t('form.email')}</label>
              <input name="email" type="email" defaultValue={editVendor?.email ?? ''} placeholder={t('form.emailPlaceholder')} className="input-base" />
            </div>
            <div>
              <label className="label-base">{t('form.phone')}</label>
              <input name="phone" defaultValue={editVendor?.phone ?? ''} placeholder={t('form.phonePlaceholder')} className="input-base" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">{t('form.city')}</label>
              <input name="city" defaultValue={editVendor?.city ?? ''} placeholder={t('form.cityPlaceholder')} className="input-base" />
            </div>
            <div>
              <label className="label-base">{t('form.country')}</label>
              <input name="country" defaultValue={editVendor?.country ?? ''} placeholder={t('form.countryPlaceholder')} className="input-base" />
            </div>
          </div>
          <div>
            <label className="label-base">{t('form.languages')}</label>
            <input name="languages" defaultValue={editVendor?.languages?.join(', ') ?? ''} placeholder={t('form.languagesPlaceholder')} className="input-base" />
          </div>
          <div>
            <label className="label-base">{t('form.capabilities')}</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {CAPABILITIES.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                  <input type="checkbox" name="capabilities" value={c} defaultChecked={editVendor?.capabilities.includes(c)} className="h-3.5 w-3.5" />
                  {t(`capabilities.${c}` as 'capabilities.venue')}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label-base">{t('form.description')}</label>
            <textarea name="description" rows={3} defaultValue={editVendor?.description ?? ''} placeholder={t('form.descriptionPlaceholder')} className="input-base resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setFormMode(null)} className="btn-secondary flex-1">{t('form.cancel')}</button>
            <button type="submit" className="btn-primary flex-1" disabled={pending}>
              {pending ? (isEditing ? t('form.saving') : t('form.creating')) : isEditing ? t('form.save') : t('form.create')}
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
