# Automation Systems — Engineering Knowledge Extraction (Part 8)

> **Purpose:** extract durable *engineering* knowledge from automation platforms (Zapier, Make/Integromat,
> n8n, Microsoft Power Automate; with IFTTT, classical workflow engines, BPMN/Camunda, and durable-execution
> engines Temporal / AWS Step Functions for lineage) and map it onto the existing ActivLife Hub (ALH)
> pipeline. The subject is **automation architecture** — trigger/action models, workflow graphs, event vs
> polling, rules engines, idempotency/retries/dead-letter, durable execution, human-in-the-loop, observability,
> and the no-code-flexibility vs determinism tension — **not** integrations, features, market, or UI.
> **Scope:** research and writing only. This document records analysis and a decision model. It does **not**
> modify code, schema, contracts, prompts, or any module. It does **not** redesign ALH; it maps ideas onto the
> existing pipeline (Discovery/M1 → FED → OPE/M2 → IR → Assembly/M3 → Project → Workspace/M4 →
> Marketplace/M5 / Execution/M6 → Evidence/M7 → Closure/M8). "OPE" remains a proper name.
> **Status:** living document · engineering benchmark · research only.
> **Method:** study *evolution* (origin → problem → why it changed → whether it improved), not products. Credit
> ALH where it is genuinely superior; flag uncertainty rather than assert.

---

## 0. Orientation — what an "automation system" actually is

Strip the marketing and every product in scope is the same machine: **a way to run a directed graph of steps in
response to something happening, while surviving the fact that the steps touch unreliable external systems.**
The hard engineering is never "call this API." It is *what happens when the call half-succeeds, when it runs
twice, when the box dies between step 3 and step 4, and when nobody can later explain why step 5 fired.* Every
real difference between these platforms is a different answer to those four questions.

The genres, by lineage:

- **Trigger→action ("if this, then that").** IFTTT (2010) is the origin: one trigger, one action, no branching,
  no state. Maximally legible, minimally expressive. Zapier generalized it to linear multi-step "Zaps."
- **Workflow graphs.** Make/Integromat and n8n turned the line into a **graph** — branches, routers, iterators,
  aggregators, merges. Expressive, but every added node is added non-determinism and added debugging surface.
- **Enterprise workflow / BPMN engines.** Camunda, jBPM, and the BPMN standard come from *business process
  management*: long-lived processes, explicit gateways, explicit human tasks, an executable diagram that is
  also the audit artifact. This lineage is where **human-in-the-loop is a first-class primitive**, not a bolt-on.
