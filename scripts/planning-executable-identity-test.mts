// Planning Enrichment Phase 1 — executable identity — contract test.
//
// Static, deterministic source analysis. Verifies EventPlanV2's executable-candidate elements
// (ItineraryMoment, LogisticItem) carry a stable, OPTIONAL identity produced deterministically by the
// Planning pipeline — additive and backward-compatible. Phase 1 is IDENTITY ONLY: no execution condition,
// trigger, timing, or prerequisite structure (that is Phase 2), and no consumer is made to require the id.
//
//   Run:  npx tsx scripts/planning-executable-identity-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const types = read('../lib/planning/event-plan-v2.ts')
const reasoning = read('../lib/planning/reasoning.ts')
const publicProj = read('../lib/planning/public-event-projection.ts')
const ir = read('../lib/planning/event-plan-v2-to-ir.ts')

// element slices of the type file
const itin = types.slice(types.indexOf('interface ItineraryMoment'), types.indexOf('interface LogisticItem'))
const logi = types.slice(types.indexOf('interface LogisticItem'), types.indexOf('interface ResourceNeed'))

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Type: OPTIONAL id on both executable-candidate elements (backward compatibility).
check('ItineraryMoment declares an optional id', /\bid\?:\s*string/.test(itin))
check('LogisticItem declares an optional id', /\bid\?:\s*string/.test(logi))

// 2. Pipeline assigns a deterministic, element-keyed id (no clock / no randomness).
check('reasoning assigns itinerary id from the internal element key', reasoning.includes('id: `itinerary:${el}`'))
check('reasoning assigns logistic id from the internal element key', reasoning.includes('id: `logistic:${el}`'))
check('id derivation is deterministic (no Math.random / Date in reasoning)',
  !reasoning.includes('Math.random') && !reasoning.includes('Date.now') && !/\bnew Date\b/.test(reasoning))

// 3. Additive only — Phase 1 is identity, not the (Phase 2) condition model.
check('no execution condition / trigger / prerequisite / timing-structure added to the elements (Phase 1 = identity only)',
  !/executionCondition|\btrigger\b|prerequisite|temporalExpectation/.test(itin) &&
  !/executionCondition|\btrigger\b|prerequisite|temporalExpectation/.test(logi))

// 4. Consumers remain agnostic — none is made to require the new id.
check('public projection does not depend on the moment id', !publicProj.includes('m.id'))
check('OPE/IR projection does not depend on the moment/logistic id',
  !ir.includes('m.id') && !ir.includes('l.id'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
