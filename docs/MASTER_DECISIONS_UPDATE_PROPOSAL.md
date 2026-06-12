# Master Decisions — Update Proposal (Architectural Consolidation)

> **Purpose:** identify which decisions from the newer strategy/architecture documents should be
> **elevated into `MASTER_PRODUCT_DECISIONS.md`** as official Product Decisions.
> **Type:** proposal for review. **No existing document was modified.**
> **Date:** 2026-06-05
> **Sources reviewed:** `MASTER_PRODUCT_DECISIONS.md`, `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md`,
> `ORGANIZER_CAREER_PATH_V1.md`, `ACTIVITY_PLANNER_AND_OPE_RELATIONSHIP.md`,
> `OPE_V1_TECHNICAL_DESIGN.md`. Also references `CONSISTENCY_REVIEW_2026_06_04.md` (M1–M6).

**Priority key:** 🔴 strategic (defines the product's shape) · 🟠 important (resolve before build) ·
🟡 cleanup/consistency.

## Summary table

| ID | Priority | Proposed Master decision | Source | Suggested Master location |
|---|---|---|---|---|
| P1 | 🔴 | **Mission:** "The World Needs More Organizers." | Brand §1 | §1 Vision (add mission line) |
| P2 | 🔴 | **Philosophy:** "People create the best moments of real life. We help." (human is the hero) | Brand §2 | §1 Vision |
| P3 | 🔴 | **Core Product Filter:** "Does this help people become better organizers?" | Brand §3 | §9 Constraints (as the gate) |
| P4 | 🔴 | **Three-loop platform structure:** Activity Planner · Organizer Academy · Organizer Platform | Brand §4 | new §11 (Platform structure) |
| P5 | 🔴 | **Activity Planner is an official user-facing loop** (plan one activity without becoming an organizer) | Brand §4, AP↔OPE | new §11 |
| P6 | 🔴 | **Single Engine Strategy:** Activity Planner + Organizer Platform are surfaces over one OPE Core | AP↔OPE §8 | new §11 + amend OPE §1.3 |
| P7 | 🟠 | **Two-sided design + Homepage positioning:** user-first / organizer-second; design for both sides | Brand §6, §7 | §2 / new §11 |
| P8 | 🔴 | **Subscription & gating timing for the aspiring path** (free user surface vs gated organizer surface) | AP↔OPE §4, Review C4/M2 | §4 (extend) |
| P9 | 🟠 | **OPE artifact & "proposal" naming standard** (plan / assessment / proposal; marketplace proposal vs proposal document) | Review N1/N2/M4 | §5 / §6 (note) |
| P10 | 🟠 | **Canonical OPE output schema** (reconcile assessment §9.2 vs proposal §10.3) | Review C3/M1 | §10.3 (extend) |
| P11 | 🟡 | **Subscription price** reconciliation ($9.99 vs $29) | Master §4 note, Review C5/M5 | §4 |
| P12 | 🟡 | **Verified Organizer** formalization (data model + verification fee amount) | Master §3/§7, Review M6 | §3 / §7 |
| P13 | 🟡 | **Canonical career-journey model** (reconcile 6-step §10.2 vs 9-stage Career Path) | Career Path §3, Master §10.2 | §10 |

Items intentionally **not** proposed for Master (technical, keep in OPE/KB): see §3.

---

## 1. Detailed proposals

### P1 🔴 Mission — "The World Needs More Organizers."
- **Decision:** adopt this as ActivLife Hub's official mission statement.
- **Source:** `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md` §1.
- **Reason:** Master §1 states a *vision* ("trust-first platform connecting…") but no **mission**.
  The mission is the "why" that every other decision serves.
- **Product impact:** anchors prioritization, copy, positioning, and the Core Product Filter (P3).
- **Risk if not recorded:** strategy drifts; teams optimize the marketplace as an end in itself
  rather than as a means to grow the supply of organizers.

### P2 🔴 Philosophy — "People create the best moments of real life. We help."
- **Decision:** record the human-is-the-hero philosophy as a guiding principle.
- **Source:** Brand §2.
- **Reason:** sets the product's posture — assistant, not protagonist; we don't manufacture
  friendship/community, we enable the person who does.
- **Product impact:** keeps the product humble and tool-like; discourages engagement-for-its-own-sake
  feature design.
- **Risk if not recorded:** feature creep toward social-network mechanics that Master §9 already warns
  against, without a positive principle to steer by.

### P3 🔴 Core Product Filter — "Does this help people become better organizers?"
- **Decision:** make this the official scope-gate for every new feature.
- **Source:** Brand §3.
- **Reason:** Master §9 lists *negative* constraints ("don't build X"); this is the *positive*,
  testable filter that operationalizes them.
- **Product impact:** a single, repeatable yes/no test for roadmap decisions and scope-creep defense.
- **Risk if not recorded:** scope-creep arguments are litigated case-by-case with no shared criterion.

### P4 🔴 Three-loop platform structure
- **Decision:** record the canonical structure — **Activity Planner · Organizer Academy · Organizer
  Platform** — as the three interconnected product loops.
- **Source:** Brand §4.
- **Reason:** Master §2 currently describes only the two **marketplace models** (Ready Activities /
  Event Requests), not the higher-level **product structure**. These are different layers and both
  belong in the source of truth.
- **Product impact:** gives every team a shared map of "which loop am I building in" and how they
  funnel into one another.
- **Risk if not recorded:** teams conflate "marketplace" with "the whole product" and under-invest in
  the Academy and the user-facing Activity Planner.

### P5 🔴 Activity Planner is an official user-facing loop
- **Decision:** formally adopt Activity Planner — help an everyday **user** organize one specific
  activity **without becoming an organizer** (Birthday, Picnic, BBQ, Immigrant Meetup, Family/Hobby
  Gathering).
- **Source:** Brand §4; `ACTIVITY_PLANNER_AND_OPE_RELATIONSHIP.md`.
- **Reason:** this introduces a **new audience-facing surface** that Master does not yet recognize —
  and it directly **contradicts OPE §1.3** ("No customer-facing planner — organizer-only"). The
  contradiction must be resolved at the decision level.
- **Product impact:** opens a top-of-funnel, mass-audience entry point that also generates marketplace
  demand (a user's plan → an Event Request).
- **Risk if not recorded:** OPE remains "organizer-only" on paper while strategy assumes a user-facing
  planner — design and build proceed on conflicting premises.

### P6 🔴 Single Engine Strategy
- **Decision:** Activity Planner and Organizer Platform are **surfaces over one shared OPE Core**
  (scenario · KB · planning · cost engine); they differ only in input depth, output template,
  capability gating, and pricing layer. Amend OPE §1.3 so the **Core is shared** and only the
  **professional output layer** (proposals, quoting, marketplace earning) is organizer-gated.
- **Source:** `ACTIVITY_PLANNER_AND_OPE_RELATIONSHIP.md` §8.
- **Reason:** prevents two divergent engines; guarantees consistent estimates between a user's budget
  and an organizer's quote; enables the demand→supply conversion loop natively.
- **Product impact:** one KB + one cost engine power users, organizers, and Event-Request assessments;
  faster category expansion; shared learning; lower cost.
- **Risk if not recorded:** the org may build a separate user planner → KB/cost drift, **inconsistent
  numbers at the user→organizer handoff (trust damage)**, double maintenance, and a severed
  demand→supply loop (the platform's core thesis).

### P7 🟠 Two-sided design + Homepage positioning
- **Decision:** record (a) the product must be designed for **both** sides of the marketplace (user =
  demand, organizer = supply), and (b) the homepage leads **user-first**, with organizer recruitment
  at the **second level**.
- **Source:** Brand §6, §7.
- **Reason:** Master §2 implies two-sidedness but doesn't state the design rule or the homepage
  ordering as decisions.
- **Product impact:** guides homepage IA, growth strategy, and balanced investment across sides.
- **Risk if not recorded:** the product over-indexes on organizers (no demand) or on users (no supply);
  homepage debates recur without a settled principle.

### P8 🔴 Subscription & gating timing for the aspiring path
- **Decision:** define **when** the monthly subscription begins and **where** the free user surface
  ends and the gated organizer surface begins (e.g., free Activity Planner + free first proposal vs
  subscribe at certification).
- **Source:** `ACTIVITY_PLANNER_AND_OPE_RELATIONSHIP.md` §4; `CONSISTENCY_REVIEW_2026_06_04.md` C4/M2.
- **Reason:** Master §4 gates the dashboard/OPE on **certified + active subscription**, but the Career
  Path promises **income before commitment** ("reach First Income"). These conflict; an aspiring
  organizer currently can't use OPE for a first proposal without paying first.
- **Product impact:** determines the entire activation funnel and the free→paid conversion model.
- **Risk if not recorded:** **launch-blocking** — the go-to-market promise (earn first) and the access
  model (pay first) contradict; the first-income funnel can't be built coherently.

### P9 🟠 OPE artifact & "proposal" naming standard
- **Decision:** standardize names — `plan` (internal) → *assessment* (pre-organizer view) →
  *proposal document* (organizer output); and disambiguate **"marketplace proposal"** (the request-flow
  record) vs **"proposal document"** (OPE output).
- **Source:** `CONSISTENCY_REVIEW_2026_06_04.md` N1/N2/M4.
- **Reason:** "proposal" currently names two different things; three terms describe related OPE
  artifacts with undefined lineage.
- **Product impact:** clear language across product, docs, and UI; "Attach proposal to client request"
  becomes unambiguous.
- **Risk if not recorded:** persistent confusion in specs and UI; mis-wired features at the
  proposal↔request seam.

### P10 🟠 Canonical OPE output schema
- **Decision:** define one canonical set of OPE outputs; express the §9.2 *assessment* and the §10.3
  *proposal* as **views** of it (reconcile "Equipment/Vendor/Logistics estimates" ↔ "Resource Plan",
  "Operational risks" ↔ "Risk Assessment", add "Executive Summary / Event Timeline / Preparation
  hours" consistently).
- **Source:** `CONSISTENCY_REVIEW_2026_06_04.md` C3/M1.
- **Reason:** OPE §9.2 and Master §10.3 list overlapping-but-differently-named outputs for the same
  engine.
- **Product impact:** one output contract that both the user assessment and the organizer proposal
  render.
- **Risk if not recorded:** assessment and proposal drift into different shapes; rework when they must
  interoperate.

### P11 🟡 Subscription price reconciliation
- **Decision:** set the canonical organizer subscription price (resolve **$9.99/mo billing** vs
  **$29/mo pricing page**).
- **Source:** Master §4 note; Review C5/M5.
- **Reason:** the app charges $9.99 while marketing advertises $29 — an active inconsistency.
- **Product impact:** pricing, billing copy, and unit economics.
- **Risk if not recorded:** customer-facing price mismatch; revenue modeling on the wrong number.

### P12 🟡 Verified Organizer formalization
- **Decision:** formalize the **Verified Organizer** badge — its meaning, **data model**, and the
  **verification fee** amount/cadence.
- **Source:** Master §3 (badge defined, not in schema) and §7 (fee "TBD"); Review M6.
- **Reason:** Master introduces Verified as a paid, stackable badge but leaves it unmodeled and
  unpriced.
- **Product impact:** a second trust signal and a distinct revenue stream.
- **Risk if not recorded:** a promised badge with no implementation path or price; stalls when prioritized.

### P13 🟡 Canonical career-journey model
- **Decision:** reconcile the **6-step** model (Master §10.2: Learn→Certify→Find Clients→Run
  Events→Earn Income→Grow) with the **9-stage** model (Career Path §3: Discover→…→Professional) into
  one canonical funnel; keep success = First Client → First Event → First Income (§10.4).
- **Source:** Career Path §3; Master §10.2/§10.4.
- **Reason:** two stage-count models for the same journey.
- **Product impact:** one funnel definition for analytics, onboarding, and metrics.
- **Risk if not recorded:** metrics and onboarding reference different stage maps.

---

## 2. Recommended sequencing

1. **P5 + P6 + P8** (Activity Planner scope, Single Engine, gating timing) — these are entangled and
   strategically central; decide them together. P8 is launch-blocking.
2. **P1–P3** (Mission, Philosophy, Core Product Filter) — fast to record, high steering value.
3. **P4 + P7** (three-loop structure, two-sided/homepage) — structural framing.
4. **P9 + P10** (naming + output schema) — unblock OPE build cleanly.
5. **P11 + P12 + P13** (price, Verified, journey model) — cleanups.

---

## 3. Intentionally NOT proposed for Master (keep technical)

These belong in OPE/KB technical docs, not in product-level Master Decisions:

- **`risk` as a `knowledge_kind`** (Review M3) — a schema/enum decision for the OPE/KB layer.
- **OPE §13 Q3 currency / no-FX** — already effectively decided in OPE §7.2; a technical confirmation,
  not a product decision. (Recommend marking it resolved **in OPE**, not Master.)
- **OPE §13 Q5 KB breadth** — track in OPE; note only that **wedding is a confirmed launch category**.

---

## 4. How to apply (when approved)

Most items extend Master rather than replace anything: P1–P3 fold into §1/§9; P4–P7 form a **new §11
"Platform Structure & Engine"**; P8/P11 extend §4; P9/P10 extend §5/§6/§10.3; P12 extends §3/§7; P13
extends §10. Per the request, **nothing here is applied** — this is a proposal for your review.

_End of proposal. All five source documents were read only; none were modified._
