// Future Event Description V1 — Slice 1 (AI-driven).
//
// Behavior per docs/FUTURE_EVENT_DESCRIPTION_SPEC.md (authoritative). This slice implements ONLY the stage
// between Discovery and Planning:
//   approved Statement of Understanding → AI writes a Future Event Description (the event as if already real)
//   → client reviews → approve (STOP) or reject+feedback (revise and return for approval).
//
// A Future Event Description describes the desired EXPERIENCE and result — what the event is, what happens,
// who it is for, what participants experience, and the emotional tone. It is implementation-independent.
// It is NOT a plan. It deliberately contains NO budget, vendors, timeline, schedule, logistics, resources,
// staffing, tasks, or checklists — those belong exclusively to Planning. Planning is entirely out of scope
// for this slice: on approval, the flow STOPS.

import OpenAI from 'openai'
import { z } from 'zod'

export type FutureEventDescriptionResult =
  | { status: 'awaiting_approval'; futureEventDescription: string }
  | { status: 'approved'; futureEventDescription: string }
  // No FED was produced. The dedicated FED AI was unavailable, errored, returned invalid output, or drifted
  // into planning content. The module never fabricates a description; the caller knows no FED exists.
  | { status: 'generation_failed'; reason: 'ai_unavailable' | 'invalid_output' | 'planning_content' }

/** The client's review of a Future Event Description. */
export interface ClientDecision {
  decision: 'approve' | 'reject'
  /** Optional feedback when rejecting — used to revise the description. */
  feedback?: string
}

export interface DescribeFutureEventInput {
  /** The approved Statement of Understanding from Discovery. */
  statementOfUnderstanding: string
  /** The description the client is reviewing, when a decision is provided. */
  priorDescription?: string
  /** The client's review, if any. Absent on the first call. */
  clientDecision?: ClientDecision
}

/** What the AI is asked to write, under the product prompt. */
interface GenerationContext {
  statementOfUnderstanding: string
  priorDescription: string | null
  rejectionFeedback: string | null
}

export interface DescribeFutureEventOptions {
  /** Test/production seam: return the raw model JSON for a context, bypassing OpenAI. */
  complete?: (ctx: GenerationContext) => Promise<string | null>
  /** Force-run even when env gating is off (used with `complete` in tests). */
  forceEnabled?: boolean
}

// The strict product prompt — the FED behavior the AI must follow. Derived from
// FUTURE_EVENT_DESCRIPTION_SPEC.md; it is the contract, not the code.
const SYSTEM_PROMPT =
  'You are ActivLife Hub. You are given an APPROVED Statement of Understanding — what the client wants to ' +
  'make real. Write a Future Event Description: a warm, plain-language description of the future event AS IF ' +
  'IT HAS ALREADY HAPPENED.\n\n' +
  'Describe: what the event is; what happens; who it is for; what participants experience; the desired ' +
  'result; and the emotional tone. Describe the EXPERIENCE and the result — never how to build it.\n\n' +
  'Absolute rules:\n' +
  '- Stay faithful to the Statement of Understanding. Do not invent a different event.\n' +
  '- NEVER include budget, prices, vendors, timeline, schedule, itinerary, logistics, resources, staffing, ' +
  'tasks, or checklists. Those belong to Planning, not here. This is not a plan.\n' +
  '- Do not decide details the client did not express (exact head count, date, place, cost). Describe the ' +
  'event they want and leave those open.\n' +
  '- If a prior description and client feedback are provided, revise the prior description to address the ' +
  'feedback, keeping the underlying intent unless the feedback changes it.\n\n' +
  'Return ONLY the structured JSON with a single field: futureEventDescription.'

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    futureEventDescription: { type: 'string', description: 'The future event described as if it had already become real. Experience and result only — no operational planning.' },
  },
  required: ['futureEventDescription'],
} as const

const responseZ = z.object({ futureEventDescription: z.string().max(4000) })

// Operational planning content that a Future Event Description must never contain (spec §6). A guard on the
// OUTPUT: if the AI drifts into planning, the generation is treated as FAILED — the FED is only ever the
// dedicated FED AI's planning-free output, and the module never fabricates one.
const PLANNING_CONTENT =
  /\bbudget\b|\bvendors?\b|\btimeline\b|\bschedule\b|\bitinerary\b|\blogistics\b|\bstaffing\b|\bcheck ?list\b|\binvoice\b|\btask list\b|\$\s?\d/i

function isPlanningFree(text: string): boolean {
  return !PLANNING_CONTENT.test(text)
}

function aiEnabled(): boolean {
  return process.env.OPE_AI_AGENT_ENABLED === 'true' && !!process.env.OPENAI_API_KEY
}

async function callModel(ctx: GenerationContext): Promise<string | null> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 10_000, maxRetries: 1 })
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ statementOfUnderstanding: ctx.statementOfUnderstanding, priorDescription: ctx.priorDescription, rejectionFeedback: ctx.rejectionFeedback }) },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'future_event_description', strict: true, schema: RESPONSE_SCHEMA } },
  })
  return completion.choices[0]?.message?.content ?? null
}

async function getRaw(ctx: GenerationContext, opts: DescribeFutureEventOptions): Promise<string | null> {
  if (opts.complete) return opts.complete(ctx)
  if (!opts.forceEnabled && !aiEnabled()) return null
  try {
    return await callModel(ctx)
  } catch {
    return null
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * One Future Event Description step. Without a client decision (or on rejection), the AI writes/revises the
 * description and returns it for approval. On approval, the reviewed description is accepted and the flow
 * STOPS — Planning is out of scope. The returned description never contains operational planning content.
 */
export async function describeFutureEvent(
  input: DescribeFutureEventInput,
  opts: DescribeFutureEventOptions = {},
): Promise<FutureEventDescriptionResult> {
  // Approval gate: the client approves the description under review → STOP. No regeneration, no Planning.
  if (input.clientDecision?.decision === 'approve') {
    const approved = (input.priorDescription ?? '').trim()
    if (approved) return { status: 'approved', futureEventDescription: approved }
    // "Approve" with nothing to approve is meaningless → fall through and produce a description first.
  }

  const ctx: GenerationContext = {
    statementOfUnderstanding: (input.statementOfUnderstanding ?? '').trim(),
    priorDescription: input.priorDescription?.trim() || null,
    rejectionFeedback:
      input.clientDecision?.decision === 'reject' ? input.clientDecision.feedback?.trim() || null : null,
  }

  // The Future Event Description is produced ONLY by the dedicated FED AI. If the AI is unavailable, errors,
  // returns invalid output, or drifts into planning content, we do NOT fabricate a FED — we return a
  // distinct failure state so the caller knows no FED was produced.
  const raw = await getRaw(ctx, opts)
  if (!raw) return { status: 'generation_failed', reason: 'ai_unavailable' }

  const parsed = responseZ.safeParse(safeJson(raw))
  if (!parsed.success) return { status: 'generation_failed', reason: 'invalid_output' }

  const fed = parsed.data.futureEventDescription.trim()
  if (!fed) return { status: 'generation_failed', reason: 'invalid_output' }
  if (!isPlanningFree(fed)) return { status: 'generation_failed', reason: 'planning_content' }

  return { status: 'awaiting_approval', futureEventDescription: fed }
}
