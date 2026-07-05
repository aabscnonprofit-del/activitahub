// Organizer Capacity model — levels, thresholds, gate evaluation contract test.
//
//   Run:  npx tsx scripts/capacity-model-test.mts

import {
  CAPACITY_MAX, CAPACITY_LEVELS, DEFAULT_CAPACITY_LEVEL, isCapacityLevel,
  maxParticipantsForLevel, levelCoversCount, minimumLevelForCount, evaluateCapacityGate,
} from '../lib/capacity/model'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Levels + thresholds exactly as specified.
check('levels 1..4', CAPACITY_LEVELS.join(',') === '1,2,3,4')
check('thresholds: L1=20, L2=100, L3=500, L4=unlimited(null)', CAPACITY_MAX[1] === 20 && CAPACITY_MAX[2] === 100 && CAPACITY_MAX[3] === 500 && CAPACITY_MAX[4] === null)
check('default level is 1', DEFAULT_CAPACITY_LEVEL === 1)
check('guard', isCapacityLevel(3) && !isCapacityLevel(5) && !isCapacityLevel('2'))
check('maxParticipantsForLevel', maxParticipantsForLevel(2) === 100 && maxParticipantsForLevel(4) === null)

// 2. levelCoversCount — boundary inclusive; unlimited covers all.
check('L1 covers 20 not 21', levelCoversCount(1, 20) && !levelCoversCount(1, 21))
check('L3 covers 500 not 501', levelCoversCount(3, 500) && !levelCoversCount(3, 501))
check('L4 covers a huge count', levelCoversCount(4, 100000))

// 3. minimumLevelForCount.
check('min level: 20→1, 21→2, 100→2, 101→3, 500→3, 501→4', [minimumLevelForCount(20), minimumLevelForCount(21), minimumLevelForCount(100), minimumLevelForCount(101), minimumLevelForCount(500), minimumLevelForCount(501)].join(',') === '1,2,2,3,3,4')

// 4. Gate: within limit → allowed.
{
  const g = evaluateCapacityGate(1, 15)
  check('L1 organizer, 15 participants → allowed (within_capacity)', g.allowed && g.reason === 'within_capacity' && g.requiredLevel === null)
}
// 5. Gate: exceeding → blocked, with the required level for the upgrade path.
{
  const g = evaluateCapacityGate(1, 50)
  check('L1 organizer, 50 participants → blocked (exceeds_capacity), requiredLevel 2', !g.allowed && g.reason === 'exceeds_capacity' && g.requiredLevel === 2 && g.organizerMax === 20)
  const g2 = evaluateCapacityGate(2, 600)
  check('L2 organizer, 600 participants → blocked, requiredLevel 4', !g2.allowed && g2.requiredLevel === 4)
}
// 6. Gate: unlimited organizer → always allowed.
check('L4 organizer, 100000 participants → allowed', evaluateCapacityGate(4, 100000).allowed)
// 7. Gate: unknown count never blocks (validates organizer eligibility only).
{
  const g = evaluateCapacityGate(1, null)
  check('unknown participant count → allowed (unknown_count), never blocks', g.allowed && g.reason === 'unknown_count')
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
