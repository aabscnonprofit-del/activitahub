// Execution readiness — can a monitoring item be ACTIVATED right now, and if not, why?
//
// A read-model helper for the Execution Workspace: for a pending item it runs the SAME activation gates the
// write path uses (applyTriggerActivation + applyTransitionWithPrerequisites), so the workspace never offers a
// "Start" the server would reject, and can explain the block. Pure/deterministic; reads no clock; mutates
// nothing. It reuses the existing runtime — it adds no new rule.

import type { ExecutionMonitoringModel } from './monitoring'
import { statusOf, type ExecutionStatusModel, type MonitoringStatus } from './status'
import { applyTriggerActivation } from './triggers'
import { applyTransitionWithPrerequisites, incompletePrerequisites } from './prerequisites'

/** Why a pending item cannot be activated yet (mirrors the runtime rejection reasons). */
export type ActivationBlock = 'prerequisites_incomplete' | 'after_item_incomplete' | 'trigger_not_bound' | 'invalid_transition'

/** Whether one item can be started now, and the block (with the offending prerequisite ids) when it cannot. */
export interface ItemActivationReadiness {
  itemId: string
  status: MonitoringStatus
  /** True only for a pending item that would be accepted for activation (pending → active) right now. */
  canStart: boolean
  /** The reason activation is not available, or null when startable / not applicable (item not pending). */
  blockedReason: ActivationBlock | null
  /** Incomplete prerequisite item ids gating this item (empty unless blocked on prerequisites/after_item). */
  blockedByIds: string[]
}

/**
 * Compute the activation readiness of one monitoring item under the runtime rules. Non-pending items are not
 * activatable (canStart=false, no block). A pending item is run through the trigger gate then the prerequisite
 * gate — exactly as the transition action does — so a `canStart=true` here always corresponds to a transition
 * the server would accept, and a block carries the same reason the write path would return.
 */
export function itemActivationReadiness(
  monitoring: ExecutionMonitoringModel,
  status: ExecutionStatusModel,
  itemId: string,
): ItemActivationReadiness {
  const current = statusOf(status, itemId)
  if (current !== 'pending') {
    return { itemId, status: current, canStart: false, blockedReason: null, blockedByIds: [] }
  }

  const trigger = applyTriggerActivation(monitoring, status, itemId, 'active')
  if (!trigger.ok) {
    return { itemId, status: current, canStart: false, blockedReason: trigger.reason, blockedByIds: incompletePrerequisites(monitoring, status, itemId) }
  }
  const prereq = applyTransitionWithPrerequisites(monitoring, status, itemId, 'active')
  if (!prereq.ok) {
    return { itemId, status: current, canStart: false, blockedReason: prereq.reason, blockedByIds: incompletePrerequisites(monitoring, status, itemId) }
  }
  return { itemId, status: current, canStart: true, blockedReason: null, blockedByIds: [] }
}
