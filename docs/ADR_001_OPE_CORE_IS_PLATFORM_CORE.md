# ADR-001 — OPE Core is the platform core (and is structured as named engines)

- **Status:** Accepted
- **Date:** 2026-06-10
- **Deciders:** project owner + engineering
- **Related:** `docs/OPE_MASTER_SPEC.md`, `docs/OPE_GAP_ANALYSIS.md`,
  `docs/OPE_V1_TECHNICAL_DESIGN.md`, `docs/ACTIVITY_PLANNER_OUTPUTS_V1.md`

---

## Context

ActivLife Hub is built around **OPE (the Organizer Planning Engine)**. OPE is the core: the other
systems — Academy, Certification, Marketplace, and the future Crew/Vendor Networks — exist to feed,
qualify, source for, or consume OPE's output (see `OPE_MASTER_SPEC.md`, Appendix C).

The engine was first written as CLI scripts, then ported into `lib/ope/*` and wired to the live
Planner. That port left the pipeline as a **single monolith**: `engine.ts` fused Scenario Assembly,
Resource Planning, the Output Builder, the Risk Engine, and the Communication/AI layer; Activity
Classification was scattered across `index.ts` and `data.ts`. The gap analysis
(`OPE_GAP_ANALYSIS.md`) recommended a **hybrid** path: refactor the working code into explicit
engine boundaries (no logic change), then extend it — rather than rewrite from scratch (which would
discard correct, tested deterministic code) or leave it monolithic (which blocks the spec's engines
from plugging in).

## Decision

1. **OPE Core is the architectural center of the platform.** Features are added as OPE engines /
   modules or as systems that connect to OPE, not as parallel planners. There is **one engine**
   serving both the consumer Planner and (later) the Organizer Platform (Single Engine Strategy).

2. **OPE is organized as named engine modules**, one concern per file, matching
   `OPE_MASTER_SPEC.md`:
   - `classify.ts` — Activity Classification (Stage 1), exposing `classifyActivity()`.
   - `assembly.ts` — Scenario Assembly (Stage 2).
   - `resources.ts` — Resource Planning (Stage 3).
   - `budget.ts` — Budget Engine (Stage 4) + `pricing.ts` (PricingProvider chain).
   - `risk.ts` — Risk Engine (Stage 7).
   - `output.ts` — Output Builder (Stage 14, `ACTIVITY_PLANNER_OUTPUTS_V1`).
   - `communication.ts` — Communication / AI layer (Stage 6).
   - `engine.ts` — thin orchestrator (`runEngine`); `index.ts` — public `generatePlan()`.

3. **This refactor changes structure only — never behavior.** The `generatePlan()` signature and the
   `ACTIVITY_PLANNER_OUTPUTS_V1` output are frozen contracts. Any future change to engine output must
   be **intentional and explained**, and the snapshot fixture updated deliberately.

4. **Output compatibility is enforced by a snapshot test.**
   `scripts/ope-snapshot-test.mts` regenerates a fixed set of cases and compares them byte-for-byte
   against `scripts/__fixtures__/ope-golden.json` (`npm run test:ope`). The fixture is only updated
   with `--update`, which must accompany a documented reason.

## What this refactor did / did not do

**Did:** split the monolith into the modules above; extracted `classifyActivity()`; left Assembly,
Budget, Risk, Output and Communication logic byte-identical.

**Did NOT:** add Vendor or Crew Network, any UI, any new planner feature, any payment work, or any
classification routing / complexity tiering (those remain `PLANNED` per the spec and gap analysis).

## Verification (evidence)

- Golden output captured **before** the refactor: 76,328 bytes, sha256 `bd9f8634…`.
- Same harness **after** the refactor: 76,328 bytes, sha256 `bd9f8634…` — `diff` empty.
- **Result: byte-for-byte identical output across all 5 cases** (priced-local, fallback-seed,
  no-subtype, bbq, unpriced).
- `tsc --noEmit` passes; `next build` compiles successfully; `npm run test:ope` passes.

## Consequences

**Positive**
- Each spec engine has a home; new engines (Execution, Vendor, Staffing, Monitoring) and P1
  extensions (classification routing, personalization, real pricing, `request_brief`) can be added
  without touching unrelated code.
- The snapshot test makes output drift a visible, deliberate act — protecting the live Planner.
- Reinforces the single-engine principle: the consumer Planner and future Organizer surface share
  this exact core.

**Negative / trade-offs**
- More files and one extra internal indirection (orchestrator → modules) for a small pipeline.
- The snapshot fixture must be consciously updated when output is *meant* to change; a forgotten
  `--update` will (correctly) fail CI/local checks.

**Neutral**
- No runtime behavior, dependency, or data change. The four duplicated CLI scripts noted in the gap
  analysis remain a separate, later cleanup (archive `scripts/*-ope.mjs`) — out of scope here.

## Compliance rule (going forward)

> Any PR that changes `lib/ope/*` must keep `npm run test:ope` green. If the change intends to alter
> output, it must say so explicitly, update the fixture with `--update`, and note the reason in the
> PR description (and, if architectural, in a follow-up ADR).
