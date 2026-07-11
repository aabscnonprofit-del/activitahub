// Required operational facts — the deterministic capture that keeps guestCount (always) and
// instructor (class-type activities) available after the Details form was removed. These are the
// values the current architecture consumes (Planning Engine V2 reasoning + Organizer Capacity Gate),
// per the accepted Details-step architecture verification.
//
//   Run:  npx tsx scripts/required-facts-test.mts

import {
  readHeadcount,
  readBareCount,
  readInstructor,
  readInstructorAnswer,
  missingRequiredFact,
  CLASS_CATEGORIES,
} from '../lib/planning/required-facts.ts'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// ── readHeadcount: noun-anchored digits, lead-ins, number-words ───────────────────────
check('“20 guests” → 20', readHeadcount('a party for 20 guests') === 20)
check('“12 kids” → 12', readHeadcount('birthday for 12 kids') === 12)
check('“around 30 people” → 30', readHeadcount('around 30 people at the retreat') === 30)
check('“for 8” → 8', readHeadcount('a dinner for 8') === 8)
check('“twenty guests” → 20', readHeadcount('twenty guests are coming') === 20)
check('“a dozen kids” → 12', readHeadcount('a dozen kids') === 12)
check('“twenty five people” → 25', readHeadcount('about twenty five people') === 25)
check('no headcount stated → null', readHeadcount('an Antarctica-themed birthday party for my children') === null)
check('unrelated numbers are not a headcount', readHeadcount('a 2 hour class next month') === null)

// ── readBareCount: short direct answers to “how many?” ────────────────────────────────
check('bare “20” → 20', readBareCount('20') === 20)
check('“about 15” → 15', readBareCount('about 15') === 15)
check('“~12” → 12', readBareCount('~12') === 12)
check('“just 8 of us” → 8', readBareCount('just 8 of us') === 8)
check('“twenty” → 20', readBareCount('twenty') === 20)
check('“a couple” → 2', readBareCount('a couple') === 2)
check('empty answer → null', readBareCount('') === null)
check('non-numeric answer → null', readBareCount('not sure yet') === null)

// ── readInstructor: from anywhere in the request ──────────────────────────────────────
check('“need an instructor” → need', readInstructor('I need an instructor for the yoga class') === 'need')
check('“don’t have a teacher” → need', readInstructor("we don't have a teacher") === 'need')
check('“I’ll teach it myself” → have', readInstructor("I'll teach it myself") === 'have')
check('“bring my own instructor” → have', readInstructor('I will bring my own instructor') === 'have')
check('no instructor mention → null', readInstructor('a fitness class for 20 people') === null)

// ── readInstructorAnswer: short reply to “have your own, or include one?” ──────────────
check('“need one” → need', readInstructorAnswer('I need one') === 'need')
check('“no” → need', readInstructorAnswer('no') === 'need')
check('“have one” → have', readInstructorAnswer('we have one') === 'have')
check('“I’ll teach it” → have', readInstructorAnswer("I'll teach it") === 'have')
check('“yes” → have', readInstructorAnswer('yes') === 'have')
check('unrelated → null', readInstructorAnswer('maybe later') === null)

// ── missingRequiredFact: guests first, then instructor for class categories only ──────
check('guestCount missing → guests (any category)', missingRequiredFact('birthday', null, null) === 'guests')
check('class + guests known + instructor missing → instructor', missingRequiredFact('fitness_class', 20, null) === 'instructor')
check('non-class + instructor missing → not required (null)', missingRequiredFact('birthday', 20, null) === null)
check('class + both known → null', missingRequiredFact('art_class', 12, 'need') === null)
check('unknown category never demands instructor', missingRequiredFact(null, 20, null) === null)
check('all four class categories require instructor',
  ['fitness_class', 'art_class', 'language_class', 'workshop'].every((c) => CLASS_CATEGORIES.has(c as never)))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
