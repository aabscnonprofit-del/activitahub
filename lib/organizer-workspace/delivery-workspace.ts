// Delivery Workspace read model — composes the plan's delivery components with their per-occurrence delivery
// state into one deterministic read model for the organizer: a component list (status + assignee), progress /
// completion, and readiness counts by status. Pure and deterministic; reads no clock; mutates nothing. It
// READS the Delivery models (types) and changes none of them, and touches no other workspace module.

import type { DeliveryComponentModel, DeliveryComponentKind } from '@/lib/delivery/components'
import { DELIVERY_STATUSES, stateOf, type DeliveryStateModel, type DeliveryStatus } from '@/lib/delivery/status'

/** One delivery component overlaid with its current delivery state. */
export interface DeliveryWorkspaceItem {
  id: string
  kind: DeliveryComponentKind
  label: string
  detail: string
  status: DeliveryStatus
  assignee: string | null
}

/** Occurrence-level delivery progress / completion. */
export interface DeliveryProgress {
  total: number
  delivered: number
  /** True only when there is at least one component and every one is delivered. */
  isComplete: boolean
}

/** The Delivery Workspace read model. */
export interface DeliveryWorkspaceModel {
  components: DeliveryWorkspaceItem[]
  readiness: Record<DeliveryStatus, number>
  progress: DeliveryProgress
}

/**
 * Build the Delivery Workspace read model from a delivery component model and a delivery state model.
 * Deterministic and pure: components follow the model order, each annotated with its status + assignee
 * (missing → pending, unassigned), readiness tallies by status over the canonical status set, and progress
 * tallies delivered vs total. Inputs are not mutated.
 */
export function buildDeliveryWorkspace(
  componentModel: DeliveryComponentModel,
  state: DeliveryStateModel,
): DeliveryWorkspaceModel {
  const readiness = Object.fromEntries(DELIVERY_STATUSES.map((s) => [s, 0])) as Record<DeliveryStatus, number>

  const components: DeliveryWorkspaceItem[] = componentModel.components.map((c) => {
    const st = stateOf(state, c.id)
    readiness[st.status] += 1
    return { id: c.id, kind: c.kind, label: c.label, detail: c.detail, status: st.status, assignee: st.assignee }
  })

  const total = components.length
  const delivered = readiness.delivered
  const progress: DeliveryProgress = { total, delivered, isComplete: total > 0 && delivered === total }

  return { components, readiness, progress }
}
