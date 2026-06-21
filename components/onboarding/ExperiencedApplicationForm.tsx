'use client'

import { useTranslations } from 'next-intl'
import { submitExperiencedApplication } from '@/lib/actions/experiencedReview'

const LINK_FIELDS = ['instagram', 'facebook', 'meetup', 'linkedin', 'website', 'portfolio'] as const

/** Experienced-organizer application: optional supporting links, then submit for review. */
export function ExperiencedApplicationForm({ locale }: { locale: string }) {
  const t = useTranslations('experiencedReview')

  return (
    <form action={submitExperiencedApplication} className="card mx-auto max-w-xl p-6">
      <input type="hidden" name="locale" value={locale} />
      <h2 className="text-lg font-bold text-slate-900">{t('form.title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('form.subtitle')}</p>
      <p className="mt-2 text-xs text-slate-400">{t('form.optionalNote')}</p>

      <div className="mt-5 space-y-3">
        {LINK_FIELDS.map((field) => (
          <div key={field}>
            <label htmlFor={field} className="block text-sm font-medium text-slate-700">
              {t(`form.fields.${field}` as 'form.fields.instagram')}
            </label>
            <input
              id={field}
              name={field}
              type="url"
              inputMode="url"
              placeholder={t('form.placeholder')}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="btn-primary mt-6 w-full justify-center"
      >
        {t('form.submit')}
      </button>
    </form>
  )
}
