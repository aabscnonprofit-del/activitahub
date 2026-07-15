// Planner session persistence — the active Planner session (idea, Discovery conversation, current step,
// unsent answer, FED/planning progress) must survive a component remount, e.g. the locale switcher
// navigating /en/plan-an-event → /ru/plan-an-event. State lives in useState (in-memory), so without
// persistence a remount wipes it. This test asserts PlannerClient persists to and restores from
// sessionStorage, gates the save so it never clobbers a stored session before restore, and that
// "Start over" (resetAll) intentionally clears it.
//
//   Run:  npx tsx scripts/planner-session-persistence-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const code = read('../components/planner/PlannerClient.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// ── Persistence mechanism exists and is client-safe ──────────────────────────────────────────────────────
check('uses sessionStorage as the persistence mechanism', code.includes('window.sessionStorage'))
check('load/save/clear helpers are defined', code.includes('function loadPlannerSession(') && code.includes('function savePlannerSession(') && code.includes('function clearPlannerSession('))
check('storage access is SSR-guarded (typeof window)', code.includes("typeof window === 'undefined'"))
check('storage access is best-effort (never throws)', (code.match(/try \{/g) ?? []).length >= 3 && code.includes('catch'))

// ── Restore on mount, gated so initial render never clobbers a stored session ───────────────────────────
check('restores the session on mount via loadPlannerSession', code.includes('loadPlannerSession()'))
check('has a hydration gate (hydrated state)', code.includes('const [hydrated, setHydrated] = useState(false)') && code.includes('setHydrated(true)'))
check('save effect is skipped until hydrated (no clobber)', code.includes('if (!hydrated) return'))
check('save effect calls savePlannerSession', code.includes('savePlannerSession({'))

// ── The minimum required session fields are preserved ───────────────────────────────────────────────────
for (const field of ['idea', 'discovery', 'answer', 'step', 'whatShouldHappen', 'eventPlanV2', 'projectId']) {
  check(`snapshot preserves "${field}"`, new RegExp(`\\b${field}\\b`).test(code.split('savePlannerSession({')[1]?.split('})')[0] ?? ''))
  check(`restore sets "${field}"`, code.includes(`if (s.${field} !== undefined)`))
}

// ── Start over intentionally clears the session ──────────────────────────────────────────────────────────
check('resetAll (Start over) clears the persisted session', /function resetAll\(\)[\s\S]*clearPlannerSession\(\)[\s\S]*\}/.test(code))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
