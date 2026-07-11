// OPE Agent — verdict contract + DETERMINISTIC FALLBACK.
//
// Product architecture:  user input → AI Agent → structured verdict → deterministic action.
// The AI Agent (lib/ai/ope-agent.ts) is the FIRST decider on every request. This module owns
// the shared verdict contract and provides the deterministic fallback used ONLY when the AI is
// unavailable or returns invalid JSON. It is LLM-free (no OpenAI import) so it stays safe to call
// from anywhere, and it never decides ahead of the AI — it is the safety net behind it.

import { recognizeScenario, assessConceptEntry, runConceptFunnel } from '@/lib/ope/concept-funnel'

/**
 * The Agent's verdict on a request:
 *  - discovery_required      — too vague/emotional to plan; no plannable anchor. NO WSH, NO plan.
 *  - interpretation_required — real intent, but it must be interpreted into a WSH first.
 *  - sufficient_data         — enough data to plan once required fields are confirmed.
 *  - plan_ready              — a usable scenario/WSH already exists; run the deterministic planner.
 *  - infeasible              — cannot be realised as an activity. NO WSH, NO plan.
 *  - out_of_scope            — not an activity/event request at all. NO WSH, NO plan.
 */
export type OpeAgentVerdict =
  | 'discovery_required'
  | 'interpretation_required'
  | 'sufficient_data'
  | 'plan_ready'
  | 'infeasible'
  | 'out_of_scope'

export const OPE_AGENT_VERDICTS: readonly OpeAgentVerdict[] = [
  'discovery_required',
  'interpretation_required',
  'sufficient_data',
  'plan_ready',
  'infeasible',
  'out_of_scope',
] as const

/** Structured fields the caller may already have (e.g. from a detail step). All optional. */
export interface OpeAgentFields {
  category?: string | null
  guestCount?: number | null
  adults?: number | null
  kids?: number | null
  venueType?: string | null
  budget?: number | null
  timeframe?: string | null
}

/** One turn of the ongoing discovery conversation (oldest → newest). */
export interface OpeAgentTurn {
  role: 'organizer' | 'user'
  content: string
}

export interface OpeAgentInput {
  /** The raw user text — the primary signal (the original idea). */
  rawText: string
  /** Optional structured fields if the flow already collected them. */
  fields?: OpeAgentFields | null
  /** Discovery history — prior organizer/user turns. The Organizer must use ALL of it. */
  conversation?: OpeAgentTurn[] | null
  /** Route locale (e.g. 'ru'). AI responses are written in this language; ignored by the deterministic path. */
  locale?: string | null
}

/**
 * The effective request text the deterministic layer reasons over: the original idea plus every
 * USER answer from the discovery conversation, joined. As answers accumulate, anchors/category
 * grow — so multi-turn discovery converges (discovery_required → interpretation/plan) naturally.
 */
export function effectiveRequestText(rawText: string, conversation?: OpeAgentTurn[] | null): string {
  const answers = (conversation ?? []).filter((t) => t.role === 'user').map((t) => t.content)
  return [rawText, ...answers].map((s) => (s ?? '').trim()).filter(Boolean).join('. ')
}

/** The structured verdict. The AI returns the first 9 fields; `source` is attached by the caller. */
export interface OpeAgentResult {
  verdict: OpeAgentVerdict
  /** 0..1 — the Agent's confidence in the verdict. */
  confidence: number
  /** Short reason for the verdict (machine/diagnostic, not user copy). */
  reason: string
  /** What the user most likely means (proposed, never asserted as fact), or null. */
  interpretation: string | null
  /** 2-5 concrete directions/concepts to offer the user BEFORE any questions ([] only when truly N/A). */
  directions: string[]
  /** What is missing before planning can proceed ([] when none). */
  missingFields: string[]
  /** Clarifying questions — shown AFTER interpretation + directions, never on their own (max 3). */
  discoveryQuestions: string[]
  /** A short operational summary of what is understood, or null. */
  operationalSummary: string | null
  /** A WSH draft (interpretation_required only); null when WSH must not be drafted. */
  whatShouldHappenDraft: string | null
  /** Whether the flow may now DRAFT a "what should happen". False blocks WSH invention. */
  mayDraftWsh: boolean
  /** Whether the deterministic planner may run. (The approved-WSH gate still applies.) */
  mayRunPlanner: boolean
  /** Where the verdict came from. */
  source?: 'ai' | 'deterministic'
}

const DISCOVERY_QUESTIONS = [
  'What should actually happen — what will people do?',
  'Who is it for, and roughly how many?',
  'Where and when, even approximately?',
]

/**
 * Enforce the product rules on a verdict's permissions, regardless of where it came from. The
 * verdict is authoritative; the permission booleans are derived from it so an AI (or a bug)
 * can never grant more than the rules allow. discovery/out_of_scope/infeasible also strip any
 * WSH draft so it can never leak into a blocked state.
 */
