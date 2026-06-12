# Activity Planner ↔ OPE — Architectural Relationship

> **Purpose:** define how **Activity Planner** (user-facing) relates to **OPE** (the Organizer
> Planning Engine). Is Activity Planner a **separate product**, or a **surface over the same OPE
> Core** used by the Organizer Platform?
> **Type:** product-architecture analysis. No code, no database, no API.
> **Date:** 2026-06-05 · **Related:** `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md`,
> `OPE_V1_TECHNICAL_DESIGN.md`, `WEDDING_KNOWLEDGE_BASE_V1.md`, `WEDDING_PRICING_REFERENCE_V1.md`,
> `MASTER_PRODUCT_DECISIONS.md`
> **Resolves the open flag** raised in `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md` (Activity Planner
> vs OPE §1.3 "organizer-only").

---

## 0. The key question

The Brand Foundation defines three product loops, two of which both involve *planning*:
**Activity Planner** (help an everyday user organize one specific activity) and **Organizer Platform**
(give working organizers planning leverage via OPE). The architectural question:

> **Do these run on one shared engine, or two independent ones?**

This document analyzes the **preferred direction — Single Engine Strategy** — and recommends it.

```
        Activity Planner  (user surface)
                 │
                 ▼
            ┌──────────┐
            │ OPE Core │  ← shared engine: scenario · knowledge · planning · cost
            └──────────┘
                 ▲
                 │
       Organizer Platform  (professional surface)

   feeding OPE Core:  Knowledge Base (KB)  +  Cost Engine (pricing logic)
   alongside:         Organizer Academy (learning context, same engine)
```

**One engine. Many surfaces.** Activity Planner and Organizer Platform are **two interfaces over the
same OPE Core**, differing in input depth, output format, gating, and the pricing layer — *not* two
separate engines.

---

## 1. Shared components (the OPE Core)

Everything below is **single-sourced** and used by every surface:

- **Scenario model** — the typed description of an event (type, guests, date, location, budget,
  constraints). One vocabulary of inputs.
- **Knowledge Base (KB)** — phases, tasks, resources, risks per category (e.g. the Wedding KB). The
  domain knowledge that makes plans grounded rather than generic.
- **Knowledge retrieval** — selecting the right KB content by category / region / tags.
- **Planning workflow** — turning a scenario + KB into a structured plan (timeline, tasks,
  resources, risks). The "what" engine.
- **Cost Engine** — deterministic estimate logic: derived quantities, cost drivers, low/likely/high
  tiers, contingency. The "how much" engine (separate from the LLM, per OPE §7).
- **Plan object** — the structured result (phases → tasks/resources, cost summary, risks) that every
  surface renders.
- **Risk model** — severity/probability/mitigation, surfaced appropriately per surface.

> The LLM proposes content; the Cost Engine computes money. That separation (OPE §7) holds for **all**
> surfaces — a user's "rough budget" and an organizer's "client quote" come from the *same* math.

---

## 2. Interface differences

Same core, different **skin, depth, output, and gating**:

| Dimension | Activity Planner (user) | Organizer Platform (professional) |
|---|---|---|
| **Language** | consumer, friendly ("plan my picnic") | professional ("client proposal", "quote") |
| **Input depth** | minimal, guided, conservative defaults | full scenario, overridable config |
| **Scope** | one personal event | many events, clients, a business |
| **Primary output** | simple plan + checklist + **budget range** | **client proposal** document (the OPE primary outcome) |
| **Pricing shown** | raw estimate range (no margin/fee) | estimate **+ organizer margin + platform fee**, quote-ready |
| **Detail exposed** | hides line-item/confidence internals | full line items, tiers, confidence, "needs pricing" |
| **Persistence** | lightweight, personal | full plans, revisions, analytics |
| **Gating** | open / low-friction | certified + subscribed (per Master §4) |
| **Marketplace** | can **post an Event Request** (becomes demand) | **answer** requests, earn, convert to activity |

The engine is identical; the **capability flags and output templates** differ.

---

## 3. Capabilities — Regular User (Activity Planner)

A person who just wants to pull off one event well, **without becoming an organizer**:

- Describe a personal scenario (Birthday, Picnic, BBQ, Immigrant Meetup, Family Gathering, Hobby
  Gathering, etc.).
- Receive a **simple plan**: timeline/checklist, what they'll need (resources), key reminders.
- Receive a **rough budget range** (low/likely/high) — raw, no margin/fee.
- Surface the **most important risks** as friendly reminders (not a full risk register).
- Export a **personal checklist** (for themselves).
- **Bridge to the marketplace:** optionally turn the plan into an **Event Request** so organizers can
  bid — this is the demand→supply conversion hook.
- **Not available:** client proposals, quoting, organizer margin, PDF-for-client, convert-to-activity,
  earning. No certification required.

---

## 4. Capabilities — Organizer (in-training / not yet certified)

The aspiring organizer in the Academy path (role on the way to certification):

- Everything the user has, **plus** deeper planning to **learn the craft** — full task lists,
  dependencies, resource detail, the full risk register.
- **Practice proposals** — generate draft proposals to learn, but **not** send them to real clients
  or earn until certified + subscribed.
