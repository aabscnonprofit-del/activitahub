'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Plus, MapPin, Pencil, Trash2, Users, Home, TreePine, ImagePlus, X } from 'lucide-react'
import { createVenue, updateVenue, deleteVenue } from '@/lib/actions/venues'
import { uploadVenuePhoto, deleteVenuePhoto } from '@/lib/actions/venuePhotos'
import type { Venue } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Toaster, useToast } from '@/components/ui/Toast'

type PhotoVM = { id: string; url: string }
type Props = {
  initialVenues: Venue[]
  initialPhotos?: Record<string, PhotoVM[]>
  locale: string
}
type FormMode = { type: 'create' } | { type: 'edit'; venue: Venue }

function indoorIcon(type: string | null) {
  if (type === 'indoor') return <Home className="w-4 h-4" />
  if (type === 'outdoor') return <TreePine className="w-4 h-4" />
  return <MapPin className="w-4 h-4" />
}

export default function VenuesClient({ initialVenues, initialPhotos }: Props) {
  const t = useTranslations('venues')
  const tCommon = useTranslations('common')
  const { toasts, addToast, dismiss } = useToast()

  const [venues, setVenues] = useState<Venue[]>(initialVenues)
  const [photos, setPhotos] = useState<Record<string, PhotoVM[]>>(initialPhotos ?? {})
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Venue | null>(null)
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUploadPhoto(venueId: string, file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('venueId', venueId)
      fd.set('file', file)
      const result = await uploadVenuePhoto(fd)
      if (!result.ok) {
        addToast('error', result.error)
        return
      }
      setPhotos((prev) => ({
        ...prev,
        [venueId]: [...(prev[venueId] ?? []), { id: result.id, url: result.url }],
      }))
      addToast('success', t('photos.uploaded'))
    } catch {
      addToast('error', tCommon('error'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemovePhoto(venueId: string, photoId: string) {
    const prevPhotos = photos[venueId] ?? []
    setPhotos((prev) => ({
      ...prev,
      [venueId]: (prev[venueId] ?? []).filter((p) => p.id !== photoId),
    }))
    try {
      await deleteVenuePhoto(photoId)
    } catch {
      setPhotos((prev) => ({ ...prev, [venueId]: prevPhotos }))
      addToast('error', tCommon('error'))
    }
  }

  async function handleCreate(formData: FormData) {
    setPending(true)
    try {
      await createVenue(formData)
      const v: Venue = {
        id: Math.random().toString(36).slice(2),
        organizer_id: '',
        name: formData.get('name') as string,
        address: (formData.get('address') as string) || null,
        city: (formData.get('city') as string) || null,
        country: (formData.get('country') as string) || null,
        capacity: formData.get('capacity') ? parseInt(formData.get('capacity') as string) : null,
        indoor_outdoor: (formData.get('indoor_outdoor') as Venue['indoor_outdoor']) || null,
        notes: (formData.get('notes') as string) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setVenues((prev) => [v, ...prev])
      setFormMode(null)
      addToast('success', `Venue "${v.name}" added`)
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
      await updateVenue(formMode.venue.id, formData)
      const updated: Venue = {
        ...formMode.venue,
        name: formData.get('name') as string,
        address: (formData.get('address') as string) || null,
        city: (formData.get('city') as string) || null,
        country: (formData.get('country') as string) || null,
        capacity: formData.get('capacity') ? parseInt(formData.get('capacity') as string) : null,
        indoor_outdoor: (formData.get('indoor_outdoor') as Venue['indoor_outdoor']) || null,
        notes: (formData.get('notes') as string) || null,
        updated_at: new Date().toISOString(),
      }
      setVenues((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
      setFormMode(null)
      addToast('success', 'Venue updated')
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
      await deleteVenue(deleteTarget.id)
      setVenues((prev) => prev.filter((v) => v.id !== deleteTarget.id))
      setDeleteTarget(null)
      addToast('success', 'Venue removed')
    } catch {
      addToast('error', tCommon('error'))
    } finally {
      setPending(false)
    }
  }

  const isEditing = formMode?.type === 'edit'
  const editVenue = isEditing ? formMode.venue : null

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

      {venues.length === 0 ? (
        <EmptyState
          icon={MapPin}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((venue) => (
            <div key={venue.id} className="card p-5 group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                  {indoorIcon(venue.indoor_outdoor)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setFormMode({ type: 'edit', venue })}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(venue)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-1 truncate">{venue.name}</h3>

              <div className="space-y-1">
                {(venue.city || venue.country) && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {[venue.city, venue.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {venue.capacity && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Users className="w-3 h-3 shrink-0" />
                    {venue.capacity} people
                  </p>
                )}
                {venue.indoor_outdoor && (
                  <Badge
                    label={t(`indoorOutdoor.${venue.indoor_outdoor}` as 'indoorOutdoor.indoor')}
                    variant={
                      venue.indoor_outdoor === 'indoor'
                        ? 'info'
                        : venue.indoor_outdoor === 'outdoor'
                          ? 'success'
                          : 'default'
                    }
                    className="mt-2"
                  />
                )}
              </div>

              {(photos[venue.id]?.length ?? 0) > 0 && (
                <div className="mt-3 flex gap-1.5 overflow-x-auto">
                  {photos[venue.id].map((p) => (
                    <Image
                      key={p.id}
                      src={p.url}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        open={formMode !== null}
        onClose={() => setFormMode(null)}
        title={isEditing ? t('editTitle') : t('createTitle')}
      >
        <form action={isEditing ? handleUpdate : handleCreate} className="space-y-4">
          <div>
            <label className="label-base">{t('form.name')} *</label>
            <input
              name="name"
              required
              defaultValue={editVenue?.name ?? ''}
              placeholder={t('form.namePlaceholder')}
              className="input-base"
              autoFocus
            />
          </div>

          <div>
            <label className="label-base">{t('form.address')}</label>
            <input
              name="address"
              defaultValue={editVenue?.address ?? ''}
              placeholder={t('form.addressPlaceholder')}
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">{t('form.city')}</label>
              <input
                name="city"
                defaultValue={editVenue?.city ?? ''}
                placeholder={t('form.cityPlaceholder')}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">{t('form.country')}</label>
              <input
                name="country"
                defaultValue={editVenue?.country ?? ''}
                placeholder={t('form.countryPlaceholder')}
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">{t('form.capacity')}</label>
              <input
                name="capacity"
                type="number"
                min="1"
                defaultValue={editVenue?.capacity ?? ''}
                placeholder={t('form.capacityPlaceholder')}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">{t('form.indoorOutdoor')}</label>
              <select
                name="indoor_outdoor"
                defaultValue={editVenue?.indoor_outdoor ?? ''}
                className="input-base"
              >
                <option value="">—</option>
                <option value="indoor">{t('indoorOutdoor.indoor')}</option>
                <option value="outdoor">{t('indoorOutdoor.outdoor')}</option>
                <option value="both">{t('indoorOutdoor.both')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-base">{t('form.notes')}</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={editVenue?.notes ?? ''}
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

        {/* Photo management — only for existing venues */}
        {isEditing && editVenue && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <label className="label-base">{t('photos.title')}</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {(photos[editVenue.id] ?? []).map((p) => (
                <div key={p.id} className="relative">
                  <Image
                    src={p.url}
                    alt=""
                    width={80}
                    height={80}
                    className="h-20 w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(editVenue.id, p.id)}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow ring-1 ring-slate-200 hover:bg-red-50"
                    title={t('photos.remove')}
                  >
                    <X className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleUploadPhoto(editVenue.id, f)
                  }}
                />
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
              </label>
            </div>
            {uploading && (
              <p className="mt-1.5 text-xs text-slate-400">{t('photos.uploading')}</p>
            )}
          </div>
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
    </>
  )
}
