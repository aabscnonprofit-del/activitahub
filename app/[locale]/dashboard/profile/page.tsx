import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import ProfileForm from '@/components/dashboard/ProfileForm'
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
    .single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <ProfileForm
        locale={locale}
        initialProfile={(orgProfile as OrganizerProfile | null) ?? null}
      />
    </div>
  )
}
