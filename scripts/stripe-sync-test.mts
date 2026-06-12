/**
 * Deterministic tests for the Stripe subscription sync fix.
 *
 * Imports lib/stripe/sync-core.ts (the non-server-only implementation behind the
 * server-only re-export) so it runs under plain tsx. Uses in-memory fakes for the
 * admin client and the Stripe SDK (no network, no DB).
 *
 * The key case: an out-of-order / stale 'incomplete' webhook event must NOT regress
 * an 'active' subscription, because syncSubscriptionById re-retrieves Stripe's
 * current state before writing.
 */
import {
  mapStripeStatus,
  subscriptionFields,
  shouldGrantOrganizer,
} from '../lib/stripe/subscription-mapping.ts'
import { syncSubscription, syncSubscriptionById } from '../lib/stripe/sync-core.ts'

let pass = 0
let fail = 0
const ok = (c: boolean, m: string) => {
  if (c) pass++
  else {
    fail++
    console.log('FAIL:', m)
  }
}

// ── pure mapping ─────────────────────────────────────────────────────────────
ok(mapStripeStatus('canceled') === 'cancelled', "mapStripeStatus: 'canceled' → 'cancelled'")
ok(mapStripeStatus('active') === 'active', 'mapStripeStatus: active → active')

// clover shape: current_period_end lives on the item
const cloverSub: any = {
  id: 'sub_1', status: 'active', customer: 'cus_1', cancel_at_period_end: false,
  items: { data: [{ price: { id: 'price_1' }, current_period_end: 1893456000 }] },
}
const f1 = subscriptionFields(cloverSub)
ok(f1.status === 'active' && f1.stripe_price_id === 'price_1' && f1.current_period_end !== null,
  'subscriptionFields: clover (item-level period end) extracted')

// acacia shape: top-level current_period_end, object customer
const acaciaSub: any = {
  id: 'sub_2', status: 'trialing', customer: { id: 'cus_2' }, cancel_at_period_end: true,
  current_period_end: 1893456000, items: { data: [{ price: { id: 'price_2' } }] },
}
const f2 = subscriptionFields(acaciaSub)
ok(f2.status === 'trialing' && f2.customerId === 'cus_2' && f2.current_period_end !== null && f2.cancel_at_period_end === true,
  'subscriptionFields: acacia (top-level period end) extracted')

ok(shouldGrantOrganizer({ role: 'certified_organizer' }, 'active') === true, 'grant: certified role + active')
ok(shouldGrantOrganizer({ onboarding_status: 'certified' }, 'trialing') === true, 'grant: certified status + trialing')
ok(shouldGrantOrganizer({ role: 'participant' }, 'active') === false, 'no grant: not certified')
ok(shouldGrantOrganizer({ role: 'certified_organizer' }, 'incomplete') === false, 'no grant: incomplete status')

// ── fake admin (supports the exact call chains in syncSubscription) ──────────
function makeAdmin(profile: any) {
  const calls: { subUpsert: any; profileUpdate: any } = { subUpsert: null, profileUpdate: null }
  function from(table: string) {
    const b: any = {
      select: () => b,
      eq: () => b,
      maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? profile : null }),
      upsert: (row: any) => {
        if (table === 'subscriptions') calls.subUpsert = row
        return Promise.resolve({ error: null })
      },
      update: (p: any) => {
        b._u = p
        return b
      },
      then: (res: any, rej: any) => {
        if (b._u && table === 'profiles') calls.profileUpdate = b._u
        return Promise.resolve({ error: null }).then(res, rej)
      },
    }
    return b
  }
  return { admin: { from }, calls }
}

// ── THE FIX: out-of-order 'incomplete' event must not regress 'active' ────────
// The webhook routes subscription.* through syncSubscriptionById, which RETRIEVES
// the current subscription from Stripe. Our fake Stripe returns 'active' regardless
// of what (stale) event triggered the sync.
const fakeStripeActive: any = {
  subscriptions: {
    retrieve: async (_id: string) => ({
      id: 'sub_99', status: 'active', customer: 'cus_99', cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_99' }, current_period_end: 1893456000 }] },
    }),
  },
}

{
  const { admin, calls } = makeAdmin({ id: 'p1', role: 'certified_organizer', onboarding_status: 'subscribed' })
  await syncSubscriptionById(admin as any, fakeStripeActive, 'sub_99')
  ok(calls.subUpsert?.status === 'active', 'OUT-OF-ORDER: retrieve writes active (stale incomplete ignored)')
  ok(calls.profileUpdate?.role === 'certified_organizer', 'OUT-OF-ORDER: certified profile granted on active')
}

// ── baseline: a legitimate cancellation still downgrades the row (no false guard) ─
{
  const { admin, calls } = makeAdmin({ id: 'p2', role: 'certified_organizer', onboarding_status: 'subscribed' })
  await syncSubscription(admin as any, {
    id: 'sub_a', status: 'canceled', customer: 'cus_a', cancel_at_period_end: false,
    items: { data: [{ price: { id: 'p' }, current_period_end: 1893456000 }] },
  } as any)
  ok(calls.subUpsert?.status === 'cancelled', 'cancellation writes cancelled (status not frozen)')
  ok(calls.profileUpdate === null, 'cancellation does not re-grant (and never downgrades role here)')
}

// ── no profile for the customer → no-op ──────────────────────────────────────
{
  const { admin, calls } = makeAdmin(null)
  await syncSubscription(admin as any, cloverSub)
  ok(calls.subUpsert === null && calls.profileUpdate === null, 'unknown customer → no writes')
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