- **Durable-execution engines.** Temporal (from Uber's Cadence) and AWS Step Functions answer the durability
  question directly: persist the *history of what happened* and **replay** it to reconstruct state after any
  crash. Workflow code must be deterministic; all non-determinism (API calls, time, randomness) is pushed into
  retryable "activities." This is the most rigorous branch of the family — and the one most relevant to ALH.

The recurring through-line: **the more expressive the graph, the harder determinism, debuggability, and
correctness become.** Automation history is largely the story of buying expressiveness and then paying for it.

---

## 1. Evolution, idea by idea

### 1.1 Trigger→action vs full workflow graphs
**Origin/problem.** IFTTT existed because connecting two consumer apps required code nobody wanted to write. The
trigger→action shape is a deliberate *under*-powering: by forbidding branches and state it is trivially
understandable and almost impossible to misuse. The cost is that anything real (a condition, a second outcome,
a loop) is impossible. Zapier's linear multi-step Zaps, then Make/n8n's full graphs, climbed the expressiveness
ladder to meet real needs — at the cost of legibility. **Whether it improved:** for power, yes; for
debuggability, no. A 40-node Make scenario with routers and nested iterators is a small untyped program with no
type system, no compiler, and no test suite. The industry rediscovered that **a visual graph is still code** —
it just hides the fact, which is worse, because it invites non-engineers to build brittle distributed systems.

### 1.2 Event-driven vs polling
**Origin/problem.** The ideal trigger is a **webhook**: the source system pushes "this happened" the instant it
happens. Reality is that most sources don't offer webhooks, so platforms **poll** ("check Gmail every 5
minutes"). Polling is the dominant trigger mechanism in Zapier/Make precisely because the integration surface is
heterogeneous and uncooperative. **Why it matters / whether it improved:** polling introduces latency, wasted
work, and a *deduplication* problem — "have I already seen this row?" — that is the seed of most idempotency
bugs. Event-driven (push) is strictly better when available but requires the source to cooperate and the
receiver to be reachable and idempotent. The lesson is not "events good, polling bad"; it is that **the trigger
mechanism dictates the idempotency burden**, and polling silently pushes that burden onto the workflow author.

### 1.3 The rules / condition model
**Origin/problem.** Once you have branches you need a way to express "when should this path run." This spans a
spectrum: IFTTT's implicit single condition → Zapier's filters → Make's routers with per-route filters → n8n's
IF/Switch nodes → Power Automate's condition cards → full **business rules engines** (Drools-style) where rules
are data, separately authored and versioned. **Whether it improved:** the BRE end of the spectrum solved a real
problem (business logic that changes faster than code, authored by non-engineers) but introduced a notorious
failure mode — **rule interaction**: large rule sets become unpredictable because no one can reason about all
firing orders. The durable lesson: **conditions are cheap to add and expensive to reason about**; legibility
degrades super-linearly with rule count. ALH's instinct — keep judgment explicit and human, keep machine
conditions few and deterministic — is the correct response to this exact history.

### 1.4 Idempotency, retries, error handling, dead-letter
This is the engineering heart, and where the platforms diverge most.

- **Idempotency.** The only safe assumption in a distributed automation is "this step may run more than once."
  Robust systems demand an **idempotency key** so a retried "create order" doesn't create two orders. Most
  no-code platforms make idempotency *optional and manual* (you dedupe on a record ID yourself). This is the
  single largest source of silent automation bugs.
- **Retries.** Mature practice converged on **exponential backoff + jitter + a bounded attempt count**. n8n
  exposes per-node "Retry On Fail"; durable engines (Temporal, Step Functions) make retry policy a
  first-class, declarative property of an activity. (Confirmed current as of 2026.)
- **Error handling / compensation.** Make's model is unusually principled and worth crediting: explicit error
  handlers — **Rollback** (undo operations in this transaction), **Commit**, **Break** (park the run and retry
  later), **Ignore**. This is a no-code echo of the **Saga pattern**: since you cannot get a distributed
  transaction across third-party APIs, you instead define *compensating actions* that semantically undo a step.
  (Confirmed current as of 2026.)
- **Dead-letter.** Borrowed from messaging (SQS/Kafka). When a unit of work fails past its retries, it goes to
  a **dead-letter queue** for human inspection rather than being silently dropped or retried forever. n8n
  approximates this with an Error Trigger workflow that routes failures to a log/queue/alert. (Confirmed
  current as of 2026.)

**Whether it improved:** dramatically, but unevenly. Durable engines made these guarantees *structural*;
no-code platforms left most of them as *opt-in author discipline*, which is why no-code automations are reliable
in demos and fragile in production.

### 1.5 Durable / stateful execution vs stateless steps
**Origin/problem.** A linear Zap is essentially stateless: each run is independent and short-lived. But real
processes are long (wait days for an approval, for a payment, for an event to happen). Holding that state
reliably across crashes and deploys is the problem **Temporal** and **AWS Step Functions** were built for.

- **Temporal** (lineage: Uber Cadence → AWS SWF before it): persists an **Event History** of everything the
  workflow did and **replays** that history on a new worker after any crash to reconstruct exact state. The
  price is a hard constraint: **workflow code must be deterministic** — same inputs produce the same sequence
  of commands — so all non-determinism (API calls, clocks, randomness) must live in separately-retried
  **Activities**. (Confirmed current as of 2026.)
- **Step Functions**: a declarative state machine (Amazon States Language) with managed durability and built-in
  retry/catch per state. Less code-native than Temporal, more "the diagram is the program."

**Whether it improved:** this is the genuine high-water mark of automation engineering. Durable execution turns
"will this survive a crash?" from a thing you hope about into a thing the runtime guarantees. **This is the
branch ALH should learn from most**, and §3 evaluates it directly against ALH's logical-event model.

### 1.6 Human-in-the-loop / approval steps
**Origin/problem.** BPMN/Camunda treated the human as a first-class node decades ago: a process *waits* at a
"user task," routes it to a role/queue, and only proceeds when a human acts. Power Automate has approval
actions; Temporal models a human wait as a workflow that blocks on an external **signal**. **Whether it
improved:** the strong systems converged on a clean idea — **a human decision is just a long-running wait for an
external event, with a typed result.** The weak systems (consumer trigger→action) have no concept of waiting for
a person at all. ALH's "keep important judgment with humans / route hard cases to certified humans" is exactly
the Camunda user-task model, and it is the right one.

### 1.7 Observability & run history
**Origin/problem.** When automation acts on your behalf invisibly, "why did this happen?" becomes the dominant
operational question. Zapier/Make/n8n all provide a **run history** with per-step input/output. Durable engines
go further: the **event history is itself the audit log** — you can see precisely what was decided and replay
it. **Whether it improved:** yes, and the lesson generalizes — **observability is not a feature you add, it is a
property of the execution model.** A model that records *what it did as typed events* is observable by
construction; one that mutates hidden state is not. ALH's logical-event emission is on the right side of this.

### 1.8 The no-code flexibility ↔ determinism/debuggability tension
This is the permanent, unresolved tension of the whole category. Selling points ("anyone can automate, no code")
are in direct conflict with the properties engineers need (determinism, types, testability, reviewability). A
visual graph built by a non-engineer is **untyped, untested, unversioned, distributed code with hidden state**.
The more a platform leans into flexibility, the more it sacrifices the ability to reason about, test, and debug
what it produces. No platform has truly resolved this; durable-execution engines come closest by *refusing*
no-code and demanding deterministic code instead.

### 1.9 "Automation sprawl" as a failure mode
**Origin/problem.** The defining organizational failure of the no-code era. Because automations are cheap to
create and require no review, organizations accumulate hundreds of overlapping, undocumented, unowned Zaps and
scenarios. Symptoms: two automations fighting over the same record; an automation firing a second automation
firing a third (cascade); nobody knowing what will break if a Zap is turned off; "ghost" automations whose
authors have left. **Why it is structural, not accidental:** sprawl is the *direct consequence* of optimizing
for "no review, anyone can build." The very thing that makes no-code attractive guarantees the sprawl. **The
lesson for ALH is decisive:** automation must be **few, owned, named, reviewed, and confined to defined seams** —
never a free-for-all surface anyone can extend.

---

## 2. The ALH lens — is the pipeline *itself* a superior automation architecture?

**Central question (a): Is ALH's deterministic, event-emitting, contract-bound pipeline already a *better*
"automation architecture" than no-code trigger→action graphs?**

Argued honestly: **for the work it covers, yes — and not by a small margin.** Lay the two side by side.

| Property | No-code graph (Zapier/Make/n8n) | ALH pipeline (M1→M8) |
|---|---|---|
| **Steps** | Untyped nodes wired at runtime | Modules joined by **typed contracts** at seams |
| **Determinism** | Best-effort; routers + external calls are non-deterministic | M2 (OPE) and M3 (Assembly) are **pure deterministic transforms** |
| **Verification** | None at seams; you hope outputs match | **Verify-don't-trust at every seam** |
| **State** | Hidden in the run, mutated in place | First state is **M4**, which *owns* lifecycle transitions explicitly |
| **Observability** | Bolt-on run history | **Logical events** emitted by every module — observable by construction |
| **Decoupling** | Implicit; cascades happen | Modules emit logical events, hold **no queues/buses/transports/persistence** internally; coupling only via contracts |
| **Sprawl risk** | High (anyone adds a Zap) | Low (a fixed, named pipeline with owned seams) |

The ALH pipeline is, in effect, **a typed, deterministic, verifiable workflow engine specialized to one
process** — closer in spirit to a *compiled* durable-execution program than to a hand-wired no-code graph. Where
a no-code graph treats determinism, typing, and verification as optional author discipline, ALH makes them
*structural*. That is the entire lesson of §1.4 and §1.8, applied in advance.

**Two honest limits on this claim (do not over-credit ALH):**

1. **A pipeline is not yet a runtime.** A fixed M1→M8 pipeline is a superior *shape*; it is not automatically a
   superior *durability guarantee*. Surviving a crash mid-M4-transition is a property of **how M4 persists and
   replays its lifecycle**, not of the pipeline shape. ALH gets the architecture right; it must still earn the
   durability (see §3).
2. **The pipeline covers the deterministic spine, not the conveniences around it.** Reminders, roll-ups,
   notifications, fan-out — the things people actually call "automation" — live *beside* the spine, mostly in
   M4/M5/M6. The pipeline being well-designed does **not** answer where those belong. §4 does.

So: ALH's pipeline is a superior automation *architecture* for the core transform, and a strong foundation
("logical events + typed seams") for the convenience automations — but the convenience layer still needs an
explicit discipline, or it will reproduce sprawl inside ALH.

---

## 3. Durable execution & event sourcing vs ALH's logical-event model

**This is the most important technical comparison in this document.** ALH already says: *every module emits
logical events; modules hold no persistence/queues/buses internally; M4 is the first stateful module.* Temporal/
Step Functions / event-sourcing say: *persist an event history and replay it to survive crashes.* These are not
in conflict — they are **two layers of the same idea**, and ALH should adopt the durable layer **only at M4 and
only for M4's lifecycle**, nowhere else.

What event-sourcing/durable-execution actually offers, mapped to ALH:

- **Logical events as the source of truth (ADOPT, M4).** ALH already emits logical events. The durable-execution
  insight is to make the **ordered log of M4 lifecycle events the authoritative state**, and derive current
  status from it — rather than mutating a status field in place. This gives M4 crash-recovery, a perfect audit
  trail, and "why is this project in this state?" answerable by reading the log. This is the single highest-value
  idea in this document and it sits squarely inside M4's existing charter ("owns lifecycle transitions").

- **Deterministic core + non-determinism at the edges (ALREADY SOLVED BETTER).** Temporal's central constraint —
  deterministic workflow code, all I/O isolated in retryable Activities — is *already* ALH's design: **M2 and M3
  are pure deterministic transforms**, and the non-deterministic, outward-facing work (real supply, real people)
  is isolated in **M5/M6**. ALH arrived at Temporal's hardest-won principle by a different route. Credit ALH
  here: it does not need to import Temporal's determinism discipline; it has it.

- **Replay (INVESTIGATE, scoped to M4 only).** Replay is what makes durable execution magical: reconstruct exact
  state by re-running history. For ALH this is valuable *for M4's lifecycle* (deterministically rebuild project
  state from the event log) and **forbidden for M5/M6 effects** — you must never "replay" by re-sending a
  marketplace request or re-charging a payment. Replay must reconstruct *state*, never *re-perform outward
  actions*. This boundary is exactly Temporal's Activity-vs-Workflow split, and ALH must honor it.

