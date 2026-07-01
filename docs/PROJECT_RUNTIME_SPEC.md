# Project Runtime — Product Specification

> **Status: Product specification (product-level, not implementation).** Follows and is consistent with
> `ACTIVLIFE_HUB_PRODUCT_CANON.md` and `PROJECT_ASSEMBLY_ENGINE_SPEC.md`. It introduces no new product
> direction and describes only **how the product behaves** — no database, APIs, state machines, or code.
>
> **Guiding sentence (every section supports this):** *The organizer never feels abandoned after the Project
> is created.*

---

## Purpose

The Project Assembly Engine creates a **living Project**. The **Project Runtime** is what keeps that Project
alive — from the instant it is assembled, through preparation, the real-world activity, and long into its
memory and reuse.

Project Runtime is **not "event execution."** Execution is only one season of it. The Runtime is the
**operating life of the Project**: the continuous behavior that makes the Project respond, prepare, watch,
remember, and surface what matters — so the organizer is never left holding a static plan.

Throughout the Runtime, the Project remains the center. **Workspace, Marketplace, Public Space, and AI all
observe and act *through* the Runtime; none of them owns the Project. Only the Project owns the Project**
(Canon §4). Every other surface is a projection of, or an actor upon, the one living Project.

---

## 1. Why Runtime exists

Assembly makes the Project alive; **something must keep it alive.** Without a Runtime, a Project would be a
snapshot — accurate the moment it was made and stale forever after. The Runtime exists so the Project
behaves like a living place (Canon §4): it keeps preparing between visits, notices what changed, raises what
needs attention, and carries the activity forward. It is the reason the Project feels like a place that is
working *for* the organizer rather than a file the organizer must maintain.

## 2. When Runtime begins

The Runtime begins the **instant the Project is assembled** — the same moment the Project becomes alive
(Assembly spec §3). There is no gap between "created" and "operating." From its first moment the Project is
already watching, preparing, and ready to guide the next decision.

## 3. When Runtime ends

The Runtime does **not end when the activity ends.** The completed activity is one season, not the finish.
The Runtime continues through completion, photos, feedback, and memory. It only **quiets** when the Project
is archived — and even then the Project persists as history and can be reawakened for a repeat or a similar
activity (Canon §20). In practice the Runtime never truly "ends"; it goes dormant in the archive, ready to
resume. A Project's operating life ends only if the Project itself is retired — and even then nothing
important is deleted.

## 4. Major Runtime phases (seasons — descriptive, not a rigid machine)

A Project moves through natural **seasons**. These are *descriptive* — not a fixed sequence, not mandatory,
and not exclusive: a Project can sit in several at once ("Preparing" while "Searching resources" and "Needs
decision"), skip some, or revisit them. The Workspace always names the current season in plain language so
the organizer knows, at a glance, where the Project is in its life.

Illustrative seasons (examples, not a required set): **Newly assembled → Preparing → Searching resources →
Budget updates → Needs decision → Waiting → Proposal sent → Awaiting approval → Deposit received → Scheduled
→ Published → Registrations → Final preparation → Live activity → Completed → Photos → Reviews → Repeat →
Archived.**

The point is not the list. The point is that the Project always **has a season**, the organizer can always
see it, and moving between seasons feels continuous — the same place changing, never a new page (Canon §4).

## 5. Which events may happen during Runtime

The Runtime responds to whatever the real world does to the activity. Any of these **changes the state of
the Project** and may surface attention (examples, not exhaustive):

- the client changes the idea; the budget changes; a vendor becomes unavailable; the weather forecast
  changes; a participant cancels or registers; AI finds a cheaper or better option; AI detects a risk; a
  deadline is approaching or missed; a payment is received; a proposal is accepted; a date is set; the
  activity goes live; the activity completes; photos or feedback arrive.

Each such event updates the one living Project and, when it matters, is surfaced to the right person.
Nothing meaningful happens to the activity that the Project does not notice.

### The Project Runtime owns Project time

Time is one of the facts the Project owns. **The Project Runtime owns Project time** — just as it owns the
rest of the Project's state — and no observer keeps a version of time for itself.

To make that ownership real, the Runtime includes a **time-watching mechanism**. Its responsibility is to:

- **observe the current time**;
- **interpret it in the Project's own timezone** — never in server time or any observer's time;
- **compare it against the Project's schedule** — its planned moments and how they are actually unfolding;
  and
- **produce Runtime time events** when a meaningful moment occurs — for example, a moment is *approaching*,
  a moment has *started*, a moment has *finished*, or a moment is *overdue*.

This time-watching mechanism is **part of the Project Runtime. It is not the AI Organizer.** It is simply how
the Runtime turns the passage of time into meaningful events that the rest of the Project — including the AI
Organizer — can react to.

## 6. Which events require AI

The **sense-and-prepare** work is AI's (Canon §21 — AI is the operational team). AI, on its own, watches and
readies things: detecting a risk, finding a cheaper or better option, noticing an approaching deadline,
re-reconciling the plan after a change, drafting reminders and updates, and continuously surfacing *"here is
what needs your attention."* This work happens between the organizer's visits, so the Project keeps moving
even when no human is present.

## 7. Which events require humans

The **judgment-and-commitment** work is the human's (Canon §7, §11, §15). A human must decide: approve a
proposal, choose a vendor, set the date, publish, spend money, accept a risk, cancel, or make any commitment
that costs money, creates an obligation, or cannot be undone. **AI may prepare every one of these, but AI
never authorizes a commitment** — a proposal becomes a commitment only when the responsible human (and, for
client work, the client) accepts it (Commitment Gate).

## 8. Which events require both

Most meaningful events are a **handoff: AI prepares, the human decides.** Examples:

- a vendor becomes unavailable → AI finds alternatives → the organizer chooses;
- the budget changes → AI reprices the scope → the organizer approves;
- the client changes the idea → AI reconciles the plan → the human approves the new direction;
- AI detects a risk → AI proposes a mitigation or Plan-B → the human decides whether to act.

This is the platform's rhythm throughout the Runtime: **AI works, the human decides** — never a blank form,
never a rubber stamp.

## 9. How Runtime preserves Project history

Every meaningful change becomes part of the Project's **story**, not a hidden log (Canon §4, Project State
Model). History is **append-only**: the Project accumulates memory rather than overwriting it. At any moment
the organizer can see *"what changed since I was here?"* and the full arc of what was decided and why. The
timeline of the Project is the narrative of its life, and it is always available.

