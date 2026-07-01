// Stage 6C — Discovery FED → domain FutureEventDescription bridge.
//
// Planning Engine V2 plans from the neutral domain FutureEventDescription (lib/domain/future-event-
// description.ts). The OPE EngineProvider seam, however, receives the Discovery FED (lib/discovery/
// types.ts) — the locked, versioned hand-off with stated context. This pure bridge adapts one to the
// other so the native provider can run Planning Engine V2 without any legacy machinery.
//
// Boundary (Stage 6C requirement): NO dependency on lib/ope/*, NO PlannerInput, NO generatePlan, NO
// legacy category mapping. Uses ONLY neutral domain types. Deterministic; never invents stated facts.

import type { FutureEventDescription as DiscoveryFED, ContextElementType } from '@/lib/discovery/types'
import type {
  FutureEventDescription as DomainFED, EventDetails, EventLocation,
} from '@/lib/domain/future-event-description'

// Matches Planning Engine V2's own FALLBACK_HEADCOUNT: when the audience scale carries no parseable
// number, plan with a minimal headcount (the engine would otherwise assume the same minimum). See the
// Stage 6C report — a nullable EventDetails.guestCount would let "unknown" be represented honestly.
const FALLBACK_HEADCOUNT = 1

const NONE_STATED = 'none stated'
const isStated = (v: string | null | undefined): v is string =>
  typeof v === 'string' && v.trim() !== '' && v.trim().toLowerCase() !== NONE_STATED

/** First usable ContextElement value of a given type (confirmed/assumed, non-empty). */
function contextValue(fed: DiscoveryFED, type: ContextElementType): string | null {
  const e = fed.statedContext.find((c) => c.elementType === type && typeof c.value === 'string' && c.value.trim() !== '')
  return e ? e.value.trim() : null
}

/** Parse "City, Country" (or just "City") into an EventLocation. */
function parseLocation(raw: string | null): EventLocation | null {
  if (!raw) return null
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  const city = parts[0]
  if (!city) return null
  return { city, country: parts.length > 1 ? parts[parts.length - 1] : city }
}

/** Parse the first positive integer from a free-text audience scale (e.g. "about 30 guests" → 30). */
function parseHeadcount(raw: string | null): number | null {
  if (!raw) return null
  const m = raw.match(/\d[\d,]*/)
  if (!m) return null
  const n = parseInt(m[0].replace(/,/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Build a domain FutureEventDescription from a verified Discovery FED. Returns null when the FED lacks
 * a usable location (a planning-ready FED always has one; the null path is defensive for direct callers).
 *
 * The planning `description` is the WSH plus all stated context (excluding the explicit "none stated"
 * sentinel) — this mirrors how the frozen adapter assembles its engine-input text, so Planning Engine
 * V2's deterministic signal extraction (which reads clientRequest + description) sees the full approved
 * FED content rather than only the WSH.
 */
export function domainFedFromDiscoveryFed(fed: DiscoveryFED): DomainFED | null {
  const location = parseLocation(contextValue(fed, 'location'))
  if (!location) return null

  const contextText = fed.statedContext.map((c) => c.value).filter(isStated)
  const description = [fed.description, ...contextText].filter(Boolean).join('. ')

  const requirements = fed.statedContext
    .filter((c) => c.elementType === 'constraint' || c.elementType === 'mandatory_moment')
    .map((c) => c.value)
    .filter(isStated)

  const details: EventDetails = {
    // `category` is a free-form label carried for the producer; Planning Engine V2 is intention-first
    // and does not read it (no legacy category taxonomy). Use the event_nature value verbatim.
    category: contextValue(fed, 'event_nature') ?? 'event',
    guestCount: parseHeadcount(contextValue(fed, 'audience_scale')) ?? FALLBACK_HEADCOUNT,
    ...(requirements.length ? { requirements } : {}),
  }

  return {
    clientRequest: fed.clientRequest ?? '',
    description,
    details,
    location,
  }
}
