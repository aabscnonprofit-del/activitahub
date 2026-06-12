// Resource Planning Engine — OPE Stage 3 (see docs/OPE_MASTER_SPEC.md §6).
//
// Derives sized quantities (cake servings, meals, tableware, supervising adults,
// favors, etc.) from the modules' derived-quantity keys + scenario counts and
// config buffers. Extracted verbatim from engine.ts; logic unchanged.

import type { OpeModule, Scenario } from './types'

const ceil = (n: number) => Math.ceil(n)

export type QtyCtx = {
  guest_count: number
  kid_count: number | null
  tableware_buffer_pct?: number
  food_buffer_pct?: number
  kids_per_adult?: number
  game_count?: number
}

export function computeQuantity(key: string, ctx: QtyCtx): number | null {
  switch (key) {
    case 'kid_count':
      return ctx.kid_count ?? null
    case 'cake_servings':
    case 'drinks_servings':
      return ctx.guest_count
    case 'meals':
      return ctx.food_buffer_pct != null ? ceil(ctx.guest_count * (1 + ctx.food_buffer_pct / 100)) : ctx.guest_count
    case 'tableware_units':
    case 'disposables_units':
      return ceil(ctx.guest_count * (1 + (ctx.tableware_buffer_pct ?? 0) / 100))
    case 'supervising_adults':
      return ctx.kid_count != null && ctx.kids_per_adult ? ceil(ctx.kid_count / ctx.kids_per_adult) : null
    case 'favors_count':
      return ctx.kid_count ?? null
    case 'game_count':
      return ctx.game_count ?? null
    default:
      return null
  }
}

/** Collect the modules' derived-quantity keys and compute each from the scenario. */
export function deriveQuantities(
  modules: OpeModule[],
  scenario: Scenario,
  config: Record<string, number>,
): Record<string, number | null> {
  const ctx: QtyCtx = {
    guest_count: scenario.guest_count,
    kid_count: scenario.kid_count,
    tableware_buffer_pct: config.tableware_buffer_pct,
    food_buffer_pct: config.food_buffer_pct,
    kids_per_adult: config.kids_per_adult,
    game_count: config.game_count,
  }
  const derivedKeys = new Set<string>()
  for (const m of modules) for (const k of Object.keys(m.derived_quantities ?? {})) derivedKeys.add(k)
  const derivedValues: Record<string, number | null> = {}
  for (const k of derivedKeys) derivedValues[k] = computeQuantity(k, ctx)
  return derivedValues
}
