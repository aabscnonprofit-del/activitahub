# OPE Planning Workflow — request to approved plan

> **Type:** operational architecture — the final end-to-end workflow before implementation.
> No code, UI, or schema.
> **Synthesizes:** `OPE_MASTER_SPEC.md` (engines/stages), `OPE_PATTERN_LIBRARY.md` (patterns +
> modifiers), `OPE_PATTERN_VALIDATION.md`, `OPE_CLARIFICATION_ENGINE.md` (unknown→ask),
> `OPE_KNOWLEDGE_MODEL.md` + `OPE_KNOWLEDGE_FOOD_SAFETY_LOGISTICS_V1.md` (the knowledge blocks),
> `OPE_ACTIVITY_TAXONOMY.md`, `ADR_001` (one engine), `ADR_002` (coverage gate).
> **Date:** 2026-06-10.

## How to read this

The workflow is **mostly linear but clarification is a loop**: any stage that hits a knowable unknown
can pause, ask the highest-value question (`OPE_CLARIFICATION_ENGINE`), and resume — and any stage that
hits an unfixable gap can **escalate** instead of inventing (`ADR_002`). The guiding rule throughout:
**UNKNOWN → ASK; out-of-capability → ESCALATE; never INVENT.**

```
User Request
  └─▶ 1 Pattern detection ─▶ 2 Modifier detection ─▶ 3 Coverage gate
        │                         │                       │
        └──────── 4 Clarification loop (called by any stage on an information gap) ───────┘
                                   │
        5 Location ─▶ 6 Knowledge lookup ─▶ 7 Local rule lookup ─▶ 8 Calculations ─▶ 9 Risk analysis
                                   │
        10 Confidence evaluation ──▶ (High) ─▶ 11 Organizer review ─▶ 12 Corrections ─▶ 13 Final plan
                  │                                                                          │
                  └─ (Low, unfixable) ─▶ ESCALATE (organizer / human review / unsupported)   ▼
                                                                              14 Outcome feedback ─▶ knowledge
```

---

## Part 1 — Stage map (quick reference)

| # | Stage | Data produced | May ask? | May escalate? |
|---|---|---|---|---|
| 0 | **User Request (Intake)** | normalized Scenario draft (raw inputs) | – | – |
| 1 | **Pattern detection** | primary pattern (+candidates), pattern confidence | Yes (ambiguity) | Yes (pattern unsupported) |
| 2 | **Modifier detection** | recurring? / community? / money? flags | Yes (form ambiguity) | Yes (money → review) |
| 3 | **Coverage gate** | status (`plan_ready` / `unsupported` / `needs_*`) + confidence | – | **Yes (the gate)** |
| 4 | **Clarification** *(loop)* | answered facts, raised confidence | **Yes (its job)** | Yes (if unraisable) |
| 5 | **Location detection** | resolved location (city / region / country) | Yes (missing city) | – |
| 6 | **Knowledge lookup** | required block set + their rules | Yes (block missing input) | Yes (block missing) |
| 7 | **Local rule lookup** | regional pricing bands + local overrides + pricing source/fallback | – | – (notes fallback) |
| 8 | **Calculations** | resource quantities + budget (low/likely/high) | – | – |
| 9 | **Risk analysis** | applicable risks + mitigations + required supervisors | Yes (safety unknown) | Yes (capability/sensitive) |
| 10 | **Confidence evaluation** | overall confidence (weakest-link) + decision | – | **Yes (Low → escalate)** |
| 11 | **Organizer review** | reviewed plan + accept/edit | – | Yes (reviewer rejects) |
| 12 | **Organizer corrections** | corrected plan + tagged correction records | – | – |
| 13 | **Final plan** | approved plan (OUTPUTS_V1 + artifacts) | – | – |
| 14 | **Outcome feedback** | actuals → knowledge proposals | – | – |

---

## Part 2 — Stage-by-stage

### 0. User Request (Intake)
- **Does:** normalize the raw request into a Scenario draft (intent text, counts, venue, location, budget,
  requirements, surface = consumer vs organizer).
- **Produces:** the Scenario draft every later stage reads.

### 1. Pattern detection
- **Does:** match the request to one **primary pattern** (Celebration, Meetup, Class, …) + any secondary,
  with a **pattern confidence**.
