'use server'

import { discoverIntent, type DiscoverIntentInput, type DiscoveryResult } from '../intent-discovery/discover-intent'

/**
 * AUTHORITATIVE Discovery — server-action seam (ADDITIVE; currently unused).
 *
 * The single reusable backend entry point for the future AUTHORITATIVE Discovery flow. It wraps the dedicated
 * Discovery AI (`discoverIntent`, per `DISCOVERY_PRODUCT_BEHAVIOR_SPEC` + `AI_ARTIFACT_OWNERSHIP_PRINCIPLE`):
 * a client message — and, once Discovery has asked its one meaning-level clarification, the answer — yields
 * either that single clarification question or the Statement of Understanding.
 *
 * It is completely additive: it is wired to no UI and no caller, it changes no existing action or behavior,
 * and it may remain unused until the Discovery UI flow is built in a later slice. Discovery is produced ONLY
 * by `discoverIntent`; on unavailable/invalid output the module returns its fail-safe result and never
 * fabricates understanding.
 */
export async function discoverAction(message: string, clarificationAnswer?: string): Promise<DiscoveryResult> {
  const input: DiscoverIntentInput = {
    message: (message ?? '').trim(),
    clarificationAnswer: clarificationAnswer?.trim() || undefined,
  }
  return discoverIntent(input)
}
