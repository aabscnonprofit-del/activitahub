'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { upsertOrganizerProfile } from '@/lib/actions/profile'
import { Toaster, useToast } from '@/components/ui/Toast'
import type { OrganizerProfile } from '@/lib/types'
import { User, Globe, MapPin } from 'lucide-react'

type Props = {
  locale: string
  initialProfile: OrganizerProfile | null
}

export default function ProfileForm({ initialProfile }: Props) {
  const t = useTranslations('profile')
  const { toasts, addToast, dismiss } = useToast()
  const [pending, setPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    try {
      await upsertOrganizerProfile(formData)
      addToast('success', t('saved'))
    } catch {
      addToast('error', t('error'))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Toaster toasts={toasts} onDismiss={dismiss} />
      <form action={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" /> Identity
          </h2>

          <div>
            <label className="label-base">{t('displayName')}</label>
            <input
              name="display_name"
              defaultValue={initialProfile?.display_name ?? ''}
              placeholder={t('placeholders.displayName')}
              className="input-base"
            />
          </div>

          <div>
            <label className="label-base">{t('slug')}</label>
            <div className="flex items-stretch">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-400">
                /o/
              </span>
              <input
                name="slug"
                defaultValue={initialProfile?.slug ?? ''}
                placeholder="maria-barcelona"
                className="input-base rounded-l-none"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">{t('slugHint')}</p>
          </div>

          <div>
            <label className="label-base">{t('bio')}</label>
            <textarea
              name="bio"
              rows={4}
              defaultValue={initialProfile?.bio ?? ''}
              placeholder={t('placeholders.bio')}
              className="input-base resize-none"
            />
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" /> Location
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-base">{t('city')}</label>
              <input
                name="city"
                defaultValue={initialProfile?.city ?? ''}
                placeholder={t('placeholders.city')}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">{t('country')}</label>
              <input
                name="country"
                defaultValue={initialProfile?.country ?? ''}
                placeholder={t('placeholders.country')}
                className="input-base"
              />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" /> Contact & Web
          </h2>

          <div>
            <label className="label-base">{t('languages')}</label>
            <input
              name="languages"
              defaultValue={initialProfile?.languages?.join(', ') ?? ''}
              placeholder={t('placeholders.languages')}
              className="input-base"
            />
            <p className="text-xs text-slate-400 mt-1.5">Comma-separated (e.g. English, Spanish)</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-base">{t('phone')}</label>
              <input
                name="phone"
                defaultValue={initialProfile?.phone ?? ''}
                placeholder={t('placeholders.phone')}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-base">{t('website')}</label>
              <input
                name="website"
                type="url"
                defaultValue={initialProfile?.website ?? ''}
                placeholder={t('placeholders.website')}
                className="input-base"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? t('saving') : t('save')}
          </button>
          {initialProfile?.status && (
            <span className="text-sm text-slate-500">
              Status:{' '}
              <span className="font-medium text-slate-700">
                {t(`status.${initialProfile.status}` as 'status.draft')}
              </span>
            </span>
          )}
        </div>
      </form>
    </>
  )
}
