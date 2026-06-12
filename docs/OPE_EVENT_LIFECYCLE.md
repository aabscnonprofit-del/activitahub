# OPE Event Lifecycle — from creation to closure

> **Type:** lifecycle architecture (no code, UI, or database design).
> **Role:** the missing bridge between `OPE_PLANNING_WORKFLOW.md` (request → plan) and
> `OPE_LEARNING_ARCHITECTURE.md` (actuals → knowledge). Also connects `OPE_MASTER_SPEC.md`,
> `OPE_IMPLEMENTATION_READY.md`, and `ADR_002` (the coverage gate).
> **Date:** 2026-06-10.

## The spine

```
Draft ─▶ Planning ─▶ Ready ─▶ Open for Registration ─▶ Registration Closed ─▶ In Progress ─▶ Completed ─▶ Closed
   │         │          │              │                         │                  │             │
   └─────────┴──────────┴──────────────┴──── Cancelled ──────────┴──────────────────┘             ▼
         (planning: OPE workflow + ADR-002 gate)   (execution)            (actuals)        (learning emitted)
```

A refused request (ADR-002 `unsupported` / `needs_*`) **never reaches Ready** — it leaves the self-serve
lifecycle at Planning into a handoff. Only a `plan_ready` plan continues.

---

## 1. Lifecycle states

| State | Purpose | Phase |
|---|---|---|
| **Draft** | the organizer is entering/iterating the request; nothing committed (Intake). | Planning |
| **Planning** | OPE runs the workflow: gate (ADR-002) → clarification loop → knowledge → calc → risk. Produces a `plan_ready` plan or a refusal/handoff. | Planning |
| **Ready** | a reviewed, approved `plan_ready` plan exists — the event's source of truth. Pre-execution. | Planning→Execution |
| **Open for Registration** | participants can sign up / RSVP; capacity tracking begins. | Execution |
| **Registration Closed** | registration ended; **final headcount known** — the key freeze trigger. | Execution |
| **In Progress** | the event is happening (day-of); deviations and incidents are logged live. | Execution |
| **Completed** | the event finished; awaiting post-event actuals. Not yet learned. | Execution→Learning |
| **Closed** | actuals captured + reconciled; record final; **learning signals emitted**. Terminal-success. | Learning |
| **Cancelled** | terminated before completion; partial signals captured. Terminal-fail. | (branch) |

---

## 2. State transitions

| From → To | Who moves it | Conditions | Becomes LOCKED | Stays EDITABLE |
|---|---|---|---|---|
| Draft → Planning | organizer (submit) | intake complete (required fields) | — | all inputs |
| Planning → Draft | organizer / system | clarification asked, or organizer edits inputs (loop) | — | all inputs |
| Planning → Ready | organizer (accept) | status `plan_ready` (gate passed, clarification resolved) | pattern, category, **safety plan baseline**, message set | counts, venue, date, budget target |
| Planning → (handoff) | system (ADR-002) | status ≠ `plan_ready` | — (no plan) | — |
| Ready → Open for Registration | organizer (open) | plan approved; date + venue set | plan skeleton, comms content | counts, registration cap |
| Open → Registration Closed | organizer / system (deadline) / capacity reached | a final headcount exists | **budget, resources, headcount** | day-of logistics notes |
| Registration Closed → In Progress | system (event start) / organizer (start) | start time reached | everything planned | live deviation/incident log only |
| In Progress → Completed | system (end) / organizer (mark done) | event ended | live log | actuals fields |
| Completed → Closed | organizer (submit actuals) / system (grace window) | actuals entered, or grace elapsed | the whole record | — |
| any (Draft…In Progress) → Cancelled | organizer | organizer cancels | the record (as cancelled) | cancellation reason |

**Actors:** *organizer* (runs it), *participants* (register/RSVP — no payments in scope), *system*
(time/threshold triggers, OPE), *expert* (only for safety/global learning, not lifecycle moves).

---

## 3. Freeze points

The plan stays **live and recomputable** while inputs can still change, then freezes in stages. Freezing
is what turns a live estimate into a committed plan and, later, a learnable record.

