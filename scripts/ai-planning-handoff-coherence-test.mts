// AI Planning journey (P4) — Planning → Project → Workspace must feel like ONE flow.
//
// Both create paths (Quick Activity and AI Planning) hand off into the workspace the same way: with a single,
// state-aware arrival confirmation (Quick lands approved → "publish next"; AI Planning lands as a draft →
// "approve next"). The planned activity's identity carries from the planner review into the workspace via the
// same field the public page uses.
//
//   Run:  npx tsx scripts/ai-planning-handoff-coherence-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const code = (p: string) => read(p).replace(/\/\/.*$/gm, '')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const planner = code('../components/planner/PlannerClient.tsx')
const quickForm = code('../components/activities/QuickActivityForm.tsx')
const workspace = code('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
const review = code('../components/planner/EventPlanV2Review.tsx')

// ── Consistent handoff: BOTH create paths signal arrival the same way ───────────────────────────────────
check('AI Planning hands off to the workspace with the arrival flag (?created=1)',
  planner.includes('/dashboard/projects/${projectId}?created=1'))
check('Quick Activity hands off the same way (?created=1) — one shared mechanism', quickForm.includes('?created=1'))
check('planner keeps a clear "Continue to Project Workspace" step', planner.includes('Continue to Project Workspace'))

// ── The arrival confirmation is ONE banner, state-aware to the path's real state ─────────────────────────
check('workspace shows a single arrival banner gated on justCreated', workspace.includes('justCreated &&'))
check('arrival banner is state-aware (approved → publish; draft → approve)',
  /justCreated &&[\s\S]{0,400}approvedAt \?[\s\S]{0,200}publish[\s\S]{0,200}approve it to continue/.test(workspace))
check('the AI (draft) arrival tells the organizer the next step is to approve', workspace.includes('review it below, then approve it to continue'))
check('the generic draft intro is suppressed right after creation (no double messaging)',
  workspace.includes('!approvedAt && !justCreated &&'))

// ── Identity carries from the plan review into the workspace (one source, same field) ───────────────────
check('planner review shows the planned activity identity (experienceDesign.intendedFeeling)',
  review.includes('plan.experienceDesign.intendedFeeling'))
check('workspace leads with that same identity (activityTitleFromPlan)', workspace.includes('activityTitleFromPlan(workerPlan)'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
