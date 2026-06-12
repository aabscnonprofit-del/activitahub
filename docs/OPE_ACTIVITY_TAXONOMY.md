# OPE Activity Taxonomy — the ActivLife Hub activity universe

> **Type:** product document (not technical). No code, UI, or database design.
> **Purpose:** define the complete universe of activities ActivLife Hub helps people create — so OPE
> knows what it is being built to plan, in what order, and at what level of support.
> **Sources:** `MASTER_PRODUCT_DECISIONS.md` (§11.4 three loops, §11.5 Activity Planner, §11.6 Single
> Engine, §11.8 monetization), `OPE_MASTER_SPEC.md`, `OPE_STRESS_TEST.md`, `ADR_001` (one engine, named
> modules), `ADR_002` (coverage/complexity gate).
> **Date:** 2026-06-10.

## First principles (the filter for everything below)

- **Mission lens.** "The World Needs More Organizers" — we exist to help people **create real active
  lives and communities**. The taxonomy is therefore weighted toward the activities that *build ongoing
  connection* (recurring activities and communities), not only one-off parties.
- **One engine, authored per category.** Per §11.6, every activity is served by **one OPE Core**;
  breadth comes from **adding knowledge per category** (modules + pricing), not new engines. Adding an
  activity = authoring its knowledge, not rebuilding OPE (ADR-001).
- **Honest coverage.** Per ADR-002, anything not yet built must **refuse/hand off**, never fake a plan.
  So this taxonomy's "support status" is a promise the engine already keeps: unsupported types return a
  handoff, not a wrong plan.
- **Not optimized for coding convenience.** The hard-but-valuable forms (recurring, community) are
  prioritized precisely because they serve the mission, even though one-off events are easier to build.

---

## Part 1 — The three forms of activity (cross-cutting)

Every activity type below is one of three **forms**. They differ less in topic than in **what they
demand of OPE over time**. This is the most important distinction in the document.

### A. One-time Events
A single occasion with a date, a build-up, and a wrap-up.
- *Examples:* birthday, wedding, BBQ, fundraiser, tournament, baby shower, reunion, workshop (single).
- *What OPE needs:* scenario → timeline, checklist, budget, risks, messages. **This is the only form
  OPE handles today** (for kids birthday and BBQ).
- *Mission role:* the **demand entry point** — most people meet ActivLife Hub by planning one event.

### B. Recurring Activities
A repeating activity with the same core but many sessions over time (weekly/monthly), usually the same
group of people.
- *Examples:* yoga, running club, language exchange, hiking club, book club, pickup soccer, art class.
- *What OPE needs (NOT built — `OPE_STRESS_TEST` gap):* a **series/schedule concept**, **per-session
  economics**, a **member roster**, and **retention** over time — not a one-off plan repeated.
- *Mission role:* the **heart of "active lives."** This is where habit, friendship, and belonging are
  built. Its absence is OPE's single biggest mission gap today.

### C. Communities
A persistent group of people that runs **many activities and many events over time**, with membership,
roles, and ongoing communication. A community is a *container*, not an event.
- *Examples:* immigrant/newcomer community, alumni association, parent groups, cultural & faith
  organizations, professional associations.
- *What OPE needs (NOT built):* a **persistent container** — members, recurring + one-off activities
  under one roof, organizer roles, and communication that spans months/years.
- *Mission role:* the **largest unit of "more organizers"** — one community organizer creates dozens of
  activities and hundreds of connections. The highest-leverage form for the mission.

> **Where OPE stands:** today it is a **single-event** engine for **2.5 topics** (kids birthday, BBQ,
> networking-with-a-budget). Forms **B** and **C** — the mission's core — are **not yet modeled**.
> Everything in Part 2 is tagged with its form so this gap stays visible.

---

## Part 2 — The hierarchy (Level 1 → 2 → 3)

**Level 1** = six life domains. **Level 2** = activity families. **Level 3** = specific types, each
tagged: **Form** (E = one-time event · R = recurring · C = community), **Status**, **Complexity**,
**Risk**, **Recurring-capable**.

*Status legend (defined fully in Part 3):* **MVP** = live today · **Planned** = Phase 1 target ·
**Org-Only** = served via certified organizers, not consumer self-serve · **No** = not supported (out
of scope / too sensitive or regulated for now).

### Level 1 — Personal & Family
*Demand engine. Mostly one-time celebrations; the gateway most users enter through.*

