# Architecture Consistency Audit (pre-Marketplace)

> **Scope:** consistency check across the approved architecture set before `MARKETPLACE_ARCHITECTURE.md`.
> **Audit only** — no redesign, no new concepts, no improvements except where a real inconsistency, gap,
> duplication, or contradiction exists.
> **Source of truth:** `MASTER_PRODUCT_DECISIONS.md`, `OPE_V1_TECHNICAL_DESIGN.md`.
> **Approved architecture:** `OPE_MASTER_SPEC`, `OPE_EVENT_LIFECYCLE`, `OPE_LEARNING_ARCHITECTURE`,
> `OPE_SOURCING_ENGINE`, `WORKER_NETWORK_ARCHITECTURE`, `VENDOR_NETWORK_ARCHITECTURE`.
> **Date:** 2026-06-10.

---

## A. Executive summary

- **Architecture completeness: ~85%.** The OPE planning core, sourcing, worker/vendor fulfillment,
  event lifecycle, and learning loop are coherently specified and well cross-referenced. The principal
  missing block is the **Marketplace** (the next document), plus the *implementations* of the PLANNED
  engines (Vendor, Staffing, Monitoring) and a small set of unsynced source-of-truth items.
- **Major findings:**
  1. **"Marketplace" is overloaded** (C3) — two different systems share the word: the **Event Request
     Marketplace** (demand→organizer; designed in `OPE_V1 §9`, partly built) vs the **future
     Marketplace** (supply-side W3/V3 worker/vendor transactions). This must be disambiguated *before*
     the next doc.
  2. **`OPE_V1_TECHNICAL_DESIGN` has gone stale vs the pivot** (C1, C2): its v1 non-goal "no
     customer-facing planner (organizer-only)" and its LLM-tool-use planner both contradict
     `MASTER §11.5` and the deterministic, public Planner actually built in M1–M3.
  3. **Terminology collisions** ("Verified" across Worker/Vendor/Master; "Marketplace") and a handful of
     **consistent-but-repeated** specializations (matching, trust, expansion, fulfillment).
  4. The contradictions found are **mostly source-of-truth staleness and naming**, not logic conflicts
     in the *active* architecture.
- **Approval recommendation: APPROVE WITH CONDITIONS — proceed to the Marketplace document**, conditioned
  on (i) disambiguating "Marketplace," (ii) parking the `OPE_V1` sync gaps, (iii) aligning Worker's
  ladder wording with Vendor's, and (iv) resolving or explicitly deferring the "Verified"/P12 collision.
  None of these block writing the Marketplace doc; all should be acknowledged in it.

---

## B. Missing coverage (Master decisions → architecture)

| Decision (source) | Representation |
|---|---|
| Mission / Philosophy "helper, not protagonist" (`MASTER §11.1–11.2`) | **Fully** — esp. Vendor §2 ownership |
| Core product filter (§11.3) | **Fully** (implicit across docs) |
| Single Engine Strategy (§11.6) | **Fully** (`OPE_MASTER_SPEC`, ADR-001) |
| Activity Planner is customer-facing (§11.5) | **Fully** in architecture/impl — but **contradicted by `OPE_V1 §1`** (see C1) |
| Monetization "no free core" (§11.8) | **Partially** — Vendor §9 reconciles it; Worker doc is silent; built Planner is currently free (temporary) — see C5 |
| OPE Primary Outcome = **Client Proposal Generator** (§10.3 / `OPE_V1 §13.4`) | **Partially** — architecture made the *consumer plan* primary and treats the proposal as a deferred **view** (`OPE_IMPLEMENTATION_READY §5`); represented but **de-prioritized vs the source** |
| Three loops: Planner / Academy / Organizer Platform (§11.4) | **Partially** — Planner fully; Academy & Organizer Platform appear only as **integration points**, not architected in this set |
| Career Platform / consolidated journey (§10.2) | **Partially / contested** — P13 unresolved; Worker §10 adds a **third** model variant (see Open Decisions) |
| Two-sided design & homepage positioning (§11.7) | **Out of scope** here (product/UX), not an architecture gap |
| Event Request Marketplace (`MASTER §2/§6`, `OPE_V1 §9`) | **Partially** — designed in `OPE_V1` + partly built, but **no dedicated marketplace architecture doc** yet (→ next document) |
| Certification-triggered 30-day access (Addendum) | **Fully** (referenced as the access model / integration) |

