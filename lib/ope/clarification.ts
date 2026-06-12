// Clarification loop (light) — OPE intake (see docs/OPE_CLARIFICATION_ENGINE.md,
// docs/OPE_IMPLEMENTATION_READY.md §M1.4).
//
// Principle: UNKNOWN → ASK; never UNKNOWN → INVENT. Only ask questions whose answer
// can change the pattern match, the budget, the risk picture, or required resources
// — and never more than 3. Runs only on the supported (plan_ready) path, after the
// coverage gate.

import { patternOf } from './activities'
import type { ClarificationQuestion, PlannerInput } from './types'

const MAX_QUESTIONS = 3

export function assessClarification(input: PlannerInput): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = []
  const pattern = patternOf(input.category)

  // Meetup (networking) has no computed pricing — a target budget is the only budget
  // signal, so it must be known before we plan. (Changes: budget.)
  if (pattern === 'meetup' && input.budget == null) {
    questions.push({
      id: 'budget',
      field: 'budget',
      kind: 'number',
      question:
        'What is your target budget for this event? This activity type has no computed price estimate yet, so we use your number as the reference.',
      placeholder: '600',
      reason: 'budget',
    })
  }

  // Celebration venue drives outdoor-risk flags and several cost lines.
  // (Changes: risk + resources + budget.)
  if (pattern === 'celebration' && input.venueType == null) {
    questions.push({
      id: 'venue',
      field: 'venueType',
      kind: 'choice',
      question: 'Where will it be held?',
      options: [
        { value: 'backyard_home', label: 'Backyard / home' },
        { value: 'public_park', label: 'A public park' },
      ],
      reason: 'risk+budget',
    })
  }

  // Kids birthday: the child count sets supervision (safety) and party favours
  // (resources). (Changes: risk + resources.)
  if (input.category === 'birthday' && input.kids == null) {
    questions.push({
      id: 'kids',
      field: 'kids',
      kind: 'number',
      question: 'About how many children will attend? This sets supervision and party-favour planning.',
      placeholder: '10',
      reason: 'risk+resources',
    })
  }

  // Class (M3): instructor presence and materials each swing the budget. We never
  // invent them — if unknown, we ask. (Changes: budget + resources.)
  if (pattern === 'class') {
    if (input.instructor == null) {
      questions.push({
        id: 'instructor',
        field: 'instructor',
        kind: 'choice',
        question: 'Do you already have an instructor, or do you need to arrange one?',
        options: [
          { value: 'have', label: 'I have an instructor' },
          { value: 'need', label: 'I need one' },
        ],
        reason: 'budget',
      })
    }
    if (input.materials == null) {
      questions.push({
        id: 'materials',
        field: 'materials',
        kind: 'choice',
        question: 'Will you provide materials, or should participants bring their own?',
        options: [
          { value: 'provided', label: 'I provide materials' },
          { value: 'byo', label: 'Participants bring their own' },
        ],
        reason: 'budget+resources',
      })
    }
  }

  return questions.slice(0, MAX_QUESTIONS)
}