- **Idempotency keys at outward seams (ADOPT, M5/M6).** The §1.4 lesson is non-negotiable for any retry: every
  outward-facing action (launch a marketplace request, send a reminder, charge) must carry an idempotency key so
  a retry cannot double-act. Since **M4 launches Marketplace requests and routes results**, the key belongs at
  the M4→M5 seam and on M6 effects.

- **Saga / compensation thinking (INVESTIGATE, M4/M5).** Make's Rollback/Commit/Break handlers and the Saga
  pattern matter because **you cannot transact across third-party reality.** If M5 fan-out partially succeeds,
  ALH needs an explicit, *human-confirmed* compensation path, not an automatic rollback of outward actions.
  Compensation that touches the outside world is a human decision; compensation of internal state is mechanical.

- **A full durable-execution engine platform-wide (REJECT).** Adopting Temporal/Step Functions as the spine
  would invert ALH's design: it would pull orchestration *into a runtime* and tempt modules to hold execution
  state, violating "modules emit logical events, no persistence/queues inside modules." ALH should adopt the
  *principles* (event-sourced state, replay-for-recovery, idempotent effects, compensation) **localized to M4's
  lifecycle**, not the *platform*.

**Net:** ALH's logical-event model is the *right abstraction*; durable execution is the *implementation
discipline* that makes it crash-safe. Adopt the discipline at M4; do not adopt the platform; honor the
state-vs-effect replay boundary absolutely.