| Family | Type | Form | Status | Complexity | Risk | Recurring? |
|---|---|---|---|---|---|---|
| Celebrations | Kids birthday | E | **MVP** | Medium | Medium | No |
| Celebrations | Adult birthday | E | Planned | Low | Low | No |
| Celebrations | Milestone birthday (16/50/…) | E | Planned | Medium | Low | No |
| Celebrations | Anniversary party | E | Planned | Low | Low | No |
| Celebrations | Baby shower | E | Planned | Low | Low | No |
| Celebrations | Engagement / bridal party | E | Planned | Medium | Low | No |
| Celebrations | Graduation party | E | Planned | Low | Low | No |
| Celebrations | Retirement / housewarming | E | Planned | Low | Low | No |
| Celebrations | Wedding | E | **Org-Only** | High | High | No |
| Celebrations | Funeral / memorial | E | **No** (sensitive) | High | High | No |
| Family gatherings | BBQ / family picnic | E | **MVP** | Low | Medium | No |
| Family gatherings | Family reunion | E | Planned | Medium | Medium | No |
| Family gatherings | Holiday dinner / gathering | E | Planned | Low | Low | No |
| Family gatherings | Dinner party / potluck | E | Planned | Low | Low | No |

### Level 1 — Community & Social
*The community heartland. Where recurring activities and communities concentrate.*

| Family | Type | Form | Status | Complexity | Risk | Recurring? |
|---|---|---|---|---|---|---|
| Social meetups | Language exchange | R | Planned | Low | Low | Yes |
| Social meetups | Book club | R | Planned | Low | Low | Yes |
| Social meetups | Board game / social night | R | Planned | Low | Low | Yes |
| Social meetups | Supper / dinner club | R | Planned | Medium | Medium | Yes |
| Social meetups | Social mixer | E/R | Planned | Low | Low | Yes |
| Identity & cultural communities | Newcomer / immigrant community | C | Planned | Medium | Medium | Yes |
| Identity & cultural communities | Cultural organization | C | Planned | Medium | Medium | Yes |
| Identity & cultural communities | Faith community | C | Planned | Medium | Medium | Yes |
| Identity & cultural communities | Alumni association | C | Planned | Medium | Low | Yes |
| Identity & cultural communities | Parent group | C | Planned | Low | Medium | Yes |
| Identity & cultural communities | Fan community / club | C | Planned | Low | Low | Yes |
| Neighborhood | Block party | E | Planned | Medium | Medium | No |
| Neighborhood | Neighborhood association | C | Planned | Medium | Medium | Yes |
| Neighborhood | Community festival | E | **Org-Only** | High | High | No |
| Hobby & interest | Photography / gardening / craft club | R | Planned | Low | Low | Yes |
| Hobby & interest | Music jam / band meetup | R | Planned | Medium | Medium | Yes |

### Level 1 — Sports & Outdoor
*High mission value (active lives) and high safety responsibility. Recurring-heavy.*

| Family | Type | Form | Status | Complexity | Risk | Recurring? |
|---|---|---|---|---|---|---|
| Recreational groups | Running club | R | Planned | Medium | Medium | Yes |
| Recreational groups | Cycling club | R | Planned | Medium | High | Yes |
| Recreational groups | Hiking club | R | Planned | Medium | High | Yes |
| Recreational groups | Pickup soccer / basketball | R | Planned | Medium | Medium | Yes |
| Recreational groups | Beach volleyball group | R | Planned | Low | Medium | Yes |
| Recreational groups | Swim / open-water group | R | Planned | Medium | High | Yes |
| Recreational groups | Climbing group | R | Planned | Medium | High | Yes |
| Fitness classes | Yoga (park / studio) | R | Planned | Low | Medium | Yes |
| Fitness classes | Bootcamp / outdoor fitness | R | Planned | Medium | Medium | Yes |
| Fitness classes | Dance / martial arts class | R | Planned | Medium | Medium | Yes |
| Outdoor adventure | Group hike (single) | E | Planned | Medium | High | No |
| Outdoor adventure | Camping trip | E | Planned | High | High | No |
| Outdoor adventure | Kayak / ski / paddle trip | E | **Org-Only** | High | High | No |
| Competitive | Fun run / 5K | E | **Org-Only** | High | Medium | No |
| Competitive | Sports tournament | E | **Org-Only** | High | High | No |
| Competitive | Recreational league | R | **Org-Only** | High | High | Yes |

### Level 1 — Learning & Education
*Skill + connection. Spans single workshops and recurring classes/study groups.*

