// Execution Snapshot — Slice 4: the single deterministic builder from EventPlanV2 to Execution State.
//
// One pure entry point that runs the Execution derivation pipeline end-to-end:
//   EventPlanV2
//     → buildExecutionMonitoringModel(plan)   (Slice 1 — the monitorable operational structure)
//     → initialExecutionStatus(monitoring)     (Slice 2 — every item starts pending)
//     → composeExecutionState(monitoring, …)   (Slice 3 — status overlaid onto monitoring)
//
// It READS Planning (the EventPlanV2 type only) and changes nothing there; it records no absolute time and
// no Occurrence binding (timing stays RELATIVE); it is pure/deterministic and involves no persistence.

import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import { buildExecutionMonitoringModel, type ExecutionMonitoringModel } from './monitoring'
import { initialExecutionStatus, type ExecutionStatusModel } from './status'
import { composeExecutionState, type ExecutionStateModel } from './state'

/** The full Execution snapshot derived from one EventPlanV2 — the three composed models. */
export interface ExecutionSnapshot {
  monitoring: ExecutionMonitoringModel
  status: ExecutionStatusModel
  state: ExecutionStateModel
}

/**
 * Build the Execution snapshot from an EventPlanV2. Pure and deterministic: same plan → same snapshot, no
 * clock, no randomness, no mutation. Legacy (pre-enrichment) plans build through the monitoring fallback ids
 * and the status/trigger defaults. Returns the monitoring, status, and state models together.
 */
export function buildExecutionSnapshot(plan: EventPlanV2): ExecutionSnapshot {
  const monitoring = buildExecutionMonitoringModel(plan)
  const status = initialExecutionStatus(monitoring)
  const state = composeExecutionState(monitoring, status)
  return { monitoring, status, state }
}
