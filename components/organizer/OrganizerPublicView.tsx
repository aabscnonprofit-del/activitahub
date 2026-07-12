import { MapPin, Globe, BadgeCheck } from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { ActivityCard } from '@/components/activities/ActivityCard'
import type { MarketplaceActivityCard } from '@/lib/activity-marketplace/cards'
import type { OrganizerReviewFacts } from '@/lib/reviews/organizer-review-facts'
import type { PublicOrganizer, Locale } from '@/lib/types'

// Public Organizer Page — the organizer's professional public identity: who they are, the real experience
// they have, whether they are active today, and written participant feedback as qualitative evidence. It is a
// PUBLIC PROJECTION over existing data (profile, public activities, participants, activity reviews). Facts only
// — no ratings, averages, scores, reputation, rankings, or gamification. It never exposes private account data
// and never shows private / published-private / draft-public Projects. The visitor draws their own conclusion.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function monthYear(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** Initials for the avatar fallback — first letters of the first two words of the name. */
function initials(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'O'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Humanize a category key (e.g. "fitness_class" → "Fitness class") for a chip label. */
function humanizeCategory(c: string): string {
  const s = c.replace(/_/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function OrganizerPublicView({
  locale,
  org,
  activities,
  completedActivities,
  reviewFacts,
  participantsHosted,
  avatarUrl,
  categories,
  isAuthenticated,
}: {
  locale: Locale
  org: PublicOrganizer
  activities: MarketplaceActivityCard[]
  completedActivities: MarketplaceActivityCard[]
  reviewFacts: OrganizerReviewFacts
  participantsHosted: number
  avatarUrl: string | null
  categories: string[]
  isAuthenticated: boolean
}) {
  const location = [org.city, org.country].filter(Boolean).join(', ')
  const organizerSince = monthYear(org.member_since ?? null)

  // Experience — objective, measurable facts. Participants Hosted is a primary metric: completed-activity
  // count alone does not describe operational scale (20 parties for 5 children ≠ 20 conferences for 500).
  const facts: { label: string; value: string }[] = [
    { label: 'Organizer since', value: organizerSince ?? '—' },
    { label: 'Participants hosted', value: String(participantsHosted) },
    { label: 'Completed activities', value: String(completedActivities.length) },
    { label: 'Current activities', value: String(activities.length) },
    { label: 'Verification', value: org.certified ? 'Verified' : 'Not verified' },
  ]

  const feedbackDate = (iso: string): string => monthYear(iso) ?? iso.slice(0, 10)

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader locale={locale} isAuthenticated={isAuthenticated} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* 1. Identity — who is this organizer? Avatar (photo or initials), name, location, languages, bio. */}
        <header className="flex items-start gap-4 sm:gap-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-20 sm:w-20" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700 sm:h-20 sm:w-20">
              {initials(org.display_name)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold text-slate-900">
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
          </div>
        </header>

        {/* 2. Experience — objective, measurable facts about the organizer's real work. */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Experience</h2>
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-5">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{f.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{f.value}</dd>
              </div>
            ))}
          </dl>
          {categories.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Organizes</p>
              <ul className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <li key={c} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    {humanizeCategory(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 3. Current activities — proof the organizer is active today. */}
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

        {/* 4. Professional history — completed public activities (occurrence-finished projection), newest first.
            A Project appears here XOR in Current activities, never both. Evidence, not promotion. */}
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

        {/* 5. Participant feedback — WRITTEN quotes with dates, newest first. Qualitative context, never
            reduced to a single number. Absence is shown honestly rather than filled. */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Participant feedback</h2>
          {reviewFacts.entries.length === 0 ? (
            <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
              No written participant feedback yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {reviewFacts.entries.map((r, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm leading-relaxed text-slate-700">“{r.body}”</p>
                  <p className="mt-2 text-xs text-slate-400">{feedbackDate(r.date)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
