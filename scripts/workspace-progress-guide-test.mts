// Workspace journey (P5) — the organizer is never left wondering "what do I do next?".
//
// A persistent progress guide, derived ENTIRELY from existing state (approval → a future occurrence →
// publication + public visibility), names the current stage and the single next action, and jumps straight to
// the section that performs it. This closes the two workspace-coherence gaps: no persistent state/next-action
// signal, and Publish being buried far below Schedule.
//
//   Run:  npx tsx scripts/workspace-progress-guide-test.mts

import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../app/[locale]/dashboard/projects/[projectId]/page.tsx', import.meta.url), 'utf8')
const code = page.replace(/\/\/.*$/gm, '')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// ── Stage derived from EXISTING state only (no new data / entity) ───────────────────────────────────────
check('stage is computed from approval + future date + publication/visibility',
  code.includes("!approvedAt ? 'review'") && code.includes("!hasFutureDate ? 'schedule'") && code.includes("!isLive ? 'publish'"))
check('"live" means published AND publicly visible', code.includes("isPublished && visibility === 'public'"))
check('progress guide adds no new data source (no extra await/query for it)',
  code.includes('futureOccurrences.length > 0') && !code.includes('getWorkspaceStage(') && !code.includes("from('workspace"))

// ── The persistent progress header + single next action ─────────────────────────────────────────────────
check('renders the four workflow milestones', code.includes("['Approve', 'Schedule', 'Publish', 'Live']"))
check('shows a labelled single "Next step" with a CTA', code.includes('Next step') && code.includes('nextStep[stage].cta'))
check('the next action jumps to the relevant section anchor', code.includes('href={`#${nextStep[stage].anchor}`}'))
check('the three next-step targets are approve / schedule / publish anchors',
  code.includes("anchor: 'approve'") && code.includes("anchor: 'schedule'") && code.includes("anchor: 'publish'"))
check('a blocked (capacity) organizer is guided to resolve it first', code.includes('capacityBlocked') && code.includes('Resolve your organizer capacity'))
check('when live, the guide confirms it and links the public page', code.includes("stage === 'live'") && code.includes('live and discoverable') && code.includes('View public page'))

// ── Anchor targets exist so the CTA actually lands on the right section (Publish no longer buried) ──────
for (const id of ['approve', 'schedule', 'publish']) {
  check(`section anchor id="${id}" exists for the next-step jump`, code.includes(`id="${id}"`))
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
