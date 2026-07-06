import { MapPin, Globe, BadgeCheck } from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { ActivityCard } from '@/components/activities/ActivityCard'
import type { MarketplaceActivityCard } from '@/lib/activity-marketplace/cards'
import type { PublicOrganizer, Locale } from '@/lib/types'

// Public Organizer Page — the participant-facing identity + trust layer for an organizer. It is a PUBLIC
// PROJECTION built from existing public data: the organizer profile (name / bio / location / languages) and the
// organizer's CURRENT public activities (published Projects WHERE visibility = 'public'). It never exposes
// private account data, and never shows private / published-private / draft-public Projects. Past Activities is
// a placeholder until reliable completed-project tracking exists — it is not faked.

export function OrganizerPublicView({
  locale,
  org,
  activities,
  isAuthenticated,
}: {
  locale: Locale
  org: PublicOrganizer
  activities: MarketplaceActivityCard[]
  isAuthenticated: boolean
}) {
  const location = [org.city, org.country].filter(Boolean).join(', ')

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

        {/* 2. Current public activities — published Projects with visibility = public. */}
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

        {/* 3. Past activities / archive — placeholder (no reliable completed-project model yet; not faked). */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Past activities</h2>
          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-400">
            Past Activities archive will appear after completed-project tracking is available.
          </p>
        </section>
      </main>
    </div>
  )
}