| Family | Type | Form | Status | Complexity | Risk | Recurring? |
|---|---|---|---|---|---|---|
| Workshops & classes | Workshop / masterclass (single) | E | Planned | Medium | Low | No |
| Workshops & classes | Art class | R | Planned | Low | Low | Yes |
| Workshops & classes | Cooking class | R | Planned | Medium | Medium | Yes |
| Workshops & classes | Language class | R | Planned | Low | Low | Yes |
| Workshops & classes | Coding / skills bootcamp | R | **Org-Only** | High | Medium | Yes |
| Talks & seminars | Seminar / lecture / panel | E | Planned | Medium | Low | No |
| Talks & seminars | Conference / summit | E | **Org-Only** | High | Medium | No |
| Study & skill groups | Study group | R | Planned | Low | Low | Yes |
| Study & skill groups | Skill-share / mentorship circle | R | Planned | Low | Low | Yes |

### Level 1 — Professional & Business
*Networking is the one MVP-adjacent area; corporate is organizer-grade.*

| Family | Type | Form | Status | Complexity | Risk | Recurring? |
|---|---|---|---|---|---|---|
| Networking | Networking event (with budget) | E | **MVP** | Low | Low | Yes |
| Networking | Business mixer | E | Planned | Low | Low | Yes |
| Networking | Industry / startup meetup | R | Planned | Medium | Low | Yes |
| Corporate | Team building / offsite | E | **Org-Only** | High | Medium | No |
| Corporate | Company party / product launch | E | **Org-Only** | High | Medium | No |
| Corporate | Conference / trade show | E | **Org-Only** | High | High | No |
| Professional communities | Professional association | C | Planned | Medium | Low | Yes |
| Professional communities | Founder / coworking community | C | Planned | Medium | Low | Yes |

### Level 1 — Volunteer & Impact
*High mission resonance; money and safety pull many types to organizer/handoff.*

| Family | Type | Form | Status | Complexity | Risk | Recurring? |
|---|---|---|---|---|---|---|
| Service events | Park / beach cleanup | E | Planned | Medium | Medium | No |
| Service events | Food / clothing drive | E | Planned | Medium | Low | No |
| Service events | Volunteer day | E | Planned | Medium | Medium | No |
| Service events | Community garden build | E | Planned | Medium | Medium | No |
| Fundraising (money) | Charity fundraiser | E | **Org-Only** (review) | High | High | No |
| Fundraising (money) | Gala / benefit / auction | E | **Org-Only** | High | High | No |
| Fundraising (money) | Charity walk / run | E | **Org-Only** | High | Medium | No |
| Civic & mutual aid | Town hall / community meeting | E | Planned | Medium | Medium | Yes |
| Civic & mutual aid | Awareness event | E | Planned | Medium | Medium | No |
| Civic & mutual aid | Mutual aid group | C | Planned | Medium | Medium | Yes |
| Civic & mutual aid | Support group | C | **No** (sensitive) | Medium | High | Yes |
| Civic & mutual aid | Blood drive | E | **No** (regulated) | High | High | No |

---

## Part 3 — Status definitions

- **MVP Supported** — works in production today through OPE (`plan_ready`). Currently only **kids
  birthday**, **BBQ / family picnic**, and **networking with a fixed budget** (per ADR-002).
- **Planned** — committed for Phase 1. Reachable by the **single engine** once its **knowledge module +
  pricing** are authored; recurring/community types additionally require the new **form capability**
  (series / container). Until then the gate returns an honest handoff.
- **Organizer Only** — high-stakes, multi-vendor, money-handling, or professional-output activities.
  Served through **certified organizers + the professional output layer**, not the consumer self-serve
  planner. The gate routes these to `needs_certified_organizer` (or `needs_human_review` for money).
- **Not Supported** — outside the mission's safe scope for now: **sensitive** (funerals, support
  groups) or **regulated/medical** (blood drives). Deliberately excluded, not merely unbuilt.

*Complexity* = planning effort + moving parts. *Risk* = safety/legal/financial exposure if done badly.
These guide build order and which types must be organizer-routed.

---

## Part 4 — TOP 20 activity types for Phase 1

Chosen to (a) serve the mission across **all six domains and all three forms**, (b) be reachable by the
single engine with authored knowledge, and (c) build the **demand → recurring → community** funnel.
Deliberately **excludes** high-stakes Org-Only types (wedding, fundraiser, tournament, corporate).

