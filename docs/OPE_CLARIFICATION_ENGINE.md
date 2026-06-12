# OPE Clarification Engine — how OPE handles uncertainty

> **Type:** product architecture document. No code, no UI, no database design.
> **Principle:** **UNKNOWN → ASK. Never UNKNOWN → INVENT.**
> **Sources:** `OPE_MASTER_SPEC.md` (Stage 1 Classification, frozen-field guard), `OPE_PATTERN_LIBRARY.md`
> (patterns + modifiers), `OPE_PATTERN_VALIDATION.md` (confidence dimensions, [S]/[Reg]/[Rit] gaps),
> `ADR_002` (Coverage / Complexity Gate, the four states + `confidence`).
> **Date:** 2026-06-10.

## Why this exists

OPE already refuses to **fabricate facts in its output** (the frozen-field guard). The Clarification
Engine is the **upstream twin**: it refuses to **fabricate facts in its input.** When a planning-critical
fact is unknown, OPE has exactly three honest moves — **ask** (if a question can resolve it), **default**
(only for non-critical facts, transparently), or **escalate** (if no question can resolve it). It never
quietly guesses an attendee count, a venue, a budget, or — worst of all — a safety or legal requirement.

The Clarification Engine sits **between Intake and the Coverage Gate** (Master Spec Stage 1). It raises
**confidence** to the point where the gate can honestly say `plan_ready`, or it hands the gate a clear
reason to escalate.

---

## 1. Confidence levels

Confidence = the engine's certainty it can produce a **reliable, safe, accurate** plan. It is not one
number but a **composite of four dimensions**, and the overall score is the **weakest critical link**,
not the average — a perfect pattern match with an unknown safety requirement is still unsafe.

| Dimension | "Confident" means… | Weight |
|---|---|---|
| **Pattern** | the pattern + form (one-time/recurring/community) + modifiers are resolved | high |
| **Scope** | attendee count, venue, date, budget are known or safely defaultable | medium |
| **Risk / Safety** | the safety dimensions the pattern implies are answered or curated-default-covered | **critical** |
| **Legal / Money** | no unresolved permit, license, or money-handling requirement | **critical** |

> **Overall confidence = min(dimensions, weighted by criticality).** Risk and Legal are *gates*: if either
> is unknown for a pattern that needs it, overall confidence is capped Low regardless of the rest.

