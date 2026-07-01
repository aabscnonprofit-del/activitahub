// OPE V2 — Module 2: OPE Engine — Frozen-engine adapter provider (Step 4).
//
// The first real EngineProvider. It wraps the existing FROZEN engine (lib/ope/*) UNCHANGED:
//   FED → (deterministic extraction) → frozen engine input → generatePlan() → map output → IR.
//
// THIS IS THE ONLY file in lib/ope-engine/ permitted to import lib/ope/*. It does NOT modify the
// frozen engine and does NOT change its golden-snapshot behavior. The frozen engine's internal
// shapes (PlannerInput, budget item_keys, sections, modules) are MAPPED AWAY — none leak into the
// IR. Cost is an estimate only (never a quote/charge). No Marketplace/Workspace/Stripe/Execution/
// scheduling/live vendors.

import { generatePlan } from '@/lib/ope'
import type { PlanGenerationResult } from '@/lib/ope'
import type { PlannerInput, PlannerLocation, PlannerOutput } from '@/lib/ope/types'
import { plannerInputSchema } from '@/lib/ope/validation'
import { extractFromText } from '@/lib/ope/request-text'
import type { FutureEventDescription } from '@/lib/discovery/types'
import type { EngineProvider } from './provider'
import type {
  CostEstimate, ImplementationRequirements, Phase, ProvenanceReference, ProviderFailure,
  ProviderOutput, Requirement, Risk, RiskSeverity, TimelineElement,
} from './types'

const PROVIDER_ID = 'frozen-engine-adapter'
const PROVIDER_VERSION = '1.0.0'

const unsupported = (message: string): ProviderFailure => ({ kind: 'provider_failure', reason: 'unsupported', message })
const failed = (message: string): ProviderFailure => ({ kind: 'provider_failure', reason: 'failed', message })

/** All FED text the deterministic extractor reasons over (request + WSH + stated context values). */
function fedText(fed: FutureEventDescription): string {
  return [fed.clientRequest, fed.description, ...fed.statedContext.map((c) => c.value)].filter(Boolean).join('. ')
}

/** Best-effort PlannerLocation from the FED's `location` ContextElement ("City, Country"). */
function fedLocation(fed: FutureEventDescription): PlannerLocation | null {
  const raw = fed.statedContext.find((c) => c.elementType === 'location')?.value?.trim()
  if (!raw) return null
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  const city = parts[0]
  if (!city) return null
  return { city, country: parts.length > 1 ? parts[parts.length - 1] : city }
}

const PHASE_LABEL: Record<Phase, string> = { preparation: 'Preparation', day_of: 'Day of', after: 'After the event' }
const PHASE_WINDOW: Record<Phase, string> = { preparation: 'before the event', day_of: 'day of', after: 'after the event' }
const normSeverity = (s: unknown): RiskSeverity => (s === 'high' || s === 'medium' || s === 'low' ? s : 'low')
const humanize = (k: string) => k.replace(/_/g, ' ').trim()

