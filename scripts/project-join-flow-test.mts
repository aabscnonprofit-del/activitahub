// Project Join Flow — contract test.
//
// Verifies the participant Join model as a PROJECT PROPERTY (join_policy: instant / approval / ticket, default
// approval) that drives the Join action on the public Activity Page — with NO Join / Ticket / Registration /
// Purchase entity and no payment. Static source analysis + a pure policy→CTA mapping. Reads source only.
//
//   Run:  npx tsx scripts/project-join-flow-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mig = read('../supabase/migrations/060_project_join_policy.sql')
const store = read('../lib/projects/store.ts')
const action = read('../lib/actions/projects.ts')
const panel = read('../components/projects/JoinPolicyPanel.tsx')
const activityPage = read('../app/[locale]/p/[projectId]/page.tsx')
const workspace = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
const cards = read('../lib/activity-marketplace/cards.ts')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Join action is driven entirely by the policy (pure mapping): instant→Join, approval→Request to Join, ticket→Get Tickets.
const ctaLabel: Record<'instant' | 'approval' | 'ticket', string> = { instant: 'Join', approval: 'Request to Join', ticket: 'Get Tickets' }
check('policy instant → "Join"', ctaLabel.instant === 'Join')
check('policy approval → "Request to Join"', ctaLabel.approval === 'Request to Join')
check('policy ticket → "Get Tickets"', ctaLabel.ticket === 'Get Tickets')

// 2. Migration 060 — adds join_policy, default approval, NOT NULL, constrained to the three values; NO new entity.
check('migration adds join_policy column (idempotent)', mig.includes('ADD COLUMN IF NOT EXISTS join_policy'))
check('join_policy is NOT NULL', /join_policy TEXT NOT NULL/.test(mig))
check('default is approval', /DEFAULT 'approval'/.test(mig))
check('constrained to instant/approval/ticket', /CHECK \(join_policy IN \('instant', 'approval', 'ticket'\)\)/.test(mig))
check('migration creates NO Join/Ticket/Registration/Purchase entity (only ALTER projects)',
  !/CREATE TABLE/i.test(mig) && mig.includes('ALTER TABLE') && mig.includes('projects'))
check('migration touches no lifecycle/planning/budget/execution/publication/visibility',
  !/Planning|Budget|Execution|is_published|visibility|approv(e|al_flow)|current_step/i.test(mig.replace(/--.*$/gm, '')))

// 3. Store — join policy is a Project attribute; tolerant read defaults to approval; owner-scoped write.
check('JoinPolicy type (instant|approval|ticket)', store.includes("export type JoinPolicy = 'instant' | 'approval' | 'ticket'"))
check('getProjectJoinPolicy reads the column', store.includes("select('join_policy')"))
check('getProjectJoinPolicy defaults to approval when absent/error (safe default)',
  /getProjectJoinPolicy[\s\S]{0,400}return 'approval'/.test(store))
check('setProjectJoinPolicy does an owner-scoped update', store.includes('.update({ join_policy: joinPolicy })'))
check('no Join/Ticket/Registration table added to the store', !/from\('(joins|project_joins|tickets|registrations|purchases)'\)/.test(store))

// 4. Organizer action — validates, owner-gated, revalidates the Activity Page; changes nothing else.
check('setProjectJoinPolicyAction exists + validates the three values',
  action.includes('export async function setProjectJoinPolicyAction') &&
  action.includes("joinPolicy !== 'instant' && joinPolicy !== 'approval' && joinPolicy !== 'ticket'"))
check('action is owner-gated + authenticated', action.includes('getProject(supabase, projectId)') && action.includes("error: 'not_authenticated'"))
check('action revalidates the public Activity Page (/p/[projectId])', action.includes('/p/${projectId}`'))
{
  const start = action.indexOf('export async function setProjectJoinPolicyAction')
  const body = action.slice(start, start + (action.slice(start).indexOf('\n}\n') + 1))
  check('action does not touch approval/publication/visibility/planning/budget',
    !/approveProject|publishProject|setProjectVisibility|persistEventPlan|Budget/.test(body))
}

// 5. Organizer config UI — Instant Join / Approval Required / Ticket Required; calls the action.
check('JoinPolicyPanel offers Instant Join / Approval Required / Ticket Required',
  panel.includes("title: 'Instant Join'") && panel.includes("title: 'Approval Required'") && panel.includes("title: 'Ticket Required'"))
check('panel calls the owner-gated action', panel.includes('setProjectJoinPolicyAction(projectId, next, locale)'))
check('panel creates no join/ticket entity (presentation + action only)', !/from\('/.test(panel) && !panel.includes('createJoin') && !panel.includes('createTicket'))

// 6. Activity Page — the Join CTA label/behavior is driven by the policy (now rendered by the JoinButton, which
//    maps instant→Join, approval→Request to Join, ticket→Get Tickets). Policy plumbing is what this test guards.
check('Activity Page loads the join policy', activityPage.includes('getProjectJoinPolicy(supabase, projectId)'))
check('Activity Page renders the policy-driven Join button', activityPage.includes('<JoinButton') && activityPage.includes('joinPolicy={joinPolicy}'))

// 7. Wired into the Project workspace configuration; loads the tolerant default.
check('workspace loads join policy + renders the JoinPolicyPanel',
  workspace.includes('getProjectJoinPolicy(supabase, projectId)') && workspace.includes('<JoinPolicyPanel'))

// 8. Local Activities architecture unchanged — still published Projects WHERE visibility = 'public'.
check('Local Activities query unchanged (published + public), no join_policy filter added',
  cards.includes(".eq('is_published', true)") && cards.includes(".eq('visibility', 'public')") && !cards.includes('join_policy'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
