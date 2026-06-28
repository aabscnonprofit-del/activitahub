# Cognitive Model of a World-Class Event Organizer

> **Purpose:** reconstruct the *mental operating model* of highly experienced event organizers —
> how they think before, during, and after an event — and conclude with additive, module-mapped
> implications for ActivLife Hub. This studies **cognition, not software**: no UI, no features, no
> implementation. Research only; changes no code, schema, architecture, or pipeline.
> **Companion:** `REAL_ORGANIZER_DECISION_MODEL.md` (behavior — *what* experts do) and the Global
> Engineering Benchmark corpus. This document covers the *cognition behind* that behavior.
> **Method & honesty note:** this is a synthesis of established cognitive-science frameworks (cited
> in the final section) applied to event work, abstracted into recurring cross-domain patterns. It
> reconstructs *patterns*, not verbatim interview quotes; where a claim is inference rather than
> established finding, it is flagged.

---

## 0. Orientation — the central thesis

A world-class organizer does **not** run an optimizer. Decades of naturalistic-decision-making
research (Klein, Endsley, Rasmussen, Hollnagel) point to one conclusion that holds across weddings,
festivals, conferences, stadium events, broadcast production, and emergency response:

> **Expert event cognition is recognition + mental simulation + protection of a small critical core
> — executed as a continuous perceive→comprehend→project loop, and deliberately *distributed* across
> people and artifacts so that working memory is reserved for judgment.**

