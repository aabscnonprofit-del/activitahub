// Project Visibility → Local Activities — contract test.
//
// Verifies that Project VISIBILITY (private/public) is separate from publication and that Local Activities is
// exactly the catalog of published PUBLIC Projects: Local Activities = published Projects WHERE visibility =
// 'public'. Static source analysis + a pure truth-table over the business rule. Reads source only.
//
//   Run:  npx tsx scripts/project-visibility-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mig = read('../supabase/migrations/059_project_visibility.sql')
const store = read('../lib/projects/store.ts')
const cards = read('../lib/activity-marketplace/cards.ts')
const action = read('../lib/actions/projects.ts')
const panel = read('../components/projects/VisibilityPanel.tsx')
const page = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Business rule (pure truth table): appears in Local Activities ⟺ published AND public.
const appears = (published: boolean, visibility: 'private' | 'public') => published && visibility === 'public'
check('truth: Draft(unpublished) + Private → NOT shown', appears(false, 'private') === false)
check('truth: Draft(unpublished) + Public  → NOT shown', appears(false, 'public') === false)
check('truth: Published + Private → NOT shown', appears(true, 'private') === false)
check('truth: Published + Public  → shown', appears(true, 'public') === true)

// 2. Migration 059 — adds the visibility field, default private, NOT NULL, constrained to private/public.
check('migration adds visibility column (idempotent)', mig.includes('ADD COLUMN IF NOT EXISTS visibility'))
check('visibility is NOT NULL', /visibility TEXT NOT NULL/.test(mig))
check('default is private (existing Projects become private)', /DEFAULT 'private'/.test(mig))
check('constrained to private/public', /CHECK \(visibility IN \('private', 'public'\)\)/.test(mig))
check('migration touches no lifecycle/approval/planning/budget/execution', !/Planning|Budget|Execution|approv|current_step|status/i.test(mig.replace(/--.*$/gm, '')))

// 3. Store — visibility is a Project attribute; tolerant read defaults to private; owner-scoped write.
check('ProjectVisibility type (private|public)', store.includes("export type ProjectVisibility = 'private' | 'public'"))
check('getProjectVisibility reads the column', store.includes("select('visibility')"))
check('getProjectVisibility defaults to private when absent/error (never accidentally public)',
  /getProjectVisibility[\s\S]{0,400}return 'private'/.test(store) && store.includes("=== 'public' ? 'public' : 'private'"))
check('setProjectVisibility does an owner-scoped update', store.includes('.update({ visibility })'))
check('publication and visibility are independent (separate: is_published vs visibility)',
  store.includes('is_published') && store.includes('setProjectVisibility') && store.includes('publishProject'))

// 4. Local Activities query — published AND public AND approved (all three), and it degrades safely.
check('query requires is_published = true', cards.includes(".eq('is_published', true)"))
check('query requires visibility = public', cards.includes(".eq('visibility', 'public')"))
check('query requires approval (approved_at not null)', cards.includes(".not('approved_at', 'is', null)"))
check('no new Local Activity entity — reads the projects table', cards.includes(".from('projects')") && !cards.includes("from('local_activities'"))
check('degrades to empty when the column is absent (null projects → return [])', cards.includes('if (!projects) return []'))

// 5. Organizer action — validates, owner-gated, revalidates the catalog; changes nothing else.
check('setProjectVisibilityAction exists + validates the value', action.includes('export async function setProjectVisibilityAction') && action.includes("visibility !== 'private' && visibility !== 'public'"))
check('action is owner-gated (getProject) + authenticated', action.includes('getProject(supabase, projectId)') && action.includes("error: 'not_authenticated'"))
check('action revalidates the Local Activities catalog', action.includes('/${locale}/activities`'))
const visFnStart = action.indexOf('export async function setProjectVisibilityAction')
const visFnBody = action.slice(visFnStart, visFnStart + (action.slice(visFnStart).indexOf('\n}\n') + 1))
check('action does not touch approval/lifecycle/planning/budget', !/approveProject|publishProject|updateProject|persistEventPlan|Budget/.test(visFnBody))

// 6. Organizer UI — Private + Public (Local Activity) options with the specified copy; calls the action.
check('VisibilityPanel offers Private and Public (Local Activity)', panel.includes("title: 'Private'") && panel.includes("title: 'Public (Local Activity)'"))
check('Private copy: only invited participants can join', panel.includes('Only invited participants can join'))
check('Public copy: show in Local Activities so people can discover and join', panel.includes('Show this activity in Local Activities'))
check('panel calls the owner-gated action', panel.includes('setProjectVisibilityAction(projectId, next, locale)'))

// 7. Wired into the Project workspace (publication section), loading the tolerant default.
check('workspace loads visibility + renders the VisibilityPanel', page.includes('getProjectVisibility(supabase, projectId)') && page.includes('<VisibilityPanel'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
