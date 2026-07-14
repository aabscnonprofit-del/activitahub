import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { ActivityCard } from '@/components/activities/ActivityCard'
import { listParticipantHistory } from '@/lib/activity-marketplace/cards'
import { listParticipantBookings } from '@/lib/bookings/participant-bookings.server'
import Link from 'next/link'
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
  // Occurrence ticket bookings whose date has passed → Booking History (projected from
  // project_participants; no history entity).
  const pastBookings = await listParticipantBookings(user.id, 'past')

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader locale={locale} isAuthenticated isOrganizer={viewer.isOrganizer} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900">Your activity history</h1>
        <p className="mt-1 text-sm text-slate-500">The public activities you have completed.</p>

        {pastBookings.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Past bookings</h2>
            <div className="mt-3 space-y-3">
              {pastBookings.map((b) => (
                <Link key={b.participantId} href={`/${locale}/p/${b.projectId}`} className="card card-hover flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{b.title || 'Activity'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(b.startsAt).toLocaleString(locale, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      {b.organizerName && <span> · {b.organizerName}</span>}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Completed</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {history.length === 0 && pastBookings.length === 0 ? (
          <p className="mt-8 rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
            You haven&rsquo;t completed any public activities yet.
          </p>
        ) : history.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {history.map((card) => (
              <ActivityCard key={card.projectId} card={card} locale={locale} />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  )
}