export function enforceVerdictRules(r: OpeAgentResult): OpeAgentResult {
  switch (r.verdict) {
    case 'discovery_required':
    case 'out_of_scope':
    case 'infeasible':
      return { ...r, mayDraftWsh: false, mayRunPlanner: false, whatShouldHappenDraft: null }
    case 'interpretation_required':
      return { ...r, mayDraftWsh: true, mayRunPlanner: false }
    case 'sufficient_data':
    case 'plan_ready':
      return { ...r, mayDraftWsh: true, mayRunPlanner: true }
    default:
      return { ...r, mayDraftWsh: false, mayRunPlanner: false, whatShouldHappenDraft: null }
  }
}

function deterministic(partial: Omit<OpeAgentResult, 'source'>): OpeAgentResult {
  return enforceVerdictRules({ ...partial, source: 'deterministic' })
}

/** Concept directions + a likely interpretation, drawn from the existing deterministic Concept
 * Funnel so discovery is NEVER questions-only. Returns up to 5 directions. Exported so the AI
 * path can backfill thin/empty model directions with the same deterministic source. */
export function conceptHints(text: string): { interpretation: string | null; directions: string[] } {
  const funnel = runConceptFunnel(text)
  return {
    interpretation: funnel.concept_options[0]?.interpretation ?? null,
    directions: funnel.concept_options.slice(0, 5).map((o) => o.title),
  }
}

function discovery(text: string, reason: string, missing: string[]): OpeAgentResult {
  const { interpretation, directions } = conceptHints(text)
  return deterministic({
    verdict: 'discovery_required',
    confidence: 0.5,
    reason,
    interpretation,
    directions, // offer concepts first…
    missingFields: missing,
    discoveryQuestions: DISCOVERY_QUESTIONS.slice(0, 3), // …then at most 3 questions
    operationalSummary: null,
    whatShouldHappenDraft: null,
    mayDraftWsh: false,
    mayRunPlanner: false,
  })
}

/**
 * Deterministic FALLBACK verdict — used only when the AI Agent is unavailable or invalid.
 * Pure and side-effect-free (no auth, no network, no AI); safe to call from server actions and
 * tests. Reuses the existing OPE signals; it is the safety net behind the AI, never ahead of it.
 */
export function assessRequest(input: OpeAgentInput): OpeAgentResult {
  // Reason over the idea PLUS every discovery answer so multi-turn discovery converges.
  const text = effectiveRequestText(input?.rawText ?? '', input?.conversation).trim()

  // No request text → nothing to plan; never invent an outcome from emptiness.
  if (!text) return discovery(text, 'no_request_text', ['what_should_happen', 'who', 'where'])

  // A usable scenario already exists (itinerary / narrative / operationally-clear brief).
  const rec = recognizeScenario(text)
  if (rec.recognized) {
    return deterministic({
      verdict: 'plan_ready',
      confidence: 0.7,
      reason: `scenario_recognized:${rec.source}`,
      interpretation: rec.story ?? null,
      directions: [],
      missingFields: [],
      discoveryQuestions: [],
      operationalSummary: rec.story ?? null,
      whatShouldHappenDraft: null,
      mayDraftWsh: true,
      mayRunPlanner: true,
    })
  }

  // Structured fields already carry enough to plan (category + headcount).
  const f = input.fields
  if (f && f.category != null && f.guestCount != null) {
    return deterministic({
      verdict: 'sufficient_data',
      confidence: 0.6,
      reason: 'structured_fields_present',
      interpretation: null,
      directions: [],
      missingFields: [],
      discoveryQuestions: [],
      operationalSummary: null,
      whatShouldHappenDraft: null,
      mayDraftWsh: true,
      mayRunPlanner: true,
    })
  }

  const a = assessConceptEntry(text)

  // No plannable anchor at all — too vague/emotional to draft from. Drafting would INVENT the
  // outcome → Discovery required. Still offer interpretation + concept directions, never just questions.
  if (a.category == null && a.anchors === 0) {
    return discovery(text, 'no_plannable_anchor', ['what_should_happen', 'who', 'where'])
  }

  // Real intent + at least one anchor/category but no usable scenario yet → must be interpreted
  // into a "what should happen" (which the user approves) before any plan. Offer concept directions.
  const { interpretation, directions } = conceptHints(text)
  return deterministic({
    verdict: 'interpretation_required',
    confidence: 0.5,
    reason: a.category != null ? 'category_without_scenario' : `anchors:${a.anchors}`,
    interpretation,
    directions,
    missingFields: ['what_should_happen'],
    discoveryQuestions: [],
    operationalSummary: null,
    whatShouldHappenDraft: null,
    mayDraftWsh: true,
    mayRunPlanner: false,
  })
}
