import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPublicProject, listPublicFutureOccurrences, getProjectJoinPolicy, getProjectTicketType, getProjectVisibility, getProjectOrganizerStory } from '@/lib/projects/store'
import { getParticipantForAccount } from '@/lib/participants/store'
import { getPublicOrganizer } from '@/lib/marketplace/queries'
import { isProjectCompleted, representativeOccurrence } from '@/lib/activity-marketplace/completed-public-activities'
import { getParticipantMemoryEligibility } from '@/lib/activity-memories/participant-memory-eligibility'
import { getReviewEligibility } from '@/lib/reviews/reviews-eligibility'
import { listParticipantStories, getParticipantStory, listActivityReviews, getActivityReview } from '@/lib/activity-memories/store'
import { JoinButton } from '@/components/participants/JoinButton'
import { getTicketContext } from '@/lib/tickets/context.server'
import { ArrivalCoordination } from '@/components/activities/ArrivalCoordination'
import { getArrivalPreference, getArrivalSummary } from '@/lib/arrival/store'
import { ActivityArchive } from '@/components/activities/ActivityArchive'
import { getPublicEventPlan } from '@/lib/planning/load-public-event-plan'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { formatDate } from '@/lib/utils'
import { CalendarDays, MapPin } from 'lucide-react'
import type { Locale } from '@/lib/types'

// Public Space — the read-only public projection of a Project (docs/PROJECT_PUBLIC_SPACE_SPEC.md).
// Loads a PUBLISHED Project through the Project Service, shows existing public-safe data + future
// Occurrences (one directly, many as a selector), and a non-functional "Registration coming soon" CTA.
// No registration/payment/SEO/OG. Public Space owns no Project data; it projects it. (Approved subset
// of Proposal 046 — no title/subtitle/description/cover/location columns on Project.)
interface Props {
  params: Promise<{ locale: string; projectId: string }>
}

