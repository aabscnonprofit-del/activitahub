// Execution transition policy — PURE evaluation of a status transition under ALL the existing runtime rules.
//
// Composes the (unchanged) Execution runtime helpers so a single call enforces:
//   - valid transitions       (applyTransition, via both helpers below);
//   - trigger enforcement      (applyTriggerActivation — manual / after_item / not-bound time/external);
//   - prerequisite enforcement (applyTransitionWithPrerequisites — activation requires prerequisites completed).
// This is action-layer glue, not a new Execution model: it adds no rule, only reuses the existing ones. Pure
// and deterministic; no I/O.

import type { ExecutionMonitoringModel } from '@/lib/execution/monitoring'
import type { ExecutionStatusModel, MonitoringStatus } from '@/lib/execution/status'
import { applyTriggerActivation } from '@/lib/execution/triggers'
import { applyTransitionWithPrerequisites } from '@/lib/execution/prerequisites'

export type TransitionRejection =
  | 'invalid_transition'
  | 'prerequisites_incomplete'
  | 'after_item_incomplete'
  | 'trigger_not_bound'

export type TransitionOutcome =
  | { ok: true; status: ExecutionStatusModel }
  | { ok: false; reason: TransitionRejection }

/**
 * Evaluate a transition of `itemId` to `to` under every runtime rule. The trigger gate runs first (which also
 * checks base validity), then the prerequisite gate (which re-checks base validity, harmless). Both must pass;
 * the resulting status is returned. Any rejection surfaces its typed reason. Pure — the input status is never
 * mutated.
 */
export function evaluateTransition(
  monitoring: ExecutionMonitoringModel,
  status: ExecutionStatusModel,
  itemId: string,
  to: MonitoringStatus,
): TransitionOutcome {
  const trigger = applyTriggerActivation(monitoring, status, itemId, to)
  if (!trigger.ok) return { ok: false, reason: trigger.reason }
  const prereq = applyTransitionWithPrerequisites(monitoring, status, itemId, to)
  if (!prereq.ok) return { ok: false, reason: prereq.reason }
  return { ok: true, status: prereq.status }
}
