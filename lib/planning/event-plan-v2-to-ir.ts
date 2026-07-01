// Stage 6C — native EventPlanV2 → ImplementationRequirements mapper.
//
// A PURE, DETERMINISTIC transform: a verified Future Event Description (Discovery FED, for identity
// + provenance) plus an EventPlanV2 (Planning Engine V2's native output) → an ImplementationRequirements.
//
// It performs NO planning, runs NO engine, reads NO legacy `section_*` output, and imports NOTHING
// from lib/ope/*. It only maps fields that already exist on the EventPlanV2 it is given, attaches FED
// provenance, and generates deterministic IR-local ids. Output is built to pass
// validateImplementationRequirements + validateIrInvariants (enforced by the OPE contract).
//
// Boundary: imports the IR data contract (types) from lib/ope-engine and the EventPlanV2 + FED types
// only. lib/ope-engine does NOT import this module — the dependency points DOWN (planning → ope-engine).

import type { FutureEventDescription as DiscoveryFED } from '@/lib/discovery/types'
import type { EventPlanV2 } from './event-plan-v2'
import type {
  CostEstimate, ImplementationRequirements, Phase, ProvenanceReference, Requirement,
  ResourceNeed, Risk, RoleNeed, TimelineElement,
} from '@/lib/ope-engine/types'

export const NATIVE_PROVIDER_ID = 'native-event-plan-v2'
export const NATIVE_PROVIDER_VERSION = '1.0.0'

const PHASE_LABEL: Record<Phase, string> = { preparation: 'Preparation', day_of: 'Day of', after: 'After the event' }
const PHASE_WINDOW: Record<Phase, string> = { preparation: 'before the event', day_of: 'day of', after: 'after the event' }
const PHASE_ORDER: Phase[] = ['preparation', 'day_of', 'after']

/**
 * Map an EventPlanV2 (and the FED it was planned from) into a valid IR.
 *
 * Mapping decisions (documented; see the Stage 6C report):
 *   - requirements: logistics → `preparation` (setup actions); itinerary moments → `day_of`
 *     (the delivered moments). EventPlanV2 models no post-event work, so NO `after` requirements
 *     are produced (a difference from the frozen engine's after_event_checklist).
 *   - resourceNeeds ← resources[]; roleNeeds ← staffing[]. The frozen adapter emitted these EMPTY;
 *     populating them is an INTENTIONAL semantic difference. EventPlanV2 carries no quantity/count/
 *     basis, so quantity/count are null and basis is 'unspecified'.
 *   - risks ← safety (severity 'medium' — duty of care) + contingencies (severity 'low' — fallback).
 *     EventPlanV2 carries no severity grading; these fixed defaults are deterministic, not invented facts.
 *   - dependencies: none (EventPlanV2 has no explicit dependency graph — same as the frozen adapter).
 *   - costEstimate: the EventPlanV2 range → an 'estimated' IR cost (no per-line breakdown; Budget prices it).
 *   - provenance: every element traces to the FED via {fedVersion, source:'description'} (same level as
 *     the frozen adapter; EventPlanV2's IntentionTrace could enable richer context_element provenance later).
 */
export function eventPlanV2ToIr(fed: DiscoveryFED, plan: EventPlanV2): ImplementationRequirements {
  const prov: ProvenanceReference[] = [{ fedVersion: fed.version, source: 'description' }]

  // ── Requirements: logistics (preparation) + itinerary moments (day_of) ──
  const requirements: Requirement[] = [
    ...plan.logistics.map((l, i): Requirement => ({
      id: `req-preparation-${i + 1}`, description: l.description, phase: 'preparation', derivedFrom: prov,
    })),
    ...plan.itinerary.map((m, i): Requirement => ({
      id: `req-day_of-${i + 1}`, description: `${m.name}: ${m.purpose}`, phase: 'day_of', derivedFrom: prov,
    })),
  ]

  // ── Timeline: one element per phase actually used, in canonical order ──
  const phasesUsed = PHASE_ORDER.filter((p) => requirements.some((r) => r.phase === p))
  const timeline: TimelineElement[] = phasesUsed.map((phase) => ({
    id: `tl-${phase}`, phase, name: PHASE_LABEL[phase], relativeWindow: PHASE_WINDOW[phase],
  }))

  // ── Resource & role needs (populated from EventPlanV2; frozen adapter left these empty) ──
  const resourceNeeds: ResourceNeed[] = plan.resources.map((r, i) => ({
    id: `res-${i + 1}`, kind: r.label, quantity: null, basis: 'unspecified', derivedFrom: prov,
  }))
  const roleNeeds: RoleNeed[] = plan.staffing.map((r, i) => ({
    id: `role-${i + 1}`, role: r.role, count: null, basis: 'unspecified', derivedFrom: prov,
  }))

  // ── Risks: safety (medium) + contingencies (low) ──
  const risks: Risk[] = [
    ...plan.safety.map((s, i): Risk => ({
      id: `risk-safety-${i + 1}`, description: s.risk, severity: 'medium', mitigation: s.safeguard, derivedFrom: prov,
    })),
    ...plan.contingencies.map((c, i): Risk => ({
      id: `risk-contingency-${i + 1}`, description: c.ifThisFails, severity: 'low', mitigation: c.fallback, derivedFrom: prov,
    })),
  ]

  // ── Cost estimate: the EventPlanV2 range becomes an honest IR estimate (never a quote/charge) ──
  const ce = plan.costEstimate
  const costEstimate: CostEstimate = {
    status: 'estimated',
    range: { low: ce.low, likely: ce.likely, high: ce.high },
    currency: ce.currency,
    lineItems: [],
    note: ce.basis,
  }

  return {
    ir_id: `ir-${fed.fedId}-${fed.version}`,
    version: 1,
    status: 'current',
    fedRef: { fedId: fed.fedId, fedVersion: fed.version },
    providerRef: { providerId: NATIVE_PROVIDER_ID, providerVersion: NATIVE_PROVIDER_VERSION },
    requirements,
    resourceNeeds,
    roleNeeds,
    dependencies: [],
    risks,
    timeline,
    costEstimate,
    createdAt: fed.updatedAt,
  }
}
