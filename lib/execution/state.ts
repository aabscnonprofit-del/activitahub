// Execution State — Slice 3: composes the Execution Monitoring model (Slice 1) and the Execution Status model
// (Slice 2) into the first executable Execution State READ MODEL.
//
// Pure/deterministic overlay: each monitoring item is carried through verbatim and annotated with its current
// status (defaulting to `pending` when none is recorded). It:
//   - depends only on the Execution monitoring + status models (Execution-internal); imports NOTHING from
//     Planning or Occurrence and changes neither;
//   - records no absolute time and no Occurrence binding (timing stays RELATIVE, inherited from monitoring);
//   - is a read model: no persistence, no mutation — composition returns a fresh model.

import type { ExecutionMonitoringModel, MonitoringItem } from './monitoring'
import { statusOf, type ExecutionStatusModel, type MonitoringStatus } from './status'

/** A monitoring item overlaid with its current execution status — the executable state of one operational
 *  unit. Carries every monitoring field (id, source, label, trigger, temporal?, prerequisiteIds) plus status. */
export interface ExecutionStateItem extends MonitoringItem {
  status: MonitoringStatus
}

/** The composed Execution State read model. */
export interface ExecutionStateModel {
  items: ExecutionStateItem[]
}

/**
 * Compose a monitoring model and a status model into the Execution State read model. Pure and deterministic:
 * items follow the monitoring model's fixed order, each annotated with its status (missing → pending, via
 * statusOf). Status attaches by monitoring item id, so legacy plans (with fallback ids) compose correctly.
 */
export function composeExecutionState(
  monitoring: ExecutionMonitoringModel,
  status: ExecutionStatusModel,
): ExecutionStateModel {
  return {
    items: monitoring.items.map((item) => ({ ...item, status: statusOf(status, item.id) })),
  }
}