- Draft PDF export for learning/portfolio.
- **Not yet available:** sending proposals to real client requests, marketplace earning, convert-to-
  activity, analytics, audience building (these unlock at certification + subscription).

> Exact unlock timing (free practice vs gated) depends on the open **subscription-timing** decision
> (`CONSISTENCY_REVIEW_2026_06_04.md` C4 / M2).

---

## 5. Capabilities — Certified Organizer (Organizer Platform)

Certified + subscribed — the full professional surface (Master §3/§4):

- Full OPE Core at full depth, **plus** the professional output layer:
  - **Generate client proposal** (Executive Summary, timeline, staffing/resource plan, budget,
    risks) — the **primary outcome** (Master §10.3).
  - **Attach proposal to a client request** (marketplace or direct mode).
  - **Proposal PDF export** (client-grade).
  - **Convert proposal into a marketplace activity.**
- **Pricing with organizer margin + platform fee** → quote-ready numbers.
- **Earn** through proposal → booking → payment.
- **Analytics, audience building, multi-event management.**

Same engine as the user's Activity Planner — just every capability flag turned on, plus the
monetization and marketplace layers.

---

## 6. Reuse from Wedding KB and the Pricing Engine

The Wedding documents are **not** organizer-only assets — they are **OPE Core content** and are
reused by **all** surfaces:

- **Wedding Knowledge Base** (phases, tasks, resources, risks) → feeds any surface. A *user* planning
  a small wedding-adjacent event gets the same grounded content, just **presented simpler** (key tasks
  and reminders instead of the full 120-task register).
- **Pricing Reference / Cost Engine logic** (derived quantities, cost drivers, low/likely/high,
  contingency) → shared. Activity Planner shows the **raw range**; Organizer adds **margin + platform
  fee** on top of the *same* base estimate. → A user's rough budget and an organizer's quote are
  **consistent**, which protects trust.
- **Category-extensibility:** Wedding is the **template structure**. The same five-part shape (Phases ·
  Tasks · Resources · Risks · Cost Drivers) is how every new category is authored — including the
  consumer categories the Activity Planner needs (Birthday, Picnic, BBQ…). One authoring model serves
  both audiences.

**Net:** building the KB + Pricing logic once powers user planning, organizer planning, and the
preliminary assessment on Event Requests — three uses, one source of truth.

---

## 7. Risks of building two independent engines

- **Two knowledge bases → drift.** The same domain maintained twice diverges; truth fragments.
- **Inconsistent estimates → broken trust.** If a user's planner says one number and an organizer's
  proposal (for the same event) says another, the marketplace loses credibility at the exact handoff.
- **Double maintenance & cost.** 2× LLM workflows, 2× cost logic, 2× testing, 2× quality bar, 2× LLM
  spend.
- **Slower category expansion.** Every new category must be built and validated twice.
- **Fragmented learning.** Improvements and usage data from one engine don't strengthen the other.
- **Broken conversion loop.** If a user's Activity Planner output can't flow into an Event Request and
  then into an organizer's proposal, the **demand→supply loop** (Brand §6) is severed — the strategic
  core of the platform.
- **Brand inconsistency.** Two engines drift into two different "voices" and quality levels.

These risks attack the platform's central thesis (one ecosystem, demand meeting supply). They are
**strategic**, not just engineering, costs.

---

## 8. Recommendation

**Adopt the Single Engine Strategy.** ✅ Recommended.

- **One OPE Core** (scenario · KB · planning workflow · Cost Engine · plan object · risk model),
  single-sourced.
- **Activity Planner and Organizer Platform are surfaces** over that core, differing only in:
  1. **Input depth** (guided/minimal vs full/overridable),
  2. **Output template** (simple plan + budget range vs client proposal + quote),
  3. **Capability flags / gating** (open vs certified+subscribed),
  4. **Pricing layer** (raw estimate vs estimate + margin + platform fee).
- **Organizer Academy** is a *learning context* over the same engine — not a third engine.
- **The KB and Pricing logic are shared content**, authored once per category (Wedding being the
  template), serving users, organizers, and Event-Request assessments alike.

**Why:** consistent estimates (trust), one source of truth (no drift), faster category expansion,
shared learning, lower cost — and, decisively, a **native demand→supply conversion loop**: a user's
plan becomes an Event Request; a certified organizer answers it with a proposal built on the *same*
engine. This is the single-engine payoff the two-engine path cannot deliver.

**What this changes in the source of truth (to record, not changed here):**
- **OPE §1.3 non-goal "No customer-facing planner (organizer-only)" should be revised:** the **OPE
  *Core* is shared**; what remains organizer-only is the **professional output layer** (proposals,
  quoting, marketplace earning), gated by certification + subscription — not the planning engine itself.
- **Raise to Master Decisions:** "Single Engine Strategy — Activity Planner and Organizer Platform are
  surfaces over one OPE Core" as a formal architectural decision.
- **Dependencies:** subscription/gating timing (Review **C4 / M2**) and proposal/artifact naming
  (Review **N1 / N2 / M4**) should be settled alongside, since they define exactly where the user
  surface ends and the organizer surface begins.

> Bottom line: **Activity Planner is not a separate product. It is the consumer surface of OPE Core.**
> One engine, gated and dressed differently for users, organizers-in-training, and certified
> organizers.