| What | Freezes at | Recomputes until | Asymmetry / notes |
|---|---|---|---|
| **Safety assumptions** | **Ready** (baseline committed) | never loosens | may only get **stricter** in In Progress (organizer/expert); never auto-relaxed (learning-arch asymmetry) |
| **Communications content** | **Ready** (message set approved) | tokens fill as facts freeze | sends execute Open → Completed (invite → reminder → thank-you) |
| **Budget (planned)** | **Registration Closed** (final count) | until Registration Closed | Ready holds a baseline snapshot; actuals recorded at Closed |
| **Resources** | **Registration Closed** (sized to confirmed count) | until Registration Closed | shopping/materials list locks for execution |

So: **Ready** freezes *safety + comms content* (what we commit to do safely and say); **Registration
Closed** freezes *budget + resources* (sized to who's actually coming). Between Ready and Registration
Closed the plan still recomputes deterministically as counts change.

---

## 4. Organizer corrections

Corrections behave differently depending on *when* they happen (this is the temporal face of
`OPE_LEARNING_ARCHITECTURE` §3):

- **Before the activity starts (Draft … Registration Closed):** edits **recompute** the plan
  deterministically (count → budget/resources). Each correction carries a **scope tag** (plan / regional /
  pattern). These are *plan corrections* and feed local (and candidate regional/global) learning.
- **During the activity (In Progress):** the plan is largely frozen (Registration Closed). Corrections are
  **deviations/annotations**, not recomputes — added tasks, schedule shifts, and **safety tightening**
  (never relaxing). Logged as *actual organizer changes*.
- **After the activity (Completed → Closed):** input is **actuals**, not plan edits — actual costs,
  attendance, incidents. These are *outcome corrections* that feed learning; the plan is now historical.

---

## 5. Actual-data collection

| Actual | Collected during | Finalized at |
|---|---|---|
| **Attendance** | In Progress (check-in vs confirmed) | Completed |
| **Costs** | — | Completed → Closed (post-event reconciliation) |
| **Incidents / near-misses** | In Progress (logged live) | Completed (report) → **expert queue** |
| **Schedule deviations** | In Progress | Completed |
| **Organizer changes** (Ready-plan vs done) | In Progress → Completed | Closed |

If the organizer never submits costs within the grace window, the system **auto-Closes** with what
exists (attendance from check-in; no cost signal emitted) — honest partial data, never invented.

---

## 6. Completion vs Closed

- **Completed** = the event physically happened and ended. Attendance may be known (live check-in), but
  costs/incidents are not yet reconciled. **No regional/global learning yet.**
- **Closed** = actuals captured and reconciled; the record is final and immutable; **this is the moment
  learning signals are emitted** (§7). Closed is reached by organizer submission or, after a grace
  window, by an auto-Close with partial data.

---

## 7. Learning triggers by state

| Learning | Trigger state(s) | What forms |
|---|---|---|
| **Local** (this plan only) | any plan correction (Draft … Registration Closed) **+** Closed | one-off truths stored on the plan; this event's final record |
| **Regional proposals** | **Closed** | actual costs / attendance → regional pricing + no-show buffer **candidates** (promoted later after N corroborations + organizer-confirmed actuals — learning-arch §4) |
| **Global / pattern proposals** | **Closed** (deltas) ; **incidents** at In Progress/Completed | organizer-change deltas → pattern-rule candidates (cross-regional + **expert**); incidents → **expert safety queue** (immediate, non-statistical) |

Closed is the primary learning trigger; incidents short-circuit to the expert queue earlier. Promotion
itself is asynchronous and governed by `OPE_LEARNING_ARCHITECTURE` (auto / organizer / expert classes).
**Cancelled** also emits a weaker signal (see §8).

---

## 8. Cancellation flow

| Cancelled… | What happens | Signal emitted |
|---|---|---|
| **before registration** (Draft / Planning / Ready / empty Open) | clean discard; no participant impact | *abandoned plan* — demand/coverage signal (what people tried to plan); no cost/attendance learning |
| **after registration** (Registration Closed, or Open with registrants) | participants **must be notified** (cancellation comms); any incurred costs (deposits) may be logged | registration size → demand/no-show context; partial cost if logged |
| **during execution** (In Progress) | partial event; capture what happened; if cancellation was safety-driven (weather/incident) → **incident → expert queue** | strong signal: partial attendance + incident |

Cancellation is terminal; it does not return to Planning (a re-attempt is a new Draft).

---

## 9. Recurring interaction

A recurring activity (M2 Recurring modifier — Class course or recurring Meetup) has a **series** that
spawns **occurrences**:

- **Series** — runs Planning → **Ready** once as a *per-session template* with a cadence (e.g. weekly).
  The series itself can later be **Closed** (when it ends or the organizer closes it).
- **Individual occurrences** — each session is an instance running its **own** lifecycle: Open for
  Registration → Registration Closed → In Progress → Completed → Closed. Freeze points apply per
  occurrence (each session freezes its own budget/resources at its Registration Closed).
- **Occurrence outcomes** — each occurrence emits its own actuals (attendance, costs, incidents) at its
  Closed.
- **Series-level statistics** — aggregated across occurrences: **retention** (attendance trend across
  sessions), average per-session cost, drop-off, completion rate. These feed regional/pattern learning at
  a higher level than a single event, and reconcile against the M2 `series_total` estimate.

The series template's safety/comms freeze at series-Ready; each occurrence's budget/resources freeze at
its own Registration Closed.

---

## 10. Walkthroughs

### A. BBQ (one-time Celebration)
| State | What happens |
|---|---|
| Draft | organizer enters BBQ, ~30 guests, Honolulu, vegetarian |
| Planning | gate → `plan_ready`; clarification asks venue → "public park"; plan + budget ($315/525/975) |
| Ready | organizer accepts → **safety + comms freeze** (food/heat/grill risks, invite set) |
| Open for Registration | invites sent; RSVPs come in |
| Registration Closed | 30 confirmed → **budget + resources freeze** to 30 |
| In Progress | day-of; check-in (28 arrive); brief shade/heat deviation logged |
| Completed | event ends; attendance 28/30 |
| Closed | organizer logs **actual cost $480** (vs $525 est) → **regional Honolulu BBQ price candidate**; 28/30 → **no-show buffer candidate** |
*Learning:* regional pricing + no-show (Closed). No incidents.

### B. Weekly language exchange (recurring Meetup, unpriced)
| Level | What happens |
|---|---|
| Series | Planning → `plan_ready` (Meetup + Recurring); organizer gives a budget target (Meetup unpriced); series **Ready** as a weekly template |
| Occurrence (each week) | Open (RSVP) → Registration Closed (≈20) → In Progress (check-in) → Completed → **Closed** (attendance + any actual spend logged) |
| Series stats | attendance trend (**retention**), average per-session cost |
*Learning:* because Meetup has **no pricing seed**, the occurrences' actual costs are the **first regional
Meetup pricing data** — over weeks they build a Houston Meetup price candidate; retention feeds
pattern/recurring knowledge. (Top gap from the coverage analysis being filled by real data.)

### C. Art class series (recurring Class, priced)
| Level | What happens |
|---|---|
| Series | Planning → `plan_ready` (Class + Recurring); instructor=have, materials=provided; priced (instructor/venue/materials); series **Ready** (weekly × 8) — **materials + safety + instructor commitments freeze** |
| Occurrence (each session) | Open → Registration Closed (12) → **budget/resources freeze per session** → In Progress → Completed → **Closed** (actual materials cost logged) |
| Incident path | if a participant is injured → **incident → expert safety queue** (immediate, tightens the physical-class risk only via expert) |
| Series stats | completion rate across 8 sessions; total actual vs M2 `series_total` estimate |
*Learning:* per-session actual materials → **regional class pricing** refinement (Closed); incident →
**expert** (never auto); series completion → pattern/recurring knowledge.

---

## Closing — the bridge

The lifecycle is the timeline along which planning, execution, completion, and learning connect:
- **Planning** (`OPE_PLANNING_WORKFLOW` + ADR-002 gate) happens in **Draft → Planning → Ready**.
- **Execution** happens in **Open for Registration → In Progress**, with **freeze points** turning a live
  estimate into a committed, then recordable, plan.
- **Completion** distinguishes *it happened* (**Completed**) from *it's reconciled and learnable*
  (**Closed**).
- **Learning** (`OPE_LEARNING_ARCHITECTURE`) is **emitted at Closed** (and incidents earlier), then
  promoted asynchronously by the auto / organizer / expert classes.

Every plan thus becomes a future input: Closed events feed regional pricing and (via expert) safety and
pattern knowledge, so the next Draft in that place starts smarter — without ever rewriting a committed
plan or auto-relaxing safety.

_Lifecycle architecture only. No code, UI, or database design. Consistent with Planning Workflow,
Learning Architecture, Master Spec, Implementation Ready, and ADR-002._
