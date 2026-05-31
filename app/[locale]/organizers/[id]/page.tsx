import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, ShieldCheck, Globe, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { getPublicOrganizer, getOrganizerReviews } from '@/lib/marketplace/queries'
import { StarRating } from '@/components/ui/StarRating'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Locale } from '@/lib/types'

interface OrganizerPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function OrganizerProfilePage({ params }: OrganizerPageProps) {
  const { locale, id } = (await params) as { locale: Locale; id: string }
  const t = await getTranslations('marketplace')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const org = await getPublicOrganizer(supabase, id)
  if (!org) notFound()
  const reviews = await getOrganizerReviews(supabase, id)

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">
                {(org.display_name ?? 'A')[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900">
                    {org.display_name ?? t('organizer.anonymous')}
                  </h1>
                  {org.certified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t('organizer.certified')}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                  {(org.city || org.country) && (
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[org.city, org.country].filter(Boolean).join(', ')}</span>
                  )}
                  {org.languages && org.languages.length > 0 && (
                    <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{org.languages.join(', ')}</span>
                  )}
                  <span className="flex items-center gap-1"><Award className="h-4 w-4" />{t('organizer.memberSince', { date: formatDate(org.member_since, 'UTC', locale) })}</span>
                  {org.rating != null && <StarRating rating={org.rating} count={org.review_count} />}
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
                  <div key={rv.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{rv.author}</span>
                      <StarRating rating={rv.rating} />
                    </div>
                    {rv.comment && <p className="mt-1 text-sm text-slate-600">{rv.comment}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatDate(rv.created_at, 'UTC', locale)}</p>
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
