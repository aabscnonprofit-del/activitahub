// OPE V2 — Module 2: OPE Engine — Engine Provider interface (Step 3; trimmed in Step 5).
//
// Defines the engine-agnostic provider seam (§9). Provider execution + result normalization now
// live in the contract (contract.ts) alongside event emission, so this file is interface-only.
//
// Boundary: does NOT import or call the frozen engine (lib/ope/*).

import type { FutureEventDescription } from '@/lib/discovery/types'
import type { ProviderFailure, ProviderOutput } from './types'

/** The replaceable engine seam behind the OPE Contract (§9). */
export interface EngineProvider {
  provider_id: string
  provider_version: string
  /** Whether identical FED input yields identical output. */
  deterministic: boolean
  /** Produce realization data for a (verified) FED, or fail. Engine internals are provider-private. */
  produce(fed: FutureEventDescription): ProviderOutput | ProviderFailure
}
