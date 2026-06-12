# OPE Knowledge Model — the reusable expertise behind every plan

> **Type:** product architecture document. No code, UI, or database schema.
> **Goal:** define OPE's **knowledge layer** before implementation — what an organizer *knows*, stored
> as **reusable blocks**, not as a library of scenarios.
> **Sources:** `OPE_MASTER_SPEC.md` (engines), `OPE_PATTERN_LIBRARY.md` (patterns + modifiers),
> `OPE_PATTERN_VALIDATION.md` (coverage), `OPE_CLARIFICATION_ENGINE.md` (unknown → ask),
> `OPE_ACTIVITY_TAXONOMY.md` (the universe), `ADR_001` (one engine, knowledge authored once),
> `ADR_002` (coverage gate).
> **Date:** 2026-06-10.

## 1. What "Knowledge" means in OPE

**Knowledge is encoded organizer expertise that is true independent of any single event.** It is what an
experienced organizer carries in their head and applies to every event they run:

- *"You need roughly 1.25 food servings per adult guest; buffer for kids differently."*
- *"Young children need at least one supervising adult per ~5 kids."*
- *"An outdoor event needs a weather backup and shade/water."*
- *"A public-park BBQ may require a permit."*
- *"A class's budget only works above a minimum enrolment."*

Knowledge is **not** the plan, **not** the pattern, and **not** the engine. Distinguish four layers:

| Layer | What it is | Example |
|---|---|---|
| **Pattern** | the *shape* of organizing | Celebration, Meetup, Class |
| **Modifier** | a *transformation* of a pattern | Recurring, Community, Money |
| **Knowledge** | reusable *expertise* the pattern draws on | "1.25 servings/adult", "1 supervisor / 5 kids" |
| **Engine** | the *machinery* that applies knowledge | Resource, Budget, Risk engines (Master Spec) |

Knowledge is the **content**; the engines are the **machine**. The same engines + the same knowledge
blocks, composed by different patterns, produce thousands of plans — **without a scenario library**
(ADR-001, Single Engine). This document defines that content.

---

## 2. The chain: Activity → Pattern → Modifier → Knowledge → Rules → Plan

```
Activity        a real thing a person wants to organize       "weekly beginners' Spanish meetup, 20 ppl, café"
  │
  ▼ classified as
Pattern         the organizing shape                          Meetup
  │
  ▼ transformed by
Modifier         recurring / community / money                + Recurring + Community
  │
  ▼ which require
Knowledge        the reusable blocks the pattern needs        Attendance, Venue, Food(light), Schedule(cadence),
  │                                                            Safety(light), Pricing, Communications, Membership
  ▼ applied via
Rules            the logic that turns knowledge + inputs       portions = guests × 1.0; reminder cadence = T-7/T-1;
  │              into concrete numbers and decisions           "venue capacity ≥ guests"; pricing = qty × band
  ▼ producing
Plan             the assembled output (OUTPUTS_V1 + artifacts) timeline, checklist, budget, risks, messages, schedule
```

- **Pattern** declares *which knowledge domains/blocks* it needs.
- **Modifiers** add or adjust knowledge needs (Recurring adds schedule-cadence + per-session economics;
  Community adds Membership & Retention; Money adds revenue + compliance).
- **Knowledge Blocks** supply the reusable expertise.
- **Rules** are the deterministic logic inside the blocks (derived quantities, applicability conditions,
  pricing math, safety thresholds) — the part the engines execute.
- **Plan** is the result.

> A "Saturday Spanish meetup" and a "weekly chess meetup" run the *identical* knowledge (Meetup blocks +
> Recurring + Community); only the **content** (topic) and **region** (pricing) differ. That is the whole
> economy: author knowledge once, parameterize by content and region.

---

## 3. Knowledge domains

Thirteen domains of organizer expertise. Each is consumed by a named engine (Master Spec).

| Domain | What OPE must know | Primary engine |
|---|---|---|
| **Resources** | what's needed and how it scales (food, supplies, materials) per guest/unit | Resource Planning |
| **Staffing** | who must run it (helpers, supervisors, facilitators, roles) and ratios | Staffing |
| **Vendors** | what must be sourced (catering, AV, rentals) and from which category | Vendor *(Phase 2)* |
| **Venues** | space types, capacity, accessibility, indoor/outdoor implications | Assembly + Risk + Budget |
| **Equipment** | rentals, AV, seating, tableware, activity gear | Resource + Vendor |
| **Pricing** | cost bands per line item, by region; contingency; low/likely/high | Budget |
| **Risks** | what commonly goes wrong, by pattern and context, + mitigations | Risk |
| **Safety** | supervision ratios, outdoor/water/heat/food hazards, first aid | Risk |
| **Legal / Permits** | permits, licenses, insurance, money/charity compliance | Risk/Classification *(mostly Phase 2)* |
| **Communications** | invite/reminder/thank-you/feedback templates + channel + cadence | Communication |
| **Schedule / Timeline** | phases (prep/day-of/after) + recurring cadence + reminder timing | Assembly + Execution |
| **Participant management** | RSVP, capacity, registration, attendance, retention | Execution + (platform) |
| **Budget logic** | how quantities × prices + contingency roll into a credible range | Budget |

