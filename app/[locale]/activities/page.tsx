import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { ActivityCard } from '@/components/activities/ActivityCard'
import { listMarketplaceActivities } from '@/lib/activity-marketplace/cards'
import { filterActivities, sortActivities, type MarketplaceSort } from '@/lib/activity-marketplace/model'
import type { Locale } from '@/lib/types'

// Activity Marketplace landing — the public face of ActivLife Hub. Lists APPROVED + PUBLISHED projects as
// activity cards, with basic filtering/sorting over the existing project data, each linking to the existing
// public Activity page (/p/[projectId]). Consumes only public-safe data; no draft or internal organizer info.

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const SORTS: MarketplaceSort[] = ['soonest', 'newest', 'price_low', 'price_high']
const SORT_LABEL: Record<MarketplaceSort, string> = {
  soonest: 'Soonest',
  newest: 'Newest',
  price_low: 'Price: low to high',
  price_high: 'Price: high to low',
}

function str(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : ''
}

export default async function ActivitiesPage({ params, searchParams }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const sp = await searchParams
  const location = str(sp.location).trim()
  const maxPrice = str(sp.max_price).trim()
  const sort: MarketplaceSort = SORTS.includes(str(sp.sort) as MarketplaceSort) ? (str(sp.sort) as MarketplaceSort) : 'soonest'

  const supabase = await createClient()

  const viewer = await getViewerCtaState(supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const all = await listMarketplaceActivities(new Date().toISOString())
  const filtered = filterActivities(all, {
    location: location || undefined,
    maxPriceCents: maxPrice ? Math.round(parseFloat(maxPrice) * 100) : undefined,
  })
  const cards = sortActivities(filtered, sort)

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} isOrganizer={viewer.isOrganizer} />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Discover activities</h1>
          <p className="mt-1 text-slate-500">Real events prepared by ActivLife organizers.</p>

          {/* Basic filtering + sorting over existing project data (GET form). */}
          <form method="get" className="mt-5 flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">
              Location
              <input name="location" defaultValue={location} placeholder="Anywhere" className="mt-0.5 block w-40 rounded border border-slate-300 px-2 py-1 text-sm" />
            </label>
            <label className="text-xs text-slate-500">
              Max price
              <input name="max_price" defaultValue={maxPrice} inputMode="decimal" placeholder="Any" className="mt-0.5 block w-28 rounded border border-slate-300 px-2 py-1 text-sm" />
            </label>
            <label className="text-xs text-slate-500">
              Sort
              <select name="sort" defaultValue={sort} className="mt-0.5 block rounded border border-slate-300 px-2 py-1 text-sm">
                {SORTS.map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
              </select>
            </label>
            <button type="submit" className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Apply</button>
            {(location || maxPrice || sort !== 'soonest') && (
              <Link href={`/${locale}/activities`} className="px-2 py-1.5 text-xs text-slate-500 underline">Clear</Link>
            )}
          </form>

          {cards.length === 0 ? (
            <p className="mt-10 text-sm text-slate-500">No activities match your search yet.</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => <ActivityCard key={card.projectId} card={card} locale={locale} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
