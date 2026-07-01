// OPE V2 — Module 2: OPE Engine — Contract envelope + FED verification surface (Step 2).
//
// Implements the engine-agnostic contract shell and the verify-before-IR gate:
//   produceImplementationRequirements(fed) -> IR | Refusal   (typed, TOTAL, never throws)
//
// At this step there is NO provider, NO frozen engine, NO FED adapter, NO IR generation, NO
// planning, NO events. Only: the typed contract result shape, FED verification, and refusal mapping.
//
// Verification REUSES Module 1's validators (read-only — Discovery is not modified):
//   - validateFedInvariants (FED validity)         lib/discovery/fed-invariants.ts
//   - evaluateReadiness (planning readiness)         lib/discovery/readiness.ts
//
// Boundary: does NOT import or call the frozen engine (lib/ope/*), does NOT generate an IR, does
// NOT implement a provider, and does NOT map the FED to any engine input.

import { validateFedInvariants } from '@/lib/discovery/fed-invariants'
import { evaluateReadiness } from '@/lib/discovery/readiness'
import type { FutureEventDescription } from '@/lib/discovery/types'
import { validateImplementationRequirements, validateIrInvariants } from './ir'
import { getActiveProvider } from './registry'
import type { EngineProvider } from './provider'
import type { ImplementationRequirements, OpeEvent, OpeEventType, ProviderFailure, ProviderOutput, Refusal, RefusalReason } from './types'

/** The typed form of the contract's "IR | Refusal" result, plus the logical events emitted. */
export type ContractResult =
  | { ok: true; ir: ImplementationRequirements; events: OpeEvent[] }
  | { ok: false; refusal: Refusal; events: OpeEvent[] }

/** Result of FED verification: ok, or a typed refusal. */
export type VerifyResult = { ok: true } | { ok: false; refusal: Refusal }

const refuse = (reason: RefusalReason, message: string): VerifyResult => ({ ok: false, refusal: { reason, message } })

/** Minimal structural guard: is the input a well-formed FED we can inspect at all? */
function isFedLike(v: unknown): v is FutureEventDescription {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.fedId === 'string' &&
    typeof o.version === 'number' &&
    typeof o.lockStatus === 'string' &&
    typeof o.clientRequest === 'string' &&
    typeof o.description === 'string' &&
    Array.isArray(o.statedContext) &&
    Array.isArray(o.openQuestions)
  )
}

/**
 * Verify a FED before any IR is produced. OPE does not trust the hand-off and does not rediscover
 * intent — it checks the FED contract and maps each failure to a typed refusal reason. TOTAL: never
 * throws (any unexpected error maps to `invalid_fed`).
 *
 * Order & mapping:
 *   1. not a well-formed FED                                  → invalid_fed
 *   2. not locked                                             → fed_not_locked
 *   3. locked but no matching `approved` ApprovalRecord       → fed_not_locked
 *   4. fails Module 1 FED validity (invariants)               → invalid_fed
 *   5. not planning-ready (Module 1 readiness)                → fed_not_planning_ready
 */
export function verifyFed(fed: unknown): VerifyResult {
  try {
    // 1. Is a FED.
    if (!isFedLike(fed)) return refuse('invalid_fed', 'input is not a well-formed FED')
    const f = fed

    // 2. Is locked.
    if (f.lockStatus !== 'locked') return refuse('fed_not_locked', `FED lockStatus is '${f.lockStatus}', expected 'locked'`)

    // 3. Has a matching approved ApprovalRecord.
    if (!f.approval || f.approval.action !== 'approved' || f.approval.fedVersion !== f.version) {
      return refuse('fed_not_locked', 'locked FED lacks a matching approved ApprovalRecord for its version')
    }

    // 4. Passes Module 1 FED validity (shape + invariants).
    const inv = validateFedInvariants(f)
    if (!inv.valid) return refuse('invalid_fed', `FED invalid: ${inv.errors.join('; ')}`)

    // 5. Is planning-ready (Module 1 readiness over the FED's stated context).
    const readiness = evaluateReadiness(f.statedContext, f.openQuestions)
    if (readiness.readiness !== 'sufficient') return refuse('fed_not_planning_ready', readiness.reason)

    return { ok: true }
  } catch {
    // Total: a malformed input that slipped past the guard never throws to the caller.
    return refuse('invalid_fed', 'verification error on malformed input')
  }
}

