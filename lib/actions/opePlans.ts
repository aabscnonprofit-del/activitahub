'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generatePlan } from '@/lib/ope'
import type { PlannerInput } from '@/lib/ope/types'
import { plannerInputSchema } from '@/lib/ope/validation'
import { mapRequestToPlannerInput, mapRequestToApproaches, assessRequestReadiness, buildAssessment, fillClarificationDefaults, type RequestLike } from '@/lib/ope/request-plan'
import { understandRequest } from '@/lib/ai/request-understanding'
import { buildProposal, type ProposalViewModel } from '@/lib/workspace/proposal'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import {
  canEditBudget, canEditInputs, canEditPrep, findTransition,
} from '@/lib/workspace/lifecycle'
import type {
  ActionResult, CreatePlanFromRequestResult, GenerateApproachesResult, OpePlanCorrections, OpePlanLogEntry, OpePlanPhase, OpePlanPrepState, SavedPlan,
} from '@/lib/types'

// ── OPE Organizer Workspace — PlanStore server actions (M5 WP1 T3) ───────────
// Organizer-owned CRUD over saved OPE plans (`ope_plans`, migration 021). The
// deterministic engine (generatePlan) stays the source of truth for `result`;
// `input` is the source of truth for recompute. Ownership is enforced by both RLS
// and an explicit organizer_id match. No engine changes; the public consumer
// planner is untouched.

const TABLE = 'ope_plans'
const SELECT = '*'

/** Create a plan: authenticate, run generatePlan, persist a fresh SavedPlan. */
export async function createPlan(title: string | null, rawInput: unknown): Promise<ActionResult<SavedPlan>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const parsed = plannerInputSchema.safeParse(rawInput)
  if (!parsed.success) return { error: 'invalid_input' }

  let result
  try {
    result = generatePlan(parsed.data as PlannerInput)
  } catch {
    return { error: 'generation_failed' }
  }

  // Every plan carries a deterministic assessment (Task #3) — for non-ready results
  // it reflects 'none' coverage / no budget, refreshed on the next recompute.
  const assessment = buildAssessment(parsed.data as PlannerInput, result)

  // Lifecycle (WP8): a new plan is a Draft and auto-advances to Planning the moment
  // the engine returns plan_ready. Non-ready results (clarify / handoff) stay Draft.
  const ready = result.status === 'plan_ready'
  const phase: OpePlanPhase = ready ? 'planning' : 'draft'
  const lifecycle_log: OpePlanLogEntry[] = ready
    ? [{ from: 'draft', to: 'planning', at: new Date().toISOString(), by: user.id, forced: false, auto: true }]
    : []

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      organizer_id: user.id,
      title: title?.trim() || null,
      input: parsed.data,
      result,
      corrections: {},
      prep_state: {},
      phase,
      lifecycle_log,
      version: 1,
      assessment,
    })
    .select(SELECT)
    .single()

  if (error || !data) return { error: 'save_failed' }
  revalidatePath('/dashboard')
  return { success: true, data: data as SavedPlan }
}

/**
 * Customer Request → OPE Plan (Task #1). Generates a deterministic OPE plan for a
 * request the organizer is matched to, links it via source_request_id, and stores
 * a preliminary assessment. Idempotent: re-running returns the existing plan rather
 * than generating a duplicate. Unsupported categories / non-ready coverage do NOT
 * persist a plan — they return a structured coverage response. No engine change;
 * the persisted row is an ordinary ope_plans plan, so editing/budget/proposal/
 * lifecycle all work on it unchanged.
 */
