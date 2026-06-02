import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { createRequest } from '@/lib/actions/requests'
import type { Locale, ActivityCategory } from '@/lib/types'

const CATEGORIES: ActivityCategory[] = [
  'sports', 'arts', 'music', 'education', 'outdoor',
  'wellness', 'workshop', 'party', 'food', 'other',
]

interface NewRequestPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewRequestPage({ params, searchParams }: NewRequestPageProps) {
  const { locale } = (await params) as { locale: Locale }
  const sp = await searchParams
  const t = await getTranslations('requests')
  const tm = await getTranslations('marketplace')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/requests/new`)

  const prefillCategory = typeof sp.category === 'string' ? sp.category : ''
  const prefillCity = typeof sp.city === 'string' ? sp.city : ''

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <h1 className="text-2xl font-extrabold text-slate-900">{t('new.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('new.subtitle')}</p>

          {/* What happens next — reduce "did it send / will anyone respond / am I paying" uncertainty */}
          <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <h2 className="text-sm font-bold text-slate-900">{t('flow.title')}</h2>
            <ol className="mt-3 space-y-2.5">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p>
                    <span className="font-semibold text-slate-900">{t(`flow.steps.${i}.title` as 'flow.steps.0.title')}</span>
                    <span className="text-slate-600"> — {t(`flow.steps.${i}.description` as 'flow.steps.0.description')}</span>
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <form action={createRequest} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <input type="hidden" name="locale" value={locale} />
            <div>
              <label className="label-base">{t('form.eventType')} *</label>
              <select name="event_type" required defaultValue={prefillCategory} className="input-base">
                <option value="">—</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{tm(`categories.${c}` as 'categories.sports')}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label-base">{t('form.city')}</label>
                <input name="city" defaultValue={prefillCity} className="input-base" />
              </div>
              <div>
                <label className="label-base">{t('form.country')}</label>
                <input name="country" className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label-base">{t('form.date')}</label>
                <input name="desired_date" type="date" className="input-base" />
              </div>
              <div>
                <label className="label-base">{t('form.participants')}</label>
                <input name="participant_count" type="number" min="1" className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="label-base">{t('form.ageMin')}</label>
                <input name="age_min" type="number" min="0" className="input-base" />
              </div>
              <div>
                <label className="label-base">{t('form.ageMax')}</label>
                <input name="age_max" type="number" min="0" className="input-base" />
              </div>
              <div>
                <label className="label-base">{t('form.budget')}</label>
                <input name="budget" type="number" min="0" step="0.01" className="input-base" />
              </div>
            </div>
            <div>
              <label className="label-base">{t('form.notes')}</label>
              <textarea name="notes" rows={4} placeholder={t('form.notesPlaceholder')} className="input-base resize-none" />
            </div>
            <button type="submit" className="btn-primary w-full justify-center">{t('new.submit')}</button>
          </form>
        </div>
      </main>
    </div>
  )
}