## 10. What can never disappear from the Project

Nothing important is ever lost (Canon §4, §13, §15, §20). Permanent for the life of the Project:

- its identity and its one stable address;
- its history and the record of every agreed decision;
- the client's original intention, preserved so the activity never drifts from what was asked;
- issued and immutable artifacts — a sent proposal, an invoice, a payment;
- the media and memories created around the activity.

Seasons change; these do not.

## 11. How Runtime supports repeated activities

A completed Project is a **reusable starting point** (Canon §20, Assembly spec §12). Its plan, decisions,
sourced vendors, and lessons become the seed of a similar activity, so repeating means **continuing from a
living, remembered Project** rather than starting from a blank page. The organizer's past effort compounds
instead of resetting — each new occasion is easier than the last.

## 12. How Runtime supports long-running Projects

A recurring or ongoing activity is **one Project with many Occurrences** (Canon §18) — never many Projects.
The same permanent place persists across many dates and seasons; each occurrence is a new instance inside
it. Over time the long-running Project accumulates participants, history, and reputation without fragmenting.
The Runtime keeps a years-long series feeling like a single, continuous place.

## 13. What the organizer experiences during Runtime

The organizer experiences a **place that keeps working for them.** They return and immediately see what
changed, what needs a decision, and what is next — the Workspace brings the important thing to them rather
than making them hunt (Canon §13). Between visits, AI has kept preparing; decisions arrive ready to make.
They feel like a **director supervising a moving production** — informed, in control, and unburdened — never
a clerk maintaining a record, and never alone with a static plan.

## 14. What participants experience

Participants experience the Project through their own view of it — a **projection of the same living
Project** (Canon §14, §17). Before the activity they see what it is, when and where, what to expect, and
receive updates and reminders as things change. During it they get the updates they need. After it they can
return for photos, memories, and to give feedback. Their experience is that of being **kept informed and
cared for**, part of a living thing rather than left guessing.

## 15. What vendors experience

Vendors experience the Project only where it concerns them — again a **projection of the same Project**
(Canon §16). They see their assignments, timing, requirements, the changes that affect them, and the
communication relevant to their work. They see nothing beyond their permission. Their experience is
**structured coordination instead of chaos** — the Project tells them what is needed and when, and keeps
them current as things change.

## 16. What AI experiences

AI **observes and acts through the Runtime** as the tireless operational team (Canon §21). It perceives the
full operational state of the Project it is allowed to use, watches continuously for risk, opportunity, and
approaching deadlines, and does the preparing work — sourcing, pricing, communication, and surfacing
decisions. But **AI never owns the Project and never authorizes a commitment.** Its role is to keep the
Project alive and prepared between human visits, and to hand the human a decision that is already worked
through. AI is the Project's engine of continuous motion; the human is its authority.

The AI Organizer **never keeps its own clock.** It does not poll the time and maintains no notion of time of
its own. It reacts **only** to the Runtime time events the Project's time-watching mechanism produces, and
coordinates the Project accordingly. Timekeeping belongs to the Runtime; **coordination** belongs to the AI
Organizer.

---

## Final verification — *"The organizer never feels abandoned after the Project is created."*

- **§1–§3** guarantee the Project is operating from its first instant and never stops operating — it is
  alive at creation and stays alive long after the activity.
- **§4** ensures the Project always has a visible season, so the organizer always knows where things stand.
- **§5–§8** guarantee that whatever the real world does, the Project notices, AI prepares, and the human is
  handed a ready decision — never left to discover problems alone.
- **§9–§10** guarantee nothing is ever lost, so the organizer can always trust and revisit the full story.
- **§11–§12** guarantee the Project keeps serving the organizer across repeats and long-running series, so
  effort compounds instead of resetting.
- **§13** states the felt result directly: a place that keeps working *for* the organizer, bringing the next
  thing to them.
- **§14–§16** ensure participants, vendors, and AI all keep the *one* Project moving, so the organizer is
  supported from every side.

The Project is the center; everything else observes and acts through the Runtime. Because the Runtime never
stops watching, preparing, remembering, and surfacing what matters, **the organizer never feels abandoned
after the Project is created.**