export async function createPlanFromRequest(requestId: string): Promise<CreatePlanFromRequestResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, kind: 'error', error: 'not_authenticated' }

  // Entitlement: same gate as sending a proposal (certified + live access window/subscription).
  if (!(await userHasOrganizerAccess(supabase, user.id))) {
    return { ok: false, kind: 'error', error: 'no_access' }
  }

  // Permission: the organizer must have been matched to this request.
  const { data: match } = await supabase
    .from('request_matches')
    .select('id')
    .eq('request_id', requestId)
    .eq('organizer_id', user.id)
    .maybeSingle()
  if (!match) return { ok: false, kind: 'error', error: 'not_authorized' }

  // Idempotent: reuse the plan already generated for this request.
  const { data: existing } = await supabase
    .from(TABLE)
    .select('id, assessment')
    .eq('organizer_id', user.id)
    .eq('source_request_id', requestId)
    .maybeSingle()
  if (existing) {
    return { ok: true, planId: existing.id as string, assessment: (existing.assessment ?? null) as SavedPlan['assessment'] }
  }

  const { data: request } = await supabase
    .from('customer_requests')
    .select('event_type, city, country, participant_count, budget_cents, notes')
    .eq('id', requestId)
    .single()
  if (!request) return { ok: false, kind: 'error', error: 'not_found' }

  const input = mapRequestToPlannerInput(request as RequestLike)
  if (!input) {
    return {
      ok: false, kind: 'unsupported', status: 'unsupported',
      reason: 'Category outside OPE V1 scope',
      recommended_next_step: 'This event type is not yet planned by OPE. Respond with a manual proposal.',
    }
  }

  const parsed = plannerInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, kind: 'error', error: 'invalid_input' }

  let finalInput = parsed.data as PlannerInput
  let result
  try {
    result = generatePlan(finalInput)
    // Auto-assessment: no customer to answer clarifications — fill the flagged gaps
    // with plan-completing defaults and regenerate once. The organizer refines later.
    if (result.status === 'needs_clarification' && result.questions?.length) {
      const reparsed = plannerInputSchema.safeParse(fillClarificationDefaults(finalInput, result.questions))
      if (reparsed.success) {
        finalInput = reparsed.data as PlannerInput
        result = generatePlan(finalInput)
      }
    }
  } catch {
    return { ok: false, kind: 'error', error: 'generation_failed' }
  }

  // Only a ready plan is persisted; everything else is an honest coverage response.
  if (result.status !== 'plan_ready') {
    return {
      ok: false, kind: 'unsupported',
      status: result.coverage.status,
      reason: result.coverage.reason,
      recommended_next_step: result.coverage.recommended_next_step,
    }
  }

  const assessment = buildAssessment(finalInput, result)
  const lifecycle_log: OpePlanLogEntry[] = [
    { from: 'draft', to: 'planning', at: new Date().toISOString(), by: user.id, forced: false, auto: true },
  ]

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      organizer_id: user.id,
      title: null,
      input: finalInput,
      result,
      corrections: {},
      prep_state: {},
      phase: 'planning',
      lifecycle_log,
      version: 1,
      source_request_id: requestId,
      assessment,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, kind: 'error', error: 'save_failed' }
  revalidatePath('/dashboard')
  return { ok: true, planId: data.id as string, assessment }
}

/**
 * Form wrapper for the "Generate OPE Plan" button on the organizer request screen.
 * Generates (or reuses) the plan and redirects to it; on unsupported/error it
 * redirects back to the requests list with a readable message.
 */
export async function generatePlanFromRequestAction(formData: FormData): Promise<void> {
  const requestId = formData.get('request_id') as string
  const locale = (formData.get('locale') as string) || 'en'
  const res = await createPlanFromRequest(requestId)
  if (res.ok) redirect(`/${locale}/dashboard/plans/${res.planId}`)
  const reason = res.kind === 'unsupported' ? res.reason : res.error
  redirect(`/${locale}/dashboard/requests?planError=${encodeURIComponent(reason)}`)
}

/**
 * Customer Request → Alternative Approaches (Alternative Event Approaches, 2026-06-15).
 * Generates one deterministic OPE plan per candidate category (mapRequestToApproaches)
 * and persists each ready one as a `draft` plan linked to the request — these are the
 * alternatives the organizer chooses between before approving a plan. NOT auto-advanced:
 * every approach stays Draft until selectApproach promotes one to Planning. Idempotent at
 * the request level: if approaches already exist for this request they are returned as-is,
 * never regenerated. No new entities — ordinary ope_plans rows sharing source_request_id.
 */
