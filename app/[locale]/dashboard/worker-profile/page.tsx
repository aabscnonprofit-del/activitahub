import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { HardHat, CheckCircle2, BadgeCheck, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMyWorkerProfile, upsertMyWorkerProfile } from '@/lib/actions/workerProfiles'
import { isMinor, todayISO } from '@/lib/workers/age'

// Worker Network Slice 1 — the worker's own profile editor (self-registration =
// claimed). Server-rendered form posting to upsertMyWorkerProfile. No directory/search/
// staffing here. Minor status is derived from date_of_birth (identify + flag only).

const ROLE_KEYS = [
  'server', 'bartender', 'driver', 'mover', 'stage_crew', 'cleaner', 'instructor',
  'host', 'dj', 'guide', 'photographer', 'videographer', 'assistant', 'coordinator',
] as const
const GENDER_KEYS = ['female', 'male', 'other', 'prefer_not_to_say'] as const

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function WorkerProfilePage({ params, searchParams }: Props) {
  const { locale } = await params
  const { error } = await searchParams
  const t = await getTranslations('workerProfile')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)

  const profile = await getMyWorkerProfile()
  const minor = profile ? isMinor(profile.date_of_birth) : null

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        <HardHat className="h-5 w-5 text-brand-500" />
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t(`error.${error}` as 'error.dob_future')}</span>
        </div>
      )}

      {profile && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{profile.published ? t('liveListed') : t('savedNotListed')}</span>
          </div>
          {/* Verification status — read-only; the worker cannot self-set it. */}
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${profile.verified ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
            <BadgeCheck className="h-4 w-4 shrink-0" />
            <span>{profile.verified ? t('verifiedYes') : t('verifiedNo')}</span>
          </div>
          {/* Minor flag — identify only, no restriction enforced. */}
          {minor === true && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{t('minorFlag')}</span>
            </div>
          )}
        </div>
      )}

      <form action={upsertMyWorkerProfile} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <label className="label-base">{t('form.displayName')} *</label>
          <input name="display_name" required defaultValue={profile?.display_name ?? ''} placeholder={t('form.displayNamePlaceholder')} className="input-base" />
        </div>

        <div>
          <label className="label-base">{t('form.email')}</label>
          <input value={user.email ?? ''} readOnly disabled className="input-base bg-slate-50 text-slate-500" />
          <p className="mt-1 text-xs text-slate-400">{t('form.emailHint')}</p>
        </div>

        <div>
          <label className="label-base">{t('form.roles')} *</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {ROLE_KEYS.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                <input type="checkbox" name="roles" value={r} defaultChecked={profile?.roles.includes(r)} className="h-3.5 w-3.5" />
                {t(`roles.${r}` as 'roles.server')}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">{t('form.rolesHint')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">{t('form.gender')}</label>
            <select name="gender" defaultValue={profile?.gender ?? ''} className="input-base">
              <option value="">{t('form.genderUnset')}</option>
              {GENDER_KEYS.map((g) => (
                <option key={g} value={g}>{t(`gender.${g}` as 'gender.female')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">{t('form.dob')}</label>
            <input name="date_of_birth" type="date" max={todayISO()} defaultValue={profile?.date_of_birth ?? ''} className="input-base" />
            <p className="mt-1 text-xs text-slate-400">{t('form.dobHint')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">{t('form.city')}</label>
            <input name="city" defaultValue={profile?.city ?? ''} placeholder={t('form.cityPlaceholder')} className="input-base" />
          </div>
          <div>
            <label className="label-base">{t('form.country')}</label>
            <input name="country" defaultValue={profile?.country ?? ''} placeholder={t('form.countryPlaceholder')} className="input-base" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">{t('form.languages')}</label>
            <input name="languages" defaultValue={profile?.languages?.join(', ') ?? ''} placeholder={t('form.languagesPlaceholder')} className="input-base" />
          </div>
          <div>
            <label className="label-base">{t('form.payRate')}</label>
            <input name="pay_rate" type="number" min="0" step="0.01" defaultValue={profile?.pay_rate_cents != null ? profile.pay_rate_cents / 100 : ''} placeholder={t('form.payRatePlaceholder')} className="input-base" />
          </div>
        </div>

        <div>
          <label className="label-base">{t('form.bio')}</label>
          <textarea name="bio" rows={3} defaultValue={profile?.bio ?? ''} placeholder={t('form.bioPlaceholder')} className="input-base resize-none" />
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="available" defaultChecked={profile ? profile.available : true} className="h-4 w-4" />
            {t('form.available')}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="published" defaultChecked={profile?.published ?? false} className="h-4 w-4" />
            {t('form.published')}
          </label>
          <p className="text-xs text-slate-400">{t('form.publishedHint')}</p>
        </div>

        <button type="submit" className="btn-primary">{profile ? t('form.save') : t('form.create')}</button>
      </form>
    </div>
  )
}
