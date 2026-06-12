import { z } from 'zod'

// Shared validation for a PlannerInput — single source of truth for the public
// planner action (lib/actions/planner.ts) and the organizer PlanStore
// (lib/actions/opePlans.ts). Plain module (not 'use server'): a server action can
// import it but cannot export it. Behaviour is identical to the prior inline schema.
export const plannerInputSchema = z.object({
  category: z.enum([
    'birthday', 'adult_birthday', 'anniversary', 'graduation', 'family_reunion', 'bbq', 'networking',
    'fitness_class', 'art_class', 'language_class', 'workshop',
  ]),
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
  recurrence: z
    .object({
      frequency: z.enum(['weekly', 'biweekly', 'monthly']),
      sessions: z.coerce.number().int().min(1).max(365).nullish(),
    })
    .nullish(),
  instructor: z.enum(['have', 'need']).nullish(),
  materials: z.enum(['provided', 'byo']).nullish(),
})