export async function generateApproachesFromRequest(requestId: string): Promise<GenerateApproachesResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, kind: 'error', error: 'not_authenticated' }

  // Entitlement: same gate as generating a single plan / sending a proposal.
  if (!(await userHasOrganizerAccess(supabase, user.id))) {
    return { ok: false, kind: 'error', error: 'no_access' }
  }

  // Permission: the organizer must have been matched to this request.
  const { data: match } = await supabase
    .from('request_matches')
    .select('id')
    .eq('request_id', requestId)
    .eq('organizer_id', user.id)
    .maybeSingle()
  if (!match) return { ok: false, kind: 'error', error: 'not_authorized' }

  // Idempotent: reuse the approaches already generated for this request (N rows).
  const { data: existing } = await supabase
    .from(TABLE)
    .select('id')
    .eq('organizer_id', user.id)
    .eq('source_request_id', requestId)
  if (existing && existing.length > 0) {
    return { ok: true, planIds: existing.map((r) => r.id as string) }
  }

  const { data: request } = await supabase
    .from('customer_requests')
    .select('event_type, city, country, participant_count, budget_cents, notes, desired_date')
    .eq('id', requestId)
    .single()
  if (!request) return { ok: false, kind: 'error', error: 'not_found' }

  // Minimum Planning Inputs gate (MASTER 2026-06-15): resolve uncertainty before any
  // Event Planning. If When/Where/Who/Budget/Outcome are not all known, do NOT generate
  // approaches — return the clarification questions for the flow to surface.
  const missing = assessRequestReadiness(request as RequestLike)
  if (missing.length > 0) return { ok: false, kind: 'needs_input', questions: missing }

  // AI Request Understanding (optional, post-gate): enrich the base PlannerInput from the
  // request's free text. Returns null when disabled / no key / any failure, in which case
  // mapRequestToApproaches falls back to the deterministic mapping — identical to before.
  // The candidate CATEGORY set stays deterministic, so pricing/budget are unaffected.
  const aiBase = await understandRequest(request as RequestLike)
  const approaches = mapRequestToApproaches(request as RequestLike, aiBase ?? undefined)
  if (approaches.length === 0) {
    return { ok: false, kind: 'unsupported', reason: 'Category outside OPE V1 scope' }
  }

  // Each approach: validate, generate (auto-filling clarifications once), keep only
  // ready plans. Unsupported / unpriced approaches are silently skipped — the organizer
  // sees only the alternatives that actually produced a complete plan.
  const rows = approaches.flatMap((input) => {
    const parsed = plannerInputSchema.safeParse(input)
    if (!parsed.success) return []

    let finalInput = parsed.data as PlannerInput
    let result
    try {
      result = generatePlan(finalInput)
      if (result.status === 'needs_clarification' && result.questions?.length) {
        const reparsed = plannerInputSchema.safeParse(fillClarificationDefaults(finalInput, result.questions))
        if (reparsed.success) {
          finalInput = reparsed.data as PlannerInput
          result = generatePlan(finalInput)
        }
      }
    } catch {
      return []
    }
    if (result.status !== 'plan_ready') return []

    // Alternatives are persisted as Draft (no lifecycle advance) — selection promotes one.
    return [{
      organizer_id: user.id,
      title: null,
      input: finalInput,
      result,
      corrections: {},
      prep_state: {},
      phase: 'draft' as OpePlanPhase,
      lifecycle_log: [] as OpePlanLogEntry[],
      version: 1,
      source_request_id: requestId,
      assessment: buildAssessment(finalInput, result),
    }]
  })

  if (rows.length === 0) {
    return { ok: false, kind: 'unsupported', reason: 'No approach could be generated for this request' }
  }

  const { data, error } = await supabase.from(TABLE).insert(rows).select('id')
  if (error || !data) return { ok: false, kind: 'error', error: 'save_failed' }
  revalidatePath('/dashboard')
  return { ok: true, planIds: data.map((r) => r.id as string) }
}

/**
 * Form wrapper for the "Generate approaches" button on the organizer request screen.
 * Generates (or reuses) the request's alternative approaches and refreshes the list;
 * on unsupported/error it redirects back with a readable message.
 */
export async function generateApproachesFromRequestAction(formData: FormData): Promise<void> {
  const requestId = formData.get('request_id') as string
  const locale = (formData.get('locale') as string) || 'en'
  const res = await generateApproachesFromRequest(requestId)
  if (res.ok) {
    revalidatePath(`/${locale}/dashboard/requests`)
    redirect(`/${locale}/dashboard/requests`)
  }
  // Minimum Planning Inputs gate: just refresh — the requests page renders the missing
  // inputs inline (it recomputes readiness per request), so no error banner is needed.
  if (res.kind === 'needs_input') {
    revalidatePath(`/${locale}/dashboard/requests`)
    redirect(`/${locale}/dashboard/requests`)
  }
  const reason = res.kind === 'unsupported' ? res.reason : res.error
  redirect(`/${locale}/dashboard/requests?planError=${encodeURIComponent(reason)}`)
}

