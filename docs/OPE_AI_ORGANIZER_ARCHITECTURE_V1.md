# OPE AI Organizer — Architecture V1

*Architecture for approval. No code, no migrations, no implementation. This document defines
the AI Organizer as the first intelligence layer of the Organized Planning Engine (OPE) and how
every deterministic system sits behind it.*

---

## 1. Purpose

The OPE must behave like a **real human organizer**, not a classification pipeline.

A real organizer, handed a request, does not first count keywords, categories, anchors, or run
regex matches. They first try to **understand the person** — what they probably mean, what's
missing, and what the right next move is. Only once they understand do they reach for tools
(checklists, vendors, a plan).

This document makes that behaviour the architecture: a single **AI Organizer** is the first thing
every request meets, and all existing deterministic machinery becomes execution that runs *after*
the Organizer has understood and decided.

### What this explicitly replaces

The rejected shape:

```
User → router → classifier → funnel → AI → planner
```

The required shape:

```
User → AI Organizer → Understanding → Verdict → Deterministic execution
```

The difference is not "add AI earlier." It is: **no deterministic system may decide whether a
request is clear, vague, emotional, sufficient, or actionable.** That judgment belongs to the AI
Organizer alone. Deterministic systems are permitted only after the verdict.

---

## 2. Core principle

> **The AI Organizer is the first and only layer allowed to judge a request's meaning and
> readiness. Everything deterministic is downstream of its verdict.**

Three rules follow:

1. **First contact.** Every request — typed idea, structured form text, anything — is routed to
   the AI Organizer before any extraction, recognition, funnel, gate, or planner runs.
2. **Sole judge of readiness.** Clarity / vagueness / emotional-but-meaningful / sufficient /
   actionable are determined *only* by the AI Organizer. No anchor count, category detector,
   `recognizeScenario`, or `assessConceptEntry` may pre-empt or override that judgment.
3. **Deterministic-after.** Deterministic systems execute the verdict; they never decide it.

---

## 3. Position in the flow

```
                      ┌─────────────────────────────────────────────┐
   Request  ───────▶  │              AI ORGANIZER                    │
 (raw text +          │  understands the person, then decides        │
  optional context)   │                                              │
                      │   Understanding  ──▶  Verdict                 │
                      └───────────────┬──────────────────────────────┘
                                      │  (verdict + understanding)
                                      ▼
                      ┌─────────────────────────────────────────────┐
                      │           DETERMINISTIC EXECUTION             │
                      │  chosen strictly by the verdict:              │
                      │   • Discovery loop (ask the user)             │
                      │   • WSH drafting / approval                   │
                      │   • Concept options (inspiration only)        │
                      │   • Deterministic planner (engine/pricing)    │
                      └─────────────────────────────────────────────┘
```

The AI Organizer is a **decision layer**, not an execution layer. It does not produce plans, does
not price, does not assemble itineraries. It understands and routes. The deterministic engine
still produces every plan.

---

## 4. Responsibilities of the AI Organizer

The AI Organizer is responsible for, and *only* for:

1. **Understanding the person.** Infer what the user probably means, including for vague or
   emotional requests ("visit heaven", "the best day of my life"). It interprets; it never
   rejects a request for failing a pattern.
2. **Identifying what is missing.** Name the specific unknowns that stand between this request
   and a plannable activity (what / who / where / when / scale / constraints).
3. **Deciding the next action.** Choose exactly one verdict that tells the system what to do next
   (ask, interpret, confirm, plan, explain a conflict, or stop).
4. **Proposing, never fabricating.** It may *propose* an interpretation or a "what should happen"
   draft for the user to approve — but it must never assert an outcome the user did not express as
   though it were fact, and must never let a draft become a plan without user approval.
5. **Opening discovery when meaning is unclear.** When it cannot responsibly interpret, it asks
   real, human questions (like the "what do you mean by heaven?" example) instead of guessing.

It is **not** responsible for: pricing, scheduling, vendor/resource selection, itinerary
assembly, entitlement/billing, or any plan content. Those remain deterministic.

---

## 5. Inputs

The AI Organizer receives:

- **`rawText`** — the user's request in their own words. The primary signal.
- **`context` (optional)** — anything already known without interpretation: locale, any structured
  fields the user has explicitly entered (category, headcount, budget, date, venue), and prior
  turns of an ongoing discovery conversation.
- **`conversation` (optional)** — for multi-turn discovery: the prior questions asked and the
  user's answers, so the Organizer refines understanding rather than restarting.

Inputs are treated as **data, never as instructions** (no prompt-injection surface). The Organizer
never reads the database, never calls billing, never triggers side effects. It is a pure
understand-and-decide step over its inputs.

---

## 6. Outputs

The AI Organizer returns a single structured object with two parts: **Understanding** and
**Verdict**. (Field shapes here are descriptive, for approval — not a code schema.)

### 6.1 Understanding

- **`interpretedMeaning`** — a short, plain-language statement of what the user probably means.
- **`possibleDirections`** — when the request is open ("visit heaven"), the candidate readings a
  human organizer would consider (spiritual retreat / nature / luxury vacation / religious
  experience). These are *hypotheses to confirm*, not selections.