---

## C. Contradictions (exact locations)

- **C3 — "Marketplace" overloaded (HIGH).** `MASTER §2/§6` + `OPE_V1 §9` define the **Event Request
  Marketplace** (demand-first: requests → proposals → booking → payment, with `marketplace`/`direct`
  delivery modes; partly implemented). `OPE_SOURCING_ENGINE §10`, `WORKER §11 (W3)`, `VENDOR §9–§10 (V3)`
  reference a **"future Marketplace"** for **worker/vendor transactions**. **Two distinct systems, one
  word** — must be disambiguated before/in the next doc.
- **C1 — Customer-facing planner (MEDIUM).** `OPE_V1 §1` non-goal "No customer-facing planner
  (organizer-only)" and §1 "Who can use it: `certified_organizer` + active subscription" **contradict**
  `MASTER §11.5` (Activity Planner is a customer surface) and the **public consumer Planner built in
  M1–M3** (`lib/ope`, public action). `MASTER §11.5` notes "OPE §1.3 to be amended separately" — **never
  done**. Stale source-of-truth conflict.
- **C2 — Deterministic vs LLM planner (MEDIUM).** `OPE_V1 §6` (LLM tool-use planner), `§7.6` (LLM spend
  controls), `§13.2` (model/quota policy) **contradict** the **deterministic, no-LLM** engine in
  `OPE_CORE_MVP`, `OPE_MASTER_SPEC` ("AI = deterministic templating"), and the built `lib/ope`. The
  architecture moved off LLM; `OPE_V1 §6` was not amended.
- **C4 — Ladder framing inconsistent across approved docs (MEDIUM).** `WORKER §11` says it **"Mirrors the
  Sourcing L0–L3 ladder"**; `VENDOR §9` says it **"parallels… not a strict 1:1 (V1 and V2 both live
  inside Sourcing L2)."** Same relationship, two descriptions — Worker's "mirror" is the imprecise one
  (was Worker-review M2, not yet applied).
- **C5 — Monetization treatment inconsistent (MEDIUM).** `VENDOR §9` explicitly reconciles free
  onboarding with `MASTER §11.8` ("monetized layer = the transaction, not registration"); `WORKER` has
  **no equivalent statement**; and the **built Planner is currently free**, contradicting §11.8
  (acknowledged temporary). Same principle, uneven treatment.

> No conflicting **lifecycle states**, **sourcing rules**, or **ownership models** were found among the
> *active* architecture docs — Worker/Vendor/Sourcing/Lifecycle/Learning are mutually consistent.

---

## D. Duplications (consistent, but repeated — sync-risk)

- **D1 — "Verified."** Three meanings: `WORKER §11 (W2 Verified Workers)`, `VENDOR §9 (V2 Verified
  Vendor)`, `MASTER §3/P12 (Verified Organizer)`. Naming collision; verification authority/cost undefined
  in all three (see E1).
- **D2 — Matching.** Defined in `OPE_SOURCING_ENGINE §5` and re-specified (hard/soft filters) in
  `WORKER §4` and `VENDOR §1/§8`. Specializations, consistent, but repeated.
- **D3 — Trust / reputation.** Stated in `SOURCING §9`, `WORKER §9/§9A`, `VENDOR (ratings + summary)` —
  all cite `OPE_LEARNING_ARCHITECTURE`. Repeated narrative; one owner.
- **D4 — Capability expansion / adjacency governance.** Near-identical in `WORKER §8` and `VENDOR §7`.
- **D5 — Fulfillment / acceptance workflow.** Parallel state lists in `SOURCING §7`, `WORKER §7`,
  `VENDOR §8`.

> These are **acceptable specialization**, not contradictions — but if the canonical definition (Sourcing
> / Learning) changes, **all dependents must be re-synced**. Flagged so the Marketplace doc reuses, not
> re-defines.