/**
 * Select one alternative approach (Alternative Event Approaches). Promotes the chosen
 * Draft approach to Planning — it becomes the working plan — while the other approaches
 * remain Draft. Owner-only; only a Draft (alternative) plan can be selected.
 *
 * Draft → Planning is intentionally NOT a generic manual transition in the lifecycle
 * table (it is the server's auto-advance on plan_ready), so this writes the transition
 * directly rather than via advancePhase, recording it as a deliberate selection
 * (auto:false, forced:false). No other field changes.
 */
export async function selectApproach(planId: string): Promise<ActionResult<SavedPlan>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const { data: existing } = await supabase
    .from(TABLE)
    .select('phase, lifecycle_log')
    .eq('id', planId)
    .eq('organizer_id', user.id)
    .single()
  if (!existing) return { error: 'not_found' }
  // Only an unselected alternative (still Draft) can be selected.
  if ((existing.phase as OpePlanPhase) !== 'draft') return { error: 'not_selectable' }

  const log = Array.isArray(existing.lifecycle_log) ? existing.lifecycle_log : []
  const entry: OpePlanLogEntry = {
    from: 'draft', to: 'planning', at: new Date().toISOString(), by: user.id,
    forced: false, auto: false, reason: 'approach_selected',
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ phase: 'planning', lifecycle_log: [...log, entry] })
    .eq('id', planId)
    .eq('organizer_id', user.id)
    .eq('phase', 'draft') // concurrency guard: only promote if still a draft
    .select(SELECT)
    .single()

  if (error || !data) return { error: 'save_failed' }
  revalidatePath('/dashboard')
  return { success: true, data: data as SavedPlan }
}

/**
 * Form wrapper for the "Use this approach" button. Selects the approach and opens the
 * resulting plan; on error it redirects back to the requests list with a message.
 */
export async function selectApproachAction(formData: FormData): Promise<void> {
  const planId = formData.get('plan_id') as string
  const locale = (formData.get('locale') as string) || 'en'
  const res = await selectApproach(planId)
  if (res.success) {
    revalidatePath(`/${locale}/dashboard/requests`)
    redirect(`/${locale}/dashboard/plans/${planId}`)
  }
  redirect(`/${locale}/dashboard/requests?planError=${encodeURIComponent(res.error)}`)
}

/**
 * Plan → Proposal → Request (Task #5). Sends a request-derived plan's generated
 * proposal back to the originating customer request, reusing the existing
 * send_proposal RPC (migration 008) and the deterministic buildProposal output.
 * No new schema, no RPC change. Guards: owner-only plan, organizer entitlement,
 * a linked source_request_id, and a ready proposal. The RPC itself enforces the
 * request_matches membership, the open/matched request status, and upserts on
 * (request_id, organizer_id) so re-sending updates the same proposal.
 */
export async function sendProposalFromPlan(planId: string, locale: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)

  // Entitlement: same gate as the manual proposal flow.
  if (!(await userHasOrganizerAccess(supabase, user.id))) redirect(`/${locale}/billing`)

  const { data: planRow } = await supabase
    .from(TABLE).select(SELECT).eq('id', planId).eq('organizer_id', user.id).single()
  if (!planRow) redirect(`/${locale}/dashboard/plans`)
  const plan = planRow as SavedPlan

  const base = `/${locale}/dashboard/plans/${planId}/proposal`
  if (!plan.source_request_id) redirect(`${base}?sendError=no_request`)

  // Use the same deterministic, correction-aware proposal the organizer sees.
  const vm = buildProposal(plan)
  if (!vm.ready || !vm.budget) redirect(`${base}?sendError=not_ready`)

  // Proposal budget is whole currency units; the RPC stores cents. Unpriced → no price.
  const priceCents = vm.budget.priced ? Math.round(vm.budget.likely * 100) : null
  // Option A (Plan→Proposal value): send the full plan value as structured text in the
  // existing message field — no schema/RPC change. Reuses the buildProposal view model.
  const message = formatPlanProposalMessage(vm) || null

  const { error } = await supabase.rpc('send_proposal', {
    p_request_id: plan.source_request_id,
    p_activity_id: null,
    p_message: message,
    p_price_cents: priceCents,
    p_proposed_date: null,
  })
  if (error) redirect(`${base}?sendError=${encodeURIComponent(error.message)}`)

  revalidatePath(`/${locale}/dashboard/proposals`)
  revalidatePath(`/${locale}/dashboard/requests`)
  redirect(`/${locale}/dashboard/proposals`)
}