**Bands** (consistent with ADR-002's `confidence`):
- **High ≥ 0.75** — pattern clear, all critical inputs present. → **continue automatically.**
- **Medium 0.40–0.74** — pattern likely known but key facts missing or one ambiguity. → **clarification mode.**
- **Low < 0.40** — pattern ambiguous/unsupported, or a safety/legal/capability unknown. → **clarify only if
  it's an information gap; otherwise escalate.**

---

## 2. Triggers for clarification

Each trigger names *what is unknown* and *which dimension it drops*. A trigger only becomes a **question**
if a user answer can actually close it (see §5 — information gap vs capability gap).

| Trigger | Dimension hit | Askable? |
|---|---|---|
| **Pattern ambiguity** (Meetup vs Class; Celebration vs Meetup) | Pattern | Yes |
| **Form ambiguity** (one-time vs recurring vs community) | Pattern (modifier) | Yes |
| **Missing attendee count / breakdown** | Scope + Budget + Risk (supervision) | Yes |
| **Missing venue / venue type** | Scope + Budget + Risk (indoor/outdoor) | Yes |
| **Missing budget** | Scope + (networking gate) | Yes |
| **Missing date / schedule / cadence** | Scope + recurring cadence | Yes (or default) |
| **Missing safety requirements** (minors, water, outdoor, heat) | **Risk** | Yes — mandatory |
| **Missing legal/permit requirements** | **Legal** | Sometimes (else escalate) |
| **Money / fundraising present** | **Legal/Money** | Escalate (review), confirm only |
| **High-stakes / large / multi-vendor** (wedding, tournament, festival) | Capability | **No** — escalate, don't interrogate |
| **Sensitive context** [S] (funeral, support group, minors/vulnerable) | Capability + care | Escalate to review |

---

## 3. Question generation rules

A question is only generated if it earns its place. Every question must do **at least one** of: reduce
uncertainty, improve pattern matching, improve budget accuracy, or improve risk assessment — and the best
questions do several at once.

**Rules**
1. **Value-ranked.** Each candidate question has a **value score = expected confidence gain × dimension
   weight × criticality.** Ask in descending order; never ask a low-value question.
2. **One fact per question**, closed/structured where possible (faster to answer, easier to act on).
3. **Never ask what can be safely defaulted.** Non-critical facts get transparent defaults
   ("assuming a flexible date") — not a question.
4. **Never ask what doesn't change the plan.** No information for its own sake. If two answers produce the
   same plan, don't ask.
5. **Safety and legal questions are mandatory** when the pattern implies the risk and the fact is unknown
   (kids → supervision; water/outdoor → safety; money → compliance). These outrank convenience questions.
6. **Prefer multi-dimension questions.** "Where will it be?" often resolves Scope + Budget + Risk + part of
   Pattern in one ask — higher value than three narrow questions.
7. **Disambiguate the pattern first** when Pattern confidence is the weakest link — e.g., "Is this a one-off
   or something you'll run regularly?" resolves the Recurring modifier and unlocks the right plan.

---

## 4. Stop conditions — when OPE has enough

OPE stops asking and **proceeds** when **all** hold:
- **Pattern resolved** — one primary pattern, the form, and required modifiers are determined (High Pattern
  confidence).
- **Critical inputs present** — attendee count known; venue known or safely defaulted; date known or
  explicitly flexible; budget known **or explicitly marked unpriced**.
- **Risk covered** — every safety dimension the pattern implies is either answered or covered by curated
  defaults.
- **No open legal/money** — no unresolved permit/license/money-handling dimension.
- ⇒ **Overall confidence ≥ High (0.75).**

OPE also stops asking — and **escalates instead** — when **either**:
- **Questions can no longer raise confidence** (the remaining gap is capability, not information), **or**
- The **question cap is reached** (§6) and confidence is still below High.

> The engine tracks the **marginal value** of the next question. When the best remaining question's value
> falls below a threshold, asking is over: proceed (if safe defaults suffice) or escalate.

---

## 5. Escalation rules — the key fork

The decisive question is **what kind of gap is this?**

- **Information gap** — a fact the *user can provide* (count, venue, budget, date, which-pattern). → **Ask.**
- **Capability gap** — something *OPE cannot do regardless of any answer* (run brackets, manage vendors at
  scale, handle money, perform a ritual safely). → **Do not ask. Escalate.**

Asking a user to supply a wedding's vendor plan is interrogation that can't help; routing to a certified
organizer can. **Never ask a question whose answer the engine couldn't act on.**

| Outcome | When | ADR-002 status |
|---|---|---|
| **Continue automatically** | High confidence, no missing critical input | `plan_ready` |
| **Clarification mode** | Medium confidence **and** the gap is an *information* gap a question can close | (stays in intake; re-gates after answers) |
| **Require certified organizer** | *Capability/complexity* gap — high-stakes/large/multi-vendor pattern, or confidence stays Low after clarification | `needs_certified_organizer` |
| **Require human review** | *Sensitive* [S], *money/fundraising*, or *regulated* [Reg] unknown the engine must not auto-handle | `needs_human_review` |
| **Unsupported** | Pattern OPE does not model at all, and no modifier/content can express it | `unsupported` |

**Rule of thumb:** clarification is for *information* gaps; escalation is for *capability, money, safety,
and sensitivity* gaps. A few clarifying questions may be used to **confirm which fork applies** (e.g., "is
there ticketing/money?") — but once the fork is known, the engine commits.

---

## 6. Maximum-question strategy (don't interrogate)

The Activity Planner's north star is *plan in minutes* — every question is a tax on that. So:

- **Hard cap: ≤ 3 clarifying questions** per planning attempt (≤ ~5 across a whole session). Past the cap:
  proceed with transparent safe defaults if the plan stays safe, otherwise escalate. Never loop endlessly.
- **Three tiers of facts:**
  - **Tier 0 — never ask:** safely defaultable (date flexibility, minor format choices). Use a default and
    say so.
  - **Tier 1 — ask only if missing AND critical:** attendee count, venue, budget (or unpriced), pattern/form
    when ambiguous, mandatory safety facts.
  - **Tier 2 — ask only if it materially changes pattern/budget/risk:** otherwise skip.
- **Batch the top-K** in one pass instead of slow back-and-forth.
- **Value threshold:** only ask a question whose value score clears the bar. Each question must "pay for
  itself" in confidence gain; if it can't, it isn't asked.
- **Stop early on escalation:** a capability/money/sensitive gap ends questioning immediately — routing is
  the help, not more questions.

---

## 7. Worked examples (Input → Questions → Confidence → Result)

> Confidence shown as overall (weakest-link). Bands: High ≥ 0.75 · Medium 0.40–0.74 · Low < 0.40.

### BBQ — *information gap, one good question*
- **Input:** "BBQ, ~30 guests, budget $450, vegetarian options." (no venue, no date)
- **Assessment:** Pattern = Celebration/BBQ (High). But venue unknown → Risk (outdoor?) + Budget
  (permit/grill) drop. **Overall ≈ 0.55 (Medium).** Date = Tier 0 → default "flexible," no question.
- **Clarification (1 Q):** "Where will it be — a backyard/home or a public park?" *(resolves Risk +
  permit + grill rental in one ask.)*
- **Confidence:** 0.55 → **0.83 (High).**
- **Result:** `plan_ready` after **one** question. (Not asked: date, exact menu — they don't change the
  plan enough to earn a question.)

### Language Exchange — *form ambiguity, modifier unlock*
- **Input:** "Language exchange, about 20 people, at a café, weekly."
- **Assessment:** Pattern = Meetup. "weekly" signals **Recurring + Community**, but isn't confirmed →
  Pattern/form is the weak link. **Overall ≈ 0.50 (Medium).**
- **Clarification (≤2 Q):** (1) "One-time, or a regular series (e.g., weekly)?" → confirms Recurring +
  Community. (2) "Roughly how many each time, and is there a fixed budget?" → confirms Scope.
- **Confidence:** 0.50 → 0.70 (form) → **0.82 (High).**
- **Result:** `plan_ready` as **Meetup + Recurring + Community.** *(Caveat: today this requires the
  Recurring/Community modifiers, which are Phase-1c; until built, the gate routes recurring requests to
  handoff — see `OPE_PATTERN_VALIDATION` §7. The clarification logic is the same; only the destination
  differs.)*

### Soccer Tournament — *capability gap, ZERO questions*
- **Input:** "Soccer tournament, 8 teams, brackets, referees, first aid."
- **Assessment:** Pattern = Tournament. The gap is **capability** (OPE can't staff referees/medical or run
  brackets) — **no answer the user gives changes that.** **Overall ≈ 0.12 (Low), un-raisable.**
- **Clarification:** **none.** Asking would be interrogation with no payoff.
- **Result:** `needs_certified_organizer`, immediately. *(Demonstrates the core rule: don't ask when a
  question can't close the gap.)*

### Community Festival — *clarify once to confirm the fork*
- **Input:** "Neighborhood festival, ~500 people, food stalls, live music, charge entry."
- **Assessment:** Composite (Celebration + Performance + Conference) + **money (entry)** + **large
  (500)**. **Overall ≈ 0.20 (Low).** One question can determine whether it's actually beyond capability.
- **Clarification (1 Q):** "Is this a single simple gathering, or a multi-stage event with vendors,
  stalls, and ticketing?"
  - If **multi-stage + ticketing** → capability + money gap → **escalate.**
  - If **small block gathering, no tickets** → re-pattern as **Block party (Celebration)** → confidence
    jumps to ~0.8 → `plan_ready`.
- **Confidence:** 0.20 → (multi-stage) still Low, now *explained* → route; or → 0.80 (High) if down-scoped.
- **Result:** `needs_certified_organizer` + `needs_human_review` (money) for the festival; **or**
  `plan_ready` if clarification reveals it's really a block party. *(Clarification used to confirm
  escalation — or to rescue a borderline case — never to fake a festival plan.)*

### Wedding — *high-stakes, route without interrogation*
- **Input:** "Wedding, 120 guests."
- **Assessment:** Celebration at high intensity + **[Rit] ceremony** + multi-vendor + **large (120)**.
  Capability + ritual gap. **Overall ≈ 0.15 (Low), un-raisable by questions.**
- **Clarification:** none (planning questions can't make OPE able to run a wedding).
- **Result:** `needs_certified_organizer`, immediately — with a clear reason, not a wrong "Kids Birthday
  Party" plan (the exact failure `OPE_STRESS_TEST` caught).

---

## Summary

| Situation | Engine move |
|---|---|
| All critical facts known, pattern clear | **Continue** (`plan_ready`) — ask nothing |
| Missing *information* a user can give | **Ask** ≤3 highest-value questions, re-gate |
| Gap is *capability/complexity* | **Route** to certified organizer — don't ask |
| Gap is *money / sensitive / regulated* | **Route** to human review — don't auto-handle |
| Pattern unmodeled entirely | **Unsupported** — honest handoff |

The Clarification Engine exists for one reason: so OPE can be **honest about what it doesn't know**. It
asks the **fewest, highest-value questions** to turn knowable unknowns into facts — and it **escalates,
never invents**, when a question can't help. UNKNOWN → ASK; never UNKNOWN → INVENT.

_Product architecture document only. No code, UI, or database design. Confidence model, triggers, and
escalation reflect the cited spec, pattern library, validation, and ADR-002._
