import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MapPin, SearchX, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { searchMarketplace } from '@/lib/marketplace/queries'
import { StarRating } from '@/components/ui/StarRating'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import { categoryArt, CATEGORY_GROUPS, CATEGORIES_BY_GROUP } from '@/lib/categories'
import { formatPrice } from '@/lib/utils'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

const LANGUAGES = ['English', 'Spanish', 'French', 'Russian']
const IO = ['indoor', 'outdoor', 'both'] as const

interface MarketplacePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: MarketplacePageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'marketplace' })
  return { title: t('title') }
}

function str(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : ''
}

export default async function MarketplacePage({ params, searchParams }: MarketplacePageProps) {
  const { locale } = (await params) as { locale: Locale }
  const sp = await searchParams
  const t = await getTranslations('marketplace')

  // Build the filter object from the URL (only non-empty keys).
  const filterKeys = ['q', 'city', 'country', 'category', 'language', 'max_price', 'indoor_outdoor', 'child_age', 'date']
  const filters: Record<string, string> = {}
  for (const k of filterKeys) {
    const v = str(sp[k]).trim()
    if (v) filters[k] = k === 'max_price' ? String(Math.round(parseFloat(v) * 100)) : v
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const cards = await searchMarketplace(supabase, filters)
  const hasFilters = Object.keys(filters).length > 0

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('title')}</h1>
          <p className="mt-1 text-slate-500">{t('subtitle')}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
            {t('trustNote')}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-[260px_1fr] lg:gap-8">
            {/* Filters — a no-JS GET form */}
            <form method="get" className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <label className="label-base">{t('filters.search')}</label>
                <input name="q" defaultValue={str(sp.q)} className="input-base" placeholder={t('filters.searchPlaceholder')} />
              </div>
              <div>
                <label className="label-base">{t('filters.city')}</label>
                <input name="city" defaultValue={str(sp.city)} className="input-base" />
              </div>
              <div>
                <label className="label-base">{t('filters.category')}</label>
                <select name="category" defaultValue={str(sp.category)} className="input-base">
                  <option value="">{t('filters.any')}</option>
                  {CATEGORY_GROUPS.map((g) => (
                    <optgroup key={g} label={t(`groups.${g}.name` as 'groups.personal.name')}>
                      {CATEGORIES_BY_GROUP[g].map((c) => (
                        <option key={c.key} value={c.key}>{t(`categories.${c.key}` as 'categories.birthday')}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-base">{t('filters.language')}</label>
                <select name="language" defaultValue={str(sp.language)} className="input-base">
                  <option value="">{t('filters.any')}</option>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-base">{t('filters.indoorOutdoor')}</label>
                <select name="indoor_outdoor" defaultValue={str(sp.indoor_outdoor)} className="input-base">
                  <option value="">{t('filters.any')}</option>
                  {IO.map((v) => (
                    <option key={v} value={v}>{t(`indoorOutdoor.${v}` as 'indoorOutdoor.indoor')}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label-base">{t('filters.maxPrice')}</label>
                  <input name="max_price" type="number" min="0" defaultValue={str(sp.max_price)} className="input-base" />
                </div>
                <div>
                  <label className="label-base">{t('filters.childAge')}</label>
                  <input name="child_age" type="number" min="0" defaultValue={str(sp.child_age)} className="input-base" />
                </div>
              </div>
              <div>
                <label className="label-base">{t('filters.date')}</label>
                <input name="date" type="date" defaultValue={str(sp.date)} className="input-base" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary flex-1 justify-center">
                  <Search className="h-4 w-4" />
                  {t('filters.apply')}
                </button>
                <Link href={`/${locale}/marketplace`} className="btn-secondary justify-center">
                  {t('filters.clear')}
                </Link>
              </div>
            </form>

            {/* Results */}
            <div>
              <p className="mb-4 text-sm text-slate-500">{t('resultCount', { count: cards.length })}</p>
              {cards.length === 0 ? (
                <div className="card flex flex-col items-center px-6 py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <SearchX className="h-7 w-7 text-slate-400" aria-hidden="true" />
                  </div>
                  <p className="font-semibold text-slate-700">{t('empty')}</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">{t('emptyHint')}</p>
                  {hasFilters && (
                    <Link href={`/${locale}/marketplace`} className="btn-secondary mt-5">
                      {t('filters.clear')}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                  {cards.map((c) => {
                    const art = categoryArt(c.category)
                    return (
                    <Link
                      key={c.id}
                      href={`/${locale}/marketplace/${c.id}`}
                      className="card card-hover group overflow-hidden"
                    >
                      <div className="relative aspect-[3/2] overflow-hidden bg-slate-100">
                        {c.cover_url ? (
                          <Image src={c.cover_url} alt="" fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width:768px) 100vw, 33vw" />
                        ) : (
                          <div className={`flex h-full items-center justify-center bg-gradient-to-br ${art.gradient} transition-transform duration-300 group-hover:scale-105`}>
                            <art.Icon className="h-10 w-10 text-white/85" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        {c.category && (
                          <span className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
                            {t(`categories.${c.category}` as 'categories.sports')}
                          </span>
                        )}
                        <h3 className="mt-0.5 font-bold text-slate-900 line-clamp-1">{c.title}</h3>
                        {c.city && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3 w-3" />
                            {c.city}
                          </p>
                        )}
                        <div className="mt-1.5">
                          {c.rating != null ? (
                            <StarRating rating={c.rating} count={c.review_count} />
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {t('card.new')}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900">
                            {formatPrice(c.price_cents, c.currency, locale) ?? t('card.free')}
                          </span>
                          {c.organizer_name && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              {c.organizer_certified && (
                                <VerifiedBadge label={t('verifiedOrganizer')} iconOnly />
                              )}
                              {c.organizer_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