---

## 4. The "Automate vs Keep Human" decision model

### 4.1 The principle

> **Automation may ASSIST and PREPARE. Humans must CONFIRM anything consequential, irreversible, or
> outward-facing. Automation must never DECIDE INTENT or COMMIT an irreversible/outward action on its own.**

This is not timidity; it is the lesson of §1.6 (human tasks are first-class) and §1.9 (sprawl is what happens
when automation is allowed to act unsupervised). It is also ALH's stated philosophy ("keep important judgment
with humans"). Restated as four tests an automation must pass to be allowed:

1. **Reversibility test.** Can the action be undone with no outside consequence? If no → human confirms.
2. **Outward-facing test.** Does it touch a real person, vendor, payment, or the client? If yes → human confirms.
3. **Intent/judgment test.** Does it decide *what the event means* or *what should happen*? If yes → **forbidden**
   (that is Discovery/FED/Project territory; automation may never author or alter it).
4. **Determinism test.** Is the result mechanical, or does it require interpretation? Interpretation → human (or
   a certified human for hard cases), never an automated rule.

An automation that fails tests 1 or 2 may still **prepare** the action (draft it, stage it, queue it for review)
— it just may not **commit** it. "Prepare, don't commit" is the safe default for almost everything.

### 4.2 The forbidden zone (automation must NEVER live here)

