import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { ActivityCard } from '@/components/activities/ActivityCard'
import { listParticipantHistory } from '@/lib/activity-marketplace/cards'
import type { Locale } from '@/lib/types'

// Participant History — the participant-side counterpart to the Organizer Archive: the completed PUBLIC
// activities the signed-in user actually attended (approved participant). A read-only public projection over
// Project + Participants + the shared completed-public-activities rule — no history entity/table. Each item
// links to the existing Public Activity Space (/p/[projectId]); this page duplicates no activity page. No
// ratings / reviews / achievements / statistics / social features.

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ParticipantHistoryPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }

  const supabase = await createClient()

  const viewer = await getViewerCtaState(supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const history = await listParticipantHistory(user.id, new Date().toISOString())

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader locale={locale} isAuthenticated isOrganizer={viewer.isOrganizer} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900">Your activity history</h1>
        <p className="mt-1 text-sm text-slate-500">The public activities you have completed.</p>

        {history.length === 0 ? (
          <p className="mt-8 rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
            You haven&rsquo;t completed any public activities yet.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {history.map((card) => (
              <ActivityCard key={card.projectId} card={card} locale={locale} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
