// Project Workspace ordering — convergence contract test (Product First, Stage 2 / Workspace).
//
// Static, deterministic source analysis of the Project Workspace page. It asserts the sections follow the real
// organizer workflow — Project Overview → Review → Approve → Budget → Delivery → Team → External Access → Publish
// — that Review/Approve are prominent and not buried, that actions are exposed only when meaningful
// (Delivery/Team once approved; External Access sharing only once approved), and that the obsolete "Manage this
// event" placeholder grid is gone. Presentation/ordering only — it reuses the existing panels/loaders and
// asserts no access model or business logic was changed here. Reads source only; changes nothing.
//
//   Run:  npx tsx scripts/project-workspace-ordering-test.mts

import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../app/[locale]/dashboard/projects/[projectId]/page.tsx', import.meta.url), 'utf8')
let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Section order follows the organizer workflow (monotonic source position of each section marker).
const order = [
  ['Project Overview', '── 1. Project Overview'],
  ['Review', '── 2. Review'],
  ['Approve', '── 3. Approve'],
  ['Budget', '── 4. Budget'],
  ['Delivery', '── 5. Delivery'],
  ['Team', '── 6. Team'],
  ['Project Access', '── 7. Project Access'],
  ['Publish', 'Publish &amp; Visibility'],
] as const
const idx = order.map(([, marker]) => src.indexOf(marker))
check('every workflow section is present', idx.every((i) => i !== -1))
for (let i = 1; i < order.length; i++) {
  check(`${order[i - 1][0]} appears before ${order[i][0]}`, idx[i - 1] < idx[i])
}

// 2. Review and Approval are immediately visible (draft) and Approve is visually prominent, not buried.
check('Review Checklist present', src.includes('Review Checklist'))
check('Approve Project present', src.includes('Approve Project'))
check('Approve is visually prominent (emphasized container/heading)',
  /Approve Project[\s\S]{0,400}/.test(src) && src.includes('border-2 border-brand-200') && src.includes('text-base font-bold text-brand-800'))
check('Approve comes before Budget (approval not buried below secondary sections)',
  src.indexOf('Approve Project') < src.indexOf('Budget Workspace'))

// 3. Budget remains immediately available (present, unconditional, reuses the existing /budget route).
check('Budget Workspace entry present and links to the existing budget route',
  src.includes('Budget Workspace') && src.includes('/dashboard/projects/${projectId}/budget'))

// 4. Delivery + Team appear only once approved (loaders gated on approvedAt — reused, unchanged).
check('Execution/Delivery gated on approval', src.includes('approvedAt ? await loadOrganizerExecutionWorkspace') && src.includes('approvedAt ? await loadDeliveryWorkspace'))
check('Team gated on approval', src.includes('approvedAt ? await loadTeamWorkspace'))

// 5. External Access (sharing) appears only once approved — the four panels are inside an approvedAt gate,
//    after Team, and still driven by the shared Project Access implementation (reused, unchanged).
const extIdx = src.indexOf('── 7. Project Access')
const clientIdx = src.indexOf('<ClientAccessPanel')
check('External Access section is gated on approvedAt', src.slice(extIdx, clientIdx).includes('{approvedAt && ('))
check('all four access panels are inside the approved gate',
  [/<ClientAccessPanel/, /<WorkerAccessPanel/, /<ParticipantAccessPanel/, /<SafetyAccessPanel/].every((re) => re.test(src.slice(extIdx))))
check('External Access appears after Team', extIdx > src.indexOf('── 6. Team'))
check('reuses the shared Project Access layer (listAccessByType), no new access model',
  src.includes("listAccessByType(supabase, projectId, 'client')") && src.includes("listAccessByType(supabase, projectId, 'safety')"))

// 6. Legacy cleanup — the obsolete "Manage this event" placeholder grid and its dead tiles are gone.
check('obsolete "Manage this event" grid removed', !src.includes('Manage this event'))
check('dead ModuleTile / placeholder module list removed', !src.includes('ModuleTile') && !src.includes('Project integration planned'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
