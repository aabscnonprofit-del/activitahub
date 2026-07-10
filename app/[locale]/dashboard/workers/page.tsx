import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import { getWorkersAddedByMe } from '@/lib/actions/workerProfiles'
import OrganizerWorkersClient from '@/components/dashboard/OrganizerWorkersClient'

// Organizer "Add Worker" surface — adds workers to the PLATFORM (dedupe via add_worker),
// not to any event. Lists only the organizer's own UNCLAIMED additions (the only worker
// rows RLS exposes to them). No event assignment, no search/directory.

type Props = { params: Promise<{ locale: string }> }

export default async function OrganizerWorkersPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('organizerWorkers')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  if (!(await userHasOrganizerAccess(supabase, user.id))) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('requiresAccess')}</span>
        </div>
      </div>
    )
  }

  const workers = await getWorkersAddedByMe()

  return <OrganizerWorkersClient initialWorkers={workers} />
}