---

## 4. Reusable knowledge blocks

A **block** is a self-contained, reusable unit of organizer knowledge that usually spans several domains.
Patterns **compose** blocks. The same block serves many patterns (§6). Each block defines: *what it
knows*, the *domains* it spans, its *inputs* (what it needs from the scenario — gaps here drive
clarification, §7), and its *outputs* (what it contributes to the plan).

**Universal blocks** (the backbone — used by almost every pattern):
- **Attendance & RSVP Block** — headcount, breakdown, no-show buffer, RSVP handling. *Domains:* resources,
  participant mgmt. *Input:* guest count (±breakdown). *Output:* sized attendance the other blocks scale to.
- **Venue & Space Block** — space types (home/park/hall/rented), capacity, accessibility, indoor/outdoor.
  *Domains:* venues, risk, budget. *Input:* venue type. *Output:* capacity check, outdoor/indoor risk flag,
  venue cost line.
- **Schedule & Cadence Block** — prep/day-of/after phases; (with Recurring) cadence + per-session timing;
  reminder windows. *Domains:* schedule, participant mgmt. *Input:* date (or flexible), recurrence.
  *Output:* timeline + reminder cadence.
- **Safety & Supervision Block** — the curated safety rule set (minors ratios, outdoor/water/heat, food,
  capacity), applicability conditions, mitigations. *Domains:* safety, risk. *Input:* context (kids?
  outdoor? water?). *Output:* applicable risks + mitigations + required supervisors.
- **Pricing & Budget Block** — cost bands per line item by region, contingency, low/likely/high roll-up.
  *Domains:* pricing, budget logic. *Input:* location + line items. *Output:* the budget range.
- **Communications Block** — invite/reminder/thank-you/feedback templates, channel, cadence, dietary/RSVP
  asks. *Domains:* communications. *Input:* event facts (frozen-field guard). *Output:* ready messages.

**Specialized blocks** (used by the patterns that need them):
- **Food & Drink Block** — portions per guest, dietary/allergy handling, food-safety rules, catering vs
  potluck, cost bands. *Spans:* resources, pricing, safety, communications.
- **Equipment & Supplies Block** — tableware, AV, seating, materials, rentals + costs. *Spans:* equipment,
  resources, pricing.
- **Decor & Theme Block** — celebration aesthetics, theme→item mapping, cost. *Spans:* resources, pricing.
- **Instructor / Facilitator Block** — leader role, learner ratio, qualification, fee. *Spans:* staffing,
  pricing, safety.
- **Registration Block** — signup, seat/capacity, waitlist, (with Money) payment link. *Spans:* participant
  mgmt, budget logic.
- **Membership & Retention Block** — roster, onboarding, roles, re-engagement, ongoing comms. *Spans:*
  participant mgmt, communications, staffing. (The **Community modifier** made into knowledge.)
- **Staffing & Roles Block** — helpers/supervisors/volunteers and assignment. *Spans:* staffing, safety.
- **Transport & Logistics Block** — parking, carpool, (for outings) travel/gear. *Spans:* venues, resources.
- **Legal & Permits Block** *(thin in Phase 1)* — park permits, licenses, insurance triggers. *Spans:* legal.
- **Money & Compliance Block** *(Phase 2)* — revenue model, reconciliation, donor/charity compliance.
  *Spans:* budget logic, legal.

---

## 5. What the Big Four must know

For each pattern, the knowledge it must hold to plan **correctly** (required blocks + the specific
expertise inside them).

### Celebration — *host an occasion*
- **Must know:** how food/cake/drinks scale to guests **and** how to handle allergies/dietary; venue
  options + capacity + outdoor implications; decor/theme→items; tableware/supplies; the prep→day-of→thanks
  timeline; **child-supervision ratios and food/weather safety**; regional cost bands for cake, catering,
  decor, rentals, favors; invite/reminder/thank-you messaging.
- **Blocks:** Attendance, Food, Venue, Decor, Equipment, Schedule, **Safety**, Pricing, Communications.

### Meetup — *gather peers*
- **Must know:** turnout uncertainty + RSVP; simple space + capacity + accessibility; light refreshments;
  a basic format/agenda; **(if Recurring)** cadence + how to keep the group warm; small pricing (space +
  refreshments); light safety (capacity, inclusion). **(if Community)** roster + retention.
- **Blocks:** Attendance/RSVP, Venue, Food(light), Schedule(+cadence), Communications, Pricing(light),
  Safety(light), Membership(if Community).

