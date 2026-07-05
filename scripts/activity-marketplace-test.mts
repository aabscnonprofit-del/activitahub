// Activity Marketplace foundation — filtering/sorting + public-safety contract test.
//
//   Run:  npx tsx scripts/activity-marketplace-test.mts

import { readFileSync } from 'node:fs'
import { filterActivities, sortActivities, type MarketplaceActivityCard } from '../lib/activity-marketplace/model'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const card = (o: Partial<MarketplaceActivityCard>): MarketplaceActivityCard => ({
  projectId: 'x', title: 'T', summary: null, organizerName: null, organizerSlug: null,
  location: null, startsAt: null, endsAt: null, capacity: null, priceCents: null, createdAt: '2026-01-01', ...o,
})

const cards: MarketplaceActivityCard[] = [
  card({ projectId: 'a', title: 'Yoga', location: 'Austin', startsAt: '2026-08-01T10:00:00.000Z', priceCents: 2000, createdAt: '2026-07-01' }),
  card({ projectId: 'b', title: 'BBQ', location: 'Dallas', startsAt: '2026-07-10T10:00:00.000Z', priceCents: 5000, createdAt: '2026-07-05' }),
  card({ projectId: 'c', title: 'Free walk', location: 'Austin', startsAt: null, priceCents: null, createdAt: '2026-07-03' }),
]

// 1. Filter — location substring (case-insensitive).
check('location filter (austin) → a + c', filterActivities(cards, { location: 'austin' }).map((c) => c.projectId).sort().join(',') === 'a,c')
// 2. Filter — max price; a card with no price is never priced out.
check('max price 3000 → a (2000) + c (no price)', filterActivities(cards, { maxPriceCents: 3000 }).map((c) => c.projectId).sort().join(',') === 'a,c')
// 3. Filter — upcoming only (has a start).
check('upcomingOnly drops the card with no occurrence (c)', filterActivities(cards, { upcomingOnly: true }).map((c) => c.projectId).sort().join(',') === 'a,b')
// 4. Sort — soonest (nulls last), newest, price low/high.
check('sort soonest → b, a, c (null start last)', sortActivities(cards, 'soonest').map((c) => c.projectId).join(',') === 'b,a,c')
check('sort newest → b, c, a (createdAt desc)', sortActivities(cards, 'newest').map((c) => c.projectId).join(',') === 'b,c,a')
check('sort price_low → a, b, c (null price last)', sortActivities(cards, 'price_low').map((c) => c.projectId).join(',') === 'a,b,c')
check('sort price_high → b, a, c', sortActivities(cards, 'price_high').map((c) => c.projectId).join(',') === 'b,a,c')
// 5. Pure — input not reordered.
{
  const before = cards.map((c) => c.projectId).join(',')
  sortActivities(cards, 'newest')
  check('sort does not mutate the input', cards.map((c) => c.projectId).join(',') === before)
}

// 6. Public safety — only APPROVED + PUBLISHED; reuses existing public readers; no new model; no internal data.
const src = read('../lib/activity-marketplace/cards.ts')
check('query lists only approved + published projects',
  src.includes(".eq('is_published', true)") && src.includes(".not('approved_at', 'is', null)"))
check('reuses existing public readers (getPublicEventPlan + getPublicOrganizer) — no new activity model',
  src.includes("from '@/lib/planning/load-public-event-plan'") && src.includes("from '@/lib/marketplace/queries'") &&
  !/from\('activities'\)/.test(src))
{
  const iface = read('../lib/activity-marketplace/model.ts').split('interface MarketplaceActivityCard {')[1]?.split('}')[0] ?? ''
  check('card DTO type (model.ts) exposes no owner_id / internal field', iface.length > 0 && !/owner_id/.test(iface))
}
{
  const pushBlock = src.split('cards.push({')[1]?.split('})')[0] ?? ''
  check('the built card carries no owner_id (owner is used only to resolve the public organizer)', pushBlock.length > 0 && !/owner_id/.test(pushBlock))
}

// 7. Landing page — public route, links to the existing Activity detail, uses only card fields, filter/sort.
const page = read('../app/[locale]/activities/page.tsx')
const cardComp = read('../components/activities/ActivityCard.tsx')
check('landing lists cards + filter/sort + no auth gate (public)',
  page.includes('listMarketplaceActivities(') && page.includes('filterActivities(') && page.includes('sortActivities(') && page.includes('<ActivityCard'))
check('card links to the existing public Activity page (/p/[projectId]); no owner id rendered',
  cardComp.includes('href={`/${locale}/p/${card.projectId}`}') && !/owner/i.test(cardComp))
check('card displays organizer, location, date, capacity, pricing',
  cardComp.includes('card.organizerName') && cardComp.includes('card.location') && cardComp.includes('formatDate(card.startsAt)') && cardComp.includes('card.capacity') && cardComp.includes('formatPrice(card.priceCents)'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
