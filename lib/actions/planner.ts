'use server'

import { generatePlan } from '@/lib/ope'
import type { PlanGenerationResult } from '@/lib/ope'
import type { PlannerInput, PlannerLocation } from '@/lib/ope/types'
import { plannerInputSchema as schema } from '@/lib/ope/validation'
import { runConceptFunnelAI, composeWhatShouldHappen } from '@/lib/ai/concept-generation'
import { understandEventText } from '@/lib/ai/request-understanding'
import { applyConceptToText, conceptRequirement, recognizeScenario, type ConceptFunnelResult, type ConceptOption, type ScenarioSource } from '@/lib/ope/concept-funnel'
import { extractFromText } from '@/lib/ope/request-text'

export type GeneratePlanResult =
  | { ok: true; result: PlanGenerationResult }
  | { ok: false; error: 'invalid_input' | 'generation_failed' | 'what_should_happen_required' }

/**
 * Public (no auth): validate the form input and run the OPE engine through the
 * Coverage / Complexity Gate. The result carries a `status` and `coverage`; a
 * `plan` is present only when `status === 'plan_ready'`.
 */
export async function generatePlanAction(raw: unknown): Promise<GeneratePlanResult> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }
  try {
    const result = generatePlan(parsed.data as PlannerInput)
    return { ok: true, result }
  } catch {
    return { ok: false, error: 'generation_failed' }
  }
}

// ── Idea-first entry (the primary public planner flow) ───────────────────────────────
// The user starts with a RAW IDEA, not a structured form. Step 1 (analyzeIdeaAction) runs
// the Concept Funnel — AI-first when enabled, deterministic otherwise — and returns concept
// options (or a bypass) plus a light prefill for the later detail step. Step 2
// (generateFromIdeaAction) runs AI understanding (deterministic fallback) over the idea +
// chosen concept, overlays the user-confirmed operational details, and runs the UNCHANGED
// engine. The Clarification Engine still runs inside generatePlan.

/** Deterministic field hints extracted from the idea, used to prefill the detail step. */
export interface IdeaPrefill {
  category: PlannerInput['category'] | null
  guestCount: number | null
  adults: number | null
  kids: number | null
  venueType: 'backyard_home' | 'public_park' | null
  budget: number | null
  timeframe: string | null
}

/**
 * "What should happen" state. `scenario_recognized` = a usable "what should happen" already
 * exists in the request (a provided itinerary/narrative, or an operationally-clear brief) →
 * `whatShouldHappen` is that story. `scenario_needed` = none yet → `whatShouldHappen` is a
 * request-specific DRAFT (AI-first, deterministic fallback) the user must approve or edit.
 */
export type ScenarioStatus = 'scenario_recognized' | 'scenario_needed'
export interface ScenarioState {
  status: ScenarioStatus
  /** The recognised story OR the draft "what should happen" to approve/edit. */
  whatShouldHappen: string | null
  source: ScenarioSource | null
}

export type AnalyzeIdeaResult =
  | { ok: true; funnel: ConceptFunnelResult; prefill: IdeaPrefill; scenario: ScenarioState }
  | { ok: false; error: 'empty_idea' }

/**
 * Step 1 — Scenario First. Before any planning, OPE checks whether a usable scenario already
 * exists in the request (recognizeScenario). If it does, it is RECOGNISED — no concepts are
 * offered. If not, the Concept Funnel CREATES one: its options are candidate scenarios the
 * user selects from. Operational details/clarification come only afterwards. No plan yet.
 */
export async function analyzeIdeaAction(idea: string): Promise<AnalyzeIdeaResult> {
  const text = (idea ?? '').trim()
  if (!text) return { ok: false, error: 'empty_idea' }
  const ext = extractFromText(text)
  const prefill: IdeaPrefill = {
    category: ext.category,
    guestCount: ext.guestCount,
    adults: ext.adults,
    kids: ext.kids,
    venueType: ext.venueType,
    budget: ext.budget,
    timeframe: ext.timeframe,
  }

  // A provided itinerary/narrative is recognised as an existing scenario — do NOT create one.
  const rec = recognizeScenario(text)
  if (rec.recognized && rec.source !== 'operational') {
    const funnel: ConceptFunnelResult = {
      original_request: text,
      detected_event_category: ext.category,
      concept_options: [],
      selected_concept: null,
      clarification_prompt: '',
      status: 'bypass_concept_funnel',
    }
    return { ok: true, funnel, prefill, scenario: { status: 'scenario_recognized', whatShouldHappen: rec.story, source: rec.source } }
  }

  // No "what should happen" provided → CREATE a request-specific draft (AI-first, deterministic
  // fallback) for the user to approve/edit. An operationally-clear brief is recognised and the
  // brief itself is the usable "what should happen". The Concept Funnel options are returned only
  // as optional inspiration — they do NOT define "what should happen".
  const funnel = await runConceptFunnelAI(text)
  if (funnel.status === 'bypass_concept_funnel') {
    return { ok: true, funnel, prefill, scenario: { status: 'scenario_recognized', whatShouldHappen: text, source: 'operational' } }
  }
  const draft = await composeWhatShouldHappen(text)
  return { ok: true, funnel, prefill, scenario: { status: 'scenario_needed', whatShouldHappen: draft, source: null } }
}

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
   * blocked until this is present. Recorded from a recognised request, or from a chosen
   * concept (see deriveWhatShouldHappen). A selected concept ALONE does NOT satisfy the gate
   * unless it has been turned into this recorded, approved description.
   */
  approvedWhatShouldHappen: string | null
  details: IdeaDetails
  location: PlannerLocation
}

const dedupe = (xs: string[]): string[] => [...new Set(xs.map((s) => s.trim()).filter(Boolean))]

/**
 * Step 2 — plan from the idea. Folds the chosen concept into the prose, runs AI
 * understanding (deterministic fallback) to enrich soft requirements, overlays the
 * user-confirmed operational details (which win), validates, and runs the UNCHANGED engine.
 */
export async function generateFromIdeaAction(payload: IdeaPlanPayload): Promise<GeneratePlanResult> {
  const text = (payload.idea ?? '').trim()

  // "What should happen" first: NO Event Plan before an approved "what should happen" exists.
  // A concept selection ALONE is not enough — it must have been turned into this recorded,
  // approved description (deriveWhatShouldHappen). Operational clarification still runs later,
  // inside generatePlan; this gate is only about "what should happen", not the operations.
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

  const parsed = schema.safeParse(merged)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }
  try {
    const result = generatePlan(parsed.data as PlannerInput)
    return { ok: true, result }
  } catch {
    return { ok: false, error: 'generation_failed' }
  }
}