/**
 * The OPE Contract (engine-agnostic). TOTAL: always returns an IR or a typed Refusal; never throws.
 * Records logical OPE domain events (in-memory, no transport/persistence) on the result.
 *
 * Flow + events:
 *   ope.requirements_requested
 *     → VERIFY the FED (invalid/unlocked/not-ready → ope.fed_rejected + refusal, BEFORE any provider)
 *     → run the active provider (failure/unsupported → ope.requirements_failed + refusal)
 *     → ope.requirements_assembled (provider produced output)
 *     → validate output (invalid → ope.requirements_failed + provider_output_invalid)
 *     → ope.requirements_validated → ope.requirements_ready → IR.
 *
 * `provider` overrides the active provider when given (tests / replacement); otherwise the
 * registry's active provider is used (default: the frozen-engine adapter). OPE performs NO
 * FED→engine mapping here — that is internal to the provider.
 */
export function produceImplementationRequirements(
  fed: unknown,
  provider?: EngineProvider,
  opts: { projectId?: string; at?: string } = {},
): ContractResult {
  const events: OpeEvent[] = []
  const emit = (type: OpeEventType, payload?: Record<string, unknown>): void => {
    events.push({ type, projectId: opts.projectId ?? '', at: opts.at ?? '', ...(payload ? { payload } : {}) })
  }

  emit('ope.requirements_requested')

  // 1. Verify the FED (before any provider call).
  const verified = verifyFed(fed)
  if (!verified.ok) {
    emit('ope.fed_rejected', { reason: verified.refusal.reason })
    return { ok: false, refusal: verified.refusal, events }
  }

  // 2. Resolve the active provider (explicit injection wins; otherwise the registry default).
  const verifiedFed = fed as FutureEventDescription
  const active = provider ?? getActiveProvider()

  // 3. Run the provider.
  let output: ProviderOutput | ProviderFailure
  try {
    output = active.produce(verifiedFed)
  } catch {
    const refusal: Refusal = { reason: 'provider_failed', message: `provider '${active.provider_id}' threw` }
    emit('ope.requirements_failed', { reason: refusal.reason })
    return { ok: false, refusal, events }
  }
  if (!output || output.kind === 'provider_failure') {
    const reason: RefusalReason = output?.reason === 'unsupported' ? 'unsupported_fed_content' : 'provider_failed'
    const refusal: Refusal = { reason, message: output?.message ?? `provider '${active.provider_id}' failed` }
    emit('ope.requirements_failed', { reason })
    return { ok: false, refusal, events }
  }

  // 4. Provider produced output → validate/normalize into an IR.
  emit('ope.requirements_assembled', { providerId: active.provider_id })
  const candidate = output.raw as ImplementationRequirements
  const v = validateImplementationRequirements(candidate)
  if (!v.valid) {
    const refusal: Refusal = { reason: 'provider_output_invalid', message: v.errors.join('; ') }
    emit('ope.requirements_failed', { reason: refusal.reason })
    return { ok: false, refusal, events }
  }
  // Enforce IR Invariants against the verified FED (content-level + FED↔IR traceability). This is
  // the "safe for downstream" guarantee — enforced for ANY provider, not just the frozen adapter.
  const inv = validateIrInvariants(candidate, {
    fedId: verifiedFed.fedId,
    fedVersion: verifiedFed.version,
    contextElementIds: new Set(verifiedFed.statedContext.map((c) => c.id)),
  })
  if (!inv.valid) {
    const refusal: Refusal = { reason: 'provider_output_invalid', message: inv.errors.join('; ') }
    emit('ope.requirements_failed', { reason: refusal.reason })
    return { ok: false, refusal, events }
  }
  emit('ope.requirements_validated')
  emit('ope.requirements_ready', { irId: candidate.ir_id })
  return { ok: true, ir: candidate, events }
}
