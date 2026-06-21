'use server'

import { createClient } from '@/lib/supabase/server'
import { generatePlan } from '@/lib/ope'
import type { PlannerInput } from '@/lib/ope/types'
import { plannerInputSchema as schema } from '@/lib/ope/validation'
import { runConceptFunnelAI, composeWhatShouldHappen } from '@/lib/ai/concept-generation'
import { recognizeScenario, assessConceptEntry, type ConceptFunnelResult, type ScenarioSource } from '@/lib/ope/concept-funnel'
import { extractFromText } from '@/lib/ope/request-text'
import { planFromIdeaCore } from '@/lib/ope/plan-from-idea'

// Idea-plan types + the pure planning core live in lib/ope/plan-from-idea.ts (no auth/billing).
export type { IdeaDetails, IdeaPlanPayload, GeneratePlanResult } from '@/lib/ope/plan-from-idea'
import type { IdeaPlanPayload, GeneratePlanResult } from '@/lib/ope/plan-from-idea'

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

  // Discovery gate: a request with NO plannable anchor (no category AND no structured
  // signals) is too vague/emotional to draft a "what should happen" from — doing so would
  // INVENT the outcome. Stop here and require Discovery: return scenario_needed with a NULL
  // WSH (no draft), which the downstream WSH gate keeps un-plannable until the user supplies
  // real content. (Generators, request path, and engine are unchanged.)
  const entry = assessConceptEntry(text)
  if (entry.category == null && entry.anchors === 0) {
    return { ok: true, funnel, prefill, scenario: { status: 'scenario_needed', whatShouldHappen: null, source: null } }
  }

  const draft = await composeWhatShouldHappen(text)
  return { ok: true, funnel, prefill, scenario: { status: 'scenario_needed', whatShouldHappen: draft, source: null } }
}

/**
 * Step 2 — plan from the idea (server action). Thin gate over the pure planning core
 * (lib/ope/plan-from-idea.ts): requires a signed-in user and consumes ONE active One Event
 * License on a delivered plan_ready plan. The planning itself is unchanged.
 */
export async function generateFromIdeaAction(payload: IdeaPlanPayload): Promise<GeneratePlanResult> {
  // Cheap WSH gate first (no auth needed): NO Event Plan before an approved "what should happen".
  if (!(payload.approvedWhatShouldHappen ?? '').trim()) {
    return { ok: false, error: 'what_should_happen_required' }
  }

  // Paid generation requires a signed-in user — the One Event License is owned by a profile.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'sign_in_required' }

  const res = await planFromIdeaCore(payload)

  // A ready plan is the paid deliverable: consume ONE active One Event License (atomic RPC;
  // owner can't write the table directly). Only on plan_ready — clarification/handoff is free.
  // Distinguish the two failure modes (NEVER deliver the plan in either):
  //   * RPC error (function missing / permission / DB error) → TECHNICAL failure, not a
  //     license verdict → 'generation_failed'. (Treating it as "no license" would wrongly
  //     tell a paying user to buy again, e.g. if migration 040 isn't applied.)
  //   * RPC ok but NULL → the user genuinely has no active license → 'event_license_required'.
  if (res.ok && res.result.status === 'plan_ready') {
    const { data: licenseId, error } = await supabase.rpc('consume_event_license')
    if (error) return { ok: false, error: 'generation_failed' }
    if (!licenseId) return { ok: false, error: 'event_license_required' }
  }
  return res
}
