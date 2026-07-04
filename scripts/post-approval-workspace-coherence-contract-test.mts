// Post-Approval Workspace Coherence — contract test.
//
// Static, deterministic source analysis of the Project Workspace page. Verifies that once a Project is
// approved (project.approved_at set), the Draft-only sections are gated off and an Approved presentation is
// shown, while Publish / Budget / module grid / navigation / data loading are kept. Presentation only.
//
//   Run:  npx tsx scripts/post-approval-workspace-coherence-contract-test.mts

import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../app/[locale]/dashboard/projects/[projectId]/page.tsx', import.meta.url), 'utf8')
const norm = page.replace(/\s+/g, ' ')
// visible text only (strip block + JSX comments) for the forbidden-wording check
const visible = page.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Approval state reused (no new query/schema/action).
check('page derives the approval state from project.approved_at', page.includes('const approvedAt = project.approved_at'))

// 2. Draft-only sections are gated off when approved.
const draftGates = (page.match(/\{!approvedAt && \(/g) || []).length
check('draft-only sections are gated on !approvedAt (intro + two prep groups)', draftGates >= 3)
check('header draft intro gated on !approvedAt', /\{!approvedAt && \([\s\S]{0,120}Planning is complete/.test(page))
check('Draft Project Overview / Review Checklist / Approval Readiness still authored (gated, not deleted)',
  page.includes('Draft Project Overview') && page.includes('Review Checklist') && page.includes('Approval Readiness'))
check('Budget entry copy is state-aware (draft copy only when not approved)',
  page.includes('Budget preparation is part of reviewing the Draft Project before approval'))

// 3. Approved presentation shown when approved.
check('approved presentation block gated on approvedAt', page.includes('{approvedAt && ('))
check('approved: "Project Approved"', page.includes('Project Approved'))
check('approved: approval date shown (formatDate(approvedAt))',
  page.includes('Approved on:') && page.includes('formatDate(approvedAt)'))
check('approved: mentions the Approved Project Snapshot', page.includes('Approved Project Snapshot'))
check('approved: operational source of truth for future Execution',
  norm.includes('operational source of truth for future Execution'))
check('approved UI does not imply Execution started / locked / frozen / Revision',
  !/(execution started|\blocked\b|\bfrozen\b|\brevision\b)/i.test(visible))

// 4. Kept in both states.
check('PublishPanel kept', page.includes('<PublishPanel'))
check('module grid kept', page.includes('Manage this event'))
check('Budget Workspace entry kept', page.includes('Budget Workspace') && page.includes('/budget`'))
check('navigation + data loading kept',
  page.includes('← Projects') && page.includes('getProject(') && page.includes('getProjectPublishState('))

// 5. Presentation only — no new action / mutation / state introduced on the page.
check('presentation only — no action call / mutation / client state on the page',
  !page.includes('approveProjectAction(') && !page.includes('useState') &&
  !page.includes('.insert(') && !page.includes('.update('))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
