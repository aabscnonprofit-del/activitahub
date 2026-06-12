# OPE Organizer Workspace — v1

> **Type:** organizer-experience design — the first real workspace on top of the existing deterministic
> OPE engine (M1–M4). **Not** architecture, schema, API, or code; no OPE redesign.
> **Sits on:** the 6-section plan (`ACTIVITY_PLANNER_OUTPUTS_V1`), the Event Lifecycle, the deterministic
> recompute, and the Organizer-Operating-System principle (the organizer is the operator).
> **Date:** 2026-06-11.

---

## 1. Organizer mental model

**What the organizer is trying to accomplish:** run a successful event **with confidence** — to always
know *what to do, by when, what it costs, what could go wrong, what's needed,* and *whether they're on
track.* The workspace is the organizer's **cockpit**, not a document viewer.

The organizer thinks in one question: **"Is my event under control?"** Everything must serve that.

**Always visible (the never-hidden core):**
- **Event identity** — what · when · where · how many.
- **Readiness** — am I on track? (the Health model, §6).
- **What needs me now** — the next action, the open risk, the missing resource.
- **Time to event** — how long do I have.

If the organizer can answer *"where am I, what's next, what's at risk"* in one glance, the workspace is
doing its job.

---

## 2. Workspace structure

The workspace is two levels: a **portfolio dashboard** (all events) and an **event view** (one event)
with seven sections that mirror the plan the engine already produces.

| View | What it shows | Answers |
|---|---|---|
| **Main dashboard** | every event as a **readiness card** (Ready %, time-to-event, top attention item); upcoming events; "needs attention" queue | *Across everything I run, what needs me?* |
| **Event view** | the event hub: identity + the **5-tile status strip** (§6) + the lifecycle stage + links into the section views | *Is this one event OK?* |
| **Planning view** | the **timeline** (phases: prep → day-of → after) + plan summary + headline | *What's the shape of the event over time?* |
| **Budget view** | **low / likely / high** + editable **line items** + key cost drivers + levers + currency/fallback note + (recurring) per-session/series | *What will it cost, and where's the money?* |
| **Resource view** | what's **needed**, sized to scale: supplies + **staffing/vendor needs** (and, later, sourcing briefs) + missing-resource status | *What do I need, and what's still missing?* |
| **Task view** | the **checklists** (prep / day-of / after) as tickable tasks + completion | *What do I do, and what's left?* |
| **Risk view** | the **risk register** — severity + "what to do," open vs handled | *What could go wrong, and have I covered it?* |
| **Communication view** | the **ready-to-send messages** (invite / reminder / thank-you / feedback) + send status | *What do I send, to whom, when?* |

Each section is a **lens on the same plan** the engine generated — not a separate document. Editing in one
lens (e.g. attendee count in identity) ripples through the others via recompute (§5).

---

## 3. Event lifecycle visibility

The workspace **changes character** as the event advances. Organizer-facing phases (mapped to the Event
Lifecycle states):

| Phase (organizer) | Lifecycle state | Workspace emphasis | Editable? | Readiness reads |
|---|---|---|---|---|
| **Planning** | Draft / Planning | building the plan; everything live; recompute on every change | **fully editable** | building (low→rising) |
| **Preparation** | Ready → Open for Registration | working the checklist, sourcing resources, sending invites | inputs + budget still adjustable; tasks active | rising toward 100% |
| **Ready** | Registration Closed | all set, on the eve; the plan is the locked source of truth | **budget/resources frozen; safety + comms frozen** | ~100% |
| **Live Event** | In Progress | day-of run: day-of checklist + run-of-show + live status | **deviations/notes only; safety may only tighten** | running |
| **Completed** | Completed → Closed | capture actuals; close out; send thanks/feedback | actuals input; plan becomes historical | done |

- **Planning** is a *workshop* (try things; the engine recomputes instantly).
- **Preparation** is a *to-do machine* (tasks + resources + comms).
- **Ready** is a *confirmation board* (everything locked; just verify).
- **Live** is a *run-sheet* (the day-of checklist front and centre; minimal editing).
- **Completed** is a *close-out* (actuals + thanks; the plan freezes as a record).

The same seven sections persist throughout — their **prominence and editability** shift with the phase.

---

## 4. Editable areas

The rule of thumb: **the organizer edits inputs and corrections; the engine owns computations; facts and
safety are protected.**

| Section | Editable | Not editable | Triggers recompute |
|---|---|---|---|
| **Identity / what-you-told-us** | attendee count, venue, duration, budget target, requirements, (activity type — with confirm) | — (date/location are facts the generated text never contradicts) | **yes** — counts/venue/duration/activity drive the plan (§5) |
| **Planning / timeline** | mark tasks done; add a custom task | the engine-generated phase structure | reshapes when inputs change |
| **Budget** | line-item price/quantity (current-plan-only correction); budget target | the estimate **math**; band logic | line edits → totals; target → health only |
| **Resources** | adjust a need's quantity; mark a need **sourced/filled**; brief spec | the engine's sizing rules | quantity changes → budget lines |
| **Tasks** | completion status; add a custom task | engine task content | — (status only) |
| **Risks** | mark handled; add a note | severity; **never-drop safety items cannot be removed** | venue/kids changes re-evaluate applicability |
| **Communications** | message wording (personalize before sending) | the frozen facts in tokens (date/price/location) | — (content only) |

