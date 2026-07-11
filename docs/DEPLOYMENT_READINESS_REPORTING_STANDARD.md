# Deployment Readiness — Reporting Standard

**Status:** MANDATORY · PERMANENT · effective 2026-07-11
**Applies to:** every Deployment Readiness execution report and every deployment-configuration investigation, from this date forward.
**Type:** process/reporting standard only. It does not change any Deployment Readiness *phase*, task, code, or infrastructure — only how results are reported and how confidence is expressed.

---

## Why this standard exists

During the Stripe Deployment Readiness investigation, a report verified the **Local** environment correctly but then included a **speculative statement about Production** ("most probable state: not configured"). Production was later confirmed **healthy** (a real live One Event License payment had already succeeded). The local findings were technically correct; the failure was in the *reporting*: a Production conclusion was drawn from Local-only evidence.

Root cause: **incomplete Production visibility was reported as a probable Production state.** This standard permanently eliminates that class of error.

---

## The Four States Rule (foundational)

`Verified`, `Unknown`, `Not Accessible`, and `Failed` are **four distinct states**. They must never be mixed or substituted. Mixing them is exactly what produced the Stripe false conclusion.

| State | Definition | Requires |
|---|---|---|
| **Verified** | Objective evidence for **this** environment shows the item is present/working. | Positive evidence from this environment. |
| **Failed** | Objective evidence for **this** environment shows the item is absent/broken. | An **observed** failure in this environment. |
| **Not Accessible** | The environment could not be reached or inspected (no credentials/token/dashboard/runtime access). | A stated access limitation. |
| **Unknown** | No objective evidence exists to determine the state (often *because* it was Not Accessible). | Explicit "no evidence available." |

**Hard rules:**
- `Not Accessible` and `Unknown` are **not** `Failed`. Absence of visibility is never a defect.
- `Failed` requires an **observed** failure — never an inference.
- A `FAIL` verdict must never be assigned to an item that was merely unverifiable; use `NOT ACCESSIBLE` / `Unknown` / `REQUIRES MANUAL ACTION` instead.

---

## Mandatory report sections

Every Deployment Readiness report MUST contain the following, in addition to the existing per-task deliverable (Objective / Actions Performed / Evidence / Verification Result / Remaining Issues). Verification Result uses: **PASS · FAIL · PARTIAL PASS · REQUIRES MANUAL ACTION**.

### 1. Evidence Confidence (mandatory)

Report a confidence row for **every** environment. Conclusions may be drawn **only** for environments backed by objective evidence.

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
Never infer one environment's state from another.

### 2. Production Evidence (mandatory)

Every statement about Production must name its supporting evidence. Acceptable Production evidence:
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

**Forbidden when describing Production** (unless directly quoting evidence): `probably`, `likely`, `most likely`, `appears to be`, `assumed`, `inferred`. If you cannot support a Production statement with Production evidence, write `Unknown` — not a hedge.

### 3. Cross-Environment Rule (mandatory)

Local configuration and deployed environments are **independent systems**:
- Missing in `.env.local` **does not** imply missing in Production.
- Present in `.env.local` **does not** imply present in Production.
- Missing Production access **does not** imply a Production defect.
- Missing Preview access **does not** imply a Preview defect.
- Production conclusions require **Production** evidence; Preview conclusions require **Preview** evidence; Local evidence proves only **Local**.

### 4. Environment Independence Rule (mandatory)

Evidence from one environment must **never** determine the state of another without direct objective proof for that other environment.

```
CORRECT                          INCORRECT
Local:      Variable missing.    Production: Variable probably missing.
Production: Unknown.
```

### 5. Investigation Quality Check (mandatory pre-publish gate)

Before publishing, verify each box. If **any** answer is YES, revise the report first.
```
□ Did any Production conclusion rely only on Local evidence?
□ Did any Preview conclusion rely only on Local evidence?
□ Was an unavailable verification incorrectly classified as FAIL?
□ Was "Unknown" / "Not Accessible" incorrectly reported as "Broken"/"Failed"?
□ Was any speculation presented as a conclusion?
□ Was any recommendation based on assumption instead of evidence?
```

