# Master Decisions — Apply Plan (Disposition Review)

> **Purpose:** decide ACCEPT / REJECT / DEFER for each proposed decision P1–P13 from
> `MASTER_DECISIONS_UPDATE_PROPOSAL.md`, producing the final list to apply to
> `MASTER_PRODUCT_DECISIONS.md`.
> **Inputs:** `MASTER_DECISIONS_UPDATE_PROPOSAL.md`, `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md`,
> `ACTIVITY_PLANNER_AND_OPE_RELATIONSHIP.md`.
> **Type:** decision record. No existing document was modified by this file.
> **Date:** 2026-06-05

**Disposition key:** **ACCEPT** → apply to Master now · **DEFER** → decide before OPE build (not yet)
· **OPEN** → keep tracked, no decision yet. (No item is REJECTED.)

## Disposition table

| ID | Decision | Disposition | One-line rationale |
|---|---|---|---|
| P1 | Mission — "The World Needs More Organizers" | **ACCEPT** | Foundational "why"; cheap to record, high steering value. |
| P2 | Philosophy — "People create the best moments…" | **ACCEPT** | Sets posture (helper, not hero); guards against social-feed drift. |
| P3 | Core Product Filter | **ACCEPT** | Operationalizes §9 constraints into one testable yes/no gate. |
| P4 | Three-loop Platform Structure | **ACCEPT** | Canonical product map above the §2 marketplace models. *(deep dive below)* |
| P5 | Activity Planner (user-facing surface) | **ACCEPT** | New audience surface; resolves the OPE §1.3 contradiction. *(deep dive)* |
| P6 | Single Engine Strategy | **ACCEPT** | One OPE Core; prevents drift + protects the demand→supply loop. *(deep dive)* |
| P7 | Two-sided Design + Homepage positioning | **ACCEPT** | States the demand/supply design rule + homepage order. |
| P8 | Subscription & Gating | **ACCEPT** | Settles the gating model (free to plan, paid to sell). *(deep dive)* |
| P9 | OPE artifact & "proposal" naming standard | **DEFER** | Needed before OPE build, not before strategy lock. |
| P10 | Canonical OPE output schema | **DEFER** | Technical reconciliation; settle alongside OPE build. |
| P11 | Subscription price ($9.99 vs $29) | **OPEN** | Real inconsistency, but a pricing call to make deliberately. |
| P12 | Verified Organizer (model + fee) | **OPEN** | Not yet prioritized; keep tracked. |
| P13 | Career-journey model consolidation | **OPEN** | Low risk; consolidate later. |

---

## Deep dives

### P4 — Three-loop Platform Structure → **ACCEPT**
- **Why accept:** Master §2 only defines the two *marketplace models* (Ready Activities / Event
  Requests). It has no record of the higher **product structure** — Activity Planner · Organizer
  Academy · Organizer Platform. These are different layers; both must live in the source of truth.
- **Effect:** every team gets a shared map of "which loop am I building in" and how they funnel.
- **If rejected/deferred:** teams keep conflating "marketplace" with "the whole product" and
  under-invest in the Academy and the user-facing planner. → accept now.

### P5 — Activity Planner (user-facing surface) → **ACCEPT**
- **Why accept:** this is a **new audience-facing surface** and it **directly contradicts OPE §1.3**
  ("No customer-facing planner — organizer-only"). A contradiction of that magnitude must be resolved
  at the decision level, not left implicit.
- **Key qualifier (carried into Master):** Activity Planner is a **surface over OPE Core**, *not* a
  separate product (depends on P6). Master records it as such and notes that **OPE §1.3 must be
  amended separately** (in the OPE doc, not here).
- **Effect:** opens a mass-audience, top-of-funnel entry point that also generates marketplace demand
  (a user's plan → an Event Request).
- **If rejected/deferred:** OPE stays "organizer-only" on paper while strategy assumes a user planner —
  build proceeds on conflicting premises. → accept now, tied to P6.

### P6 — Single Engine Strategy → **ACCEPT**
- **Why accept:** the decisive architectural choice. One **OPE Core** (scenario · KB · planning · cost
  engine) under multiple surfaces guarantees **consistent estimates** between a user's budget and an
  organizer's quote, enables the **demand→supply conversion loop** natively, and avoids двух-engine
  drift, double maintenance, and brand inconsistency.
- **Effect:** KB + Pricing are shared Core content (authored once per category); only the
  **professional output layer** (proposals, quoting, earning) is organizer-gated.
- **If rejected/deferred:** risk of two divergent engines → **inconsistent numbers at the
  user→organizer handoff (trust damage)** and a severed core loop. This is the single most important
  accept. → accept now.

### P8 — Subscription & Gating → **ACCEPT**
- **Why accept:** resolves the launch-blocking conflict (Review C4) between "earn before commitment"
  (Career Path) and "pay-to-access" (Master §4). With P5+P6 accepted, the model is now clear:
  - **Free:** planning **for yourself** (Activity Planner, the user surface of OPE Core).
  - **Gated (certified + active subscription, per §4):** **selling to clients** — client proposals,
    marketplace earning, the organizer dashboard.
- **What is decided now:** the **gating model** (plan-for-self = free; sell-to-clients = paid).
- **What remains to finalize (not blocking):** the precise free→paid boundary inside the aspiring
  path (e.g., a free *first* client proposal before subscription vs subscribe-at-certification). This
  is an implementation detail, recorded as a follow-up — the model itself is decided.
- **If rejected/deferred:** the activation funnel can't be built coherently. → accept the model now;
  finalize the boundary detail during build.

---

## Final list to apply to MASTER_PRODUCT_DECISIONS.md

- **APPLY (ACCEPT):** P1, P2, P3, P4, P5, P6, P7, P8 → added as a new dated section **§11 "Platform
  Structure & Engine — 2026-06-05"** (existing §1–§10 preserved unchanged).
- **DEFER (recorded as deferred in Master, not decided):** P9, P10.
- **OPEN (recorded as open in Master):** P11, P12, P13.
- **Not for Master (technical):** `risk` knowledge_kind, OPE §13 Q3 currency, Q5 KB breadth — keep in
  OPE/KB.

_Review complete. This plan modifies no existing document; the Master update is applied separately and
shown as a diff._