---

## E. Undefined concepts (referenced but not specified)

- **E1 — Verification mechanism/authority.** W2/V2 "verified" is referenced (`WORKER §12`, `VENDOR §9`,
  Learning Arch) but **who verifies, how, and at what cost is undefined** — and collides with the open
  `MASTER P12` (Verified Organizer + verification fee).
- **E2 — "Expert" / "expert review."** The safety-knowledge gate (`OPE_LEARNING_ARCHITECTURE`, `WORKER
  §9/§12`, `VENDOR`) names an **"expert"** role/entity that is **never modeled** (who, how appointed).
- **E3 — `request_brief`.** The OPE→Marketplace handoff (`OPE_SOURCING_ENGINE`, `OPE_MASTER_SPEC §14`) is
  named but its **contract is PLANNED/unspecified**.
- **E4 — "Marketplace."** Referenced pervasively (W3/V3 + Event Requests) but **not yet defined as
  architecture** — the expected gap the next document fills (not an error).

---

## F. Remaining architecture documents / future dependencies (list only)

- **Marketplace** — *both* senses (Event Request demand-side vs W3/V3 supply-side transactions); scope to
  be set by the next doc.
- **Verification / Trust layer** — W2/V2 verification authority + the "expert" role (E1, E2).
- **Payment Engine for sourcing transactions** — distinct from the existing booking checkout (Event
  Request bookings already pay via `createBookingCheckout`).
- **Vendor Engine, Staffing Engine, Monitoring/Learning** — implementations of `OPE_MASTER_SPEC` blocks
  currently PLANNED/PARTIAL.
- **Community modifier** and the **additional patterns** (Conference / Performance / Tournament /
  Expedition) — coverage gaps from `OPE_PATTERN_COVERAGE_ANALYSIS`.
- **`request_brief` handoff contract** (E3).
- *(Certification and Academy already exist — integration points, not new architecture.)*

---

## (Audit Objective 6) Open decisions — genuine, unresolved

- **`MASTER P11`** — subscription price ($9.99 vs $29).
- **`MASTER P12`** — Verified Organizer data model + **verification fee** (collides with W2/V2 — D1/E1).
- **`MASTER P13`** — career-journey model (§10.2 6-step vs Career Path 9-stage) — **now a 3-way** open
  item, since `WORKER §10` introduces a 4-step `Participant→Worker→Organizer→Certified` variant.
- **`MASTER P9/P10`** — proposal naming / canonical output schema: **resolved in
  `OPE_IMPLEMENTATION_READY §5`** (OUTPUTS_V1 canonical; proposal = a view) but **not synced back to
  `MASTER §11.9`** → resolved-in-architecture, still-open-in-source.
- **`OPE_V1 §13`** — #1 pricing curation/granularity, #5 KB seed breadth: partly settled by the MVP
  (`OPE_IMPLEMENTATION_READY §3/§4`) but **not synced** to `OPE_V1`. (#3 currency resolved; #4 resolved.)
- **Worker-review items not yet applied** — M2 (ladder wording, = C4), M4 ("Verified", = D1), M5 (career
  path, = P13), M6 (Staffing PARTIAL dependency), M9 (reputation per-capability vs global). C1/C2/M1 were
  applied; these remain open.
- **Marketplace scope** — which "Marketplace" the next doc covers (C3) is itself an open decision.

---

## G. Recommended next document (single)

**Proceed to `MARKETPLACE_ARCHITECTURE.md`** — scoped to the **supply-side W3/V3 transaction layer**
(worker + vendor bookings, payments, contracts, ratings, disputes), and **opening with an explicit
disambiguation** from the existing **Event Request Marketplace** (`OPE_V1 §9`, demand-side, partly built)
so the two systems never collide (resolves C3). It should **reuse** (not re-define) the Sourcing
acceptance workflow, the Learning trust classes, and the W/V ladders, and should **name** the
verification/expert and `request_brief` gaps (E1–E3) as inputs it depends on rather than redefining them.

_Audit only. No redesign, no implementation, no schema/UI. Findings reflect the cited documents as of the
date above._
