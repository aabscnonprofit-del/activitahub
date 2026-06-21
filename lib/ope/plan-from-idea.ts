// Pure idea → plan core (NO 'use server', NO auth, NO billing). The deterministic
// planning logic shared by the public planner action and the OPE test suites. The
// server action (lib/actions/planner.ts) wraps this with auth + One Event License
// consumption; keeping the core here means those concerns can't leak into a callable
// server action, and the planning behaviour stays unit-testable.

import { generatePlan } from '@/lib/ope'
import type { PlanGenerationResult } from '@/lib/ope'
import type { PlannerInput, PlannerLocation } from '@/lib/ope/types'
import { plannerInputSchema as schema } from '@/lib/ope/validation'
import { understandEventText } from '@/lib/ai/request-understanding'
import { applyConceptToText, conceptRequirement, type ConceptOption } from '@/lib/ope/concept-funnel'
import { enrichInputWithWsh } from '@/lib/ope/wsh-signals'

/** Operational details the user confirms/completes after choosing a concept direction. */
export interface IdeaDetails {
  category: PlannerInput['category']
  guestCount: number
  adults?: number | null
  kids?: number | null
  venueType?: 'backyard_home' | 'public_park' | null
  budget?: number | null
  requirements?: string[]
  instructor?: 'have' | 'need' | null
  materials?: 'provided' | 'byo' | null
  recurrence?: PlannerInput['recurrence']
}

export interface IdeaPlanPayload {
  idea: string
  selectedConcept: ConceptOption | null
  /**
   * The approved "what should happen" — what happens + what people experience. Planning is
   * blocked until this is present. A selected concept ALONE does NOT satisfy the gate unless
   * it has been turned into this recorded, approved description.
   */
  approvedWhatShouldHappen: string | null
  details: IdeaDetails
  location: PlannerLocation
}

export type GeneratePlanResult =
  | { ok: true; result: PlanGenerationResult }
  | { ok: false; error: 'invalid_input' | 'generation_failed' | 'what_should_happen_required' | 'sign_in_required' | 'event_license_required' }

const dedupe = (xs: string[]): string[] => [...new Set(xs.map((s) => s.trim()).filter(Boolean))]

/**
 * Plan from the idea: WSH gate → fold concept/WSH into prose → AI understanding
 * (deterministic fallback) → overlay user-confirmed details (which win) → enrich with
 * WSH signals → run the UNCHANGED engine. No auth, no entitlement — see the action wrapper.
 */
export async function planFromIdeaCore(payload: IdeaPlanPayload): Promise<GeneratePlanResult> {
  const text = (payload.idea ?? '').trim()

  // "What should happen" first: NO Event Plan before an approved "what should happen" exists.
  const wsh = (payload.approvedWhatShouldHappen ?? '').trim()
  if (!wsh) {
    return { ok: false, error: 'what_should_happen_required' }
  }

  // Plan from the approved "what should happen" (+ the chosen concept's wording, if any).
  const base = payload.selectedConcept ? applyConceptToText(text, payload.selectedConcept) : text
  const enriched = `${base} — what should happen: ${wsh}`

  let aiBase: PlannerInput | null = null
  try {
    aiBase = await understandEventText(enriched, payload.location)
  } catch {
    aiBase = null
  }

  const d = payload.details
  const conceptReq = payload.selectedConcept ? [conceptRequirement(payload.selectedConcept)] : []
  const merged: PlannerInput = {
    category: d.category,
    guestCount: d.guestCount,
    ...(d.adults != null ? { adults: d.adults } : {}),
    ...(d.kids != null ? { kids: d.kids } : {}),
    venueType: d.venueType ?? aiBase?.venueType ?? null,
    budget: d.budget ?? aiBase?.budget ?? null,
    specialRequirements: dedupe([
      ...(d.requirements ?? []),
      ...(aiBase?.specialRequirements ?? []),
      ...conceptReq,
    ]).slice(0, 20),
    location: payload.location,
    ...(d.recurrence ? { recurrence: d.recurrence } : {}),
    ...(d.instructor ? { instructor: d.instructor } : {}),
    ...(d.materials ? { materials: d.materials } : {}),
  }

  // P-B: the approved WSH is a real planning input. Enrich deterministically (fills blank
  // venue/budget/headcount, adds typed requirements); user-entered details already won above.
  const parsed = schema.safeParse(enrichInputWithWsh(merged, wsh))
  if (!parsed.success) return { ok: false, error: 'invalid_input' }
  try {
    const result = generatePlan(parsed.data as PlannerInput)
    return { ok: true, result }
  } catch {
    return { ok: false, error: 'generation_failed' }
  }
}
