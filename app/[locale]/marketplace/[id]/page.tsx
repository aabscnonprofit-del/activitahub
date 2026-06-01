import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  MapPin, Clock, Users, Globe, CalendarDays, ImageOff, ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { getMarketplaceActivity, getActivityReviews } from '@/lib/marketplace/queries'
import { StarRating } from '@/components/ui/StarRating'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import { formatPrice, formatDate, formatTime } from '@/lib/utils'
import type { Locale } from '@/lib/types'

interface DetailPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function ActivityDetailPage({ params }: DetailPageProps) {
  const { locale, id } = (await params) as { locale: Locale; id: string }
  const t = await getTranslations('marketplace')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const a = await getMarketplaceActivity(supabase, id)
  if (!a) notFound()
  const reviews = await getActivityReviews(supabase, id)

  const requestHref = `/${locale}/requests/new?category=${a.category ?? ''}&city=${encodeURIComponent(a.city ?? '')}`

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href={`/${locale}/marketplace`} className="text-sm text-slate-500 hover:text-slate-800">
            ← {t('backToMarketplace')}
          </Link>

          {/* Gallery */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {a.photo_urls.length > 0 ? (
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                {a.photo_urls.slice(0, 4).map((url, i) => (
                  <div key={i} className={`relative aspect-[4/3] ${i === 0 ? 'col-span-2 row-span-2 sm:aspect-auto' : ''}`}>
                    <Image src={url} alt="" fill className="object-cover" sizes="50vw" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex aspect-[16/6] items-center justify-center text-slate-300">
                <ImageOff className="h-10 w-10" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
            {/* Main */}
            <div>
              {a.category && (
                <span className="text-xs font-bold uppercase tracking-wide text-brand-600">
                  {t(`categories.${a.category}` as 'categories.sports')}
                </span>
              )}
              <h1 className="mt-1 text-3xl font-extrabold text-slate-900">{a.title}</h1>

              {a.rating != null && (
                <div className="mt-2">
                  <StarRating rating={a.rating} count={a.review_count} />
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                {a.city && (
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[a.city, a.country].filter(Boolean).join(', ')}</span>
                )}
                {a.duration_minutes && (
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{a.duration_minutes} {t('detail.minutes')}</span>
                )}
                {(a.min_age != null || a.max_age != null) && (
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" />{t('detail.ages')} {a.min_age ?? 0}–{a.max_age ?? '∞'}</span>
                )}
                {a.languages && a.languages.length > 0 && (
                  <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{a.languages.join(', ')}</span>
                )}
              </div>

              {a.description && (
                <div className="mt-6">
                  <h2 className="font-bold text-slate-900">{t('detail.about')}</h2>
                  <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">{a.description}</p>
                </div>
              )}

              {a.venue && (
                <div className="mt-6">
                  <h2 className="font-bold text-slate-900">{t('detail.venue')}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {a.venue.name}
                    {a.venue.city ? ` · ${a.venue.city}` : ''}
                  </p>
                </div>
              )}

              {a.upcoming.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-bold text-slate-900">{t('detail.upcoming')}</h2>
                  <ul className="mt-2 space-y-1.5">
                    {a.upcoming.slice(0, 6).map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarDays className="h-4 w-4 text-brand-500" />
                        {formatDate(s.date, 'UTC', locale)}
                        {s.start_time ? ` · ${formatTime(s.start_time)}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reviews.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-bold text-slate-900">{t('detail.reviewsTitle')}</h2>
                  <div className="mt-2 space-y-3">
                    {reviews.map((rv) => (
                      <div key={rv.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">{rv.author}</span>
                          <StarRating rating={rv.rating} />
                        </div>
                        {rv.comment && <p className="mt-1 text-sm text-slate-600">{rv.comment}</p>}
                        <p className="mt-1 text-xs text-slate-400">{formatDate(rv.created_at, 'UTC', locale)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: price + organizer + CTA */}
            <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">
                  {formatPrice(a.price_cents, a.currency, locale) ?? t('card.free')}
                </p>
              </div>

              <Link href={`/${locale}/organizers/${a.organizer.id}`} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {(a.organizer.name ?? 'A')[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{a.organizer.name ?? t('detail.organizer')}</p>
                  {a.organizer.certified && (
                    <VerifiedBadge label={t('detail.certified')} className="mt-1" />
                  )}
                </div>
              </Link>

              <Link href={requestHref} className="btn-primary w-full justify-center">
                {t('detail.bookCta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-center text-xs text-slate-400">{t('detail.bookHint')}</p>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