### Class — *one teaches, others learn*
- **Must know:** instructor role + qualification + **learner ratio**; seat capacity + registration + fee;
  **per-seat materials/equipment**; session structure + (if recurring) schedule; space; safety (injury for
  fitness, materials hazards, minors if a kids' class); **per-seat economics / break-even**; enrol→prep→
  reminder→next messaging.
- **Blocks:** Instructor, Registration, Equipment/Materials, Venue, Schedule(+cadence), **Safety**,
  Pricing(per-seat), Communications.

### Club / Community — *keep a group going*
- **Must know:** membership roster + onboarding; recurring cadence; organizer **roles**; the **base
  activity** it repeats (delegates to Meetup/Class/Outing knowledge); **retention/re-engagement**;
  communication over months; **cumulative safety & safeguarding** (esp. minors/vulnerable — the [S]
  modifier); per-session **and** ongoing economics (e.g., membership vs per-event).
- **Blocks:** Membership & Retention, Schedule(recurring), Staffing/Roles, **Safety/Safeguarding**,
  Communications(ongoing), Pricing(per-session + membership), **+ the base-activity blocks** (Food/Venue/
  Instructor) of whatever it repeats.

---

## 6. How knowledge is reused across patterns

**Patterns declare required blocks; blocks are written once and parameterized by content (topic) and
region (pricing).** This is the anti-scenario-library mechanism: not one template per activity, but one
block per kind of expertise, recombined.

**Block × Pattern reuse matrix** (●=core, ○=light/conditional, –=not used):

| Block | Celebration | Meetup | Class | Club/Community | Universal? |
|---|:--:|:--:|:--:|:--:|:--:|
| Attendance & RSVP | ● | ● | ● (seats) | ● (members) | **Universal** |
| Venue & Space | ● | ● | ● | ● | **Universal** |
| Schedule & Cadence | ● | ●(+cadence) | ●(+cadence) | ●(recurring) | **Universal** |
| Safety & Supervision | ● | ○ | ● | ● | **Universal** |
| Pricing & Budget | ● | ●(light) | ●(per-seat) | ●(per-session) | **Universal** |
| Communications | ● | ● | ● | ●(ongoing) | **Universal** |
| Food & Drink | ● | ○ | ○ | ○ | shared |
| Equipment & Supplies | ● | ○(AV) | ●(materials) | ○ | shared |
| Decor & Theme | ● | – | – | – | celebration |
| Instructor / Facilitator | – | ○(host) | ● | ○(if it teaches) | class/club |
| Registration | – | ○(RSVP) | ● | ●(membership) | class/club |
| Membership & Retention | – | ○(if Community) | ○(cohort) | ● | community |
| Staffing & Roles | ○(helpers) | ○(host) | ○(assistant) | ● | shared |

**Reading:** six **universal blocks** (Attendance, Venue, Schedule, Safety, Pricing, Communications) form
the backbone of *every* Big-Four pattern; a handful of specialized blocks differentiate them. Author the
six universals well and most of the work is reused everywhere. Modifiers reuse blocks too — **Recurring**
extends the Schedule block; **Community** activates the Membership block on top of any base pattern.

---

## 7. How missing knowledge triggers clarification

When a required block is missing one of its **inputs**, and a user can supply it (an *information gap*),
the Clarification Engine asks the highest-value question (`OPE_CLARIFICATION_ENGINE`). The block tells the
engine *what* it needs and *why it matters* — which feeds the question's value score.

| Block missing an input | Clarifying question | Confidence it raises |
|---|---|---|
| Venue & Space (no venue) | "Backyard/home or a public park?" | Risk + Budget + permit |
| Attendance (no count) | "Roughly how many people?" | Scope + Budget + supervision |
| Schedule (one-off vs series?) | "One-time or a regular series?" | Pattern (Recurring modifier) |
| Pricing (no budget, networking) | "Is there a target budget?" | Budget / gate |
| Safety (kids present?) | "Any young children attending?" | **Risk (mandatory)** |
| Food (allergy unknown, kids) | "Any allergies or dietary needs?" | **Risk (mandatory)** |

Rule (from §1): a missing **input** to an **existing** block ⇒ **ask** — never default a safety/legal fact,
never invent a count or venue.

---

## 8. How missing knowledge triggers escalation

When the **block itself does not exist**, or the activity needs **expertise OPE has deliberately not
authored** (a *capability gap*, not an information gap), no question helps — the engine **escalates**
(ADR-002). This is the clean parallel to §7:

| Missing knowledge | Why a question can't fix it | Escalation |
|---|---|---|
| Money & Compliance block (fundraiser) | user can't supply charity-compliance expertise | `needs_human_review` |
| Advanced Staffing (referees/medics) | OPE hasn't authored competition staffing | `needs_certified_organizer` |
| Vendor sourcing at scale (wedding/festival) | no vendor knowledge/matching exists | `needs_certified_organizer` |
| Ceremony / Ritual block (wedding, funeral) | ritual structure/tone not authored | `needs_certified_organizer` / review |
| Regulated/medical (blood drive) | regulated expertise out of scope | `unsupported` / review |
| Safeguarding [S] depth (support group) | sensitive-care expertise not authored | `needs_human_review` |

Rule: missing **input to a block** ⇒ **ask**; missing **block / out-of-scope expertise** ⇒ **escalate**.
The engine never fabricates the missing expertise.

---

## 9. Knowledge required for Phase 1

To plan the **Big Four + light Volunteer Action** credibly for the launch region(s):

- **The six universal blocks** — Attendance, Venue, Schedule(+Recurring cadence), Safety, Pricing,
  Communications — authored to MVP depth.
- **Food & Drink** and **Equipment & Supplies** — portions/scaling + cost bands for the common items.
- **Instructor/Facilitator** and **Registration** — for Class (and Club when it teaches).
- **Membership & Retention** — for the Community modifier (Phase 1c).
- **Safety rule set** for the common contexts: **minors/supervision, outdoor, heat/weather, food/allergy,
  venue capacity** — applicability conditions + mitigations.
- **Pricing bands** for the Big-Four line items in **at least one launch region**, with contingency and
  low/likely/high logic.
- **Communications templates** for invite/reminder/thank-you/feedback (+ RSVP/dietary asks).
- **The Recurring and Community modifiers as knowledge** (cadence + per-session economics; roster +
  retention) — the real Phase-1 dependency identified in `OPE_PATTERN_VALIDATION`.

---

## 10. Knowledge explicitly OUT of scope for Phase 1

Authored later; until then the gate returns honest handoffs:

- **Vendor sourcing/matching** (catering/AV/rentals as real vendors).
- **Money & Compliance** (fundraising, ticketing revenue, charity rules).
- **Advanced Staffing** (referees, medics, lifeguards beyond simple supervision ratios).
- **Legal/Permits depth** (licenses, insurance, road closures) beyond simple park-permit flags.
- **Ceremony/Ritual** knowledge (weddings, funerals, services).
- **Regulated/medical** knowledge (blood drives, anything licensed).
- **Deep multi-region pricing** beyond the launch region(s); **historical pricing / learning**.
- **Monitoring** knowledge (deviation/re-plan).

---

## 11. The minimum viable OPE knowledge set

### Minimum viable knowledge set (MVKS)
The smallest set that lets the **Big Four** produce **trustworthy** plans in the launch region(s):

> **6 universal blocks + Food + Equipment + Instructor + Registration + Membership&Retention** (≈ 12
> blocks), each authored with its inputs, outputs, and rules; **the common safety rule set**; **one
> region's pricing bands** for the Big-Four line items; **the core communications templates**; and the
> **Recurring + Community modifiers** expressed as knowledge.

Everything in §10 is excluded from the MVKS and handled by escalation.

### What must exist BEFORE coding
This is **content/expertise**, not engine code (the engines exist — ADR-001):
1. **Block definitions** — for each MVKS block: what it knows, its inputs (→ clarification triggers), its
   outputs, and its rules (quantity/pricing/safety logic).
2. **The safety rule set** — applicability conditions + mitigations for minors/outdoor/heat/food/capacity.
3. **Launch-region pricing bands** — low/likely/high per Big-Four line item, + contingency logic.
4. **Communications templates** — the four message types with frozen-field placeholders.
5. **Pattern → block requirement maps** — which blocks each Big-Four pattern (and each modifier) requires.
6. **Clarification & escalation triggers per block** — which missing input asks (§7) vs which missing block
   escalates (§8).

If these six exist and are reviewed by a real organizer, the engines can be wired with confidence. If they
don't, coding would just hard-code guesses — the exact failure the stress test exposed.

### What can be added later
More regions and deeper pricing; Vendor, Money, advanced Staffing, Legal, Ceremony/Ritual, Regulated, and
Safeguarding-depth knowledge; Monitoring/learning; and the remaining patterns (Tournament, Conference,
Performance, Fundraiser, Expedition) — each as **new blocks composed by existing engines**, never as a
scenario library.

---

## Closing — knowledge, not templates

OPE's durable asset is not a thousand activity templates; it is **~12 well-authored blocks of organizer
expertise + a safety rule set + regional pricing**, composed by patterns and transformed by modifiers.
Author that knowledge once, review it with real organizers, and the engine assembles it into the entire
Phase-1 universe — and refuses, honestly, where the knowledge does not yet exist.

_Product architecture document only. No code, UI, or database schema. The knowledge model reflects the
cited spec, pattern library, validation, clarification engine, taxonomy, and ADRs._
