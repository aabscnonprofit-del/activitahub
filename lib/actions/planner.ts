'use server'

import { z } from 'zod'
import { generatePlan } from '@/lib/ope'
import type { PlannerInput, PlannerOutput } from '@/lib/ope/types'

const schema = z.object({
  category: z.enum(['birthday', 'bbq', 'networking']),
  guestCount: z.coerce.number().int().min(1).max(100_000),
  adults: z.coerce.number().int().min(0).max(100_000).optional(),
  kids: z.coerce.number().int().min(0).max(100_000).optional(),
  venueType: z.enum(['backyard_home', 'public_park']).nullish(),
  budget: z.coerce.number().min(0).max(100_000_000).nullish(),
  specialRequirements: z.array(z.string().max(120)).max(20).optional(),
  location: z.object({
    city: z.string().min(1).max(120),
    state: z.string().max(120).nullish(),
    country: z.string().min(1).max(120),
    postalCode: z.string().max(20).nullish(),
  }),
})

export type GeneratePlanResult =
  | { ok: true; plan: PlannerOutput }
  | { ok: false; error: 'invalid_input' | 'generation_failed' }

/** Public (no auth): validate the form input and run the OPE engine. */
export async function generatePlanAction(raw: unknown): Promise<GeneratePlanResult> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }
  try {
    const plan = generatePlan(parsed.data as PlannerInput)
    return { ok: true, plan }
  } catch {
    return { ok: false, error: 'generation_failed' }
  }
}
