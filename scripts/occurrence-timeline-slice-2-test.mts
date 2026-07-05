// Occurrence Binding Slice 2 (timeline read model) — contract test.
//
// Verifies buildOccurrenceTimeline orders bound items by absoluteStart with a deterministic tie-break for
// equal times, carries entry fields, keeps unbound items separately, handles the legacy all-unbound case, is
// deterministic, does not mutate the binding, and changes nothing in Planning / Execution / projections.
//
//   Run:  npx tsx scripts/occurrence-timeline-slice-2-test.mts

import { readFileSync } from 'node:fs'
import { buildExecutionSnapshot } from '../lib/execution/snapshot'
import { bindOccurrence } from '../lib/occurrence/binding'
import { buildOccurrenceTimeline } from '../lib/occurrence/timeline'
import type { EventPlanV2 } from '../lib/planning/event-plan-v2'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const START = '2026-07-04T09:00:00.000Z'
const OCC = 'occ-1'

// Plan order is intentionally NOT sorted: c(60) before a(30) & b(30) [tie]; z has no temporal (unbound).
const plan = {
  itinerary: [
    { id: 'itinerary:c', name: 'C', trigger: { kind: 'manual' }, temporal: { offsetFromStartMinutes: 60 } },
    { id: 'itinerary:a', name: 'A', trigger: { kind: 'manual' }, temporal: { offsetFromStartMinutes: 30, deadlineOffsetMinutes: 90 } },
    { id: 'itinerary:b', name: 'B', trigger: { kind: 'manual' }, temporal: { offsetFromStartMinutes: 30 } },
    { id: 'itinerary:z', name: 'Z', trigger: { kind: 'manual' } }, // no temporal → unbound
  ],
  logistics: [],
} as unknown as EventPlanV2

const binding = bindOccurrence(buildExecutionSnapshot(plan), OCC, START)
const bindingBoundOrderBefore = binding.bound.map((b) => b.monitoringItemId).join(',')
const timeline = buildOccurrenceTimeline(binding)
const ids = timeline.entries.map((e) => e.monitoringItemId)

// 1. Ordering by absoluteStart ascending.
check('entries ordered by absoluteStart ascending (a@09:30, b@09:30, c@10:00)', ids.join(',') === 'itinerary:a,itinerary:b,itinerary:c')
check('start times are non-decreasing', timeline.entries.every((e, i) => i === 0 || timeline.entries[i - 1].absoluteStart <= e.absoluteStart))

// 2. Equal-time deterministic tie-break (a & b both @09:30 → by monitoringItemId).
check('equal-time tie-break by monitoringItemId (a before b)',
  timeline.entries[0].monitoringItemId === 'itinerary:a' && timeline.entries[1].monitoringItemId === 'itinerary:b' &&
  timeline.entries[0].absoluteStart === timeline.entries[1].absoluteStart)

// 3. Entry fields present.
check('entry carries id / occurrenceId / absoluteStart / absoluteDeadline? / relative',
  timeline.entries[0].occurrenceId === OCC && timeline.entries[0].absoluteStart === '2026-07-04T09:30:00.000Z' &&
  timeline.entries[0].absoluteDeadline === '2026-07-04T10:30:00.000Z' &&
  timeline.entries[0].relative.offsetFromStartMinutes === 30 &&
  timeline.entries[1].absoluteDeadline === undefined)

// 4. Unbound items preserved separately.
check('unbound items kept separately (z, no_temporal)',
  timeline.unbound.length === 1 && timeline.unbound[0].monitoringItemId === 'itinerary:z' && timeline.unbound[0].reason === 'no_temporal')
check('timeline carries occurrence id + start', timeline.occurrenceId === OCC && timeline.occurrenceStartIso === START)

// 5. Determinism + input not mutated.
check('build is deterministic (same binding → identical timeline)',
  JSON.stringify(buildOccurrenceTimeline(binding)) === JSON.stringify(timeline))
check('input binding is not mutated (bound order unchanged)', binding.bound.map((b) => b.monitoringItemId).join(',') === bindingBoundOrderBefore)

// 6. Legacy all-unbound case.
const legacy = { itinerary: [{ name: 'Old' }], logistics: [{ description: 'Old logistic' }] } as unknown as EventPlanV2
const ltimeline = buildOccurrenceTimeline(bindOccurrence(buildExecutionSnapshot(legacy), OCC, START))
check('legacy: no entries, all items unbound', ltimeline.entries.length === 0 && ltimeline.unbound.length === 2)

// 7. Depends only on the Occurrence binding types (no Planning/Execution value imports).
const src = readFileSync(new URL('../lib/occurrence/timeline.ts', import.meta.url), 'utf8')
const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const libImports = codeOnly.match(/^import[^\n]*@\/lib\/[^\n]*$/gm) ?? []
check('timeline.ts imports only from ./binding as a type; nothing from Planning/Execution/Occurrence-db',
  libImports.length === 0 && /^import type \{[^}]*\} from '\.\/binding'/m.test(codeOnly) && !/occurrence.*supabase|migration/i.test(codeOnly))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