**Hard protections:** the deterministic computations (you change inputs, not outputs), **never-drop
safety items**, **frozen fields after the freeze points** (budget/resources at Ready; safety + comms when
the plan is approved), and the pricing math. Safety can **only tighten**, never be removed.

---

## 5. Recompute behavior

Recompute is **deterministic and instant** (the engine is pure) and **current-plan-only** (it never
changes shared knowledge in v1). What the organizer changes → what OPE recalculates:

| Organizer changes | OPE recalculates |
|---|---|
| **Budget** (a line item) | budget **totals + bands + levers** — the rest of the plan unchanged. *(Editing the budget **target** changes only Budget Health, not computed costs.)* |
| **Attendee count** | resource **quantities** (food, tableware, supervision, favors), **per-head budget lines × count**, **supervision risk**, capacity check, message headcount — the biggest ripple |
| **Venue** | **outdoor/indoor risks** (weather/heat flags), venue-related cost lines, some logistics, message location |
| **Duration** | **schedule windows**, per-hour food/drink quantities, staffing hours |
| **Activity type** | a **re-classification** — re-runs the **coverage gate**, selects a new pattern/content + pricing reference → effectively a new plan (**with confirmation**; may trip the gate to a handoff if the new type is unsupported) |

The organizer sees the change **immediately** and reversibly. A recompute never silently alters a fact or
loosens safety; if a change pushes the event past a supported limit (size, budget, an unsupported type),
the gate surfaces an honest handoff rather than a wrong plan.

---

## 6. Health / Readiness model

The organizer must grasp event status in **10 seconds**. The event view leads with a **5-tile status
strip**, each tile a plain, color-coded signal (green / amber / red) derived from the plan — no numbers to
decode:

| Tile | Means | Derived from |
|---|---|---|
| **Ready %** | overall readiness (one bar) | a composite of the four tiles below + tasks completed |
| **Open Risks** | unhandled risks (esp. high / never-drop) | risk register, count not marked handled |
| **Missing Resources** | needs not yet sourced/filled | resource/needs list, count unfilled |
| **Budget Health** | within target? | **likely vs target** (green within, amber near, red over); flags fallback/reference pricing |
| **Staffing Status** | supervisors/roles needed vs arranged | supervision + staffing needs vs marked-arranged |

Alongside: **time-to-event** and the **single next action**. The dashboard shows the same tiles, condensed
to one **Ready %** + the top attention item per event card.

**Design intent:** the strip answers *"am I OK, and if not, what's wrong?"* at a glance — green means
proceed, amber means attend soon, red means act now. (Thresholds are simple status concepts, not exposed
formulas.)

---

## 7. Daily workflow

A typical organizer pass through the workspace:

1. **Create event** — enter the basics (what/when/where/how many). OPE **clarifies** what it needs
   (UNKNOWN → ASK), **gates** for support, and **generates the plan** (or returns an honest handoff). The
   event opens as a **Draft** with its status strip already populating.
2. **Review the plan** — read the timeline, budget, risks, and messages; glance at the **5 tiles** to see
   where it stands. The plan reads as *"here's your event, end to end."*
3. **Make changes** — adjust count / venue / budget / duration; the plan **recomputes instantly**. Tweak
   budget line items; add a custom task or note. Try options freely — it's deterministic and reversible.
4. **Prepare resources** — work the **task checklist** (tick items off → Ready % rises); generate
   **sourcing briefs** for staffing/vendor needs and mark them **filled**; **send invites/reminders** from
   the communication view. Watch **Missing Resources** and **Open Risks** fall to green.
5. **Run the event** — on the day, the workspace flips to the **Live** run-sheet: the day-of checklist and
   run-of-show lead; log any **deviation** and **tighten safety** if needed; almost nothing else is
   editable (it's frozen and ready).
6. **Close the event** — capture **actuals** (attendance, actual costs), send **thank-you/feedback**, and
   **close**. The plan freezes as a **record**; Ready % reads **done**. *(Post-v1, those actuals feed the
   learning loop — out of scope here.)*

Across all of it, the workspace keeps the organizer oriented: **where am I (lifecycle phase), what's next
(next action), what's at risk (the tiles)** — so the answer to *"is my event under control?"* is always
one glance away.

---

## Summary

OPE Workspace v1 turns the deterministic engine's 6-section plan into a **living operator's cockpit**:
seven lenses on one plan (planning, budget, resource, task, risk, communication, plus the event hub), a
**phase-aware** surface that shifts from workshop → to-do machine → confirmation board → run-sheet →
close-out, **deterministic instant recompute** when the organizer edits inputs (with facts and safety
protected), and a **5-tile readiness model** that answers *"is my event under control?"* in ten seconds.
It is the organizer's daily home — built entirely on what the engine already produces, redesigning
nothing.

_Organizer-experience design only. No architecture, schema, API, or code. Built on the existing OPE
engine, the Event Lifecycle, and the Organizer-Operating-System principle._