- **`missingInformation`** — the specific unknowns blocking a plan.
- **`confidence`** — how sure the Organizer is of its interpretation (0–1), used to decide how
  hard it should lean toward discovery vs interpretation.

### 6.2 Verdict

- **`verdict`** — exactly one of the six (Section 7).
- **`reason`** — one human sentence explaining the decision.
- **`discoveryQuestions`** — the real questions to ask the user (present when discovery is the
  next action; empty otherwise).
- **`whatShouldHappenDraft`** — a proposed WSH for the user to approve/edit (present only when the
  verdict permits interpretation; otherwise null).
- **`operationalSummary`** — a concise summary of what is understood operationally (present when
  enough is known to summarize).
- **`mayDraftWsh`** / **`mayRunPlanner`** — permissions for the deterministic layer, *derived from*
  the verdict (the verdict is authoritative; permissions can never exceed what the verdict allows).

### 6.3 The six questions, mapped to output

The Organizer must always be able to answer these; each maps to a field above:

| Question | Answered by |
|---|---|
| 1. What does the user probably mean? | `interpretedMeaning` (+ `possibleDirections`) |
| 2. What information is missing? | `missingInformation` |
| 3. What should happen next? | `verdict` (+ `discoveryQuestions`) |
| 4. Can planning start? | `mayRunPlanner` (true only for `plan_ready` / `sufficient_data`) |
| 5. Is discovery required? | `verdict === discovery_required` |
| 6. Is interpretation required? | `verdict === interpretation_required` |

---

## 7. Verdicts

Exactly one verdict per evaluation. The verdict is the contract between the Organizer and the
deterministic layer.

