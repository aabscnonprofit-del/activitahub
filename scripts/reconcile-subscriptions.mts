/**
 * Reconcile Supabase `subscriptions` rows (and the certified-organizer grant) with
 * Stripe's CURRENT state — the repair tool for rows that drifted out of sync (e.g.
 * an 'active' Stripe subscription left 'incomplete' in the DB by an out-of-order
 * webhook event).
 *
 * For every subscription row it retrieves the live Stripe subscription and rewrites
 * status / period end / cancel flag / price (mirroring lib/stripe/sync.ts), and
 * re-applies the certified_organizer grant when warranted. Pure read-only by
 * default; pass `--apply` to write.
 *
 * Run:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/reconcile-subscriptions.mts            # dry run (report drift)
 *   npx tsx scripts/reconcile-subscriptions.mts --apply    # write fixes
 *
 * Needs: STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (auto-loaded from .env.local if present).
 */
import Stripe from 'stripe'
import { readFileSync } from 'node:fs'
import { subscriptionFields, shouldGrantOrganizer } from '../lib/stripe/subscription-mapping.ts'

function loadEnvLocal() {
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* env may already be exported */
  }
}
loadEnvLocal()

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SK = process.env.STRIPE_SECRET_KEY
const APPLY = process.argv.includes('--apply')

if (!SUPA_URL || !SUPA_KEY || !SK) {
  console.error('Missing env: STRIPE_SECRET_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const stripe = new Stripe(SK, { apiVersion: '2025-02-24.acacia' })

async function sb(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPA_KEY as string,
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

const sameInstant = (a: string | null, b: string | null) =>
  (a ? Date.parse(a) : 0) === (b ? Date.parse(b) : 0)

async function main() {
  console.log(`Reconcile subscriptions — ${APPLY ? 'APPLY' : 'DRY RUN'}\n`)
  const rows: any[] = await sb(
    'subscriptions?select=profile_id,stripe_subscription_id,status,current_period_end,cancel_at_period_end,stripe_price_id&stripe_subscription_id=not.is.null'
  )
  let drifted = 0, granted = 0, ok = 0

  for (const row of rows) {
    let fresh: Stripe.Subscription
    try {
      fresh = await stripe.subscriptions.retrieve(row.stripe_subscription_id)
    } catch (e: any) {
      console.log(`  SKIP ${row.stripe_subscription_id}: retrieve failed (${e.message})`)
      continue
    }
    const f = subscriptionFields(fresh)

    const profiles: any[] = await sb(`profiles?id=eq.${row.profile_id}&select=id,role,onboarding_status`)
    const profile = profiles?.[0]
    const grant =
      !!profile &&
      shouldGrantOrganizer(profile, f.status) &&
      !(profile.role === 'certified_organizer' && profile.onboarding_status === 'subscribed')

    const rowDrift =
      row.status !== f.status ||
      !sameInstant(row.current_period_end, f.current_period_end) ||
      row.cancel_at_period_end !== f.cancel_at_period_end ||
      row.stripe_price_id !== f.stripe_price_id

    if (!rowDrift && !grant) {
      ok++
      continue
    }

    if (rowDrift) {
      drifted++
      console.log(`  DRIFT ${row.profile_id}: db.status=${row.status} → stripe.status=${f.status}`)
    }
    if (grant) {
      granted++
      console.log(`  GRANT ${row.profile_id}: will set role=certified_organizer / onboarding=subscribed`)
    }

    if (APPLY) {
      await sb(`subscriptions?profile_id=eq.${row.profile_id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          status: f.status,
          current_period_end: f.current_period_end,
          cancel_at_period_end: f.cancel_at_period_end,
          stripe_price_id: f.stripe_price_id,
          updated_at: new Date().toISOString(),
        }),
      })
      if (grant) {
        await sb(`profiles?id=eq.${row.profile_id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ role: 'certified_organizer', onboarding_status: 'subscribed' }),
        })
      }
      console.log(`    APPLIED`)
    }
  }

  console.log(
    `\n${rows.length} rows · ${ok} in sync · ${drifted} drifted · ${granted} grant-needed` +
      (APPLY ? ' · changes written' : ' · dry run (pass --apply to write)')
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
