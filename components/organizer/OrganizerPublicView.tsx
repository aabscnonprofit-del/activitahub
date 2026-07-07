import { MapPin, Globe, BadgeCheck } from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { ActivityCard } from '@/components/activities/ActivityCard'
import type { MarketplaceActivityCard } from '@/lib/activity-marketplace/cards'
import type { OrganizerReviewFacts } from '@/lib/reviews/organizer-review-facts'
import type { PublicOrganizer, Locale } from '@/lib/types'

// Public Organizer Page — the participant-facing identity + trust layer for an organizer. It is a PUBLIC
// PROJECTION built from existing public data: the organizer profile (name / bio / location / languages), the
// organizer's CURRENT public activities (published Projects WHERE visibility = 'public'), and objective
// Organizer Facts (no ratings/reviews/score/reputation — facts only). It never exposes private account data,
// and never shows private / published-private / draft-public Projects. Past Activities and Completed Activities
// are placeholders until reliable completed-project tracking exists — they are not faked.

// Format a stored date as "Month Year" (e.g. "June 2026"), deterministically (UTC). Returns null on no/invalid
// date — the caller shows a placeholder rather than inventing a date.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function monthYear(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function OrganizerPublicView({
  locale,
  org,
  activities,
  completedActivities,
  reviewFacts,
  isAuthenticated,
}: {
  locale: Locale
  org: PublicOrganizer
  activities: MarketplaceActivityCard[]
  completedActivities: MarketplaceActivityCard[]
  reviewFacts: OrganizerReviewFacts
  isAuthenticated: boolean
}) {
  const location = [org.city, org.country].filter(Boolean).join(', ')
  const organizerSince = monthYear(org.member_since ?? null)
  // Facts are objective, derived from existing public data — no rating/review/score/reputation/level.
  const facts: { label: string; value: string }[] = [
    { label: 'Organizer since', value: organizerSince ?? 'Coming soon' },
    // Public Activities uses EXACTLY the Organizer Page rule (published + visibility = public): this is that list.
    { label: 'Public Activities', value: String(activities.length) },
    // Completed = the archive count, from EXACTLY the same list rendered in "Past activities" (single source).
    { label: 'Completed Activities', value: String(completedActivities.length) },
    // Existing verification field only (certified) — no new verification system.
    { label: 'Verification', value: org.certified ? 'Verified' : 'Not verified' },
  ]

  // Organizer Review Facts — objective counts projected from Activity Reviews on completed public activities.
  // Facts only: no average/stars/score/ranking/trust. Latest review date shows "Coming soon" when there are none.
  const reviewFactsList: { label: string; value: string }[] = [
    { label: 'Reviews received', value: String(reviewFacts.reviewsReceived) },
    { label: 'Reviewed activities', value: String(reviewFacts.reviewedActivities) },
    { label: 'Latest review', value: reviewFacts.latestReviewDate ? reviewFacts.latestReviewDate.slice(0, 10) : 'Coming soon' },
  ]

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader locale={locale} isAuthenticated={isAuthenticated} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* 1. Organizer profile — public information only. */}
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            {org.display_name || 'Organizer'}
            {org.certified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <BadgeCheck className="h-4 w-4" aria-hidden />Certified
              </span>
            )}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            {location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{location}</span>}
            {org.languages && org.languages.length > 0 && (
              <span className="flex items-center gap-1"><Globe className="h-4 w-4" aria-hidden />{org.languages.join(', ')}</span>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Website</a>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-700">
            {org.bio || 'This organizer hasn’t added a description yet.'}
          </p>
        </header>

        {/* 2. Organizer Facts — objective public signals only (no ratings/reviews/score/reputation/badges). */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Organizer facts</h2>
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{f.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 2b. Organizer Review Facts — objective review counts (no ratings/stars/score/reputation/ranking). */}
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Organizer review facts</h2>
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-3">
            {reviewFactsList.map((f) => (
              <div key={f.label}>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{f.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 3. Current public activities — published Projects with visibility = public. */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Current activities</h2>
          {activities.length === 0 ? (
            <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
              This organizer has no public activities right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {activities.map((card) => (
                <ActivityCard key={card.projectId} card={card} locale={locale} />
              ))}
            </div>
          )}
        </section>

        {/* 4. Past activities / archive — completed public activities (occurrence-finished projection), newest
            first. A Project appears here XOR in Current activities, never both. */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Past activities</h2>
          {completedActivities.length === 0 ? (
            <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
              This organizer has no completed public activities yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {completedActivities.map((card) => (
                <ActivityCard key={card.projectId} card={card} locale={locale} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