| # | Activity type | Domain | Form | Why it's in Phase 1 |
|---|---|---|---|---|
| 1 | Kids birthday | Personal | E | Live; the proven demand entry point. |
| 2 | Adult / milestone birthday | Personal | E | Kills the current mislabel; broadens the entry. |
| 3 | BBQ / family picnic | Personal | E | Live; universal, low-risk. |
| 4 | Family reunion | Personal | E | High emotional value, single-engine reach. |
| 5 | Baby shower / casual celebration | Personal | E | Large, simple celebration cluster. |
| 6 | Dinner party / potluck | Personal | E | Smallest possible "host something" on-ramp. |
| 7 | Block / neighborhood party | Community | E | Turns neighbors into a community. |
| 8 | Networking event | Professional | E | Live (with budget); fund the pricing fix. |
| 9 | Business / industry mixer | Professional | E/R | Bridges events into recurring. |
| 10 | Language exchange | Community | R | Flagship recurring; low risk, high connection. |
| 11 | Book club | Community | R | Simplest recurring; proves the series form. |
| 12 | Board game / social night | Community | R | Habit-forming, low risk. |
| 13 | Hobby / craft / photography group | Community | R | Interest → belonging. |
| 14 | Running club | Sports | R | Active lives flagship; introduces route safety. |
| 15 | Group hike (single) + hiking club | Sports | E + R | Outdoor safety as KB; event→recurring pair. |
| 16 | Yoga / outdoor fitness class | Sports | R | Recurring class economics. |
| 17 | Pickup sports (soccer/volleyball) | Sports | R | Low-cost recurring, broad appeal. |
| 18 | Workshop / skill-share / art class | Learning | E + R | Learning + connection; single and recurring. |
| 19 | Newcomer / immigrant community | Community | C | First **community container**; flagship mission. |
| 20 | Volunteer day / cleanup (non-money) | Volunteer | E | Impact without the money-handling gate. |

These 20 cover **6/6 domains** and **all three forms** (E, R, C), with the weighting tilted — on
purpose — toward recurring and community, the forms that build active lives.

---

## Part 5 — Recommended implementation order

Capability-first and mission-first. Each step adds **knowledge or a form**, never an engine rewrite
(ADR-001); anything not yet built keeps returning an honest handoff (ADR-002).

**Phase 1a — Harden one-time events + nearest neighbors (priced).**
Solidify kids birthday & BBQ; **price beyond Honolulu**. Add the celebration cluster (adult/milestone
birthday, anniversary, baby shower, graduation, housewarming, dinner party, family reunion). **Price
networking** and add business mixer. *Outcome: a credible single-event planner across Personal +
Professional. (Items 1–9.)*

**Phase 1b — Build the Recurring form (the missing capability).**
Introduce the **series/schedule + per-session + roster** capability — the biggest single unlock.
Launch language exchange, book club, board game night, hobby groups, running club, hiking club, yoga,
pickup sports, recurring classes. *Outcome: ActivLife Hub can power ongoing active lives, not just
one-off parties. (Items 10–18.)*

**Phase 1c — Build the Community form (the container).**
Introduce the **persistent community container** (members, many activities over time, organizer roles,
long-running communication). Launch newcomer/immigrant community first, then cultural / faith / alumni
/ parent / professional communities. *Outcome: one organizer can sustain a whole community — the
highest-leverage mission outcome. (Item 19 + community rows.)*

**Phase 1d — Light Impact (non-money).**
Volunteer days and cleanups with **safety/waivers as knowledge**, deliberately excluding fundraising
(money) for now. *Outcome: impact activities without the financial/legal gate. (Item 20.)*

**Phase 2 — Organizer-Only / high-stakes (gated & routed).**
Wedding, fundraiser/gala, sports tournament/league, corporate/conference. Served through **certified
organizers + the professional output layer**; OPE assists the organizer, not the consumer. The coverage
gate already routes these to `needs_certified_organizer` / `needs_human_review` until then.

**Always-on guardrails.**
- Every new type ships with its **safety knowledge**; high-risk types (water, climbing, outdoor, minors
  at scale) stay gated until that knowledge exists.
- **Money and sensitive/regulated** types are never quietly enabled — they route to organizer/review or
  remain Not Supported.
- Coverage honesty (ADR-002) holds throughout: **breadth grows by adding knowledge, never by faking a
  plan.**

---

## Closing — why this order serves the mission

The easy build order would be "more one-time events." The mission order is different: after a credible
single-event planner (1a), we invest in **Recurring (1b)** and **Community (1c)** — the forms that turn
a one-time host into a repeat organizer and a repeat organizer into a community builder. That is how
ActivLife Hub produces **more organizers and more active lives**, not just more parties.

_Product document only. No code, UI, or database design. Activity universe, support status, and order
reflect the cited product decisions and the current OPE capability (ADR-001 / ADR-002)._