- **Changing the FED, IR, or Project content / intent.** These are the meaning of the event. Only humans
  (Discovery with the client, the organizer) author or alter them. No rule, no roll-up, no convenience may write
  here. *(Forbidden — this is the §1.3 rule-interaction nightmare applied to the one place it must never reach.)*
- **Deciding intent.** Automation may surface options; it may never choose what the client *wants*.
- **Auto-accepting marketplace results (M5).** Accepting a vendor/quote is consequential and outward-facing — a
  human (organizer) confirms. Automation may rank, summarize, and pre-fill; it may not accept.
- **Executing irreversible or outward-facing actions without human confirmation** — sending to a client,
  charging, committing a booking, dispatching a request as final. Prepare yes; commit no.
- **Overriding a verify-don't-trust seam.** Automation may not "auto-pass" a seam check.

### 4.3 Candidate automations → module → verdict

| Candidate automation | What it does | Reversible? | Outward-facing? | Owning module | Verdict |
|---|---|---|---|---|---|
| **Reminders / due-date nudges to the organizer** | Notify organizer a step is waiting | Yes | No (internal) | **M4** | **ADOPT** — pure assist |
| **Status roll-ups** ("3 of 5 needs resolved") | Derive a summary from project state | Yes (read-only) | No | **M4** | **ADOPT** — derived view, no write to FED/IR |
| **Notify-on-result** (marketplace result arrived) | Tell organizer a result came back | Yes | No | **M4** (routes results) | **ADOPT** — notify only, never auto-accept |
| **Auto-advance *suggestions*** | Propose "ready to advance" to organizer | Yes (suggestion) | No | **M4** | **ADOPT** — suggest only; the transition stays human |
| **Auto-advance lifecycle *itself*** | Move project to next state with no human | No | Sometimes | **M4** | **REJECT** — transition is a human-confirmed decision |
| **M5 request fan-out** | Send one need to many candidate providers | Partially | Yes | **M5** (launched by M4) | **ADOPT with guardrails** — mechanical *dispatch* of a human-approved request; needs idempotency key; the *decision to send* is human |
| **Auto-accept marketplace result** | Accept a quote/vendor automatically | No | Yes | **M5** | **REJECT** — consequential + outward-facing; organizer confirms |
| **M6 reminders** (event/run logistics nudges) | Remind participants/organizer of timing | Yes | Sometimes (participants) | **M6** | **ADOPT** for internal nudges; **human-confirm** anything sent outward to participants |
| **Idempotency keys on outward actions** | Prevent double-send/double-charge on retry | n/a (safety) | n/a | **M4→M5 seam, M6** | **ADOPT** — mandatory for any retry |
| **Retry with backoff + dead-letter on transient failure** | Recover transient M5/M6 failures; park the rest | n/a | n/a | **M5/M6**, surfaced in **M4** | **ADOPT** — but a dead-lettered item routes to a *human*, not an auto-retry loop |
| **Event-sourced M4 lifecycle log + replay-for-recovery** | Crash-safe state from an ordered event log | n/a | No | **M4** | **ADOPT (state only)** / **INVESTIGATE** mechanics — never replay outward effects |
| **Compensation/rollback on partial M5 fan-out** | Undo or unwind a partial send | No (outward) | Yes | **M4/M5** | **INVESTIGATE** — internal-state compensation is mechanical; outward compensation is human-confirmed |
| **Auto-route hard cases to a certified human** | Detect a case needing expert judgment, queue it | Yes | No | **M4** (queue), human resolves | **ADOPT** — this is the §1.6 user-task model; it *increases* human control |
| **Auto-edit / auto-fill the FED, IR, or Project** | Write meaning/intent into the spine | No | — | **nowhere** | **FORBIDDEN** — §4.2 |
| **Auto-decide client intent** | Choose what the client wants | No | Yes | **nowhere** | **FORBIDDEN** — §4.2 |
| **Auto-send to client / auto-charge / auto-book** | Commit an irreversible outward action unattended | No | Yes | **nowhere (unattended)** | **FORBIDDEN unattended** — automation may *prepare*; human commits |
| **Evidence collection prompts (M7)** | Nudge for proof/evidence capture | Yes | Sometimes | **M7** | **ADOPT** for internal prompts; outward requests human-confirmed |
| **Closure checklist roll-up (M8)** | Summarize what remains to close | Yes | No | **M8** | **ADOPT** — derived view; closing itself stays a human act |

