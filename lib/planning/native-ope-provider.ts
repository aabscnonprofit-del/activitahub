// Stage 6C — native EventPlanV2 EngineProvider.
//
// An EngineProvider (the OPE Contract's replaceable seam) that produces ImplementationRequirements
// from Planning Engine V2 — WITHOUT the frozen legacy engine:
//
//   Discovery FED → domain FutureEventDescription → planningEngineV2.plan() → EventPlanV2 → IR
//
// Boundary (Stage 6C requirement): imports NOTHING from lib/ope/*, calls NO generatePlan, reads NO
// `section_*` output. Deterministic. NOT registered as the active provider in this stage — it is built
// and tested behind the existing contract only; the registry default is untouched.

import type { FutureEventDescription as DiscoveryFED } from '@/lib/discovery/types'
import type { EngineProvider } from '@/lib/ope-engine/provider'
import type { ProviderFailure, ProviderOutput } from '@/lib/ope-engine/types'
import { planningEngineV2 } from './planning-engine-v2'
import { domainFedFromDiscoveryFed } from './discovery-fed-bridge'
import { eventPlanV2ToIr, NATIVE_PROVIDER_ID, NATIVE_PROVIDER_VERSION } from './event-plan-v2-to-ir'

const unsupported = (message: string): ProviderFailure => ({ kind: 'provider_failure', reason: 'unsupported', message })
const failed = (message: string): ProviderFailure => ({ kind: 'provider_failure', reason: 'failed', message })

/**
 * The native EventPlanV2 provider. Returns a ProviderOutput wrapping a valid IR, or a typed
 * ProviderFailure the OPE Contract maps to a refusal:
 *   - 'unsupported' (→ unsupported_fed_content): the FED is planning-ready but cannot be turned into
 *     structurable requirements — no usable location, a non-'planned' feasibility verdict (e.g. a
 *     signal-less FED → 'needs_human_decision'), or an experience with no concrete moments.
 *   - 'failed' (→ provider_failed): Planning Engine V2 threw unexpectedly.
 */
export const nativeEventPlanV2Provider: EngineProvider = {
  provider_id: NATIVE_PROVIDER_ID,
  provider_version: NATIVE_PROVIDER_VERSION,
  deterministic: true,
  produce(fed: DiscoveryFED): ProviderOutput | ProviderFailure {
    // 1. Adapt the Discovery FED to the domain FED Planning Engine V2 consumes (no legacy machinery).
    const domainFed = domainFedFromDiscoveryFed(fed)
    if (!domainFed) return unsupported('FED does not yield a usable location for planning')

    // 2. Run Planning Engine V2 (deterministic, LLM-free).
    let plan
    try {
      plan = planningEngineV2.plan(domainFed)
    } catch {
      return failed('Planning Engine V2 threw')
    }

    // 3. Gate on the native authority: only a 'planned' verdict is a producible plan.
    if (plan.feasibility.verdict !== 'planned') {
      return unsupported(`EventPlanV2 feasibility verdict is '${plan.feasibility.verdict}', not 'planned'`)
    }
    // A 'planned' plan with no concrete moments (qualities only) yields no structurable requirements;
    // the IR model requires ≥1 requirement, so refuse rather than emit an empty plan.
    if (plan.logistics.length === 0 && plan.itinerary.length === 0) {
      return unsupported('EventPlanV2 yields no structurable implementation requirements')
    }

    // 4. Map EventPlanV2 → IR (pure; FED provenance attached).
    return {
      kind: 'provider_output',
      providerRef: { providerId: NATIVE_PROVIDER_ID, providerVersion: NATIVE_PROVIDER_VERSION },
      raw: eventPlanV2ToIr(fed, plan),
    }
  },
}