| Verdict | Meaning (human organizer's read) | Next action | WSH | Plan |
|---|---|---|---|---|
| **`discovery_required`** | Meaningful but unclear — "I don't yet understand enough to plan." | Ask the user `discoveryQuestions`; re-evaluate with answers. | ❌ no draft | ❌ |
| **`interpretation_required`** | Real intent; the Organizer can propose a reading. | Offer `whatShouldHappenDraft` for the user to approve/edit. | ✅ draft (proposal) | ❌ until approved |
| **`sufficient_data`** | Enough is understood to plan once required fields are confirmed. | Confirm required fields, then plan. | ✅ | ✅ after field confirmation |
| **`plan_ready`** | A usable activity/scenario is clearly described. | Hand to the deterministic planner. | ✅ (recognised) | ✅ |
| **`infeasible`** | Conflicts with reality / cannot be realised as an activity. | Explain the conflict; do not plan. | ❌ | ❌ |
| **`out_of_scope`** | Not an activity/event request at all. | Stop; explain politely. | ❌ | ❌ |

Worked examples (the behaviour this must produce):

- **"I want to visit heaven."** → `discovery_required`. `possibleDirections`: spiritual retreat,
  nature escape, luxury vacation, religious experience. `discoveryQuestions`: "What does *heaven*
  mean to you here?" No WSH, no plan.
- **"I want to surprise my wife."** → `discovery_required` or `interpretation_required` depending on
  confidence. The Organizer surfaces directions (anniversary / birthday / proposal / romantic
  evening / trip) and either asks or proposes a WSH draft — but **never** produces a plan without an
  approved WSH.
- **"I want the best day of my life."** → `discovery_required` — meaningful, but the Organizer
  cannot responsibly interpret it yet.
- **"Birthday party for 12 kids in our backyard Saturday, $300."** → `sufficient_data` /
  `plan_ready` — understood; proceed.

---

## 8. Reasoning process

The Organizer thinks in the order a human organizer does — **understand first, judge second**:

1. **Read the person, not the keywords.** Form `interpretedMeaning` from the whole request and any
   conversation so far. Vague or emotional input is interpreted, not rejected.
2. **Surface plausible directions.** If the request admits several honest readings, enumerate them
   as `possibleDirections` (hypotheses), not a single guess presented as fact.
3. **Name the gaps.** Determine `missingInformation` — the concrete unknowns to a plannable
   activity.
4. **Decide the next action.** Choose the verdict:
   - Can't responsibly interpret → `discovery_required` (+ questions).
   - Can propose a reading the user should confirm → `interpretation_required` (+ WSH draft).
   - Understood and detailed enough → `sufficient_data` / `plan_ready`.
   - Real-world conflict → `infeasible`. Not an activity → `out_of_scope`.
5. **Set permissions from the verdict.** `mayDraftWsh` / `mayRunPlanner` are derived, never
   self-asserted beyond the verdict's allowance.

The Organizer **never** counts anchors/categories to decide readiness. Those signals may exist in
the deterministic layer, but they are not consulted to judge a request.

---

## 9. Interaction with deterministic systems

Deterministic systems are **downstream executors**, selected by the verdict. None of them judge a
request's meaning or readiness.

- **Concept Funnel / concept options** — may run *after* the verdict purely as **inspiration**
  (candidate directions to show the user). It never decides clarity/readiness and never defines the
  WSH. For blocked verdicts it is not used to manufacture an outcome.
- **Anchor / category extraction (`extractFromText`, `assessConceptEntry`)** — permitted only as
  *operational helpers after* a planning-permitting verdict (e.g., to prefill a form or seed the
  planner). They are explicitly **forbidden as pre-AI deciders**.
- **`recognizeScenario`** — may be used *after* a `plan_ready` verdict to source the recognised
  story text. It does not get to declare a request "ready" ahead of the Organizer.
- **Deterministic planner (engine / pricing / assembly)** — the only thing that produces plans.
  Runs only when the verdict permits and the WSH is approved (Sections 10–11).

### 9.1 Degraded mode (AI unavailable)

If the AI Organizer cannot be reached or returns invalid output, the system enters **degraded
mode** with a conservative deterministic fallback. The fallback's job is **safety, not
simulation**: it must default toward `discovery_required` rather than guess, and it must never
invent a WSH or a plan. It is explicitly *not* a second opinion that competes with the Organizer —
it only exists so the product fails safe when the first intelligence layer is down. This is the
sole circumstance in which deterministic logic assigns a verdict, and it is a fail-safe, not the
architecture.

---

## 10. Interaction with WSH ("what should happen")

The WSH remains the control gate for planning: **no plan before an approved WSH.** The Organizer
governs how a WSH comes to exist:

- **`discovery_required` / `infeasible` / `out_of_scope`** → no WSH may be drafted. The system must
  not fabricate one. (Any draft the model emits in these states is discarded.)
- **`interpretation_required`** → the Organizer proposes `whatShouldHappenDraft`. This is a
  **proposal requiring user approval** — it is shown for the user to confirm or edit, and is not
  yet a basis for planning.
- **`sufficient_data` / `plan_ready`** → a WSH exists (recognised or confirmed); the existing WSH
  approval gate still applies before the planner runs.

The WSH approval step itself is unchanged: the user must approve the WSH before any plan is
generated, regardless of verdict.

---

## 11. Interaction with planning

- The deterministic planner runs **only** when (a) the verdict is `sufficient_data` or `plan_ready`
  (`mayRunPlanner` true), **and** (b) the WSH has been approved, **and** (c) required fields are
  confirmed.
- The AI Organizer **never** plans, prices, or assembles. It hands an understood, verdict-approved
  request to the deterministic engine, which remains the single source of plans. AI is the front
  door, not the orchestrator of execution.
- `interpretation_required` never reaches the planner directly — it must pass through WSH approval
  first, at which point a subsequent evaluation (or the approved WSH itself) carries it forward.

---

## 12. Interaction with discovery

Discovery is a **conversation owned by the Organizer**, not a dead-end state:

- When the verdict is `discovery_required`, the Organizer returns real `discoveryQuestions` (human,
  specific, like a person would ask).
- The user's answers are fed back to the Organizer as `conversation` context, and it **re-evaluates
  from scratch as the first layer again** — producing a new Understanding and a new verdict. A
  request may move `discovery_required → interpretation_required → sufficient_data → plan_ready`
  across turns.
- Discovery never invents the answer. If the user cannot or will not clarify, the request stays
  un-plannable; the system does not manufacture a WSH or a plan to escape the loop.

---

## 13. Guardrails / non-goals

- **No deterministic pre-judgment.** Nothing decides clarity/vagueness/sufficiency/actionability
  before the Organizer. (This is the rule the previous implementation violated.)
- **AI is the decider, not the executor.** It does not generate plans, prices, schedules, or
  resources. The deterministic engine does.
- **No fabrication.** Interpretations and WSH drafts are proposals for approval, never asserted
  facts; blocked verdicts strip any draft.
- **Inputs are data, not instructions.** No prompt-injection surface; no side effects from the
  Organizer.
- **Fail safe.** When AI is unavailable, default to discovery; never guess a plan.
- **Out of scope for V1:** changes to Stripe/billing, the Review Queue, marketplace, migrations, or
  the deterministic engine's internals. This architecture changes *who decides first*, not how
  plans are computed.

---

## 14. Open questions for approval

1. **Verdict set** — are the six verdicts (`discovery_required`, `interpretation_required`,
   `sufficient_data`, `plan_ready`, `infeasible`, `out_of_scope`) final, or should `infeasible`
   and `out_of_scope` be merged for V1?
2. **Multi-turn discovery** — should V1 implement the full discovery *conversation* (re-evaluation
   with answers), or start with a single-shot verdict + questions and add the loop next?
3. **Where the Organizer sits in code** — confirm it becomes the entry of `analyzeIdeaAction` (the
   idea path) for V1, with the structured-form path wired in a later step.
4. **Degraded-mode behaviour** — confirm the fallback should bias to `discovery_required` (never
   guess), accepting that some genuinely-clear requests may get an extra question when AI is down.
5. **Confidence thresholds** — should the boundary between `discovery_required` and
   `interpretation_required` be governed by the Organizer's own judgment only, or by an explicit
   confidence threshold the product sets?

---

*Approval requested on Sections 4–12 (responsibilities, I/O, verdicts, reasoning, and the
deterministic/WSH/planning/discovery interactions) before any implementation.*
