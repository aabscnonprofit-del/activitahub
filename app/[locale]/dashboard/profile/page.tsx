import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import ProfileForm from '@/components/dashboard/ProfileForm'
import { organizerHref } from '@/lib/utils'
import type { OrganizerProfile } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()
  const t = await getTranslations('profile')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)

  const { data: orgProfile } = await supabase
    .from('organizer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('subtitle')}</p>
        </div>
        {/* Pure navigation to the existing public Organizer Page. */}
        <Link
          href={organizerHref(locale, { id: user.id, slug: (orgProfile as OrganizerProfile | null)?.slug ?? null })}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-slate-50"
        >
          View my organizer page
        </Link>
      </div>

      <ProfileForm
        locale={locale}
        initialProfile={(orgProfile as OrganizerProfile | null) ?? null}
      />
    </div>
  )
}
