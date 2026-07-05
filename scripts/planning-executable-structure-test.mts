// Planning Enrichment Increment 1 — executable operational structure — contract test.
//
// Verifies the executable-candidate elements (ItineraryMoment, LogisticItem) carry the accepted, DECOMPOSED
// operational structure (activation trigger / relative timing / prerequisite; stable moment reference), that
// the deterministic pipeline populates what it can (a default `manual` trigger + `forMomentId`) ADDITIVELY,
// that legacy items default correctly, and that existing projections read NONE of the new fields (unchanged).
//
//   Run:  npx tsx scripts/planning-executable-structure-test.mts

import { readFileSync } from 'node:fs'
import { operationalTrigger } from '../lib/planning/executable'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const types = read('../lib/planning/event-plan-v2.ts')
const reasoning = read('../lib/planning/reasoning.ts')
const publicProj = read('../lib/planning/public-event-projection.ts')
const ir = read('../lib/planning/event-plan-v2-to-ir.ts')

const itin = types.slice(types.indexOf('interface ItineraryMoment'), types.indexOf('interface LogisticItem'))
const logi = types.slice(types.indexOf('interface LogisticItem'), types.indexOf('interface ResourceNeed'))

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Types — the decomposed operational structure exists (all optional; not a single "condition" blob).
check('OperationalTrigger type defined (decomposed activation concept)',
  /interface OperationalTrigger/.test(types) && types.includes("'manual'"))
check('RelativeTiming type defined (relative, never absolute)',
  /interface RelativeTiming/.test(types) && types.includes('offsetFromStartMinutes'))
check('ItineraryMoment has optional trigger / temporal / prerequisiteIds',
  /trigger\?:/.test(itin) && /temporal\?:/.test(itin) && /prerequisiteIds\?:/.test(itin))
check('LogisticItem has optional forMomentId / trigger',
  /forMomentId\?:/.test(logi) && /trigger\?:/.test(logi))

// 2. Pipeline populates the derivable structure additively.
check('pipeline defaults moment + logistic trigger to manual',
  (reasoning.match(/trigger: \{ kind: 'manual' \}/g) || []).length >= 2)
check('pipeline sets logistic forMomentId from the moment id', reasoning.includes('item.forMomentId = `itinerary:${el}`'))
check('id/structure derivation stays deterministic (no Math.random / Date)',
  !reasoning.includes('Math.random') && !reasoning.includes('Date.now') && !/\bnew Date\b/.test(reasoning))

// 3. Compat / defaulting (runtime): a legacy item with no trigger defaults to manual; explicit is preserved.
check('operationalTrigger() defaults an absent trigger to manual', operationalTrigger({}).kind === 'manual')
check('operationalTrigger() preserves an explicit trigger',
  operationalTrigger({ trigger: { kind: 'relative_time' } }).kind === 'relative_time')

// 4. Projections UNCHANGED — existing consumers read none of the new fields.
check('public projection reads none of the new executable fields',
  !publicProj.includes('.trigger') && !publicProj.includes('.temporal') &&
  !publicProj.includes('.forMomentId') && !publicProj.includes('.prerequisiteIds'))
check('OPE/IR projection reads none of the new executable fields',
  !ir.includes('.trigger') && !ir.includes('.temporal') &&
  !ir.includes('.forMomentId') && !ir.includes('.prerequisiteIds'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