/**
 * Compose a concise, deterministic plain-text proposal from the already-built proposal
 * view model (Option A — Plan→Proposal value). Reuses buildProposal's output verbatim,
 * adds no new data, and is stored in the existing proposals.message field (rendered to
 * the customer with whitespace preserved). Sections are omitted when empty so the text
 * stays tight; the whole string is capped so it always fits the TEXT column comfortably.
 * Not exported — a local helper, so this 'use server' module still only exports actions.
 */
function formatPlanProposalMessage(vm: ProposalViewModel): string {
  const lines: string[] = []
  const money = (n: number) => n.toLocaleString('en-US')
  const cur = (vm.budget?.currency ?? 'usd').toUpperCase()

  // Event summary / headline.
  const head = vm.summary ?? vm.eventTitle ?? vm.activityType
  if (head) lines.push(head)

  // Facts (guests · location · cadence).
  const facts: string[] = []
  if (vm.facts.guests != null) facts.push(`${vm.facts.guests} guests`)
  if (vm.facts.location) facts.push(vm.facts.location)
  if (vm.facts.cadence) facts.push(vm.facts.cadence)
  if (facts.length) lines.push('', facts.join(' · '))

  // Timeline highlights (top 5).
  if (vm.timeline.length) {
    lines.push('', 'Timeline')
    for (const t of vm.timeline.slice(0, 5)) {
      const label = t.name || t.phase
      lines.push(`- ${label}${t.when ? ` — ${t.when}` : ''}`)
    }
  }

  // Budget low / likely / high + key drivers (priced plans only).
  if (vm.budget?.priced) {
    lines.push('', `Estimated budget (${cur})`)
    lines.push(`- ${money(vm.budget.low)} – ${money(vm.budget.likely)} – ${money(vm.budget.high)} (low / likely / high)`)
    if (vm.budget.contingencyPct != null) lines.push(`- Includes ~${vm.budget.contingencyPct}% contingency`)
    if (vm.budget.drivers.length) {
      const drivers = vm.budget.drivers.slice(0, 3).map((d) => `${d.label} ${money(d.amount)}`).join(', ')
      lines.push(`- Key drivers: ${drivers}`)
    }
  }

  // Included services / plan components (top 6).
  if (vm.included.length) {
    lines.push('', 'Included')
    lines.push(`- ${vm.included.slice(0, 6).map((i) => i.label).join(', ')}`)
  }

  // Top risks / assumptions (top 3).
  if (vm.risks.length) {
    lines.push('', 'Key risks & assumptions')
    for (const r of vm.risks.slice(0, 3)) {
      lines.push(`- ${r.name}${r.mitigation ? ` — ${r.mitigation}` : ''}`)
    }
  }

  return lines.join('\n').slice(0, 4000)
}

/** Load one plan (owner only). */
export async function getPlan(planId: string): Promise<ActionResult<SavedPlan>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const { data } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq('id', planId)
    .eq('organizer_id', user.id)
    .single()

  if (!data) return { error: 'not_found' }
  return { success: true, data: data as SavedPlan }
}

/** List the organizer's plans, newest-edited first. */
export async function listPlans(): Promise<ActionResult<SavedPlan[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const { data } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq('organizer_id', user.id)
    .order('updated_at', { ascending: false })

  return { success: true, data: (data ?? []) as SavedPlan[] }
}

/**
 * Recompute a plan from edited inputs: re-run generatePlan, persist the new input
 * + result, bump the version, and PRESERVE corrections + prep_state (untouched).
 */
