// OPE engine — pipeline orchestrator (see docs/OPE_MASTER_SPEC.md, Appendix A).
//
// Wires the named engine modules in dependency order. Classification (Stage 1)
// runs upstream in index.ts; this orchestrates the rest:
//   assemble (Stage 2, incl. Resource Planning Stage 3)
//     → budget (Stage 4)
//     → output builder (Stage 14, incl. Risk Engine Stage 7)
//     → communication / AI layer (Stage 6).
//
// This refactor split the former monolith (compose + buildOutput + AI layer) into
// lib/ope/{assembly,resources,risk,output,communication}.ts WITHOUT changing
// business logic. The public generatePlan() contract and the
// ACTIVITY_PLANNER_OUTPUTS_V1 output are unchanged (proven byte-for-byte by
// scripts/ope-golden-check.mts against scripts/__fixtures__/ope-golden.json).

import { assemble } from './assembly'
import { buildBudget } from './budget'
import { applyAiLayer } from './communication'
import { applyModifiers } from './modifiers'
import { buildOutput } from './output'
import type { OpeModule, PlannerOutput, Scenario } from './types'

/**
 * Full pipeline: assemble → budget → output → AI layer → modifiers.
 * applyModifiers is a no-op when no modifier is active (one-time stays
 * byte-identical with M1).
 */
export function runEngine(modules: OpeModule[], scenario: Scenario): PlannerOutput {
  const composed = assemble(modules, scenario)
  const budget = buildBudget(scenario, composed.costDrivers, composed.config, composed.derivedValues)
  const output = buildOutput(composed, budget)
  const planned = applyAiLayer(output)
  return applyModifiers(planned, scenario)
}
