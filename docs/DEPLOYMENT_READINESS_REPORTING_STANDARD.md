# Deployment Readiness — Reporting Standard

**Status:** MANDATORY · PERMANENT · **v2 (frozen)** · effective 2026-07-11
**Applies to:** every Deployment Readiness execution report and every deployment-configuration investigation, from this date forward. Replaces any previous reporting convention.
**Type:** process/reporting standard only. It does not change any Deployment Readiness *phase*, task, code, or infrastructure — only how results are reported and how confidence is expressed.

---

## Introduction

During the Stripe Deployment Readiness investigation, a report verified the **Local** environment correctly but then included a **speculative statement about Production** ("most probable state: not configured"). Production was later confirmed **healthy** by a **real live One Event License payment** that had already succeeded. The local findings were technically correct; the failure was in the *reporting* — a Production conclusion was drawn from Local-only evidence, over the top of authoritative operational evidence.

Root cause: **incomplete Production visibility was reported as a probable Production state.** This standard permanently eliminates that class of error. It is mandatory, permanent, and applies to every future Deployment Readiness report.

---

## The Four States Rule

Every verification result must be classified as **exactly one** of four fundamentally different states. They must **never** be merged, redefined, or used interchangeably.

| State | Definition | Requires |
|---|---|---|
| **Verified** | Objective evidence confirms the result **for this environment**. | Positive evidence from this environment. |
| **Unknown** | Insufficient evidence exists; **no conclusion may be drawn**. | Explicit "no evidence available." |
| **Not Accessible** | The required environment/system cannot be inspected (no credentials, token, dashboard, or runtime access); **no conclusion may be drawn**. | A stated access limitation. |
| **Failed** | An objective failure has been **directly observed**. | An observed failure — never inferred from missing visibility. |

**Hard rules:** `Unknown` is not `Failed`. `Not Accessible` is not `Failed`. Absence of visibility is never a defect and never a failure. `Failed` requires a directly observed failure. Never assign `FAIL` to an unverifiable item — use `Not Accessible`, `Unknown`, or `REQUIRES MANUAL ACTION`.

---

## §1 Evidence Confidence

Report a confidence row for **every** environment. Conclusions may be drawn **only** for environments backed by objective evidence, and never inferred from another environment.

**Confidence Matrix**

| Environment | Confidence | Evidence Source | Conclusions Allowed |
|---|---|---|---|
| Local | High / Medium / Low / **Unknown** | Local runtime, local configuration, local API calls | Local only |
| Development | High / Medium / Low / **Unknown** | Development deployment | Development only |
| Preview | High / Medium / Low / **Unknown** | Preview deployment | Preview only |
| Production | High / Medium / Low / **Unknown** | Production runtime, dashboard, logs, real transactions | Production only |

If no objective evidence exists for an environment, report exactly:
```
Confidence: Unknown
Reason: No objective evidence available.
```

## §2 Production Evidence

Every Production conclusion must name its supporting evidence. Acceptable Production evidence:
- Production runtime verification
- Production deployment verification
- Vercel Production configuration (authenticated)
- Production dashboard
- Production logs
- Production API responses
- A real production transaction
- Other objective Production evidence

If none exists, the report must state exactly:
```
Production Status: Unknown
Reason: Production could not be verified from the available evidence.
```

**Forbidden when describing Production** (unless directly quoting evidence): `probably`, `likely`, `most likely`, `appears to be`, `assumed`, `inferred`. If a Production statement cannot be supported by Production evidence, write `Unknown` — not a hedge.

## §3 Operational Evidence

**Real production behavior has higher evidentiary value than local configuration, and is authoritative for Production.**

Examples of Operational Evidence:
- Successful production payment
- Successful production login
- Successful production webhook
- Successful production email delivery
- Successful production push notification
- Successful production cron execution
- Successful production Stripe Checkout
- Successful production API operation

**When Operational Evidence conflicts with a Local investigation:**
1. Treat the production behavior as **confirmed**.
2. Investigate the discrepancy.
3. Do **not** assume Production is incorrect.
4. Determine **why Local and Production differ** (e.g., a variable set in Vercel but absent from `.env.local`).

**Precedence — the one clarification:** Operational Evidence **overrides speculative conclusions**. It **does not** override directly observed facts from the **same** environment. If evidence conflicts, the investigation must **explain the discrepancy** rather than discard either side.

## §4 Cross-Environment Rule

Local configuration and deployed environments are **independent systems**:
- Missing in `.env.local` does not imply missing in Production.
- Present in `.env.local` does not imply present in Production.
- Missing Production access does not imply a Production defect.
- Missing Preview access does not imply a Preview defect.
- Production conclusions require **Production** evidence; Preview conclusions require **Preview** evidence; Local evidence proves only **Local**.

## §5 Environment Independence Rule