export async function updatePlanInputs(planId: string, rawInput: unknown, title?: string | null): Promise<ActionResult<SavedPlan>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const parsed = plannerInputSchema.safeParse(rawInput)
  if (!parsed.success) return { error: 'invalid_input' }

  const { data: existing } = await supabase
    .from(TABLE)
    .select('version, phase, lifecycle_log')
    .eq('id', planId)
    .eq('organizer_id', user.id)
    .single()
  if (!existing) return { error: 'not_found' }

  // Freeze (WP8): inputs are part of the plan definition, locked at Ready and beyond.
  const phase = existing.phase as OpePlanPhase
  if (!canEditInputs(phase)) return { error: 'frozen' }

  let result
  try {
    result = generatePlan(parsed.data as PlannerInput)
  } catch {
    return { error: 'generation_failed' }
  }

  // Atomic update: input + recomputed result + refreshed assessment + version bump.
  // Title lives on the record (not in `input`), so persist it here only when the
  // caller supplies it; omitting it leaves the existing title untouched. The
  // assessment is recomputed so it never goes stale after a rebuild (Task #3).
  // corrections/prep_state stay as-is.
  const patch: Record<string, unknown> = {
    input: parsed.data,
    result,
    assessment: buildAssessment(parsed.data as PlannerInput, result),
    version: (existing.version as number) + 1,
  }
  if (title !== undefined) patch.title = title?.trim() || null

  // Auto-advance a Draft to Planning if this edit finally produced a ready plan.
  if (phase === 'draft' && result.status === 'plan_ready') {
    patch.phase = 'planning'
    const log = Array.isArray(existing.lifecycle_log) ? existing.lifecycle_log : []
    patch.lifecycle_log = [
      ...log,
      { from: 'draft', to: 'planning', at: new Date().toISOString(), by: user.id, forced: false, auto: true },
    ]
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', planId)
    .eq('organizer_id', user.id)
    .select(SELECT)
    .single()

  if (error || !data) return { error: 'save_failed' }
  revalidatePath('/dashboard')
  return { success: true, data: data as SavedPlan }
}

/** Persist budget line-item corrections (current-plan-only). Does NOT recompute. */
export async function saveCorrections(planId: string, corrections: OpePlanCorrections): Promise<ActionResult<SavedPlan>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }
  if (typeof corrections !== 'object' || corrections === null) return { error: 'invalid_input' }

  // Freeze (WP8): budget corrections are plan definition, locked at Ready and beyond.
  const { data: existing } = await supabase
    .from(TABLE).select('phase').eq('id', planId).eq('organizer_id', user.id).single()
  if (!existing) return { error: 'not_found' }
  if (!canEditBudget(existing.phase as OpePlanPhase)) return { error: 'frozen' }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ corrections })
    .eq('id', planId)
    .eq('organizer_id', user.id)
    .select(SELECT)
    .single()

  if (error || !data) return { error: 'not_found' }
  revalidatePath('/dashboard')
  return { success: true, data: data as SavedPlan }
}

/** Persist preparation/readiness state (tasks/risks/resources). Does NOT recompute. */
export async function savePrepState(planId: string, prepState: OpePlanPrepState): Promise<ActionResult<SavedPlan>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }
  if (typeof prepState !== 'object' || prepState === null) return { error: 'invalid_input' }

  // Freeze (WP8): preparation progress is editable through In Progress, frozen at Completed.
  const { data: existing } = await supabase
    .from(TABLE).select('phase').eq('id', planId).eq('organizer_id', user.id).single()
  if (!existing) return { error: 'not_found' }
  if (!canEditPrep(existing.phase as OpePlanPhase)) return { error: 'frozen' }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ prep_state: prepState })
    .eq('id', planId)
    .eq('organizer_id', user.id)
    .select(SELECT)
    .single()

  if (error || !data) return { error: 'not_found' }
  revalidatePath('/dashboard')
  return { success: true, data: data as SavedPlan }
}

/**
 * Advance / override the lifecycle phase (WP8). Validates the transition against
 * the pure lifecycle table, then writes the new phase and appends an audit entry
 * to lifecycle_log. Forced (backward / reopen / abandon) transitions are allowed
 * but recorded as such. No engine call; no other field is touched.
 */
export async function advancePhase(planId: string, target: OpePlanPhase, reason?: string): Promise<ActionResult<SavedPlan>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const { data: existing } = await supabase
    .from(TABLE)
    .select('phase, lifecycle_log')
    .eq('id', planId)
    .eq('organizer_id', user.id)
    .single()
  if (!existing) return { error: 'not_found' }

  const from = existing.phase as OpePlanPhase
  const transition = findTransition(from, target)
  if (!transition) return { error: 'invalid_transition' }

  const log = Array.isArray(existing.lifecycle_log) ? existing.lifecycle_log : []
  const entry: OpePlanLogEntry = {
    from, to: target, at: new Date().toISOString(), by: user.id, forced: transition.forced,
    ...(reason ? { reason } : {}),
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ phase: target, lifecycle_log: [...log, entry] })
    .eq('id', planId)
    .eq('organizer_id', user.id)
    .select(SELECT)
    .single()

  if (error || !data) return { error: 'save_failed' }
  revalidatePath('/dashboard')
  return { success: true, data: data as SavedPlan }
}
