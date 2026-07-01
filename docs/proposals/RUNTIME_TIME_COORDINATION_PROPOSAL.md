# Runtime Time Coordination — Architecture Proposal

> **Status: PROPOSAL — under evaluation. NOT part of the Product Canon.**
> This document critically evaluates a candidate model for how the **AI Organizer coordinates time** during
> a Project's Runtime. It follows `ACTIVLIFE_HUB_PRODUCT_CANON.md` and `PROJECT_RUNTIME_SPEC.md` but changes
> neither. Adoption requires an explicit decision; only then would selected principles be promoted (see
> "Promotion recommendations"). Product-level analysis — no database, API, schema, or code.

---

## Background & the open question

The Canon establishes that the **AI Organizer coordinates the Project throughout its lifecycle** (§9, §21),
that the **Project owns its state**, and that **AI observes and acts *through* the Runtime** rather than
owning it (`PROJECT_RUNTIME_SPEC` — "Runtime owns state; nothing owns the Project except the Project").

The open question this proposal answers:

> **How should the AI Organizer coordinate *time* without becoming responsible for timekeeping itself?**

The candidate model's central instinct — *the Runtime owns time; the AI coordinates against it* — is a
direct extension of principles the Canon already holds. That instinct is correct. Most of the work below is
tightening the model so it stays consistent with **invisible architecture**, **AI works / human decides**,
and **reduce organizer load** — and rejecting the parts that would harden into premature implementation.

---

## Evaluation of the candidate model

### 1. One authoritative Project timezone
**Verdict: Accepted with modification.**

Sound: time is a fact the Project owns, so a single authoritative time reference per Project is the right
default, and **the AI reasoning in Project time (never server time)** removes an entire class of errors and
is consistent with "the Project is the single source of truth."

Modifications:
- "Every scheduled activity belongs to *that one* timezone" is too rigid. Real activities span zones — a
  multi-venue festival, a trip that crosses time zones, a virtual event with worldwide participants. Correct
  model: the Project has one **authoritative reference timezone** (the "home" time in which the organizer
  and the Runtime reason and display), while an individual occurrence or activity may carry its **own local
  timezone**, always resolvable to the reference.
- Underneath, time should be anchored to **absolute instants**, with timezone as a reasoning/display
  concern. This — and DST handling — is **implementation detail**, not a product principle.
- "Mandatory if Runtime Time Tracking is enabled" is reasonable and accepted.

### 2. Two realities — Planned vs Actual
**Verdict: Accepted with modification.**

Excellent core idea. The planned-vs-actual duality is the proven **baseline-vs-actuals** pattern from mature
project systems; it gives the AI something concrete to reason about — the **deviation** — without owning the
clock. It matches `PROJECT_RUNTIME_SPEC` ("Runtime responds to what the real world does").

