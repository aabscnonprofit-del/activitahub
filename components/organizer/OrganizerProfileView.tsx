import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { MapPin, Globe, Award } from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { StarRating } from '@/components/ui/StarRating'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Locale, PublicOrganizer, PublicReview } from '@/lib/types'

interface OrganizerProfileViewProps {
  locale: Locale
  org: PublicOrganizer
  reviews: PublicReview[]
  isAuthenticated: boolean
}

/**
 * Shared public organizer profile rendering. Used by both the slug route
 * (/[locale]/o/[slug]) and the UUID route (/[locale]/organizers/[id]) so the
 * two stay identical.
 */
export async function OrganizerProfileView({
  locale,
  org,
  reviews,
  isAuthenticated,
}: OrganizerProfileViewProps) {
  const t = await getTranslations('marketplace')

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={isAuthenticated} />

      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          {/* Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">
                {(org.display_name ?? 'A')[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900">
                    {org.display_name ?? t('organizer.anonymous')}
                  </h1>
                  {org.certified && <VerifiedBadge label={t('organizer.certified')} />}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
                  {org.rating != null && <StarRating rating={org.rating} count={org.review_count} />}
                  <span>{t('resultCount', { count: org.activities.length })}</span>
                  {(org.city || org.country) && (
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[org.city, org.country].filter(Boolean).join(', ')}</span>
                  )}
                  {org.languages && org.languages.length > 0 && (
                    <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{org.languages.join(', ')}</span>
                  )}
                  <span className="flex items-center gap-1"><Award className="h-4 w-4" />{t('organizer.memberSince', { date: formatDate(org.member_since, 'UTC', locale) })}</span>
                </div>
                {org.bio && <p className="mt-3 text-sm leading-relaxed text-slate-700">{org.bio}</p>}
                {org.website && (
                  <a href={org.website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
                    {org.website}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Activities */}
          <h2 className="mt-8 mb-4 text-lg font-bold text-slate-900">{t('organizer.activities')}</h2>
          {org.activities.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              {t('organizer.noActivities')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {org.activities.map((a) => (
                <Link
                  key={a.id}
                  href={`/${locale}/marketplace/${a.id}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
                >
                  {a.category && (
                    <span className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
                      {t(`categories.${a.category}` as 'categories.sports')}
                    </span>
                  )}
                  <h3 className="mt-0.5 font-bold text-slate-900">{a.title}</h3>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    {a.city && <span className="text-slate-500">{a.city}</span>}
                    <span className="font-semibold text-slate-900">
                      {formatPrice(a.price_cents, a.currency, locale) ?? t('card.free')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {reviews.length > 0 && (
            <>
              <h2 className="mt-8 mb-4 text-lg font-bold text-slate-900">{t('organizer.reviews')}</h2>
              <div className="space-y-3">
                {reviews.map((rv) => (
                  <div key={rv.id} className="card p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                        {(rv.author ?? 'A')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">{rv.author}</span>
                          <StarRating rating={rv.rating} />
                        </div>
                        <p className="text-xs text-slate-400">{formatDate(rv.created_at, 'UTC', locale)}</p>
                      </div>
                    </div>
                    {rv.comment && <p className="mt-2 text-sm leading-relaxed text-slate-700">{rv.comment}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default OrganizerProfileView
