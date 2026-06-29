// Stage 0 — Planning Layer Baseline & Parity Harness (per docs/IMPLEMENTATION_CONTRACT.md).
//
// PURPOSE: freeze the CURRENT deterministic planning behaviour so every future migration
// stage can objectively detect a behavioural change. This is a CHARACTERIZATION test — it
// records what the system does TODAY; it does NOT assert that the behaviour is correct or
// desirable. A failure here means behaviour CHANGED (expected once a migration stage
// intentionally changes it — at which point the frozen baseline is updated deliberately).
//
// SCOPE: the deterministic, no-network, no-DB, no-auth planning path only:
//   free text  -> parseEventText -> PlannerInput        (request reduction)
//   PlannerInput -> generatePlan -> assembleOpeOutput    (engine + costed output)
// AI understanding is OFF (no key in tests), exercising the mandatory deterministic parser
// that is also the AI fallback — exactly the path the legacy Planning Layer uses without a key.
//
//   Run:  npx tsx scripts/planning-baseline-characterization-test.mts

import { parseEventText } from '../lib/ope/request-text'
import { generatePlan } from '../lib/ope/index'
import { assembleOpeOutput } from '../lib/ope/output-contract'
import type { PlannerInput, PlannerLocation } from '../lib/ope/types'

const LOC: PlannerLocation = { city: 'Honolulu', state: 'HI', country: 'USA', postalCode: null }

let failures = 0
function freeze(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}\n        expected ${e}\n        actual   ${a}`) }
}

// ── Part A — Request characterization (the six representative requests) ──────────────
// Records how the CURRENT deterministic Planning Layer reduces each free-text request.
// Frozen baseline captured from the current implementation; do NOT edit without an
// intentional migration stage that changes this behaviour.
const REQUESTS: Record<string, string> = {
  parents_day: 'I want to organize a memorable day for my parents on Waikiki. They are about 70 years old. I want them to have a relaxing day with beautiful views, a quiet dinner, and a limousine ride home.',
  wedding: 'I want to plan a wedding for 120 guests.',
  funeral: 'I need to organize a funeral for my grandmother.',
  birthday: 'A birthday party for my daughter who is turning 8, about 15 kids.',
  beach_yoga: 'Beach yoga every Sunday morning.',
  small_conference: 'A small conference for 80 people about local startups.',
}

type RequestSnapshot = {
  derivedCategory: string | null
  guestCount: number | null
  venueType: 'backyard_home' | 'public_park' | null
  budget: number | null
  inputBuildable: boolean
  planStatus: string | null
  coverageStatus: string | null
}

function snapshotRequest(text: string): RequestSnapshot {
  const { input } = parseEventText(text, LOC)
  const snap: RequestSnapshot = {
    derivedCategory: input?.category ?? null,
    guestCount: input?.guestCount ?? null,
    venueType: input?.venueType ?? null,
    budget: input?.budget ?? null,
    inputBuildable: input != null,
    planStatus: null,
    coverageStatus: null,
  }
  if (input) {
    const r = generatePlan(input)
    snap.planStatus = r.status
    snap.coverageStatus = r.coverage?.status ?? null
  }
  return snap
}

// Frozen baseline — captured from the current implementation (Stage 0).
const REQUEST_BASELINE: Record<string, RequestSnapshot> = {
  parents_day: { derivedCategory: null, guestCount: null, venueType: null, budget: null, inputBuildable: false, planStatus: null, coverageStatus: null },
  wedding: { derivedCategory: null, guestCount: null, venueType: null, budget: null, inputBuildable: false, planStatus: null, coverageStatus: null },
  funeral: { derivedCategory: null, guestCount: null, venueType: null, budget: null, inputBuildable: false, planStatus: null, coverageStatus: null },
  birthday: { derivedCategory: 'birthday', guestCount: 15, venueType: null, budget: null, inputBuildable: true, planStatus: 'needs_clarification', coverageStatus: 'plan_ready' },
  beach_yoga: { derivedCategory: null, guestCount: null, venueType: null, budget: null, inputBuildable: false, planStatus: null, coverageStatus: null },
  small_conference: { derivedCategory: null, guestCount: null, venueType: null, budget: null, inputBuildable: false, planStatus: null, coverageStatus: null },
}

console.log('Part A — request characterization (free text -> PlannerInput -> plan status):')
for (const [key, text] of Object.entries(REQUESTS)) {
  freeze(`request:${key}`, snapshotRequest(text), REQUEST_BASELINE[key])
}

// ── Part B — Engine characterization (canonical fully-specified PlannerInputs) ────────
// Freezes the engine's deterministic costed output for inputs that reach plan_ready, so a
// later stage that changes engine/output behaviour is detected even when the text path can't
// build an input. Counts + statuses are the stable, confirmed signals.
const ENGINE_INPUTS: Record<string, PlannerInput> = {
  birthday_full: { category: 'birthday', guestCount: 15, adults: 5, kids: 10, venueType: 'backyard_home', budget: 800, specialRequirements: [], location: LOC },
  bbq_full: { category: 'bbq', guestCount: 30, adults: 30, kids: 0, venueType: 'public_park', budget: 1200, specialRequirements: [], location: LOC },
  fitness_full: { category: 'fitness_class', guestCount: 12, adults: 12, kids: 0, venueType: 'public_park', budget: 300, specialRequirements: [], location: LOC, instructor: 'have', materials: 'provided' },
}

type EngineSnapshot = { planStatus: string; coverageStatus: string | null; resourceCount: number; roleCount: number }

function snapshotEngine(input: PlannerInput): EngineSnapshot {
  const r = generatePlan(input)
  const snap: EngineSnapshot = { planStatus: r.status, coverageStatus: r.coverage?.status ?? null, resourceCount: -1, roleCount: -1 }
  if (r.status === 'plan_ready' && r.plan) {
    const o = assembleOpeOutput(r.plan)
    snap.resourceCount = o.resources.length
    snap.roleCount = o.staffing.roles.length
  }
  return snap
}

// Frozen baseline — captured from the current implementation (Stage 0).
const ENGINE_BASELINE: Record<string, EngineSnapshot> = {
  birthday_full: { planStatus: 'plan_ready', coverageStatus: 'plan_ready', resourceCount: 11, roleCount: 1 },
  bbq_full: { planStatus: 'plan_ready', coverageStatus: 'plan_ready', resourceCount: 10, roleCount: 2 },
  fitness_full: { planStatus: 'plan_ready', coverageStatus: 'plan_ready', resourceCount: 6, roleCount: 1 },
}

console.log('\nPart B — engine characterization (PlannerInput -> plan_ready -> costed output):')
for (const [key, input] of Object.entries(ENGINE_INPUTS)) {
  freeze(`engine:${key}`, snapshotEngine(input), ENGINE_BASELINE[key])
}

console.log(`\n${failures === 0 ? 'ALL PASS — current planning behaviour matches the frozen Stage 0 baseline' : `${failures} CHANGE(S) DETECTED vs the frozen Stage 0 baseline`}`)
process.exit(failures === 0 ? 0 : 1)