### 6. Confidence Summary (mandatory — ends every report)

```
Confidence Summary

Local:        Verified / Unknown
Development:  Verified / Unknown
Preview:      Verified / Unknown
Production:   Verified / Unknown

Production Evidence Used:
□ Live deployment
□ Production runtime
□ Vercel configuration
□ Dashboard
□ Production logs
□ Production API
□ Real production transaction
□ Other

Overall Confidence: High / Medium / Low
```
(Use `Not Accessible` in place of a verdict wherever access was unavailable; it is distinct from both `Verified` and `Failed`.)

### 7. Investigation Assessment (mandatory)

Every report classifies **its own** confidence — choose exactly one and explain why:
- Correct
- Correct for Local only
- Correct but incomplete
- Based on incomplete visibility
- Incorrect

### 8. Lessons Learned (mandatory — even when no issues are found)

Summarize: what was learned · what process weakness was found · what should change in future investigations · how similar false conclusions will be prevented.

---

## Standard report template

Every Deployment Readiness execution report must follow this skeleton:

```
# Deployment Readiness — <Phase/Task> Execution Report

Authoritative scope: <taken verbatim from the approved plan>
Access constraints: <what was / was not reachable>

## Per task  (repeat per task)
- Objective
- Actions Performed
- Evidence  (label each: Local / Development / Preview / Production / Repository / Prior report / Cannot verify)
- Verification Result: PASS | FAIL | PARTIAL PASS | REQUIRES MANUAL ACTION
- Remaining Issues

## Evidence Confidence            (§1 — table, all four environments)
## Production Evidence            (§2 — named evidence, or "Unknown + reason")
## Completed
## Failed                         (only OBSERVED failures)
## Requires Manual Action         (exact var/scope/mode/service/verification)
## Environment Status             (Local / Development / Preview / Production — Verified / Not Accessible / Unknown; never conflate)
## Evidence Sources
## Blocking Issues                (Critical / High / Medium / Low)
## Risk Introduced
## Artifact Inventory
## Files Changed                  (tracked files, migrations, external config)
## Scope Compliance               (+ items deferred)
## Master Completion Progress     (Complete / Awaiting Manual Action / Partial / Not Started)
## Investigation Quality Check    (§5 — the checklist, all boxes answered)
## Investigation Assessment       (§7 — one classification + why)
## Lessons Learned                (§8 — mandatory)
## Confidence Summary             (§6 — ends the report)
```

---

## Applicability & enforcement

- This is a **mandatory rule**, not a recommendation. A Deployment Readiness report is not publishable unless it contains §1–§8.
- It governs **reporting only** — it does not alter phases, tasks, code, Stripe, Supabase, Vercel, or any implementation.
- When production access is unavailable, the report must scope every conclusion to the environments actually observed and mark the rest `Not Accessible` / `Unknown` — never `Failed`, never a hedge.

---

## Effect on previous reports (do not rewrite)

Old reports are **not** rewritten. Under this standard, the confidence of specific prior conclusions would change as follows:

- **Runtime verification report — "most probable real state is Production not configured."** Would now be **Production: Unknown / Not Accessible** (no Production evidence). This is the single conclusion the standard directly corrects.
- **Phase 0–3 reports — "Production: NOT ACCESSIBLE."** Already compliant (correctly stated no Vercel access; no Production claim inferred). No change.
- **T2.1 investigation — "checkout cannot succeed today."** Was scoped to **Local** (env var unset locally) and remains correct **for Local only**; it should not be read as a Production statement.
- **One Event License reconciliation.** Confirmed the divergence was incomplete Production visibility, not a defect — consistent with this standard.

Net: exactly one prior conclusion (the "probably not configured" lean) would flip to `Unknown` under this standard; all `NOT ACCESSIBLE` statements already conform.
