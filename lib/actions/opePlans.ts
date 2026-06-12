'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generatePlan } from '@/lib/ope'
import type { PlannerInput } from '@/lib/ope/types'
import { plannerInputSchema } from '@/lib/ope/validation'
import {
  canEditBudget, canEditInputs, canEditPrep, findTransition,
} from '@/lib/workspace/lifecycle'
import type {
  ActionResult, OpePlanCorrections, OpePlanLogEntry, OpePlanPhase, OpePlanPrepState, SavedPlan,
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
    })
    .select(SELECT)
    .single()

  if (error || !data) return { error: 'save_failed' }
  revalidatePath('/dashboard')
  return { success: true, data: data as SavedPlan }
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

  // Atomic update: input + recomputed result + version bump. Title lives on the
  // record (not in `input`), so persist it here only when the caller supplies it;
  // omitting it leaves the existing title untouched. corrections/prep_state stay as-is.
  const patch: Record<string, unknown> = {
    input: parsed.data,
    result,
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