Modifications:
- Two realities is the right **minimum** but incomplete. Add a third, **derived** reality — **Forecast /
  Expected** (the AI's projection given current deviations, e.g. "started 20 min late → downstream shifts").
  Planned is the human-approved baseline; Actual is observed; Forecast is AI-derived and **non-authoritative**.
- Allow **partial and unknown** actuals (started-but-not-finished), and **point-in-time vs interval**
  activities (a payment is a moment; a session is an interval — not everything needs a start *and* finish).
- The **baseline must stay stable** through re-planning: when the plan changes, the planned reality is
  revised as a new version, but the original baseline is not silently overwritten (consistent with the
  Canon's immutable-record discipline).
- The specific fields (`planned_start`, `actual_start`, …) are **implementation detail**; the product-level
  contribution is *planned vs actual vs forecast, and deviation is what the AI reasons over*.

### 3. Runtime owns time; AI does not
**Verdict: Accepted (as stated).**

This is the most important and most correct idea, and it directly answers the background question. It is
fully consistent with `PROJECT_RUNTIME_SPEC` and prevents the AI from becoming a fragile timekeeper. It also
keeps the AI **deterministic-friendly**: it reasons over a single, stated source of time truth rather than
inventing one. Strong accept — a promotion candidate.

Clarification only: "Runtime owns time" should read as *the Project owns time, expressed through its
Runtime* (the Runtime is the Project's operating life, not a separate owner) — so the Canon's "only the
Project owns the Project" is preserved.

### 4. Runtime publishes events; AI reacts, does not poll
**Verdict: Accepted with modification.**

The **event-driven** pattern (Runtime publishes; AI reacts) is architecturally correct and matches
`PROJECT_STATE_MODEL` ("notifications are reactions to changes in Project State"). Reacting beats polling.

Modifications / critique:
- The list **conflates two different things**: (a) genuinely new **time-derived events** — countdowns,
  *started / finished / overdue* — which are this proposal's real contribution; and (b) general
  **Project-state events** — *vendor arrived, payment received, weather changed, participant cancelled,
  budget changed* — which the Runtime **already** publishes (`PROJECT_RUNTIME_SPEC §5`). Keep only the
  time-derived events as this proposal's scope; do not re-specify the state events.
- **Reject fixed thresholds (T-30 / T-10 / T-3) as a principle.** Lead times are context-dependent (a 3-day
  festival vs a 1-hour class) and should be **derived per activity and per coordination intensity**, not
  hard-coded. Accept "the Runtime publishes countdown / start / finish / overdue events"; reject the
  specific numbers (config / implementation).
- "AI never polls" is largely an **implementation** concern (push vs pull). The product-level truth is: *the
  organizer never has to ask the system for the time status; the Project surfaces it.*

### 5. Runtime modes — Free / Guided / Strict
**Verdict: Accepted with modification (the abstraction is *coordination intensity*, not three fixed modes).**

The intuition is correct and valuable: different activities need different **intensity of coordination**. A
single fixed intensity would either **over-nag** a small event (violating "reduce organizer load / never a
data-entry clerk") or **under-serve** a festival. So an intensity abstraction is right, and "Strict = confirm
every critical activity" aligns well with protecting the *critical few*.

Modifications:
- **Do not make three named modes a mandatory user setting the organizer picks from a screen** — that edges
  toward "operating a module," against invisible architecture and "the organizer works with the AI
  Organizer." Instead: **coordination intensity is a property the AI Organizer sets and adapts**, defaulting
  from the Project's scale/criticality and adjustable **in conversation**. Free / Guided / Strict are useful
  **named presets on a spectrum**, not a rigid taxonomy.
- Intensity should be **per-critical-activity, not only per-Project** — a small Project may still have one
  make-or-break moment that warrants confirmation while everything else stays quiet.
- Tie intensity to the **criticality** the Project already reasons about — Strict ≈ "confirm the critical
  few."

### 6. Multiple trusted sources of reality
**Verdict: Accepted with modification.**

Realistic and necessary: at any non-trivial event the organizer cannot personally observe everything. A
vendor reporting "arrived," a coordinator marking a session started, an integration from a check-in system —
these already fit `PROJECT_STATE_MODEL` and the multi-role **projections** (Canon §14–§16). Accept.

Modifications:
- **"Trusted" must be bounded.** Distinguish **observations** (many actors may contribute; the AI treats
  them as *evidence*) from **authoritative confirmations** (a human with the relevant authority). This keeps
  the model consistent with the **Commitment Gate** (§15): a vendor's "arrived" is evidence, not an
  unchallengeable truth, and anything that carries a commitment is confirmed by a human.
- **Conflicting reports** must be **surfaced for a human**, not silently reconciled by the AI.
- Each actor updates **only their slice** of reality (projection + permission), consistent with the Canon's
  view model. Actual reconciliation mechanics are **implementation detail**.

### 7. AI compares planned vs actual and proposes actions — coordination, not timekeeping
**Verdict: Accepted (as stated).**

This is the crux and it is exactly right: it is the natural consequence of parts 2 + 3 and it aligns
perfectly with the Canon — **the AI Organizer coordinates; AI works, the human decides; the Runtime owns the
state**. "Coordination, not timekeeping" is the clean separation the whole proposal exists to establish.
Strong accept — a promotion candidate (as a clarification of §9/§21, not a new idea).

---

## Research check (conceptual only — no copying)

Where do similar concepts already exist, and where does this proposal go further?

- **HoneyBook** — client/project pipeline with scheduling, reminders, and workflow automation for small
  operators. Has scheduled sessions and automated reminders, but **light** time coordination and **no live
  planned-vs-actual deviation tracking** of a real-world event.
- **Monday / ClickUp / Asana / Trello** — general work management: tasks with due dates, timelines/Gantt,
  and automations that fire on date or status (Trello the lightest). They model **planned dates + status**;
  first-class **baseline-vs-actual** is limited and mostly belongs to heavyweight PM (MS Project / Primavera).
  None provide an **AI Organizer** that continuously reasons over deviation during a live event.
- **Cvent / Tripleseat** — event management: detailed agendas / run-of-show, registration, day-of tooling
  (Cvent captures some real-time onsite/session data; Tripleseat centers on venue event orders and
  timelines). Rich but **human-operated dashboards**, not AI-orchestrated coordination.

**Common thread:** planned schedules + reminders/automations are widespread; baseline-vs-actual exists in
heavyweight PM; real-time run-of-show exists in event software.

**Where this proposal goes further** (by *recombining* proven patterns under the ALH model, not inventing
mechanics): (1) a single **Project-owned time truth** the AI reasons over but never keeps; (2) an **AI
Organizer that continuously compares planned vs actual and proposes coordinating actions** — instead of a
human watching a Gantt; (3) **adaptive coordination intensity** tied to criticality; (4) **multiple trusted
sources** feeding one Project truth with an observation/confirmation split; (5) all delivered **invisibly and
conversationally**, not as a dashboard the organizer must operate. The novelty is the **combination and the
AI-Organizer framing**, which none of the above deliver together.

---

## Final decision

Adopting this model — **with the modifications above** — would:

- **Simplify the architecture? Yes.** "The Project owns time; the AI reasons over it and never keeps its own
  clock" is a strong simplifying boundary that removes AI-timekeeping complexity and gives one time truth.
- **Strengthen the AI Organizer? Yes.** It gives the AI a concrete, well-bounded coordination job (compare
  planned vs actual, propose) without overreach — consistent with §9/§21 and the Commitment Gate.
- **Improve Project Runtime? Yes.** Planned-vs-actual + time-derived events make the Runtime's "operating
  life" concrete during preparation and execution.
- **Improve organizer experience? Yes — conditionally.** Only if **adaptive intensity** and **invisible
  architecture** are honored; the fixed-threshold, fixed-mode version would nag and would turn the organizer
  into a confirmation clerk. With the modifications, the Project actively coordinates time so the organizer
  never babysits the clock — supporting *"the organizer never feels abandoned."*

**Recommendation: adopt the model in its modified form.**

### Promotion recommendations

**Promote to `ACTIVLIFE_HUB_PRODUCT_CANON.md`** (as short clarifications of §9/§21/§15, not new product):
- *The Project owns time; the AI Organizer coordinates against it and never keeps its own clock.*
- *The AI Organizer's job around time is coordination, not timekeeping; the human confirms what matters.*

**Promote to `PROJECT_RUNTIME_SPEC.md`** (extends its existing sections):
- **Planned Reality vs Actual Reality (+ derived Forecast); deviation is what the AI reasons over** (extends §5, §13).
- **The Runtime owns time and publishes time-derived events** — countdowns, started / finished / overdue —
  that the AI reacts to (extends §4/§5).
- **Multiple trusted sources of reality**, split into **observations vs human confirmations**, with
  conflicts surfaced to a human (extends §5, §7, §14–§16).
- **Adaptive coordination intensity** (a spectrum the AI Organizer sets and adapts from criticality; Free /
  Guided / Strict as named presets, per-activity where needed) (extends the seasons model and §13).

**Keep as implementation details** (not Canon, not the Runtime spec):
- Field-level shapes (`planned_start`, `actual_start`, …); storage as absolute instants + display timezone; DST handling.
- Fixed countdown thresholds (T-30 / T-10 / T-3) — derived/configurable.
- Push-vs-poll event delivery ("AI never polls").
- Per-occurrence timezone override mechanics and conflict-resolution algorithms.
- Whether the three intensity presets are exposed as named settings at all.

### Open risks to resolve before adoption
- **Nagging risk:** intensity must default conservatively; when in doubt, quieter. Over-confirmation
  directly violates the Constitution.
- **False reality risk:** an incorrect observation (a vendor's mistaken "arrived") must remain challengeable;
  never let a single source's report become an unchallengeable commitment.
- **Scope creep:** keep this about *time coordination*; the general Project-state events already belong to
  the Runtime and should not be re-owned here.

---

*This is a proposal for evaluation. It modifies no existing document. If accepted, the "Promotion
recommendations" above define exactly what would move into the Canon, the Runtime spec, and implementation.*
