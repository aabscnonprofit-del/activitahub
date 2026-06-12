'use server'

import { generatePlan } from '@/lib/ope'
import type { PlanGenerationResult } from '@/lib/ope'
import type { PlannerInput } from '@/lib/ope/types'
import { plannerInputSchema as schema } from '@/lib/ope/validation'

export type GeneratePlanResult =
  | { ok: true; result: PlanGenerationResult }
  | { ok: false; error: 'invalid_input' | 'generation_failed' }

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
