'use server'

import { describeFutureEvent, type ClientDecision, type FutureEventDescriptionResult } from '../future-event-description/describe-future-event'

/**
 * AUTHORITATIVE Future Event Description — server-action seam (ADDITIVE; currently unused).
 *
 * The single reusable backend entry point for the future AUTHORITATIVE FED flow. It wraps the dedicated FED
 * AI (`describeFutureEvent`, per `FUTURE_EVENT_DESCRIPTION_SPEC` + `AI_ARTIFACT_OWNERSHIP_PRINCIPLE`) and
 * exposes the minimal future-UI contract: the confirmed Statement of Understanding in; an optional prior
 * description and client decision (approve / reject + feedback) for the approval loop; the
 * `FutureEventDescriptionResult` out (`awaiting_approval` / `approved` / `generation_failed`).
 *
 * It is completely additive: it is wired to no UI and no caller, it changes no existing action or behavior,
 * and it may remain unused until the FED UI flow is built in a later slice. The FED is produced ONLY by
 * `describeFutureEvent`; on unavailable / invalid / planning-content output the module returns
 * `generation_failed` and never fabricates a description.
 */
export async function describeFutureEventAction(
  statementOfUnderstanding: string,
  priorDescription?: string,
  clientDecision?: ClientDecision,
): Promise<FutureEventDescriptionResult> {
  return describeFutureEvent({
    statementOfUnderstanding: (statementOfUnderstanding ?? '').trim(),
    priorDescription,
    clientDecision,
  })
}