// The frozen engine cross-references its internal task ids (e.g. "BC-T05") inside risk/task prose.
// Those are engine internals and must NOT leak into the IR — strip them while mapping (incl. any
// "(BC-T05/BC-T06)" parentheticals) and tidy the resulting punctuation.
const ENGINE_REF = /[A-Z]{2,4}-(?:T|RK|CD|TPL)\d{2}/
function stripEngineRefs(s: string): string {
  return s
    .replace(/\s*\((?:[A-Z]{2,4}-(?:T|RK|CD|TPL)\d{2})(?:\s*\/\s*[A-Z]{2,4}-(?:T|RK|CD|TPL)\d{2})*\)/g, '')
    .replace(new RegExp(ENGINE_REF.source, 'g'), '')
    .replace(/\s+([.;,])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Map the frozen engine's plan output → a valid IR, attaching FED provenance to every element. */
function mapPlanToIr(fed: FutureEventDescription, plan: PlannerOutput): ImplementationRequirements {
  const prov: ProvenanceReference[] = [{ fedVersion: fed.version, source: 'description' }]
  const b = plan.section_b_your_plan

  const requirements: Requirement[] = []
  const addReqs = (items: { id: string; task: string }[], phase: Phase) =>
    items.forEach((it, i) => requirements.push({ id: `req-${phase}-${i + 1}`, description: stripEngineRefs(it.task), phase, derivedFrom: prov }))
  addReqs(b.preparation_checklist, 'preparation')
  addReqs(b.day_of_checklist, 'day_of')
  addReqs(b.after_event_checklist, 'after')

  const phasesUsed = [...new Set(requirements.map((r) => r.phase))] as Phase[]
  const timeline: TimelineElement[] = phasesUsed.map((phase) => ({ id: `tl-${phase}`, phase, name: PHASE_LABEL[phase], relativeWindow: PHASE_WINDOW[phase] }))

  const risks: Risk[] = (plan.section_d_key_risks?.risks ?? []).map((r, i) => ({
    id: `risk-${i + 1}`, description: stripEngineRefs(r.name), severity: normSeverity(r.severity), mitigation: stripEngineRefs(r.mitigation), derivedFrom: prov,
  }))

  const c = plan.section_c_budget
  const costEstimate: CostEstimate = c?.is_priced && c.estimate
    ? {
        status: 'estimated',
        range: { low: c.estimate.low, likely: c.estimate.likely, high: c.estimate.high },
        currency: c.currency ?? null,
        lineItems: (c.breakdown ?? []).map((bl) => ({ key: humanize(bl.item_key), amount: bl.line.likely, basis: bl.basis })),
        note: null,
      }
    : { status: 'unpriced', range: null, currency: null, lineItems: [], note: c?.fallback_note ?? null }

  return {
    ir_id: `ir-${fed.fedId}-${fed.version}`, version: 1, status: 'current',
    fedRef: { fedId: fed.fedId, fedVersion: fed.version },
    providerRef: { providerId: PROVIDER_ID, providerVersion: PROVIDER_VERSION },
    requirements, resourceNeeds: [], roleNeeds: [], dependencies: [], risks, timeline, costEstimate,
    createdAt: fed.updatedAt,
  }
}

/** The frozen-engine adapter — a deterministic EngineProvider wrapping lib/ope unchanged. */
export const frozenEngineProvider: EngineProvider = {
  provider_id: PROVIDER_ID,
  provider_version: PROVIDER_VERSION,
  deterministic: true,
  produce(fed: FutureEventDescription): ProviderOutput | ProviderFailure {
    // 1. Deterministic adaptation: FED text → engine input (reuses the existing extractor).
    const ext = extractFromText(fedText(fed))
    if (!ext.category) return unsupported('FED event nature does not map to a supported activity category')
    const guestCount = ext.guestCount ?? (ext.adults != null || ext.kids != null ? (ext.adults ?? 0) + (ext.kids ?? 0) : null)
    if (guestCount == null || guestCount < 1) return unsupported('FED does not yield a usable headcount')
    const location = fedLocation(fed)
    if (!location) return unsupported('FED does not yield a usable location')

    const candidate: PlannerInput = {
      category: ext.category,
      guestCount,
      ...(ext.adults != null ? { adults: ext.adults } : {}),
      ...(ext.kids != null ? { kids: ext.kids } : {}),
      venueType: ext.venueType ?? null,
      budget: ext.budget ?? null,
      specialRequirements: fed.statedContext
        .filter((c) => c.elementType === 'constraint' || c.elementType === 'mandatory_moment')
        .map((c) => c.value)
        .filter((v) => v && v.trim().toLowerCase() !== 'none stated')
        .slice(0, 20),
      location,
    }
    const parsed = plannerInputSchema.safeParse(candidate)
    if (!parsed.success) return unsupported('FED could not be adapted to a valid engine input')

    // 2. Run the frozen engine UNCHANGED.
    let result: PlanGenerationResult
    try {
      result = generatePlan(parsed.data as PlannerInput)
    } catch {
      return failed('frozen engine threw')
    }
    if (result.status !== 'plan_ready' || !result.plan) {
      return unsupported(`frozen engine did not produce a DIY plan (status: ${result.status})`)
    }

    // 3. Map engine output → IR (engine internals mapped away; FED provenance attached).
    return { kind: 'provider_output', providerRef: { providerId: PROVIDER_ID, providerVersion: PROVIDER_VERSION }, raw: mapPlanToIr(fed, result.plan) }
  },
}