The pattern is consistent and falls straight out of §4.1: **everything safe is a reminder, a derived view, a
suggestion, a mechanical dispatch of an already-human-approved action, or a routing-to-human.** Everything
forbidden writes intent or commits an outward/irreversible action unattended.

---

## 5. Extraction MATRIX

| Idea | Problem it solves | Origin | Universal? | ALH today | Owning module | Verdict |
|---|---|---|---|---|---|---|
| Trigger→action | Connect two systems without code | IFTTT 2010 | Partly — only trivial cases | Pipeline replaces it with typed transforms | M1 (Discovery as trigger of intent) | **ALREADY SOLVED BETTER** |
| Full workflow graphs | Express branches/loops/multi-outcome | Make, n8n | Yes (any process) | Fixed typed pipeline, not a free graph | whole pipeline | **ALREADY SOLVED BETTER** (typed > untyped graph) |
| Event-driven triggers (webhooks) | Act the instant something happens | Webhook era | Yes | ALH emits logical events natively | all modules | **ALREADY SOLVED** |
| Polling | Trigger from uncooperative sources | Zapier/Make | Situational | Avoided internally; only at real-world edges | M5/M6 edges | **REJECT** internally; tolerate at outward edges |
| Rules / condition engine | Branch on data; business logic as data | Drools/BPMN | Yes but degrades with scale | Conditions kept few, deterministic, human-owned | M4 (minimal) | **INVESTIGATE FURTHER** (keep tiny; never a BRE in the spine) |
| Idempotency keys | Prevent double-acting on retry | Distributed systems | Yes — non-negotiable | Not yet explicit at outward seams | M4→M5 seam, M6 | **ADOPT** |
| Retry + backoff + jitter | Recover from transient failures | SRE practice | Yes | Implicit; not yet formalized | M5/M6 | **ADOPT** |
| Error handlers (Rollback/Commit/Break/Ignore) | Handle partial failure deliberately | Make/Integromat | Yes | No explicit model yet | M5 (surfaced in M4) | **INVESTIGATE FURTHER** |
| Dead-letter queue | Don't drop or infinitely-retry failures | SQS/Kafka | Yes | No explicit DLQ; failures should reach a human | M5/M6 → M4 → human | **ADOPT** (route to human, not auto-loop) |
| Saga / compensation | "Undo" across non-transactional APIs | Saga pattern | Yes | No formal compensation model | M4/M5 | **INVESTIGATE FURTHER** (outward compensation = human) |
| Durable execution (Temporal) | Survive crashes mid-process | Cadence/Temporal | Yes for long processes | Pipeline shape good; durability not yet earned | M4 | **INVESTIGATE FURTHER** (principles only, not platform) |
| Event-sourced state + replay | State as an ordered event log | Event sourcing / Temporal | Yes | ALH emits logical events already | M4 | **ADOPT** (state) / **INVESTIGATE** (replay mechanics) |
| Deterministic core, I/O at edges | Make replay/verify possible | Temporal Workflow/Activity split | Yes | **M2/M3 pure; effects in M5/M6** | M2, M3, M5, M6 | **ALREADY SOLVED BETTER** |
| Step Functions (declarative state machine) | Managed durable orchestration | AWS | Yes | Would pull orchestration into a runtime | — | **REJECT** (conflicts with no-persistence-in-modules) |
| Human task / approval step | Wait for a human decision, typed result | BPMN/Camunda | Yes | ALH keeps judgment human by design | M4 (+ certified-human routing) | **ALREADY SOLVED** / **ADOPT** the typed-wait shape |
| Route hard cases to certified human | Don't let rules decide hard judgment | BPMN escalation | Yes | ALH already does this | M4 → human | **ADOPT** / **ALREADY SOLVED** |
| Run history / observability | Answer "why did this happen?" | All platforms | Yes | Logical events make it structural | all modules | **ALREADY SOLVED** (strengthen at M4) |
| Auto-accept / auto-commit outward actions | "Full" hands-off automation | no-code aspiration | No — anti-pattern for consequential acts | Forbidden by design | nowhere | **REJECT / FORBIDDEN** |
| Automation sprawl (failure mode) | — (it is the disease) | no-code era | Universal risk | Low risk by design; must stay confined | governance over M4–M6 | **REJECT the conditions that cause it** |

