// Execution Runtime — Slice 3: trigger-aware activation.
//
// Layers a TRIGGER gate on top of the pure transition rules (Slice 1) and the prerequisite logic (Slice 2),
// applied only to activation (→ active). By trigger kind (resolved from the monitoring item; legacy/unknown
// items default to `manual`):
//   - manual         → activate normally (no trigger restriction);
//   - after_item     → activate only when the referenced items (its prerequisiteIds) are all completed;
//   - relative_time  → recognized but NOT bound yet (no clock) → rejected;
//   - external_event → recognized but NOT bound yet (no external signal) → rejected.
// Pure and immutable: returns a NEW status model or a typed rejection; never mutates. Reads the monitoring +
// status models; nothing from Planning or Occurrence.

import type { ExecutionMonitoringModel, MonitoringItem } from './monitoring'
import type { ExecutionStatusModel, MonitoringStatus } from './status'
import { applyTransition, type TransitionResult } from './runtime'
import { incompletePrerequisites } from './prerequisites'

/** The resolved trigger kinds (derived from the monitoring item's trigger — no Planning import). */
type TriggerKind = MonitoringItem['trigger']['kind']

/** Result of a trigger-aware activation — the base results plus the two trigger rejections. */
export type TriggerActivationResult =
  | TransitionResult
  | { ok: false; reason: 'after_item_incomplete'; itemId: string; incompletePrerequisiteIds: string[] }
  | { ok: false; reason: 'trigger_not_bound'; itemId: string; triggerKind: 'relative_time' | 'external_event' }

/** The resolved trigger kind of a monitoring item — legacy/unknown items default to `manual`. */
export function triggerKindOf(monitoring: ExecutionMonitoringModel, itemId: string): TriggerKind {
  return monitoring.items.find((i) => i.id === itemId)?.trigger.kind ?? 'manual'
}

/**
 * Apply a transition with TRIGGER-aware activation. Base transition rules are checked first (so a
 * structurally-invalid transition is rejected as `invalid_transition`). Non-activation transitions are not
 * trigger-gated. For a valid activation (pending → active) the trigger kind decides:
 *   - manual         → activate;
 *   - after_item     → activate only if every referenced item (prerequisiteId) is completed, else
 *                      `after_item_incomplete` (listing the incomplete ids);
 *   - relative_time / external_event → `trigger_not_bound` (recognized, not bound yet).
 * Pure/immutable — the input model is never mutated.
 */
export function applyTriggerActivation(
  monitoring: ExecutionMonitoringModel,
  status: ExecutionStatusModel,
  itemId: string,
  to: MonitoringStatus,
): TriggerActivationResult {
  const base = applyTransition(status, itemId, to)
  if (!base.ok) return base
  if (to !== 'active') return base

  const kind = triggerKindOf(monitoring, itemId)
  switch (kind) {
    case 'manual':
      return base
    case 'after_item': {
      const incomplete = incompletePrerequisites(monitoring, status, itemId)
      return incomplete.length > 0
        ? { ok: false, reason: 'after_item_incomplete', itemId, incompletePrerequisiteIds: incomplete }
        : base
    }
    case 'relative_time':
    case 'external_event':
      return { ok: false, reason: 'trigger_not_bound', itemId, triggerKind: kind }
    default:
      return base
  }
}
