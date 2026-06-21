// One Event License — config/price-resolution test (deterministic, no network/DB).
//   Run:  npx tsx scripts/event-license-test.mts   (or: npm run test:event-license)

import { getOneEventLicensePriceId } from '../lib/stripe/config'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// Unset → fails loudly (mirrors the certification/subscription price guards).
delete process.env.STRIPE_PRICE_ONE_EVENT_LICENSE
let threw = false
try { getOneEventLicensePriceId() } catch { threw = true }
check('throws a helpful error when STRIPE_PRICE_ONE_EVENT_LICENSE is unset', threw)

// Set → returns the configured price id verbatim.
process.env.STRIPE_PRICE_ONE_EVENT_LICENSE = 'price_test_one_event_license'
check('returns the configured price id', getOneEventLicensePriceId() === 'price_test_one_event_license')

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