---

## 6. Challenges to conventional wisdom

1. **"A visual no-code graph is simpler than code." False — it is *worse* than code.** It is untyped, untested,
   unversioned, hidden-state distributed code, with the one safety net (engineers who know it's code) removed.
   ALH's typed pipeline is the rebuttal: make it code-like and verifiable, don't pretend it isn't a program.

2. **"More automation is more leverage." Only until sprawl.** §1.9 shows the leverage curve inverts: past a
   point, each new unowned automation *subtracts* net value by adding cascade risk and un-debuggability. The
   right metric is not "how much is automated" but "how much is automated *and still reasoned-about*."

3. **"Durable execution means you can replay anything." Dangerously incomplete.** You may replay to reconstruct
   *state*; you may never replay to *re-perform outward effects*. The entire Workflow/Activity (or
   state/effect) split exists to enforce this. Any ALH replay must reconstruct M4 state only and must treat
   M5/M6 effects as non-replayable.

4. **"Human-in-the-loop is a fallback for when automation isn't good enough." Backwards.** In the mature lineage
   (BPMN/Camunda) the human task is a *first-class designed node*, not a degraded path. ALH treating human
   confirmation as the *intended* design for consequential actions is the sophisticated position, not the timid
   one.

5. **"Idempotency is an optimization." No — it is a correctness precondition for *any* retry.** A system that
   retries without idempotency keys is not "mostly reliable"; it is "reliably double-acting under failure." This
   reframes idempotency from nice-to-have to mandatory wherever ALH retries an outward action.

6. **"ALH should adopt a workflow engine to get reliability." Partly a category error.** ALH already *is* a
   workflow architecture (typed, deterministic, verifiable). What it lacks is *durability of M4's state*, which
   is a narrow, local need — earned by event-sourcing M4's lifecycle, not by importing an orchestration platform
   that would violate ALH's no-persistence-in-modules rule.

---

## 7. Top ideas for ALH (ranked, module + verdict)

1. **Event-sourced M4 lifecycle + replay-for-state-recovery — M4 — ADOPT (state) / INVESTIGATE (mechanics).**
   Make the ordered log of M4 lifecycle events authoritative; derive status from it; reconstruct state on crash
   by replay. Highest value, sits inside M4's existing charter, builds directly on ALH's logical-event model.
   *Hard boundary:* replay reconstructs state only — never re-performs M5/M6 outward effects.

2. **Idempotency keys on every outward action — M4→M5 seam, M6 — ADOPT.** Non-negotiable precondition for any
   retry. Without it, retries double-send and double-charge. Cheap, structural, high-impact.

3. **Retry-with-backoff + dead-letter-to-human on transient outward failure — M5/M6, surfaced in M4 — ADOPT.**
   Recover transient failures automatically; route the un-recoverable to a *human*, never an infinite auto-loop.

4. **The "Automate vs Keep Human" decision model (§4) as a standing rule — governs M4/M5/M6 — ADOPT.** Prepare,
   don't commit; never write intent; never auto-accept outward results; route hard cases to certified humans.
   This is the single most important *governance* output and the antidote to automation sprawl inside ALH.

5. **Convenience assists in M4 — reminders, status roll-ups, notify-on-result, auto-advance *suggestions* — M4 —
   ADOPT.** All pass the reversibility/outward/intent/determinism tests. They assist and prepare; humans confirm.

6. **Route-hard-cases-to-certified-human as a first-class M4 path — M4 → human — ADOPT.** The BPMN user-task
   model; it increases rather than reduces human control and is already ALH philosophy.

7. **Saga / compensation model for partial M5 fan-out — M4/M5 — INVESTIGATE FURTHER.** Internal-state
   compensation can be mechanical; any compensation touching the outside world stays human-confirmed. Worth
   designing before M5 fan-out goes live.

8. **Explicit error-handler vocabulary (Rollback/Commit/Break/Ignore-style) for M5 effects — M5, surfaced in M4
   — INVESTIGATE FURTHER.** Make's model is the best no-code articulation of deliberate partial-failure
   handling; adapt the *vocabulary*, keep outward "rollback" human-confirmed.

**Explicitly rejected / forbidden:** auto-advancing lifecycle without a human; auto-accepting marketplace
results; auto-editing the FED/IR/Project; auto-deciding intent; auto-sending/charging/booking unattended;
adopting a full durable-execution *platform* as the spine; internal polling; a large business-rules engine in
the deterministic core.

---

## 8. Non-goals of this document

- It does **not** modify code, schema, migrations, contracts, prompts, or any module (M1–M8).
- It does **not** redesign the ALH pipeline; it maps ideas onto the existing architecture.
- It does **not** rename OPE or any existing object; "OPE" remains a proper name.
- It does **not** analyze competitors, features, market, or UI; it extracts *engineering* knowledge only.
- It does **not** specify implementation; verdicts marked INVESTIGATE FURTHER require their own design pass.
