// Stage C — Dashboard Home is Project-first + discovery converges on the Project surface.
// Integration only: reuses listProjects and the existing /activities page; repoints legacy links; no new
// entity/route/business-logic.
//
//   Run:  npx tsx scripts/stage-c-project-home-discovery-test.mts

import { readFileSync } from 'node:fs'

const home = readFileSync(new URL('../app/[locale]/dashboard/page.tsx', import.meta.url), 'utf8')
const header = readFileSync(new URL('../components/layout/PublicHeader.tsx', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// Phase 1 — Dashboard Home is Project-first.
check('home surfaces Projects (reuses listProjects)', home.includes('listProjects(supabase)') && home.includes('Your projects'))
check('home create + primary CTAs enter the Project world', home.includes('/dashboard/plans/new') && home.includes('/${locale}/activities') && home.includes('/dashboard/projects'))
check('legacy-activity quick actions removed from the home (add participants / promotion / send update)',
  !home.includes("quick.addParticipants") && !home.includes("quick.generatePromotion") && !home.includes("quick.sendUpdate"))
// The empty-state ("start") CTA lives inside the Your-projects section and must point at the planner.
// (Remaining /dashboard/activities links on the home are data-gated legacy compat — invisible to a first-time
// organizer with no legacy activities.)
{
  const startBlock = home.slice(home.indexOf("t('start.title')"), home.indexOf("t('start.cta')") + 20)
  check('empty-state / start CTA points at the planner, not the legacy editor',
    startBlock.includes('/dashboard/plans/new') && !startBlock.includes('/dashboard/activities'))
}

// Phase 2 — Discovery converges on the Project surface.
check('header "Marketplace" nav now points to the Project discovery (/activities)', (header.match(/\/\$\{locale\}\/activities/g) ?? []).length >= 2)
check('header no longer links the legacy /marketplace', !header.includes('${locale}/marketplace'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