- **Produces:** `{ primary_pattern, candidates[], pattern_confidence }`.
- **May ask:** when two patterns are plausible (Meetup vs Class). **May escalate:** if the pattern is one
  OPE does not model → `unsupported`.

### 2. Modifier detection
- **Does:** detect **Recurring** (series cues), **Community** (membership/ongoing), **Money** (fundraising/
  ticketing) modifiers.
- **Produces:** `{ recurring?, community?, money? }` flags.
- **May ask:** one-time vs recurring. **May escalate:** money present → `needs_human_review`.

### 3. Coverage gate *(ADR-002)*
- **Does:** decide `plan_ready` / `unsupported` / `needs_human_review` / `needs_certified_organizer` from
  pattern + modifiers + structural thresholds (size/budget/minors).
- **Produces:** `{ status, reason, recommended_next_step, confidence, missing_capabilities }`.
- **Escalates** here whenever status ≠ `plan_ready`. Only `plan_ready` continues.

### 4. Clarification *(loop — not a fixed position)*
- **Does:** invoked by stages 1, 2, 5, 6, 9 whenever they hit an **information gap a user can close**. Asks
  the highest-value question(s) (≤3 cap), then returns control.
- **Produces:** answered facts + a higher confidence; or, if a question can't help, a signal to escalate.
- **Rule:** missing **input** → ask; missing **capability** → escalate (never ask what the answer can't fix).

### 5. Location detection
- **Does:** resolve the user's location (city, region, country) — the key to pricing and local rules.
- **Produces:** `{ city, region, country }`.
- **May ask:** if city is missing/ambiguous (it drives budget accuracy).

### 6. Knowledge lookup
- **Does:** pull the **knowledge blocks** the pattern + modifiers require (`OPE_KNOWLEDGE_MODEL` §4–6):
  e.g. Celebration → Attendance, Food, Venue, Decor, Equipment, Schedule, Safety, Pricing, Communications.
- **Produces:** the active block set + their rules (ratios, derived-quantity rules, comms templates).
- **May ask:** a block missing a critical **input** (Venue block needs venue type). **May escalate:** a
  required **block does not exist** (Money/Vendor/Ritual) → handoff.

### 7. Local rule lookup
- **Does:** resolve **region-specific knowledge** — pricing bands for this city, and any local overrides
  (permit rules, regional supervision norms). Runs the pricing resolver chain
  (local → historical → fallback) and records provenance.
- **Produces:** `{ pricing_bands, local_overrides, pricing_source, is_fallback, fallback_note }`.
- **No question/escalation:** if no local data, it **falls back with a clear note** (never blocks).

### 8. Calculations
- **Does:** Resource Planning (quantities from the block rules + scenario, e.g. Food A1–A5, supervision
  C2) then Budget (quantities × regional bands + contingency → low/likely/high).
- **Produces:** `{ resource_plan, budget{low,likely,high,breakdown,key_drivers} }` — deterministic.

### 9. Risk analysis
- **Does:** apply the **Safety block** rules (B1–B9, C) whose conditions match (food/outdoor/water/kids/
  heat/alcohol), rank by never-drop + severity, attach mitigations and required supervisors.
- **Produces:** `{ risks[], mitigations[], supervising_adults }`.
- **May ask:** a mandatory safety input is unknown (kids? water?). **May escalate:** sensitive [S] /
  regulated [Reg] context the engine must not auto-handle.

### 10. Confidence evaluation
- **Does:** compute **overall confidence = weakest critical dimension** (Pattern/Scope/Risk/Legal).
- **Produces:** `{ overall_confidence, decision }`.
- **Decision:** High → proceed to review; Medium with an information gap → back to Clarification (4); Low &
  unfixable → **escalate**.

### 11. Organizer review
- **Does:** present the assembled plan for human acceptance.
  - **Consumer surface:** the *user* is the reviewer — they read the plan and may edit key inputs.
  - **Organizer surface:** the *certified organizer* reviews before sending to a client.
- **Produces:** an accepted plan, or an edit set (→ 12), or a rejection (→ escalate / re-clarify).

### 12. Organizer corrections
- **Does:** apply edits (line-item price, quantity, added/removed task or risk, message wording). Each
  edit is recorded as a **correction record** with a **scope tag** (Part 3).
- **Produces:** the corrected plan (recomputed deterministically) + tagged correction records.

### 13. Final plan
- **Does:** freeze the approved plan.
- **Produces:** the approved OUTPUTS_V1 plan + derived artifacts (resource plan, budget, risk register,
  comms, schedule) and — for the organizer surface — the marketplace `request_brief` if handed off.

### 14. Outcome feedback
- **Does:** after the event, capture actuals and route them into the knowledge loop (Part 4).
- **Produces:** actuals → knowledge proposals (regional pricing updates, rule corroborations, incident
  flags).

---

## Part 3 — Organizer corrections: how they apply, and their scope

Every correction recomputes the **current plan immediately** (deterministic). Whether it changes
**knowledge** depends on its scope tag — and knowledge changes are **proposals**, promoted by evidence,
never silently applied. One organizer's edit must not rewrite shared knowledge on its own.

| Scope | Meaning | Example | How it's applied |
|---|---|---|---|
| **Current plan only** | a one-off truth for *this* event | "the venue is free (my backyard)" | applied to this plan; **never generalized** |
| **Future knowledge (pattern)** | a correction to a pattern's rule/ratio | "kids parties also need a quiet-down activity" | **proposal** → expert/organizer review before the block changes |
| **Regional knowledge** | a price/permit/norm specific to a city/region | "cake costs ~30% more in Honolulu" | **proposal** → promoted after **N corroborating** corrections/actuals in that region |
| **Global knowledge** | a universal truth (esp. safety) | "the toddler supervision ratio is wrong everywhere" | **highest bar** — expert review only; **never auto-promoted** |

**Promotion thresholds (integrity guard):**
- Current plan → instant.
- Regional → requires multiple corroborating data points (corrections **or** real outcomes) before the
  regional Pricing/rule layer updates.
- Pattern/Global → requires expert review; safety-critical knowledge (Block B/C) is **never** changed by
  organizer edits alone.

This keeps the knowledge **trustworthy**: convenient one-off edits stay local; only corroborated,
reviewed evidence reaches shared knowledge.

---

## Part 4 — How real outcomes feed back into OPE

After an event, the **Monitoring** loop captures actuals and turns them into knowledge proposals:

- **Costs:** actual spend per line item → **regional pricing** proposals (the historical pricing provider
  in the resolver chain). Enough corroborating points improve that city's bands — so the next plan in that
  city is more accurate and less "fallback."
- **Quantities:** actual food/supplies used vs planned → tunes the **ratio rules** (proposal-level).
- **Attendance/RSVP:** actual turnout vs invited → improves no-show buffers; for recurring/community,
  feeds **retention** knowledge.
- **Safety incidents / near-misses:** flagged to **expert review** of the Safety block — never
  auto-applied; safety knowledge only ever gets *stricter* via review.
- **Satisfaction:** signals which parts of the plan worked.

The loop closes per `OPE_MASTER_SPEC` §13: actuals → historical store → better regional Pricing/Resource
on the next request. Coverage and safety knowledge still change **only by review**, not by data alone.

---

## Part 5 — Three complete walkthroughs

### A. BBQ in Honolulu — *supported, clean*

| Stage | Outcome |
|---|---|
| 0 Intake | "BBQ, ~30 guests (24 adults / 6 kids), Honolulu, budget $450, vegetarian options." |
| 1 Pattern | **Celebration** (BBQ), pattern confidence High. |
| 2 Modifiers | none (one-time). |
| 3 Gate | `plan_ready` (≤60 guests, budget < $5000, no unsupported cues). |
| 4 Clarify | venue not given → **1 question**: "backyard/home or public park?" → *public park*. |
| 5 Location | Honolulu, HI, USA. |
| 6 Knowledge | Attendance, **Food**, Venue, Equipment, Schedule, **Safety**, Pricing, Communications. |
| 7 Local rules | Honolulu pricing **local** (not fallback); park-permit flag on. |
| 8 Calc | food = `24×1.25 + 6×0.75 +10%` ≈ 38 servings; drinks, ice, tableware sized; budget ≈ **$315 / $525 / $975**. |
| 9 Risk | outdoor (shade/water), **food safety (2-hr rule)**, heat/hydration, grill safety, veg cross-contact, **child supervision** = `max(2, ceil(6/8))` = 2 adults. |
| 10 Confidence | overall **High (~0.83)** after the venue answer. |
| 11 Review | user reads plan; edits one line — local grill rental is cheaper. |
| 12 Corrections | grill line −$20 → **current-plan-only**; budget recomputes. |
| 13 Final | approved BBQ plan (timeline, checklist, $-range, risks, messages). |
| 14 Feedback | actual spend logged → corroborates Honolulu BBQ pricing (regional). |

### B. Weekly language exchange in Houston — *recurring + community*

| Stage | Outcome |
|---|---|
| 0 Intake | "Language exchange, ~20 people, a café in Houston, weekly." |
| 1 Pattern | **Meetup**, pattern confidence Medium (format clear, scope thin). |
| 2 Modifiers | "weekly" → **Recurring**; ongoing group → **Community** (needs confirm). |
| 3 Gate | networking-adjacent meetup; a budget/format is present → proceed toward `plan_ready`. |
| 4 Clarify | **2 questions:** "one-time or a regular series?" → *weekly series*; "roughly how many each time / fixed budget?" → *~20, ~$50/session*. |
| 5 Location | Houston, TX, USA. |
| 6 Knowledge | Attendance/RSVP, Venue, Food(light), Schedule **(+cadence)**, Communications, Pricing(light), Safety(light), **Membership & Retention**. |
| 7 Local rules | Houston has **no local seed → fallback pricing** with the clear note; café space likely free/low. |
| 8 Calc | per-session: light refreshments for ~20, minimal supplies; per-session budget small (fallback-noted). |
| 9 Risk | low — venue capacity, inclusion of newcomers; no minors/water. |
| 10 Confidence | **High (~0.82)** after clarification (pattern + form + scope resolved). |
| 11 Review | user accepts the **recurring series** plan (per-session checklist + cadence + retention comms). |
| 12 Corrections | none. |
| 13 Final | a **Meetup + Recurring + Community** plan: session template + weekly cadence + member onboarding/reminders. |
| 14 Feedback | attendance per session → retention knowledge; actual costs → start building **Houston** regional pricing (reduces future fallback). |

> *Phase note:* this is the intended behavior **once the Recurring + Community modifiers are built**
> (Phase 1b–1c, per `OPE_PATTERN_VALIDATION`). Until then the gate routes recurring requests to an honest
> handoff rather than a one-off plan.

### C. Community festival requiring escalation — *honest refusal*

| Stage | Outcome |
|---|---|
| 0 Intake | "Neighborhood festival, ~500 people, food stalls, live music, charge entry, Austin." |
| 1 Pattern | **composite** (Celebration + Performance + Conference); no clean primary → pattern confidence Low. |
| 2 Modifiers | **Money** (entry fee) detected; large scale. |
| 3 Gate | size 500 > 60 **and** money present → not `plan_ready`. |
| 4 Clarify | **1 scoping question:** "a single simple gathering, or a multi-stage event with vendors, stalls and ticketing?" → *multi-stage + ticketing*. |
| 6 Knowledge | required blocks **Vendor**, **Money & Compliance**, advanced **Staffing** → **do not exist** (Phase 2). |
| 9 Risk | crowd/permit/financial — beyond authored safety knowledge. |
| 10 Confidence | overall **Low (~0.2)** and **unraisable by questions** (capability + money gaps). |
| 11–13 | **No plan produced.** |
| Escalation | `needs_certified_organizer` (capability/scale) **+** `needs_human_review` (money), with `reason`, `recommended_next_step`, and `missing_capabilities = [vendor_management, revenue_collection, large_event_logistics, staffing]`. |
| 14 Feedback | the request is logged as demand for the festival capability (informs roadmap), **not** faked into a plan. |

> Counter-path: had the answer been *"just a small block gathering, no tickets,"* stage 1 re-patterns it
> as a **Block party (Celebration)**, confidence jumps to High, and it proceeds to a normal `plan_ready` —
> clarification *rescued* the borderline case instead of refusing it.

---

## Closing

This is how OPE operates end to end: detect the **pattern** and **modifiers**, gate for coverage,
**ask** to close knowable unknowns and **escalate** unfixable ones, resolve **location** and pull the
**knowledge blocks** + **regional rules**, compute deterministically, analyze **risk**, evaluate
**confidence**, and only then present for **review**. Organizer **corrections** recompute the plan
instantly but reach shared knowledge only as **evidence-promoted proposals**, and real **outcomes** feed
the regional pricing and (via review) the rules — so every plan in a place gets more accurate over time,
while OPE never invents what it does not know.

_Operational architecture only. No code, UI, or schema. Reflects the full OPE document set and ADR-001/002._