Evidence from one environment must **never** determine the state of another without direct objective proof for that other environment.

```
CORRECT                          INCORRECT
Local:      Variable missing.    Production: Variable probably missing.
Production: Unknown.
```

**Scope of Conclusions.** Every conclusion must explicitly identify the environment to which it applies. A conclusion about Local must never be interpreted as a conclusion about Development, Preview, or Production.

## §6 Investigation Quality Check

Before publishing, verify each box. If **any** answer is YES, revise the report first.
```
□ Did any Production conclusion rely only on Local evidence?
□ Did any Preview conclusion rely only on Local evidence?
□ Was an unavailable verification incorrectly classified as Failed?
□ Was Unknown incorrectly reported as Broken/Failed?
□ Was any speculation presented as a conclusion?
□ Was any recommendation based on assumption instead of evidence?
□ Did Operational Evidence contradict any Local conclusion? (if so, §3 governs)
```

## §7 Confidence Summary

Every report must end with:
```
Confidence Summary

Local:        Verified / Unknown / Not Accessible
Development:  Verified / Unknown / Not Accessible
Preview:      Verified / Unknown / Not Accessible
Production:   Verified / Unknown / Not Accessible

Production Evidence Used:
□ Live deployment
□ Production runtime
□ Vercel configuration
□ Dashboard
□ Production logs
□ Production API
□ Real production transaction
□ Operational Evidence
□ Other

Overall Confidence: High / Medium / Low
```

## §8 Investigation Assessment

Every report classifies **its own** confidence — choose exactly one and explain why:
- Correct
- Correct for Local only
- Correct but incomplete
- Based on incomplete visibility
- Incorrect

## §9 Lessons Learned

Mandatory even when no issues are found. Summarize: what was learned · what process weakness was discovered · what should change in future investigations · how similar false conclusions will be prevented.

---

## Standard Report Template

Every Deployment Readiness execution report must follow this skeleton:

```
# Deployment Readiness — <Phase/Task> Execution Report

Authoritative scope: <taken verbatim from the approved plan>
Access constraints: <what was / was not reachable>

## Per task  (repeat per task)
- Objective
- Actions Performed
- Evidence  (label each: Local / Development / Preview / Production / Operational / Repository / Prior report / Cannot verify)
- Verification Result: PASS | FAIL | PARTIAL PASS | REQUIRES MANUAL ACTION
- Remaining Issues

## §1 Evidence Confidence         (Confidence Matrix — all four environments)
## §2 Production Evidence          (named evidence, or "Unknown + reason")
## §3 Operational Evidence         (real production behavior; authoritative for Production)
## Completed
## Failed                          (only directly observed failures)
## Requires Manual Action          (exact variable / scope / mode / service / verification)
## Environment Status              (Local / Development / Preview / Production — Verified / Unknown / Not Accessible / Failed; never conflate the four)
## Evidence Sources
## Blocking Issues                 (Critical / High / Medium / Low)
## Risk Introduced
## Artifact Inventory
## Files Changed                   (tracked files, migrations, external config)
## Scope Compliance                (+ items deferred)
## Master Completion Progress      (Complete / Awaiting Manual Action / Partial / Not Started)
## §6 Investigation Quality Check  (the 7-item checklist, all boxes answered)
## §8 Investigation Assessment     (one classification + why)
## §9 Lessons Learned              (mandatory)
## §7 Confidence Summary           (ends the report)
```

---

## Applicability & Enforcement

- **Mandatory, not a recommendation.** A Deployment Readiness report is not publishable unless it contains §1–§9.
- **Permanent.** This standard applies to every future Deployment Readiness report and replaces any previous reporting convention.
- **Reporting only** — it does not alter phases, tasks, code, Stripe, Supabase, Vercel, or any implementation.
- When production access is unavailable, scope every conclusion to the environments actually observed and mark the rest `Not Accessible` or `Unknown` — never `Failed`, never a hedge. Operational Evidence (§3) is authoritative for Production.

---

## Effect on Previous Reports

Old reports are **not** rewritten. Under this standard, the confidence of specific prior conclusions would change as follows:

- **Runtime verification report — "most probable real state is Production not configured."** Becomes **Production: Unknown / Not Accessible**, and is directly overridden by Operational Evidence (the successful live One Event License payment). This is the single conclusion the standard corrects.
- **Phase 0–3 reports — "Production: Not Accessible."** Already compliant (no Production state inferred). No change.
- **T2.1 investigation — "checkout cannot succeed today."** Was scoped to **Local** (env var unset locally) and remains correct **for Local only**; not a Production statement.
- **One Event License reconciliation.** Confirmed the divergence was incomplete Production visibility, not a defect — the archetypal case §3 now formalizes.

Net: exactly one prior conclusion (the "probably not configured" lean) would flip to `Unknown` and defer to Operational Evidence; all `Not Accessible` statements already conform.
