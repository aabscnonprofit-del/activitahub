import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { createRequest } from '@/lib/actions/requests'
import { getMarketplaceActivity } from '@/lib/marketplace/queries'
import { CATEGORY_GROUPS, CATEGORIES_BY_GROUP } from '@/lib/categories'
import { MapPin } from 'lucide-react'
import type { Locale } from '@/lib/types'

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

  const viewer = await getViewerCtaState(supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/requests/new`)

  // When the request originates from a specific marketplace activity, load it
  // and prefill from its details; otherwise fall back to generic category/city.
  const activityId = typeof sp.activityId === 'string' ? sp.activityId : ''
  const activity = activityId ? await getMarketplaceActivity(supabase, activityId) : null

  const prefillCategory = activity?.category ?? (typeof sp.category === 'string' ? sp.category : '')
  const prefillCity = activity?.city ?? (typeof sp.city === 'string' ? sp.city : '')
  const prefillCountry = activity?.country ?? ''
  const prefillBudget = activity?.price_cents != null ? (activity.price_cents / 100).toString() : ''
  const prefillAgeMin = activity?.min_age != null ? String(activity.min_age) : ''
  const prefillAgeMax = activity?.max_age != null ? String(activity.max_age) : ''

  // Activity-join prefills (only when joining an existing activity). The activity
  // already has a scheduled date, so default "When" to its next upcoming session so
  // OPE doesn't re-ask it; default "Who" to 1 (one joining user = at least one
  // participant). Both stay editable. Empty for the generic (no-activity) request.
  const prefillDate = activity?.upcoming?.[0]?.date ?? ''
  const prefillParticipants = activity ? '1' : ''

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated isOrganizer={viewer.isOrganizer} />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <h1 className="text-2xl font-extrabold text-slate-900">{t('new.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('new.subtitle')}</p>

          {/* Specific-activity context — make it clear which activity is being requested */}
          {activity && (
            <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-600">
                {t('new.requestingActivity')}
              </p>
              <p className="mt-0.5 truncate font-bold text-slate-900">{activity.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                {activity.category && (
                  <span>{tm(`categories.${activity.category}` as 'categories.birthday')}</span>
                )}
                {(activity.city || activity.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {[activity.city, activity.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </p>
            </div>
          )}

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
            {/* Carry the activity reference so the server can block joins to expired activities. */}
            <input type="hidden" name="activity_id" value={activityId} />
            <div>
              <label className="label-base">{t('form.eventType')} *</label>
              <select name="event_type" required defaultValue={prefillCategory} className="input-base">
                <option value="">—</option>
                {CATEGORY_GROUPS.map((g) => (
                  <optgroup key={g} label={tm(`groups.${g}.name` as 'groups.personal.name')}>
                    {CATEGORIES_BY_GROUP[g].map((c) => (
                      <option key={c.key} value={c.key}>{tm(`categories.${c.key}` as 'categories.birthday')}</option>
                    ))}
                  </optgroup>
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
                <input name="country" defaultValue={prefillCountry} className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label-base">{t('form.date')}</label>
                <input name="desired_date" type="date" defaultValue={prefillDate} className="input-base" />
              </div>
              <div>
                <label className="label-base">{t('form.participants')}</label>
                <input name="participant_count" type="number" min="1" defaultValue={prefillParticipants} className="input-base" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="label-base">{t('form.ageMin')}</label>
                <input name="age_min" type="number" min="0" defaultValue={prefillAgeMin} className="input-base" />
              </div>
              <div>
                <label className="label-base">{t('form.ageMax')}</label>
                <input name="age_max" type="number" min="0" defaultValue={prefillAgeMax} className="input-base" />
              </div>
              <div>
                <label className="label-base">{t('form.budget')}</label>
                <input name="budget" type="number" min="0" step="0.01" defaultValue={prefillBudget} className="input-base" />
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
