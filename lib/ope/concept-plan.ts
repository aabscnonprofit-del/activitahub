// Concept-Funnel → Plan orchestrator (see docs/OPE_CONCEPT_FUNNEL_V1.md).
//
// Sequences the new Concept Funnel pre-stage ahead of the UNCHANGED planning pipeline:
//
//   raw idea → Concept Funnel → (user selects/refines | bypass) → parseEventText → generatePlan
//
// On a vague/themed idea the funnel asks for a concept choice FIRST and returns no plan.
// On an operationally-clear brief (or once a concept is chosen) it hands off to the
// existing deterministic path. generatePlan still runs its own Coverage + Clarification
// stages afterwards — the funnel does NOT replace them. This module imports the planner;
// it is a leaf (nothing else imports it), so there is no cycle and no existing code path
// changes behaviour.

import { runConceptFunnel, selectConcept, applyConceptToText, type ConceptFunnelResult } from './concept-funnel'
import { parseEventText } from './request-text'
import { generatePlan, type PlanGenerationResult } from './index'
import type { PlannerInput, PlannerLocation } from './types'

export type IdeaPlanResult =
  // Funnel is waiting for the user to pick/refine a concept — no plan yet, by design.
  | { stage: 'concept'; funnel: ConceptFunnelResult; input: null; plan: null }
  // Bypassed or concept chosen — handed to the normal pipeline. input is null when the
  // operational details are still incomplete (the caller routes to clarification as usual).
  | { stage: 'plan'; funnel: ConceptFunnelResult; input: PlannerInput | null; plan: PlanGenerationResult | null }

/**
 * Plan from a raw idea, running the Concept Funnel first.
 * - No `selection` and the idea needs a concept → returns stage 'concept' (options, no plan).
 * - `selection` given (or the idea bypasses the funnel) → continues to the existing pipeline.
 * The chosen concept is captured on the funnel result and folded into the request text; it
 * carries the DIRECTION forward without altering the deterministic plan's structured fields.
 */
export function planFromIdea(
  request: string,
  location: PlannerLocation,
  opts: { selection?: number | string } = {},
): IdeaPlanResult {
  let funnel = runConceptFunnel(request)

  if (funnel.status === 'concept_selection_needed') {
    if (opts.selection == null) return { stage: 'concept', funnel, input: null, plan: null }
    funnel = selectConcept(funnel, opts.selection)
    if (funnel.status !== 'concept_selected') return { stage: 'concept', funnel, input: null, plan: null }
  }

  const text = funnel.selected_concept
    ? applyConceptToText(funnel.original_request, funnel.selected_concept)
    : funnel.original_request

  const input = parseEventText(text, location).input
  const plan = input ? generatePlan(input) : null
  return { stage: 'plan', funnel, input, plan }
}