export default async function PublicProjectPage({ params }: Props) {
  const { locale, projectId } = (await params) as { locale: Locale; projectId: string }

  const supabase = await createClient()

  // Project Service owns the load. Unpublished/missing → null → not accessible.
  const project = await getPublicProject(supabase, projectId)
  if (!project) notFound()

  const occurrences = await listPublicFutureOccurrences(supabase, projectId, new Date().toISOString())

  // Public Activity Space — a completed PUBLIC activity's /p/[projectId] page becomes its permanent public
  // archive. "Completed" is the shared occurrence projection (every occurrence finished); "public" is required
  // so private/invitation-only Projects never expose the archive. Reads all occurrences (timestamps only) for
  // the completion rule + the finished occurrence to show its date/location.
  const visibility = await getProjectVisibility(supabase, projectId)
  const { data: allOccData } = await supabase.from('occurrences').select('starts_at, ends_at, location').eq('project_id', projectId).order('starts_at', { ascending: true })
  const allOccs = (allOccData ?? []) as { starts_at: string; ends_at: string | null; location: string | null }[]
  const nowMs = Date.now()
  const showArchive = visibility === 'public' && isProjectCompleted(allOccs, nowMs)
  const archivedOccurrence = showArchive ? representativeOccurrence(allOccs, nowMs, true) : null

  // Join policy drives the participant Join action (tolerant default 'approval'). When the policy is 'ticket',
  // the Ticket System's ticket type (tolerant default 'free') decides the Join CTA.
  const joinPolicy = await getProjectJoinPolicy(supabase, projectId)
  const ticketType = await getProjectTicketType(supabase, projectId)
  // Paid/donation tickets: the representative occurrence price + the organizer's receive-payments gate.
  const ticketCtx = joinPolicy === 'ticket' && ticketType !== 'free' ? await getTicketContext(projectId) : null

  // Stage 5d: render the prepared event from EventPlanV2 (public-safe subset). Null for projects without
  // an EventPlanV2 (e.g. legacy structured-flow) → the existing bare projection is shown instead.
  const publicPlan = await getPublicEventPlan(projectId)

  // Header auth state + the viewer's own participation (drives the Join button; tolerant null).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const myParticipation = user ? await getParticipantForAccount(supabase, projectId, user.id) : null

  // Organizer identity for the "Organized by" link → the public Organizer Page. owner_id is readable for a
  // published Project; the public organizer profile is a public projection (no private account data).
  const { data: ownerRow } = await supabase.from('projects').select('owner_id').eq('id', projectId).eq('is_published', true).maybeSingle()
  const organizerId = (ownerRow as { owner_id?: string } | null)?.owner_id ?? null
  const organizer = organizerId ? await getPublicOrganizer(supabase, organizerId) : null

  // Organizer Story (first Activity Memory) — public content, loaded only in the archive state. Only the owner
  // (the organizer) may edit it, and only for a completed public activity.
  const isOwner = !!user && !!organizerId && user.id === organizerId
  const organizerStory = showArchive ? await getProjectOrganizerStory(supabase, projectId) : null

  // Participant Stories (participant-generated Activity Memory) — loaded only in the archive state. Contribution
  // is gated by the shared Participant Memory Eligibility helper (public + completed + approved participant);
  // ticket ownership never grants it. Only the eligible participant edits their OWN story.
  const participantStories = showArchive ? await listParticipantStories(projectId) : []
  const canContributeStory = showArchive && getParticipantMemoryEligibility({
    isPublished: true, // getPublicProject already required published
    visibility,
    occurrences: allOccs,
    nowMs,
    participantStatus: myParticipation?.status ?? null,
  }).eligible
  const myParticipantStory = canContributeStory && user ? await getParticipantStory(supabase, projectId, user.id) : null

  // Activity Reviews (participant feedback) — loaded only in the archive state. Editing is gated by the canonical
  // Review Eligibility helper (public + completed + approved participant); ticket ownership never grants it.
  const activityReviews = showArchive ? await listActivityReviews(projectId) : []
  const canReview = showArchive && getReviewEligibility({
    isPublished: true, // getPublicProject already required published
    visibility,
    occurrences: allOccs,
    nowMs,
    participantStatus: myParticipation?.status ?? null,
  }).eligible
  const myActivityReview = canReview && user ? await getActivityReview(supabase, projectId, user.id) : null

  // Arrival Coordination ("Getting there") — only for the CURRENT (non-archive) activity, and only visible to the
  // organizer or an APPROVED participant (never public). Only approved participants may submit.
  const isApprovedParticipant = myParticipation?.status === 'approved'
  const showArrival = !showArchive && (isOwner || isApprovedParticipant)
  // Ride coordination is occurrence-scoped — to the soonest upcoming occurrence (the representative date).
  const rideOccurrenceId = occurrences[0]?.id ?? null
  const arrivalSummary = showArrival ? await getArrivalSummary(projectId, rideOccurrenceId) : null
  const myArrivalPreference = showArrival && isApprovedParticipant && user ? await getArrivalPreference(supabase, projectId, user.id, rideOccurrenceId) : null

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{showArchive ? 'Completed activity' : 'Public event'}</p>
        {/* Organized by → the public Organizer Page (identity + trust layer). */}
        {organizer?.display_name && organizerId && (
          <p className="mt-1 text-sm text-slate-500">
            Organized by{' '}
            <Link href={`/${locale}/organizers/${organizerId}`} className="font-medium text-brand-600 hover:underline">
              {organizer.display_name}
            </Link>
          </p>
        )}
        {publicPlan ? (
          <>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{publicPlan.intendedExperience}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{publicPlan.concept}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{publicPlan.experienceArc}</p>
            {publicPlan.itinerary.length > 0 && (
              <section className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">What happens</h2>
                <ol className="mt-3 space-y-2">
                  {publicPlan.itinerary.map((m, i) => (
                    <li key={i} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.summary}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Project</h1>
            <p className="mt-1 font-mono text-sm text-slate-500">{project.id}</p>
            <dl className="mt-6 rounded-lg border border-slate-200 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">Published</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">{formatDate(project.created_at)}</dd>
            </dl>
          </>
        )}

        {showArchive ? (
          <>
            {/* When & where it was held — the completed occurrence's date + location. */}
            {archivedOccurrence && (
              <section className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">When &amp; where</h2>
                <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />{formatDate(archivedOccurrence.starts_at)}</span>
                  {archivedOccurrence.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" aria-hidden />{archivedOccurrence.location}</span>}
                </p>
              </section>
            )}
            {/* Activity Archive + Activity Memories (Organizer Story + placeholders). No Join — completed. */}
            <ActivityArchive
              projectId={projectId}
              locale={locale}
              organizerStory={organizerStory}
              canEditStory={showArchive && isOwner}
              participantStories={participantStories}
              myParticipantStory={myParticipantStory}
              canContributeStory={canContributeStory}
              activityReviews={activityReviews}
              myActivityReview={myActivityReview}
              canReview={canReview}
            />
          </>
        ) : (
          <>
            {/* Future Occurrences */}
            <section className="mt-8">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                {occurrences.length > 1 ? 'Upcoming dates' : 'When'}
              </h2>

              {occurrences.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-400">
                  Dates coming soon.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {occurrences.map((o) => (
                    <li key={o.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
                      <CalendarDays className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {o.title?.trim() || formatDate(o.starts_at)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(o.starts_at)}
                          {o.location ? (
                            <span className="ml-1 inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                              {o.location}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Join — label + behavior driven by the Project's Join Policy and the viewer's participation.
                instant → join as approved; approval → request (pending); ticket → non-functional "Get Tickets". */}
            <JoinButton
              projectId={projectId}
              locale={locale}
              joinPolicy={joinPolicy}
              ticketType={ticketType}
              initialStatus={myParticipation?.status ?? null}
              isAuthenticated={!!user}
              signInHref={`/${locale}/sign-in`}
              occurrences={(ticketCtx?.occurrences ?? []).map((o) => ({ id: o.id, startsAt: o.startsAt, priceCents: o.priceCents, remaining: o.remaining, full: o.full }))}
              canReceivePayments={ticketCtx?.canReceivePayments ?? false}
            />

            {/* Getting there — arrival coordination for the organizer + approved participants (never public). */}
            {showArrival && arrivalSummary && (
              <ArrivalCoordination
                projectId={projectId}
                occurrenceId={rideOccurrenceId}
                locale={locale}
                myPreference={myArrivalPreference}
                summary={arrivalSummary}
                canSubmit={isApprovedParticipant}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
