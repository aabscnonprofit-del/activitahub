import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { signOut } from '@/lib/actions/auth'
import { LogOut, Mail, Shield, CalendarDays } from 'lucide-react'
import type { Profile } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()
  const t = await getTranslations('settings')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const p = profile as Profile | null
  const signOutAction = signOut.bind(null, locale)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
      </div>

      {/* Account info */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">{t('account.title')}</h2>

        <div className="flex items-center gap-3 py-2 border-b border-slate-100">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">{t('account.email')}</p>
            <p className="text-sm font-medium text-slate-800">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 py-2 border-b border-slate-100">
          <Shield className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">{t('account.role')}</p>
            <p className="text-sm font-medium text-slate-800 capitalize">{p?.role ?? 'student'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 py-2">
          <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">{t('account.memberSince')}</p>
            <p className="text-sm font-medium text-slate-800">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString('en', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Language preferences */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">{t('preferences.title')}</h2>
        <div>
          <p className="text-xs text-slate-400 mb-2">{t('preferences.language')}</p>
          <div className="flex flex-wrap gap-2">
            {[
              { code: 'en', label: 'English' },
              { code: 'es', label: 'Español' },
              { code: 'fr', label: 'Français' },
              { code: 'ru', label: 'Русский' },
              { code: 'de', label: 'Deutsch' },
              { code: 'pt', label: 'Português' },
            ].map((l) => (
              <a
                key={l.code}
                href={`/${l.code}/dashboard/settings`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  l.code === locale
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-6 border-red-100">
        <h2 className="font-semibold text-slate-900 mb-1">{t('danger.title')}</h2>
        <p className="text-sm text-slate-500 mb-4">{t('danger.signOutDesc')}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('danger.signOut')}
          </button>
        </form>
      </div>
    </div>
  )
}