Five load-bearing properties recur:
1. **Recognition over deliberation.** Experts don't enumerate options; they *recognize* a situation
   as a type they've seen and act on the first course their mental simulation says will work
   (Klein's Recognition-Primed Decision, RPD).
2. **Satisficing, not optimizing.** They seek *good enough to succeed*, not optimal (Simon). Optimal
   is a beginner's trap and a time sink on uncertain data.
3. **A protected core.** They identify the few things that *cannot fail* and pour attention there,
   letting everything else flex. Importance, not order, governs attention.
4. **Externalized cognition.** The plan, the run-sheet, the radio net, the team — cognition is
   *distributed* (Hutchins). Working memory holds the live picture and the next decision; everything
   else is offloaded so the mind stays free for the unexpected.
5. **Anticipate-monitor-respond-learn.** The four cornerstones of resilience (Hollnagel): experts
   pre-build responses, watch leading indicators, adapt gracefully, and convert outcomes into
   pattern memory.

Everything below elaborates this thesis.

---

## Part 1 — Mental Model: how an event is represented in the mind

Experts do **not** primarily think in *tasks*. Tasks are an output, not the representation. The
expert's internal model is **layered**, and the layers are ranked by consequence:

1. **The intended experience / the "moment."** The emotional outcome and the one or few moments that
   *are* the event (the vows, the headliner, the keynote, the kickoff). Everything else exists to
   protect these. Novices hold a task list; experts hold *the felt result* and reason backward.
2. **The critical core / load-bearing elements.** A small set (often 3–7, matching working-memory
   limits — Miller 7±2 / Cowan ~4 chunks) of things whose failure ends the event: the venue/access,
   power, the principal people, the headcount, the timing spine, safety. This is held *in the head*,
   constantly.
3. **Commitments and people, not just resources.** Experts think in **promises** — who owes what, by
   when, confirmed or not — and in **relationships** (this vendor is reliable, that one needs
   chasing). A "resource" to a novice is a line item; to an expert it is a *person who has committed*
   and may not deliver.
4. **The dependency spine and fixed points.** A sparse causal map: what must happen before what, and
   the *immovable points* (doors open at 19:00, sunset at 18:42, the band loads in by 16:00). They
   do not hold the full graph — they hold the **critical chain** and the fixed anchors; the rest is
   externalized.
5. **A risk surface.** Not a register — a *felt sense* of where this event is fragile, updated
   continuously. "What's most likely to bite me, and what's my move if it does."

**Key insight:** the expert representation is a **compressed, consequence-ranked model** — meaning at
the top, the critical core and fixed points in working memory, the long tail externalized. Chunking
(Chase & Simon's chess studies) is why experts hold more with less effort: they perceive "a
standard outdoor wedding with a weather exposure" as one chunk, not 200 tasks.

---

## Part 2 — Planning: how an event is planned in the mind

- **First planned: the end, then backward.** Experts **backcast** from the moment and the fixed
  points (*working backward from the deadline*), establishing the spine before the detail. The first
  question is rarely "what are the tasks" — it is "what does success look like, and what are the
  immovable points it hangs on?"
- **Intentionally left undefined (deferred commitment).** Experts *under-specify on purpose*. Details
  that depend on information not yet available — exact run order, final counts, specific assignments —
  are deliberately left open until the **last responsible moment** (a Lean idea), because committing
  early on uncertain data creates rework. This is the cognitive twin of ALH's "abstract-before-real /
  late binding."
- **Uncertainty accepted, not eliminated.** Experts plan to a level of detail proportional to
  *stability*: stable things (the spine) are nailed; volatile things (weather, attendance, vendor
  confirmations) are held loosely with **contingency**, not false precision. They reserve **slack/
  buffer** at the outcome level rather than padding every task (the Critical Chain insight).
- **Mentally simulated.** The expert *runs the event in their head* — a walk-through from arrival to
  teardown, looking for where it breaks: load-in conflicts, transition gaps, the moment 200 people
  all want coffee, the rain plan. This **prospective simulation** is the core planning act and the
  source of most "I just know we need X." It pairs with the **pre-mortem** (Klein): "assume it
  failed — why?" — prospective hindsight that surfaces risks optimism hides.
- **Ignored on purpose.** Low-consequence detail, decorative perfection, and anything that doesn't
  touch the core or a fixed point. Experts conserve planning attention as fiercely as execution
  attention. Beginners over-plan the visible and under-plan the load-bearing.

---

## Part 3 — Decision Making: how decisions are actually made

- **Recognition first, analysis only when stuck.** Most expert decisions are RPD: recognize the
  pattern → simulate the obvious course → if it works, act; if simulation reveals a flaw, fix that
  flaw or take the next recognized course. They rarely build a comparison matrix. Deliberate
  option-comparison appears only for **novel, high-stakes, reversible-window** decisions (vendor
  selection, format choices) — and even then, satisficing dominates.
- **Information required vs ignored.** Experts are ruthless about **relevance**. Required: the few
  facts that change the decision (is it confirmed? what's the lead time? what fails if this slips?).
  Ignored: precision beyond what changes the action, sunk cost, and information that arrives too late
  to act on. A defining expert trait is *knowing what not to look at* — novices drown in detail
  because they cannot tell signal from noise.
- **Trade-offs evaluated by consequence and reversibility.** The dominant axes are **"what's the
  cost of being wrong"** and **"can I undo it."** Cheap-and-reversible decisions are made fast and
  early (they are options, not commitments). Expensive-and-irreversible decisions are slowed,
  confirmed, and often escalated to the principal/client. This reversibility heuristic is the single
  most reliable expert decision filter.
- **Uncertainty handled by hedging, not resolving.** When they can't know, experts **keep options
  open**, secure a **backup**, and **buy information cheaply** (a confirmation call, a weather check)
  before committing. They convert unknowns into *monitored* unknowns.
- **Incomplete information handled by acting on the spine.** They make the decisions the critical
  core demands now and *defer the rest*. The skill is distinguishing "decision I must make now to
  protect the core" from "decision that looks urgent but can wait for better information."

---

## Part 4 — Prioritization: the attention economy

Experts run an explicit (if intuitive) **four-bucket triage**, continuously re-sorted:

| Bucket | Definition | Cognitive treatment |
|---|---|---|
| **Cannot fail** | Failure ends or ruins the event (safety, the moment, access, the principals, the timing spine) | Held in working memory; over-confirmed; redundancy/backup; the organizer's personal attention |
| **Matters now** | On the critical path *this* moment; a closing window | Active focus; do or delegate immediately |
| **Can wait** | Real but not yet time-critical | Externalized to the plan/team; sampled, not watched |
| **Can fail safely** | Decorative or low-consequence; a graceful-degradation candidate | Deliberately *not* given attention; first to be sacrificed under pressure |

Two expert moves stand out:
- **Protecting the critical few.** Experts know that attention is the scarcest resource and that
  spreading it uniformly means protecting nothing. They *consciously starve* the can-fail-safely
  bucket to feed the cannot-fail bucket.
- **"Should never consume attention."** Mature experts actively *push things out of mind* — by
  delegating with clear ownership, by trusting confirmed commitments, by externalizing to a checklist
  so they can stop holding it. The discipline of *not* thinking about a closed item is as important
  as tracking an open one. (Novices keep everything "warm," exhaust working memory, and miss the live
  signal.)

---

## Part 5 — Stress: how thinking changes along the countdown

Cognition is not constant; it shifts predictably as arousal rises (Yerkes-Dodson inverted-U:
performance peaks at moderate arousal, degrades when too low or too high). The expert's craft is
*staying near the top of the curve* and *managing the team's position on it*.

| Horizon | Dominant cognitive mode | What changes |
|---|---|---|
| **~1 month out** | Strategic / analytical (Rasmussen "knowledge-based") | Wide, deliberate; lock the spine and fixed points; pre-mortem; secure the cannot-fail items and their backups. Time is the resource. |
| **~1 week out** | Convergent / closing loops | Shift from *deciding* to *confirming*. Re-confirm commitments (booked ≠ confirmed). The risk surface sharpens; ambiguity is intolerable now. |
| **~1 day out** | Procedural / "rules-based" | Switch to checklists and walk-throughs; minimize new decisions; freeze the plan. Cognitive load is offloaded to artifacts so the mind is clear for tomorrow. This is the cognitive meaning of a **go/no-go**: stop planning, commit, prepare to execute. |
| **~1 hour out** | Perceptual / monitoring | Working memory clears to *the live picture*. Attention narrows to the critical core and the first moves. Experts deliberately *finish thinking* before this point. |
| **During live execution** | Reactive / "skill-based"; OODA at speed | Fast perceive→orient→act loops; satisfice hard; communicate constantly; hold the timeline and the room. Decisions are recognized, not deliberated — there is no time. |
| **During failure** | Stabilize-then-diagnose | Arousal spikes → risk of **attentional tunneling** and **cognitive overload**. The expert's first act is to *regulate arousal* (composure) precisely to avoid tunneling, then act (Part 9). |

Two expert-specific adaptations: (1) they **front-load decisions** so the high-arousal window holds
few choices; (2) they **manage the team's arousal**, not just their own — calm is a transmitted
signal (a Crew-Resource-Management finding), and a panicking team loses situational awareness first.

---

## Part 6 — Replanning: modify, keep, abandon, or invent

Experts treat the plan as a **hypothesis under test**, not a contract. The decision among four
responses is itself a recognized judgment, well captured by Cynefin sense-making (Snowden) and OODA
*orientation* (Boyd — re-orienting faster than the situation degrades):

- **Keep the plan** when the deviation is within the buffer/contingency the plan already reserved.
  Experts resist the novice urge to re-plan at every wobble — *thrashing* destroys execution. "The
  plan accounts for this; hold."
- **Modify the plan** when a specific assumption broke but the structure is sound — swap a vendor,
  shift a transition, deploy a pre-positioned backup. This is the common case and is *fast* because
  the backup was anticipated (Part 2's pre-mortem pays off here).
- **Abandon the plan** when the *core assumption* fails (the venue is unusable, the headliner cancels).
  The expert recognizes this as a different *kind* of problem — the plan is no longer about the same
  reality — and stops defending it. Knowing *when the plan is dead* is a senior skill; juniors defend
  dead plans far too long (sunk-cost + identity).
- **Invent a new solution** when the situation is genuinely novel (Cynefin "complex/chaotic") and no
  recognized response fits — improvisation *within constraints*, anchored to the unchanged goal (the
  *moment* and safety) and the available resources. Experts improvise toward the **same end** with
  different means; they do not abandon the goal, only the route.

The meta-skill is **diagnosing which mode you're in** before acting — and re-orienting fast. The
failure mode is mis-classification: treating a dead-plan situation as a modify situation (defending
too long) or a within-buffer wobble as a crisis (thrashing).

---

## Part 7 — Situational Awareness: holding hundreds of moving parts

This is where experts most visibly outperform, and it is *not* superior memory — it is superior
**organization and externalization** of awareness. Endsley's three-level model maps exactly:

- **Level 1 — Perception.** What is happening right now (who's where, what's confirmed, what's late).
- **Level 2 — Comprehension.** What it *means* (this late delivery threatens the 16:00 load-in,
  which threatens doors-at-19:00).
- **Level 3 — Projection.** What happens *next* (if this slips 30 minutes, the cascade is X). Experts
  live at Level 3; novices get stuck at Level 1, reacting to events instead of anticipating them.

How the hundreds of parts are managed:
- **Working memory holds only the live critical picture** — the cannot-fail items, the current
  position on the timeline, the next decision, and any *open* anomaly. That's it (≈4 chunks).
- **Everything else is externalized** — the run-sheet/cue-sheet, the checklist, the budget, the
  contact list, the team's individual ownership. The artifact *is* part of the cognition (distributed
  cognition, Hutchins): the expert doesn't *remember* the schedule, they *consult* it, freeing the
  mind. A canonical expert behavior is building a **single source of truth** everyone reads from, so
  awareness is shared, not siloed.
- **Continuously monitored:** the critical core, the timing spine, and any *open anomaly* — the few
  leading indicators that predict cascade (Is the room filling on time? Is the kitchen on schedule?
  Is the principal calm?). Experts watch *predictors*, not just *status*.
- **Sampled periodically:** everything stable and delegated — checked on a cadence, not watched.
  Mature delegation means an item *leaves* continuous awareness once a trusted owner has it (with a
  confirmation loop), returning only if a sampled check or an exception flag pulls it back.

The expert's situational-awareness discipline is therefore: **narrow continuous attention to
predictors of cascade; sample the stable; externalize the rest; share the picture.**

---

## Part 8 — Experience: how the mental model matures

The Dreyfus & Dreyfus five-stage model (here compressed to four), plus chunking (Chase & Simon) and
deliberate practice (Ericsson), explain the trajectory:

| Level | Mental model | Characteristic cognition | Failure mode |
|---|---|---|---|
| **Beginner** | A flat **task list**; rules followed literally | Plans detail uniformly; can't tell signal from noise; reacts to events (SA Level 1) | Over-plans the visible, misses the load-bearing; drowns in detail; defends dead plans |
| **Intermediate (competent)** | Tasks + some **dependencies**; aware of priorities | Begins to plan around the critical path; still over-confirms everything; analysis-heavy | Slow under pressure; thrashes on deviations; attention spread too evenly |
| **Senior (proficient)** | **Consequence-ranked**; sees the critical core and fixed points; thinks in commitments | Recognition-driven; satisfices; pre-mortems; reserves buffer; manages own arousal | Occasionally over-relies on a known pattern in a genuinely novel situation |
| **World-class (expert)** | **Compressed, felt model of the *outcome*** with the critical core in working memory and everything else externalized and delegated | Reads situations instantly (RPD); lives at SA Level 3; protects the few; improvises toward the unchanged goal; manages the *team's* cognition; knows what not to look at | Rare — over-confidence; tacit knowledge hard to transfer to juniors |

The deepest difference is **perceptual**: experts *see different things* in the same situation
(chunked patterns, fragility, cascade paths) and therefore make fewer, better, faster decisions with
less felt effort. Expertise is not more knowledge held in mind — it is **better-organized knowledge
that frees the mind**. Crucially, much expert knowledge is **tacit** (Polanyi) — the expert "just
knows," which is why expertise is hard to document and dangerous to naively automate.

---

## Part 9 — Failure Recovery: diagnosis under pressure

When something goes wrong, the expert sequence is remarkably consistent across domains (it mirrors
incident-command and clinical-resuscitation practice):

1. **Regulate arousal first (composure).** Before diagnosis, the expert deliberately *slows their own
   reaction* to avoid attentional tunneling and overload. Calm is a prerequisite for accurate
   perception, and it is *transmitted* — a calm lead keeps the team's situational awareness intact.
2. **Stabilize before diagnosing — protect the core.** The first action is rarely to fix the cause;
   it is to *stop the bleeding* — protect safety and the moment, buy time, contain the blast radius.
   (Emergency medicine: airway/breathing/circulation before etiology.) "Make it not get worse" comes
   before "understand why."
3. **Distinguish symptom from cause.** Experts resist treating the loudest symptom. They ask "what is
   *actually* broken?" — the late caterer might be a symptom of a traffic problem that also threatens
   three other deliveries. They trace to the **root** because fixing symptoms multiplies work and
   misses cascades. (This is where Level-2/3 situational awareness earns its keep.)
4. **Choose the recovery mode (Part 6)** — deploy the pre-positioned backup (fast), modify, or
   improvise toward the unchanged goal. Anticipated failures recover *fast* because the response was
   pre-built; truly novel ones require invention within constraints.
5. **Regain control = re-establish projection.** Control is recovered not when the symptom is gone but
   when the expert can again *predict what happens next* — when they're back at SA Level 3 and the
   situation is once more inside the plan (or a new viable plan). Until they can project forward, they
   are still reacting, not controlling.

The defining expert trait in failure is **diagnostic discipline under arousal**: stay calm, stabilize
the core, find the real cause, act on the anticipated response, and restore forward prediction.

---

## Part 10 — Success Recognition: knowing it's safe

Experts have a clear, if tacit, internal "all-clear" — and recognizing it is itself a skill (over-
monitoring wastes the attention an event still needs elsewhere; under-monitoring misses a late
collapse). The recognized signals, recurring across domains:

- **The critical core has passed or is irreversibly secured.** The moment happened; the principals
  are safe and present; the timing spine is holding; access/power held. The *cannot-fail* items have
  cleared their risk windows.
- **Open anomalies are closed; no new ones are appearing.** The risk surface has gone quiet — the
  rate of new problems, not just their count, has dropped. Experts watch the *derivative*.
- **Projection is boring.** When Level-3 simulation forward shows nothing threatening — "from here
  it just runs" — the event is under control. Control *is* the ability to predict an uneventful path.
- **The plan is executing itself / the team has it.** Delegation is holding; the organizer is being
  consulted less; the system runs without their continuous intervention.

When these align, the expert **down-shifts**: from active control to monitoring-and-sampling, freeing
attention for graceful landing (teardown, settlement, the relationship close). The *decision to stop
intervening* is a deliberate cognitive act — staying in high-control mode too long is itself a mild
failure (exhaustion, micromanagement, missed close-out). The mirror of the go/no-go is the
**"it's safe now"** recognition that releases the organizer's attention.

---

## Synthesis — the unified cognitive operating model

A world-class organizer runs one continuous loop, instantiated at every horizon (month → live):

```
  PERCEIVE (what's true now, esp. predictors of cascade)
      → COMPREHEND (what it means for the critical core + fixed points)
          → PROJECT (what happens next; where it breaks)
              → RECOGNIZE a course (RPD) + SIMULATE it (incl. pre-mortem)
                  → ACT on the spine / defer the rest / hedge the uncertain
                      → EXTERNALIZE + DELEGATE (free working memory)
                          → MONITOR predictors, SAMPLE the stable
  (loop; re-orient faster than reality degrades)
```

Held constant throughout: **the meaning/the moment** at the top, **a protected critical core** in
working memory, **everything else externalized and owned**, **satisficing** over optimizing, and
**anticipate → monitor → respond → learn**. Expertise is the speed, accuracy, and economy of this
loop — and the wisdom about *what not to attend to*.

---

## Implications for ActivLife Hub

*Additive only — mapped onto the existing eight modules (M1 Discovery · M2 OPE · M3 Project Assembly
· M4 Workspace · M5 Marketplace · M6 Execution · M7 Completion Evidence · M8 Closure). No
architecture redesign, no implementation, no code. These extend the recommendations already recorded
in `ARCHITECTURAL_IDEA_CATALOG.md` / `FINAL_ENGINEERING_RECOMMENDATIONS.md` with the cognitive
rationale.*

### A. Cognitive capabilities OPE (M1–M3) should eventually support
The deterministic upstream should *encode the structure expert cognition relies on*, so the human is
freed to do judgment:
- **The "moment" as a first-class concept (M1/M2).** Discovery already captures meaning/desired
  result; make the *peak/the moment* explicit in the FED so everything downstream can be ranked
  against "does this protect the moment." (Cognitive basis: Part 1 — experts reason from the outcome.)
- **Consequence-ranking / criticality (M3 computes → M4 surfaces).** Experts hold a *critical core*,
  not a flat list. ALH orders work but does not rank it by consequence. A computed criticality/
  critical-chain annotation over the dependency graph (the single highest-leverage gap in both this
  study and the benchmark) lets the platform show "what carries the day." (Parts 1, 4, 7.)
- **Backward-from-fixed-points sequencing + immovable points (M2/M3).** Model fixed anchors
  explicitly; the timeline is built backward from them. (Part 2.)
- **Pre-mortem-style risk generation + named Plan-B (M2; sourced M5; held M4).** Risks should carry
  an *anticipated response/alternative path*, not just narrative mitigation — the pre-positioned
  backup is what makes expert recovery fast. (Parts 2, 6, 9.)
- **Uncertainty as ranges + an aggregated buffer (M2 defines, M4 burns down).** Experts accept
  uncertainty and reserve outcome-level slack; encode estimates as ranges and a single buffer, not
  per-task padding. (Parts 2, 3.)
- **Deliberate under-specification / late binding (already a strength).** ALH's abstract-before-real,
  late-date-binding posture *is* the cognitive "last responsible moment." Protect it. (Part 2.)

### B. Cognitive capabilities Workspace (M4 / M6) should support
The stateful modules should *externalize awareness* and *protect attention* the way an expert's
artifacts and team do:
- **A single source of truth + shared situational picture (M4 → M6).** The expert builds one picture
  everyone reads from; ALH's immutable Project + append-only timeline already are this — extend M4 to
  present the *live* critical-core view and M6 to carry it to the day-of. (Part 7.)
- **Predictor monitoring vs status (M6).** Surface *leading indicators* of cascade (is it on time, is
  the core secured), not just task status — support SA Levels 2–3, not just Level 1. (Parts 7, 10.)
- **Attention triage / "what matters now vs what can wait vs what can fail" (M4).** Use criticality
  (from A) to help the organizer *starve the can-fail-safely bucket and feed the cannot-fail bucket*
  — and to let closed/delegated items *leave* continuous attention. (Part 4.)
- **The go/no-go as an explicit cognitive transition (M4 lifecycle).** The "stop planning, freeze,
  commit, prepare to execute" shift is a real cognitive mode-change; the Ready gate should make it an
  explicit, recorded human decision. (Part 5.)
- **The "it's safe now" / down-shift signal (M4/M6 → M7).** Recognizing that risk windows have
  cleared and projection is boring is a distinct cognitive act; support a readiness/all-clear view
  that releases attention toward graceful close-out. (Part 10.)
- **Graceful-degradation ladder (M4 stages it / M6 uses it).** Pre-declare full → reduced → minimum-
  viable so the can-fail-safely items are *known in advance* as the things to sacrifice. (Parts 4, 6.)
- **Always-verify baseline checklist (M4 prep → M6 day-of).** Externalize the load-bearing facts
  experts re-confirm every time (headcount, timing, access, power, weather, safety) — Gawande's
  checklist discipline. (Parts 5, 7.)
- **Confirmation loops as first-class (M4 track / M5 confirm).** Encode "booked ≠ confirmed" — the
  re-confirmation lifecycle experts run in the final week. (Parts 5, 7.)

### C. What must remain human (never automated)
These are tacit, relational, or irreversible-judgment acts where automation degrades the outcome and
erodes accountability:
- **Definition of success / the relationship with the client** (the meaning itself). (Parts 1, 8.)
- **Final go/no-go and the "it's safe now" call.** (Parts 5, 10.)
- **Safety decisions** — tighten-only, human-owned. (Parts 4, 9.)
- **In-the-moment recovery and improvisation** under live arousal — invention toward the unchanged
  goal. (Parts 6, 9.)
- **Reading and directing the room / managing the team's arousal.** (Parts 5, 9.)
- **Commitment of irreversible, outward-facing actions** (contracts, charges, public sends) — confirm,
  never auto-execute. (Part 3 reversibility heuristic.)

### D. What AI can assist (advise; decide only with human confirmation)
AI's value is *offloading what consumes attention so the human can do judgment* — strictly advisory,
behind ALH's verify-don't-trust posture:
- **Offload monitoring to protect attention (M6).** Watch the many sampled items and *surface
  anomalies/predictors* so the human reserves working memory for the core — never auto-acting. (Part 7.)
- **Pre-mortem and risk surfacing (M1/M2/M4).** AI can propose failure modes and missing
  load-bearing items for the human to accept/reject — augmenting the expert's anticipation. (Part 2.)
- **Recognition support for the inexperienced (M4).** Surface "events like this usually need X / fail
  at Y" — compressing the novice→expert perceptual gap as *advice*, with the human deciding. (Part 8.)
- **Diagnosis assistance in failure (M4/M6).** Help separate symptom from cause by tracing the
  dependency/criticality graph — advisory; the human chooses the recovery. (Part 9.)
- **Drafting, summarizing, retrieval (M1/M4/M7/M8).** Comms drafts, status summaries, evidence and
  learnings — always human-confirmed before anything binds. (Parts 3, 8.)
- **The learning loop (M8 → M1/M2).** Convert closed events into recognized patterns (the substrate
  of expertise) via the expert gate, strengthening future Discovery/OPE. (Part 8.)

### E. The one cognitive principle that should govern all of the above
> **The platform's job is to externalize structure and awareness so the organizer's scarce attention
> is reserved for recognition, judgment, and the protected core — never to replace those.** ALH's
> existing architecture already embodies this (deterministic structure upstream, a working overlay at
> M4, humans approving intent and making consequential calls, AI behind verified contracts). Every
> recommendation here is additive within that frame and consistent with
> `ARCHITECTURAL_IDEA_CATALOG.md`.

---

## Sources & frameworks (and uncertainty)

This synthesis draws on established frameworks, applied to event work:
- **Recognition-Primed Decision / mental simulation / pre-mortem** — Gary Klein, *Sources of Power*
  (1998) and pre-mortem work.
- **Situational Awareness (3-level)** — Mica Endsley.
- **Skills/Rules/Knowledge cognitive control** — Jens Rasmussen.
- **Resilience engineering (anticipate/monitor/respond/learn; graceful extensibility)** — Erik
  Hollnagel, David Woods.
- **Expertise development (5-stage)** — Dreyfus & Dreyfus; **chunking** — Chase & Simon; **deliberate
  practice** — K. A. Ericsson; **tacit knowledge** — Michael Polanyi.
- **OODA loop / orientation** — John Boyd. **Cynefin sense-making** — Dave Snowden.
- **Satisficing / bounded rationality** — Herbert Simon. **Working-memory limits** — Miller (7±2),
  Cowan (~4). **Arousal–performance** — Yerkes-Dodson. **Cognitive load** — John Sweller.
- **Distributed cognition** — Edwin Hutchins, *Cognition in the Wild*.
- **Checklists** — Atul Gawande, *The Checklist Manifesto* (aviation/surgery lineage).
- **Crew Resource Management** (aviation) and **Incident Command System** (emergency response) for
  team-cognition and failure-stabilization patterns. **After-Action Review** (US Army) for
  retrospection.

**Uncertainty note:** the *mapping* of these frameworks onto event organizers is an informed
synthesis of recurring cross-domain patterns, not a citation of organizer-specific empirical studies;
event-organizer cognition is under-studied academically relative to aviation/medicine/military. The
cognitive *frameworks* are well-established; their *application here* is reasoned inference and is
presented as such. Specific numeric claims (e.g., "3–7 critical items") reflect general working-memory
findings, not measured event data.

---

*Research only. No UI, features, code, schema, architecture, or pipeline change. Companion to the
Global Engineering Benchmark; final-section recommendations are additive and module-mapped, consistent
with `ARCHITECTURAL_IDEA_CATALOG.md` and `FINAL_ENGINEERING_RECOMMENDATIONS.md`.*
