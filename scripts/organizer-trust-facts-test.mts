// Organizer Trust Facts — contract test.
//
// The Organizer Page shows OBJECTIVE facts (Organizer since / Public Activities / Completed Activities /
// Verification) derived from existing public data — never ratings/reviews/score/reputation/level. Asserts real
// data or safe placeholders (no invented dates/counts), and no new schema. Source analysis. Reads source only.
//
//   Run:  npx tsx scripts/organizer-trust-facts-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const view = read('../components/organizer/OrganizerPublicView.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Organizer Facts section exists.
check('Organizer Facts section present', view.includes('Organizer facts'))

// 2. Organizer since — real member_since date, formatted, with a placeholder fallback (never invented).
check('Organizer since uses the existing member_since date', view.includes('monthYear(org.member_since'))
check('Organizer since falls back to a placeholder (no invented date)', view.includes("organizerSince ?? 'Coming soon'"))
check('date formatter is deterministic + returns null on no/invalid date', view.includes('getUTCMonth()') && /if \(!iso\) return null/.test(view) && view.includes('Number.isNaN(d.getTime())'))

// 3. Public Activities — the count of published public Projects (the same list the page already filters).
check('Public Activities = the published-public activities count', view.includes("label: 'Public Activities'") && view.includes('String(activities.length)'))

// 4. Completed Activities — placeholder only (no reliable model; never estimated/inferred).
check('Completed Activities shows "Coming soon" (not estimated)', view.includes("label: 'Completed Activities'") && /Completed Activities'[\s\S]{0,40}'Coming soon'/.test(view))

// 5. Verification — existing certified field only (no new verification system).
check('Verification uses the existing certified field', view.includes("label: 'Verification'") && view.includes("org.certified ? 'Verified' : 'Not verified'"))

// 6. Facts only — no ratings/reviews/score/reputation/level/stars/percentages/gamification.
const codeOnly = view.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
check('no rating/review/reputation/level/score/stars/percentage/gamification', !/rating|review|reputation|\blevel\b|\bscore\b|\bstars?\b|percentage|gamif/i.test(codeOnly))

// 7. Read-only projection — no new schema/migration, no reputation/score tables.
check('no new migration for trust facts', (() => { try { read('../supabase/migrations/063_organizer_trust.sql'); return false } catch { return true } })())
check('no reputation/score/trust-score/organizer-level construct introduced', !/reputation|trust_score|organizer_level|score_table|review_aggregat/i.test(codeOnly))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
