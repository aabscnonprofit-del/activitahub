// Planning Engine V2 — the engine boundary/interface (Stage 1 of the Planning Layer Migration).
//
// Per docs/IMPLEMENTATION_CONTRACT.md and the approved "Planning Engine V2 Product
// Specification". This file defines the SEAM that lets the legacy Planning Layer be replaced
// incrementally:
//
//   INPUT  : the Future Event Description (NOT PlannerInput)
//   OUTPUT : an EventPlanV2 (the approved conceptual outputs; NO legacy category model)
//
// Stage 2 implements the reasoning behind this boundary. It is DETERMINISTIC and uses NO language
// model (LLMs belong only to Discovery / Request Understanding). It is still wired into NO
// production path — current users receive exactly the same planning results as before (the legacy
// Planning Layer still plans). Connection to production happens in Stage 3+.
//
// Schedule (per the approved migration roadmap):
//   * Stage 3 — temporary Adapter A1 (EventPlanV2 -> legacy projection) is introduced THERE, not here.
// This file introduces NO adapter (Stages 1–2 require none).

import type { FutureEventDescription } from '@/lib/ope/future-event-description'
import type { EventPlanV2 } from './event-plan-v2'
import { reasonEventPlan } from './reasoning'

/**
 * Planning Engine V2 contract: turn an approved Future Event Description into a complete,
 * reviewable event plan, preserving the client's intention. Responsibility begins at an
 * approved FED and ends at a prepared EventPlanV2 (Spec §1) — it does not do discovery,
 * pricing-to-sell, scheduling, publishing, or commitments.
 */
export interface PlanningEngineV2 {
  plan(fed: FutureEventDescription): EventPlanV2
}

/**
 * Planning Engine V2 — deterministic, LLM-free reasoning from the approved Future Event
 * Description to a complete EventPlanV2. The same FED always produces the same EventPlanV2.
 * Not connected to production until a later migration stage.
 */
export const planningEngineV2: PlanningEngineV2 = {
  plan(fed: FutureEventDescription): EventPlanV2 {
    return reasonEventPlan(fed)
  },
}
