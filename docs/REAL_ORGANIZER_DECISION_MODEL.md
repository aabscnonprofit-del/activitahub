# Real Organizer Decision Model — how experienced event organizers actually think and work

> **Purpose:** reconstruct the *cognitive and operational* model of an experienced event organizer —
> how experts prepare, prioritize, estimate risk, communicate, recover, verify, and decide what never
> to delegate — and translate that human model into ActivLife Hub (ALH) architecture terms.
> **Scope:** research and writing **only**. No code, no schema, no architecture redesign, no renaming.
> This document *maps onto* the existing ALH pipeline (M1–M8); it does not modify it. Where it proposes
> something, the proposal is a recorded idea for later specification, with an owning module and a verdict.
> **Status:** living research document · Part 10 of the Global Engineering Benchmark · evidence-based,
> uncertainty flagged.
> **Method anchors:** cognitive task analysis; naturalistic decision-making (Klein's recognition-primed
> decision model, RPD); expert-vs-novice research (Chase & Simon, Dreyfus); checklist & safety
> engineering (Gawande's *Checklist Manifesto*, aviation/surgical checklists); resilience engineering
> (Hollnagel, Weick high-reliability organizations); project-management practice (critical path, slack,
> pre-mortems — Klein/Kahneman).
> **Sources of truth it reasons against:** `UOP_UNIVERSAL_ORGANIZER_PRINCIPLES_V1_1.md`,
> `OPE_EVENT_LIFECYCLE.md`, `OPE_MODULAR_PIPELINE_PRINCIPLE.md`, `OPE_MASTER_SPEC.md`,
> `OPE_V2_MODULE2_IMPLEMENTATION_SPEC.md`, `OPE_V2_MODULE3_IMPLEMENTATION_SPEC.md`,
> `OPE_V2_MODULE4_IMPLEMENTATION_SPEC.md`.

---

## 0. How to read this document

The valuable object of study here is the **person**, not the software. The first half (§1–§8) models the
experienced organizer as a cognitive system, drawing on established research rather than inventing
specifics. The second half (§9–§12) does the engineering synthesis: it lays the human model over the ALH
pipeline and asks, for each expert behavior, *does ALH support this today, which module should own it, and
what is the verdict?*

**ALH pipeline, as it exists (the spine this document maps onto):**

```
M1 Discovery (gather MEANING → FED)
  → M2 OPE (abstract plan / IR: requirements, needs, risks, dependencies, cost)
  → M3 Assembly (deterministic Project: work packages, dependency graph, timeline)
  → M4 Workspace (prepare: statuses, notes, checklists, decisions, lifecycle, marketplace seam)
  → M5 Marketplace (source REAL people / vendors / availability)
  → M6 Execution (run the event; actual delivery)
  → M7 Evidence → M8 Closure (learning emitted)
```

**ALH principles** (held throughout): meaning-first; abstract-before-real; planning-separate-from-execution;
immutable upstream; humans approve intent and make consequential calls; certified humans handle hard cases.

---

## 1. What an experienced organizer actually is (the cognitive frame)

An experienced organizer is **not** a person who holds more facts than a beginner. They are a person whose
experience has compiled into **patterns, perception, and protected attention**. Three research findings
explain the entire rest of this document:

1. **Expertise is perceptual, not just procedural (Chase & Simon; Klein's RPD).** Experts "see" a situation
   as an instance of a pattern they recognize, which immediately suggests a typical course of action and the
   typical ways it goes wrong. They do not enumerate options and score them; they recognize, mentally
   simulate the recognized option, and run with it if the simulation holds. *This is why the expert's plan
   looks thin on paper but is robust in practice.*

2. **The scarce resource is attention, not information (UOP-002, UOP-012, UOP-013).** The expert's central
   problem on the day is staying *free enough to read the room and direct it*. Everything they do in
   preparation is, in part, an effort to spend their day-of attention on the few things only they can do —
   not on things that should have been settled beforehand or handed off.

3. **Experts manage the gap between plan and reality, beginners manage the plan (UOP-013 "the plan is a
   hypothesis").** The expert treats the plan as a *disposable hypothesis about a future they can't fully
   predict*, and invests in the ability to detect and absorb deviation. The beginner treats the plan as the
   work product and is destabilized when reality diverges.

These map cleanly onto ALH's own stated philosophy — UOP already names attention management, situational
awareness, recovery, and the plan-as-hypothesis as the *least fakeable* skills (UOP "Top 5"). ALH's human
layer is, in fact, ahead of most planning software here. The gaps are operational, in M2–M6, not
philosophical.

---

## 2. How experts PREPARE — working backward from the moment

The signature of expert preparation is **direction of travel**: they reason *backward from the moment the
event is experienced*, not forward from today's to-do list.

- **Mental simulation / "seeing the day" (Klein).** The expert plays the event forward in imagination —
  arrival, the first awkward ten minutes, the peak, the close, load-out — and notices where their mental
  movie *snags*. Snags are where they invest. This is a perception of *future friction*, and it is the
  origin of most of their best preparation moves. (UOP-006 Transitions, UOP-015 Friction are the named
  snag-zones.)
- **Working backward from fixed points.** They anchor on the irreversible moment (the ceremony, the cake,
  the keynote, the bus that leaves at 5) and back-schedule everything to protect it, building in margin
  *before* the fixed point, never after.
- **The pre-mortem (Klein/Kahneman).** Before committing, the expert imagines *"it's over and it failed —
  why?"* This prospective hindsight surfaces failure modes that forward optimism hides. Crucially, the
  pre-mortem is **about this specific event**, layered on top of the generic risks any event of this type
  carries. (This generic-vs-specific split is load-bearing for the ALH mapping: see §9.)
- **Protecting their own bandwidth.** Experienced organizers prepare so that *they personally* are not the
  bottleneck on the day (UOP-012 Shared Load, UOP-021 Tone Setting). They pre-decide, pre-confirm, and
  pre-delegate specifically so their day-of attention is free.

> **Beginner contrast.** Beginners prepare *forward and detailed*: long lists, exhaustive schedules,
> decoration minutiae — high effort spent uniformly. They simulate the parts they can already picture
> (the fun parts) and skip the snags (arrival, transitions, weather, the load-bearing dependency).

---

## 3. How experts PRIORITIZE — the critical few vs the nice-to-have

Experts ruthlessly separate **load-bearing** elements from **decorative** ones. A load-bearing element is
one whose failure *changes whether the event happens or whether its purpose is achieved*; a decorative one
improves the experience but degrades gracefully.

Three lenses experts use:

1. **The purpose tiebreaker (UOP-001).** When time/money/attention is short, the intended *human outcome*
   decides what to cut. A "reconnect the family" dinner protects the long shared table and the toast; a
   "summit by noon" hike protects the start time. The purpose is the silent ranking function.
2. **The critical path (PM practice).** Among tasks, experts track the chain with no slack — the sequence
   where any slip slips the whole event (venue → permit → invitations; or vendor confirmation → final
   headcount → catering count). They guard this chain and let off-path tasks float.
3. **The single points of failure (UOP-012).** The expert asks "what has no backup?" — the one supplier,
   the one key-holder, the one person who knows the code — and either creates redundancy or watches it like
   a hawk.

The output of expert prioritization is a *short* list of things that must be true, not a long list of things
to do. This is the **"critical few"** — and recognizing it is the single largest difference between competent
and exceptional execution.

> **Beginner contrast.** Beginners treat the task list as flat — every item feels equally urgent because they
> lack the pattern that says *which three things actually carry the day*. They over-invest in the visible and
> controllable (decor, favors) and under-invest in the load-bearing and uncomfortable (the permit, the rain
> plan, the one vendor with no backup).

---

## 4. How experts ESTIMATE RISK — leading indicators, buffers, "what's my backup"

Experts do **not** estimate risk as a probability table. They estimate it as a set of **recognized failure
patterns** with **leading indicators** and **pre-planned responses**.

- **What fails most (the recognized set).** Across event types the recurring failures are remarkably stable:
  weather; headcount drift (no-shows / over-attendance); a vendor/supplier not showing or under-delivering;
  timing slip (one late thing cascading — UOP-003 momentum); access/power/logistics (locked door, no outlet,
  no parking); food safety and dietary/allergy; and the *transitions* between segments (UOP-006). Experts
  carry this set as a checklist precisely because it's stable and checklist-able (Gawande).
- **Leading indicators, not lagging.** The expert watches for the *early sign*: the vendor who hasn't
  re-confirmed 72h out; the RSVP curve that's tracking low; the forecast trending; the delivery that's "on
  its way" with no tracking. They act on the indicator, not the event.
- **Buffers and slack.** Time buffer before fixed points, budget contingency (a held reserve), headcount
  buffer (the no-show factor), and a margin of supplies. Buffers are *deliberately placed where the critical
  path is*, not spread thin.
- **"What's my backup?" (the Plan-B reflex).** For each load-bearing element the expert has, at minimum, a
  *named* fallback: the indoor room if it rains, the second caterer's number, the manual process if the AV
  dies, the "if the speaker no-shows we do the panel early." The backup need not be elaborate — it needs to
  *exist and be reachable in the moment* (UOP-017 Recovery: "often a ready fallback").

> **Beginner contrast.** Beginners estimate risk as *worry* (diffuse anxiety about everything) or *denial*
> (it'll be fine). They lack the recognized failure set, so they miss the load-bearing risks (the permit,
> the single vendor) while fixating on vivid-but-minor ones. They rarely hold a named Plan B; their recovery
> is improvised from zero, under stress, in front of guests.

---

## 5. How experts COMMUNICATE — confirmation loops, single source of truth, over-communicating change

Communication is where experienced organizers spend a surprising share of effort, because **most failures
are communication failures wearing a logistics costume** (a vendor who "didn't know," a guest at the wrong
place, a team member who assumed someone else had it).

- **Confirmation loops, closed deliberately.** Experts don't send-and-assume; they *confirm receipt and
  re-confirm near the date* (the read-back, borrowed from aviation/medicine). The pattern is: agree →
  document → re-confirm at a leading-indicator interval (e.g. T-1 week, T-72h, T-24h). A vendor is "booked"
  only when re-confirmed, not when first agreed.
- **Single source of truth.** One authoritative version of times, places, counts, and contacts — and
  everyone points at it. The expert is allergic to *forked truth* (two versions of the run-of-show, an old
  headcount in someone's inbox).
- **Over-communicating change.** When something changes, experts *over-broadcast* the change to everyone it
  touches, redundantly, because the cost of a stale assumption is high and asymmetric. Changes are the
  highest-risk communications.
- **Audience-tuned channels.** Client (set and manage expectations — UOP-014); vendors (precise, documented,
  confirmed); team (clear ownership, who-does-what — UOP-012); participants (framing and reminders —
  UOP-014). Each audience gets a different register; the *facts* underneath are the single source of truth.

> **Beginner contrast.** Beginners under-communicate and *assume the loop is closed* when they've only sent
> one direction. They let truth fork (verbal agreement never written down; a count updated in one place).
> When something changes they tell the obvious person and forget the three downstream people who silently
> depended on the old value.

---

## 6. How experts RECOVER FROM FAILURE — improvise within constraints, degrade gracefully, "show goes on"

Recovery is the most prized and least fakeable expert skill (UOP-017, and the *failure-moment* case of
UOP-021 tone-setting). The research model:

- **Composure first (emotional contagion, UOP-021).** The expert knows their own calm is an instrument; the
  *first* recovery action is to not transmit panic. Guests take their read of "is this okay?" from the
  organizer's face.
- **Graceful degradation, not binary failure.** Experts have a mental ladder of *acceptable reduced states*:
  full plan → reduced plan → minimum viable event. They know which elements can be dropped silently (most
  decorative ones) and which cannot (safety, the peak, the purpose). They protect the *floor* and shed the
  *ceiling*. (This is exactly the load-bearing/decorative split from §3, now used under fire.)
- **Improvisation within constraints (jazz, not chaos).** Recovery is bounded improvisation: the expert
  recombines *available* resources toward the *unchanged purpose*. The constraints (safety floor, purpose,
  what's physically present) are fixed; the arrangement is fluid.
- **Pre-positioned fallbacks make recovery look effortless.** The "improvisation" that observers admire is
  usually a *named Plan B from §4 being executed calmly*. True from-zero improvisation is the fallback of
  last resort.
- **The show must go on / the peak is protected (UOP-005).** Experts will sacrifice almost anything to
  deliver the one peak and a clean ending, because that's what will be remembered.

> **Beginner contrast.** Beginners experience failure as *binary* (it's ruined) and *visible* (they transmit
> the panic). With no degradation ladder, they either freeze or over-correct, often sacrificing a
> load-bearing element to save a decorative one. With no pre-positioned backup, recovery is slow and
> improvised under maximum stress.

---

## 7. What experts ALWAYS VERIFY (the universal day-of checklist)

These items recur across every event type and are *checklist-able* — exactly the domain Gawande shows
benefits from a forcing function, because they are "known, simple, and skipped under load." Experienced
organizers verify them *personally or via a closed confirmation loop*, near the date and again on the day:

| Verify | Why it's load-bearing | Leading-indicator timing |
|---|---|---|
| **Headcount (final, confirmed)** | sizes catering, seating, supplies, budget; drives most other counts | at registration close; re-check day-of (check-in vs confirmed) |
| **Timing / run-of-show** | one slip cascades (UOP-003); fixed points are immovable | confirm with all parties T-1wk, T-24h |
| **Access / entry / keys** | a locked door at T-0 stops everything | day-before and T-0 |
| **Power / utilities / connectivity** | silent until it fails publicly | site check before; T-0 confirm |
| **Weather (for outdoor/any exposure)** | most common cause of forced re-plan | track from T-1wk; decision point set in advance |
| **Dietary / allergy / safety constraints** | a single failure can cause real harm (UOP-010); never softened | at planning; re-confirm with caterer T-72h |
| **Vendor / supplier confirmations** | "booked" ≠ "confirmed"; a no-show is catastrophic | re-confirm T-1wk and T-24h |
| **The backup for each load-bearing item** | recovery depends on it existing and being reachable | verified to *exist* during prep |

The discipline isn't the list — it's the *forcing function*: experts verify these even when confident,
because the failure mode is "skipped because obvious," and the cost is asymmetric.

---

## 8. What experts NEVER DELEGATE — the irreversible few

Experts delegate *load* generously (UOP-012) but **reserve a small set of decisions** for themselves. The
reservation rule is consistent: *keep what is consequential, irreversible, relational, or safety-critical;
delegate the rest.*

- **The client relationship and the definition of success.** What "good" means here is the spine; it can't
  be handed off without losing the purpose (UOP-001).
- **Final go / no-go.** The decision to proceed, postpone, or cancel — especially under weather/safety
  pressure. This is the single most consequential reversible-window decision.
- **Safety calls.** Anything that trades safety stays with the responsible human, and only ever tightens,
  never relaxes (UOP-010; mirrored in ALH's lifecycle: safety "may only get stricter… never auto-relaxed").
- **The few irreversible, high-cost commitments.** Signing the venue, committing the non-refundable deposit,
  the point-of-no-return on headcount. Once-only, hard-to-undo decisions.
- **Reading and directing the room on the day (UOP-002/013).** Cannot be delegated because it *is* the
  expertise — real-time perception and attention-direction.

> **Beginner contrast.** Beginners mis-draw this line in *both* directions: they hoard the delegable
> (doing everything themselves, becoming the bottleneck, blind to the room — the "hero organizer" failure of
> UOP-012) while *under-owning* the irreversible (deferring the go/no-go, letting a vendor or the client
> make a safety/scope call that should have been theirs).

---

## 9. Beginner vs Expert — consolidated contrast

| Dimension | Beginner | Expert |
|---|---|---|
| **Mental model of the plan** | the plan is the deliverable; reality should conform to it | the plan is a disposable hypothesis; reality will diverge |
| **Direction of reasoning** | forward from today's to-do list | backward from the experienced moment and its fixed points |
| **Detail allocation** | uniform, exhaustive, heaviest on the visible/controllable | concentrated on snags, transitions, and the critical path |
| **Risk** | diffuse worry or denial; vivid-but-minor risks | recognized failure set + leading indicators + named Plan B |
| **Prioritization** | flat list, everything urgent | critical few; load-bearing vs decorative; purpose as tiebreaker |
| **Communication** | send-and-assume; truth forks; under-broadcasts change | closed confirmation loops; single source of truth; over-broadcasts change |
| **Recovery** | binary failure; transmits panic; improvises from zero | graceful degradation; composure as instrument; executes pre-positioned backup |
| **Delegation** | hoards the delegable, defers the irreversible | delegates load, reserves the consequential/irreversible/safety/relational |
| **Day-of attention** | consumed by doing | protected for reading and directing the room |
| **Verification** | trusts "it's handled"; verifies the easy, skips the load-bearing | forcing-function verification of the universal set, even when confident |

The through-line: **experts protect a small critical core (purpose, safety, the peak, the critical path, the
irreversible decisions, their own attention) and let everything else flex.** Beginners protect the whole
plan uniformly and so protect nothing when it matters.

---

## 10. Decision taxonomy — intuitive / systematic / automatable

Classifying organizer decisions by *how they are actually made* and *how much a system can realistically
take on*. **Assist** = the system surfaces, structures, reminds, or drafts, but a human decides.
**Automate** = the system can decide/execute deterministically and safely. **Human-only** = must remain a
human judgment.

| Decision / behavior | How experts do it | Systematic & checklist-able? | Realistic ALH posture |
|---|---|---|---|
| Final headcount → resource/budget sizing | mechanical once count is known | **Yes** — deterministic | **Automate** (ALH already recomputes; M2/M3) |
| Universal day-of verification (§7 list) | forcing-function checklist | **Yes** | **Automate the prompt / Assist the verify** (M4/M6) |
| Vendor re-confirmation cadence | scheduled confirmation loop | **Yes** | **Assist** (reminders + status; M4/M5) |
| Surfacing generic risks for this event type | pattern recall | **Yes** — pattern-derived | **Automate generation** (M2, exists) |
| Pre-mortem for *this specific* event | mental simulation, prospective hindsight | **Partially** — promptable, not derivable | **Assist** (prompt the human; M4) |
| Identifying the critical path / load-bearing few | pattern + dependency reasoning | **Partially** — graph exists, criticality doesn't | **Assist** (compute + flag; M3→M4) |
| Choosing what to cut under pressure | purpose tiebreaker (UOP-001) | **No** — judgment | **Assist** (show degradation ladder; M4/M6) |
| Naming a Plan B per load-bearing item | recognized fallbacks | **Partially** — promptable; some sourceable | **Assist + Automate-source** (M2 prompt, M5 backup-source) |
| Go / no-go (esp. weather/safety) | recognition + judgment under uncertainty | **No** | **Human-only** (M4 gate; assist with indicators) |
| Safety calls (tightening only) | judgment; non-negotiable floor | **No** | **Human-only** (M2 never-drop + M4/M6 human) |
| Client relationship / definition of success | relational, meaning-level | **No** | **Human-only** (M1 Discovery is human-approved) |
| Reading & directing the room on the day | real-time perception (UOP-002/013) | **No** — least fakeable | **Human-only** (can frame, cannot sense) |
| Recovery / improvisation in the moment | bounded improvisation under stress | **No** | **Human-only** (assist with pre-positioned backups) |

**Reading of the table:** the *systematic* band (counts, verification lists, confirmation cadences, generic
risk generation, dependency ordering) is where a system earns its keep and where ALH is already strong. The
*intuitive* band (go/no-go, safety, the room, recovery, definition of success) is correctly reserved for
humans, and ALH's principles already say so. The interesting frontier is the **"partially"** band —
pre-mortem, criticality, Plan-B — which is *assist-able* and is exactly where ALH has gaps (§12).

---

## 11. Expert-behavior → ALH-support MATRIX

For each expert behavior: does ALH's architecture support it **today**, which module **should** own it, and
a verdict. **ADOPT** = clear gap worth a recorded proposal; **INVESTIGATE** = promising but needs design
thought; **REJECT** = don't add (out of scope, or correctly absent); **ALREADY SOLVED (BETTER)** = ALH
already does this, sometimes more rigorously than the human does manually.

| # | Expert behavior | Supported today? | Owning module (should) | Verdict |
|---|---|---|---|---|
| 1 | **Generic risk surfacing for the event type** (recognized failure set) | **Yes** — M2 IR `Risk{description, severity, mitigation}`; MASTER_SPEC Risk Engine ranks by severity with a `never_drop` set | **M2 OPE** | **ALREADY SOLVED (BETTER)** — pattern-derived, traceable, never silently dropped |
| 2 | **Pre-mortem for *this specific* event** (organizer-added "why might *mine* fail?") | **No** — M2 risks are generic/derived; M4 has free-form `Decision`/`Note` but no structured risk overlay | **M4 Workspace** (organizer-added risks layered on M2 generics) | **ADOPT** |
| 3 | **Working backward from fixed points / mental simulation** | **Partial** — M3 has a relative timeline + topological order, but it's forward (dependency) ordering, not backward-from-fixed-point; no "fixed/immovable point" concept | **M3 timeline + M4 prep** | **INVESTIGATE** |
| 4 | **Identifying the critical path / load-bearing few** | **No** — M3 computes an *acyclic dependency graph + topological order* but **no criticality/slack/critical-path** flag; M2 has no task-level "load-bearing" concept | **M3 compute → M4 surface** | **ADOPT** (the single biggest structural gap) |
| 5 | **Buffers / slack / contingency reserve** | **Partial** — resource buffers (e.g. no-show factor, supply margin) exist implicitly in sizing; **no explicit time/budget contingency field** | **M2 (estimate) / M4 (organizer-set)** | **INVESTIGATE** |
| 6 | **"What's my backup?" — named Plan B per load-bearing item** | **No** — M2 `mitigation` is a *response narrative*, not an *alternative path*; nothing models a backup resource/plan | **M2 (prompt for it) + M5 (source the backup) + M4 (hold it)** | **ADOPT** |
| 7 | **Graceful degradation ladder** (full → reduced → minimum-viable) | **No** — no concept of which work packages are droppable vs floor; tied to #4 criticality | **M4 (prep) / M6 (under fire)** | **INVESTIGATE** |
| 8 | **Confirmation loops with vendors** (booked ≠ confirmed; re-confirm cadence) | **Partial** — M4 has a marketplace seam with `launched / results_received / accepted` and an event log, but **no re-confirmation / "still confirmed?" state** near the date | **M5 (source/confirm) + M4 (track status + remind)** | **ADOPT** |
| 9 | **Single source of truth** | **ALREADY SOLVED (BETTER)** — immutable upstream (FED → IR → Project), traceability chain `projectRef→irRef→fedRef`, overlay-only edits, append-only event log | **M1–M4 (architectural invariant)** | **ALREADY SOLVED (BETTER)** |
| 10 | **Over-communicating change** | **Partial** — re-plan is forced through M1→M2→M3 (so change is *controlled*), and the event log records it, but there is **no "who downstream depended on the old value, notify them" propagation** | **M4 (signal) / M6 (notify)** | **INVESTIGATE** |
| 11 | **Universal day-of verification checklist (§7)** | **Partial** — M4 derives per-work-package checklist items + organizer-added items; **a standing "always-verify" safety/logistics checklist is not guaranteed**; live day-of verification is M6 (PARTIAL/PLANNED) | **M4 (prep checklist) + M6 (day-of verify)** | **ADOPT** |
| 12 | **Leading-indicator monitoring** (RSVP curve, unconfirmed vendor, forecast) | **No (not yet built)** — MASTER_SPEC Monitoring Engine ("missing confirmations, changed headcount") is **PLANNED** | **M6 Execution / Monitoring** | **INVESTIGATE** (already on the roadmap) |
| 13 | **Go / no-go gate** | **Partial / inconsistent** — `OPE_EVENT_LIFECYCLE` has an explicit **Ready** go-state and freeze; the M4 spec has a monotonic `planning→preparation→ready` lifecycle with a `ReadyForExecution` hand-off — but no *explicit human go/no-go decision artifact* with the indicators in front of it | **M4 lifecycle (Ready)** | **ADOPT** (formalize the human gate, don't auto-advance) |
| 14 | **Safety calls — tighten-only, never delegate** | **ALREADY SOLVED (BETTER)** — `never_drop` risks (M2); lifecycle "safety may only get stricter… never auto-relaxed"; certified humans handle hard cases | **M2 + M4/M6 human + expert queue** | **ALREADY SOLVED (BETTER)** |
| 15 | **Client relationship / definition of success — never delegate** | **ALREADY SOLVED (BETTER)** — M1 Discovery is human-approved, meaning-first; FED is locked only on client approval | **M1 Discovery** | **ALREADY SOLVED (BETTER)** |
| 16 | **Protecting the organizer's day-of attention** (UOP-012/021) | **Partial** — M4 supports delegation via `assignee`/members; **no "what only you must do on the day" vs "delegated" surfacing** | **M4 (assignment) / M6 (run-of-show)** | **INVESTIGATE** |
| 17 | **Reading & directing the room on the day** | **Correctly human-only** — UOP states the assistant "can frame, not sense" | **M6 (human); assist with framing** | **REJECT** (do not attempt to automate; assist only) |
| 18 | **Recovery / in-the-moment improvisation** | **Correctly human-only** — but pre-positioned backups (#6) make it work | **M6 (human)** | **REJECT to automate; ADOPT the enabling backups (#6)** |
| 19 | **Peak-and-ending design (UOP-005)** | **Partial** — UOP names it as planner work; unclear it is a first-class object in M2/M3 (which are logistics-shaped) | **M2 (plan shape) / M1 (intent)** | **INVESTIGATE** |

---

## 12. Gaps ALH has no place for yet

These are expert behaviors with **no clean home** in the current architecture. For each: the gap, whether it
should be filled, and where.

1. **Criticality / load-bearing / critical-path (biggest gap).** M3 computes a *correct dependency graph and
   topological order* but has **no notion of which work packages are critical-path (zero slack) or
   load-bearing.** Experts run their entire prioritization, buffering, and recovery off this distinction
   (§3, §6). Without it, ALH can order work but cannot tell the organizer *which three things carry the
   day*. **Fill it.** The dependency graph already contains the information needed to compute longest-path /
   slack; the natural split is **M3 computes criticality, M4 surfaces it** (and uses it to drive the
   degradation ladder #7 and to focus verification). *Uncertainty flag: "load-bearing-to-purpose" is partly
   a meaning judgment (M1/UOP-001), not purely a graph property — the graph gives critical-path; purpose
   gives importance; the two should be distinguished, not conflated.*

2. **Named backups / Plan-B as a first-class object.** ALH models a risk's `mitigation` (a narrative) but
   not an *alternative path or backup resource*. Experts hold a reachable Plan B per load-bearing item. **Fill
   it.** Split across modules per the pipeline rule: **M2** prompts for/derives that a backup is *needed*;
   **M5** can *source* the backup (a second vendor, the indoor room); **M4** *holds* the named backup and its
   reachability. This respects abstract-before-real (M2 says "a backup is needed"; M5 makes it real).

3. **The "is it still confirmed?" vendor state.** M4's marketplace seam ends at `accepted` — there is no
   *re-confirmation lifecycle* (booked → confirmed → re-confirmed-T-1wk → re-confirmed-T-24h). Experts treat
   "booked" as not-yet-real until re-confirmed. **Fill it.** **M5** owns confirmation with the real vendor;
   **M4** tracks the status and drives the reminder cadence.

4. **A standing "always-verify" checklist independent of work packages.** M4 derives checklist items *per
   work package*; the universal safety/logistics verifications (§7) are cross-cutting and must be present
   *even if no work package happens to carry them*. **Fill it** as a guaranteed baseline checklist in **M4**
   (prep) handed to **M6** (day-of), seeded from event-type and the M2 `never_drop` risks so it can't be
   omitted.

5. **The explicit human go/no-go artifact.** The lifecycle has a **Ready** state and M4 has a monotonic
   advance to `ready`, but advancing is currently framed as a phase transition, not a *human decision made
   with the leading indicators in front of them* (weather, confirmations, headcount). The expert's go/no-go
   is a *judgment*, not a checkbox. **Fill it** in **M4** as a human-gated transition that *presents the
   indicators and records the decision* — and never auto-advances under weather/safety conditions. *(Note: a
   minor inconsistency to resolve — `OPE_EVENT_LIFECYCLE` and the M4 spec describe "Ready" with slightly
   different framings; the go/no-go formalization is a chance to reconcile them.)*

6. **The graceful-degradation ladder.** Nowhere does ALH represent "full plan → reduced plan → minimum
   viable," i.e. which work packages may be shed and in what order while protecting the floor (safety, peak,
   purpose). This is downstream of criticality (#1). **Investigate** — valuable but design-heavy; lives in
   **M4** (pre-staged) and is *used* in **M6** under fire.

7. **Change-impact propagation ("who depended on the old value").** ALH controls change beautifully
   (immutable upstream, forced re-plan) but does not *notify the humans/vendors downstream of a changed
   value* the way an expert over-broadcasts a change. **Investigate** — partly a notification concern (M6),
   partly a re-plan-signal concern (M4).

8. **The pre-mortem as a structured prompt.** M2 generates *generic* risks; the *specific* "why might MY
   event fail" reflection has no structured home (only free-form notes/decisions in M4). **Fill it** as an
   M4 organizer-added-risk overlay (#2 in the matrix) — cheap, high-value, respects the boundary (M2 stays
   deterministic/generic; M4 holds the human's situated additions).

**What ALH should NOT try to fill:** reading the room, in-the-moment recovery, tone-setting, and the
relational definition of success. These are correctly human-only; the system should *assist* (frame,
prompt, pre-position backups, protect attention) but never attempt to *perform* them. ALH's own UOP and
"humans approve intent / make consequential calls" principles already draw this line correctly.

---

## 13. Top human-derived ideas for ALH (ranked)

Ranked by *value × fit with existing architecture*. Each: the idea, the owning module(s), and verdict.

1. **Criticality / critical-path surfacing.** Compute critical-path/slack from the existing dependency graph
   and flag the load-bearing few; let purpose (M1/UOP-001) modulate importance. → **M3 compute → M4 surface.**
   **ADOPT.** *(Highest leverage: unlocks prioritization, focused verification, and the degradation ladder.)*

2. **Named Plan-B / backup as a first-class object.** "A backup is needed" (M2) → "source the backup" (M5)
   → "hold the named, reachable backup" (M4). → **M2 + M5 + M4.** **ADOPT.**

3. **Organizer pre-mortem / added-risk overlay.** Structured "why might *this* event fail" layered on M2's
   generic risks, with organizer-set severity and a linked mitigation/backup. → **M4 Workspace.** **ADOPT.**

4. **Vendor re-confirmation lifecycle + cadence.** Extend the marketplace seam beyond `accepted` to a
   confirmed / re-confirmed state with leading-indicator reminders (T-1wk, T-24h). → **M5 confirm + M4 track.**
   **ADOPT.**

5. **Guaranteed "always-verify" baseline checklist.** A cross-cutting safety/logistics checklist (§7) seeded
   from event-type + M2 `never_drop`, present regardless of work-package coverage, carried into day-of. →
   **M4 prep → M6 day-of.** **ADOPT.**

6. **Explicit human go/no-go gate at Ready.** Present the indicators (weather, confirmations, headcount),
   require a recorded human decision, never auto-advance under safety/weather. → **M4 lifecycle.** **ADOPT**
   *(also reconciles the lifecycle/M4-spec framing difference).*

7. **Leading-indicator monitoring** (RSVP curve, unconfirmed vendors, forecast). → **M6 / Monitoring.**
   **INVESTIGATE** *(already PLANNED in MASTER_SPEC; align this human model with it).*

8. **Graceful-degradation ladder** (downstream of #1). → **M4 stage / M6 use.** **INVESTIGATE.**

9. **Change-impact propagation / over-broadcast of changes.** → **M4 signal / M6 notify.** **INVESTIGATE.**

10. **Backward-from-fixed-points scheduling & fixed/immovable-point concept.** → **M3 timeline / M4 prep.**
    **INVESTIGATE.**

**Already solved (and often better than the manual human practice) — protect, don't rebuild:** generic risk
generation with `never_drop` (M2); single source of truth via immutable upstream + traceability + event log
(M1–M4); safety tighten-only and the expert queue (M2 + M4/M6); meaning-first human-approved intent (M1).

**Correctly human-only — assist, never automate:** reading/directing the room; in-the-moment recovery;
tone-setting; the relational definition of success; the final go/no-go and safety calls themselves (the
*system surfaces the indicators*; the *human decides*).

---

_Research and writing only. No code, schema, or architecture change. This document maps the human expert
model onto the existing ALH pipeline (M1–M8) and records proposals with owning modules and verdicts for
later specification; it modifies nothing._
