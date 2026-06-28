# CRM Engineering — Knowledge Extraction (Part 4)

> **Purpose:** extract reusable **engineering principles** from the evolution of CRM systems
> (Salesforce, HubSpot, Zoho, Pipedrive; precursors ACT!, GoldMine, Siebel) and map them onto the
> ActivLife Hub (ALH) module pipeline. The subject is **relationship management, interaction
> history/timeline, collaboration, ownership, approvals, audit, and long-term information flow** —
> *not* sales, pipelines, quotas, or UI.
> **Scope:** research and writing ONLY. This document proposes **no code, no schema, no
> architecture redesign, and no implementation.** It maps ideas onto the existing pipeline
> (Discovery/M1 → FED → OPE/M2 → IR → Assembly/M3 → Project → Workspace/M4 →
> Marketplace/M5 / Execution/M6 → Evidence/M7 → Closure/M8) and records verdicts.
> **Status:** living research document · benchmark extraction. Challenges to ALH designs are
> intentional; credit is given where ALH is already superior.
> **Method:** study *evolution*, not products — origin, problem solved, why it changed, whether it
> improved. Confidence is flagged; uncertainty is flagged, never fabricated.

---

## 0. Reading guide and a standing warning

CRM is the wrong place to copy *features* and the right place to copy *engineering*. The four
named systems are sales machines; their relationship/collaboration/audit substrate, however, was
forged by ~30 years of multi-user, multi-year, regulated, audited use and is genuinely
load-bearing. ALH must mine that substrate and **reject the sales-CRM bloat that rides on top of
it** — pipelines, quotas, forecasting, lead scoring, sequences, "deals," and the entire
revenue-attribution apparatus. Those answer "how do we sell more?"; ALH answers "how do we
correctly realize one client's event and remember the people who helped." Different question.

The single most important CRM idea for ALH is also the one ALH is *least* designed for today:
**entities that persist across many events over time** — a repeat client, a trusted vendor, an
organizer's accumulated reputation. ALH is, by deliberate design, **per-project / per-event** and
immutable-upstream. That is correct for one event. It is silent about the *second* event. Section
7 is the heart of this document.

---

## 1. Origin: why CRM exists as an engineering object

(1) **Problem.** Before CRM, customer knowledge lived in a salesperson's head, a Rolodex, and
scattered notes. When the person left, the relationship left with them. Three structural failures
recurred: (a) **knowledge evaporation** — no durable record of *what was said, by whom, when*;
(b) **no shared truth** — sales, support, and billing each held a different version of the same
customer; (c) **no accountability** — nobody could reconstruct who promised what.

(2) **Why invented.** The lineage is instructive:
- **ACT!** (1987) and **GoldMine** (early 1990s) — *contact managers*. Their real invention was
  the **append-only activity history attached to a contact**: every call, letter, and note logged
  against a person, in time order, never overwritten. This is the ancestor of every modern
  "timeline."
- **Siebel** (mid-1990s) — *enterprise CRM*. Its invention was the **shared, server-side,
  multi-user "single customer object"** plus **territory/ownership assignment** and **role-based
  visibility** — relationship data as a governed corporate asset, not a personal file.
- **Salesforce** (1999) — moved the above to multi-tenant cloud and made the **object model +
  field history + sharing rules + approval processes** a configurable platform.
- **HubSpot** (2006→) — re-centered the timeline on **inbound interaction capture** (email opens,
  page views, form fills) and made the **contact timeline the primary object**, auto-populated.
- **Pipedrive** (2010) — deliberately *minimalist*; its lesson is mostly about **what to leave
  out**, and that **activities are first-class** (an activity must always exist as the "next
  thing").

(3) **Universal?** The *substrate* problems are universal to any multi-actor system that operates
over time: durable interaction history, single source of truth, ownership, accountability, audit.
The *sales* superstructure is not universal and must be excluded.

**Confidence:** high on the historical lineage and the engineering primitives; specific dates are
from general industry knowledge and are approximate where noted.

---

## 2. The interaction timeline (append-only event log of every touch)

(1) **Problem.** Reconstruct, at any later moment, *everything that happened* to a relationship or
record — every call, email, meeting, note, status change — in trustworthy time order, even years
later and even after staff turnover.

(2) **Why invented.** Memory and email inboxes are private, lossy, and non-shared. The timeline
makes interaction history a **shared, durable, ordered, append-only** artifact. Engineering
shape: each touch is an immutable **Activity/Event record** (type, actor, timestamp, body,
related-object pointer); the timeline is the **ordered projection** of those records over a
record. Crucially it is **append-only** — you add a correction as a new entry, you do not edit
history. HubSpot's advance was **auto-capture** (the system logs the touch without a human
remembering to); Salesforce's was **mixing system events and human events** on one timeline (a
field change and a logged call appear side by side).

(3) **Universal?** Yes. Any system where multiple actors act on a shared thing over time needs an
append-only, ordered, attributable history. This is the same primitive as an event log, an audit
log, a git history, and a bank ledger.

(4) **Does ALH solve it?** **Partially, and at the wrong layer for human collaboration.** ALH's
pipeline already runs on **immutable upstream artifacts + logical event logs** — FED, IR, Project
are immutable, and module transitions are logical events. That is a *system* event log
(deterministic M2/M3 producing immutable artifacts). But the CRM timeline is a **human
interaction** log: organizer notes, internal communication, decisions, approvals, attachments,
client touches. That is precisely **M4's** job (M4 is the first stateful module and owns notes,
internal communication, decisions, approvals, attachments). The question is whether M4 treats
those as an **append-only, attributed, ordered event log** or as mutable rows.

(5) **ALH better where it already does this?** Yes — ALH's *upstream* immutability is stronger and
more principled than CRM's. CRM bolted field-history onto mutable records after the fact; ALH made
upstream artifacts immutable *by construction*. ALH should not weaken that.

(6) **Conceptual solution (for the part ALH does not yet nail).** M4's collaboration surface
should be modeled as **one append-only interaction timeline per Project**, unifying human touches
(notes, messages, decisions, approval state changes, attachment adds) and system touches (Project
created, Marketplace request launched, result routed back, evidence attached). Every entry:
immutable, typed, actor-attributed, timestamped, with a pointer to what it concerns. Corrections
are new entries. This is the CRM timeline's single best idea, expressed in ALH's own
event-log idiom. **No new engine, no upstream change** — it is a discipline on M4's existing
responsibilities.

(7) **Owning module:** **M4** (Organizer Workspace).

(8) **Verdict:** **ADOPT** as an M4 modeling discipline. Trade-off: append-only history grows
unbounded and needs projection/summarization for the UI (CRM solved this with "filtered timeline"
views), and "edit a note" becomes "supersede a note," which is unfamiliar to users but correct for
audit.

---

## 3. Record ownership and assignment

(1) **Problem.** When many people can touch a record, *who is responsible for it right now?*
Without a single answerable owner, work is dropped, duplicated, or fought over.

(2) **Why invented.** Siebel's territory/assignment model and Salesforce's `OwnerId` made
ownership a **single, explicit, transferable field** on every record, with a logged transfer
("reassignment"). Ownership drives accountability ("whose queue is this in?"), routing, and default
visibility. The key engineering choice: **exactly one owner at a time**, plus a separate **team /
collaborator** concept for everyone else who can see or act.

(3) **Universal?** Yes — any long-lived shared object needs one accountable owner plus a set of
collaborators. This is org design encoded as data.

(4) **Does ALH solve it?** **Yes, and it is central to M4.** M4 explicitly owns *ownership,
collaboration/membership, approvals-of-organizer-work, lifecycle*. ALH's Project has a clear owning
organizer; M4 is where ownership and membership live. This is one of ALH's strongest pre-existing
fits.

(5) **ALH better?** Comparable. ALH's advantage is that ownership sits in a module whose *single
responsibility* is the stateful workspace, rather than being a field smeared across a giant
multi-purpose customer object. ALH's separation (immutable upstream Project vs. mutable M4
ownership/collaboration state) is cleaner than CRM's "everything hangs off the one Account object."

(6) **Conceptual solution:** N/A — already solved. The only refinement worth borrowing: make
**ownership transfer an event on the timeline** (§2), not a silent field overwrite, so the chain of
custody is reconstructable. CRM learned this the hard way (silent reassignment hid accountability).

(7) **Owning module:** **M4.**

(8) **Verdict:** **ALREADY SOLVED** (M4), with one ADOPT refinement: log ownership transfer as a
timeline event. Trade-off: none material.

---

## 4. @mentions, collaboration, and internal communication

(1) **Problem.** Coordinate multiple people working on one record without losing the *context*
of who said what to whom about which item — and without that conversation escaping into private
email where it becomes invisible and unauditable.

(2) **Why invented.** Salesforce **Chatter** (2010, the "enterprise social network" era) and
parallel features elsewhere brought **record-scoped discussion with @mentions** so collaboration
happens *on the record*, in context, durably, and visibly — not in side-channel email. The
engineering primitive: a **comment/post thread attached to the object**, with **mentions** that
create **directed notifications** and a participant set. The deeper principle: **keep the
conversation attached to the thing it is about**, so future readers inherit the context.

(3) **Universal?** Yes — contextual, attached, attributable collaboration is universal to teamwork
on shared artifacts (cf. PR review comments, Google Docs comments, Linear/Jira threads).

(4) **Does ALH solve it?** **Yes by mandate** — M4 explicitly owns *INTERNAL COMMUNICATION* and
*collaboration/membership*. The capability is assigned; the *engineering shape* is what to borrow:
internal communication should be **timeline entries scoped to the Project** (or to a specific
decision/approval/attachment within it), with mentions producing **logical notification events**.
ALH already speaks "logical events," so mentions/notifications fit its idiom natively.

(5) **ALH better?** Potentially yes, *if* ALH keeps internal communication strictly **internal to
M4 and scoped to the Project**, rather than CRM's tendency to let Chatter sprawl into a
general-purpose social feed. ALH's "one responsibility per module" gives it a principled reason to
keep communication bounded to organizer work — a discipline CRM lacked.

(6) **Conceptual solution:** model internal communication as a **scoped, append-only thread on the
Project's M4 timeline**, with @mention → logical notification event. Do **not** build a separate
messaging product; communication is a *facet* of the workspace timeline, not a new module.

(7) **Owning module:** **M4.**

(8) **Verdict:** **ADOPT** the engineering shape (scoped, attached, append-only, mention =
logical event). **REJECT** the Chatter "social feed" expansion. Trade-off: notification volume and
the temptation to grow a chat product — bound it hard.

---

## 5. Approval processes / workflow

(1) **Problem.** Some state changes must not happen until a designated person (or chain) signs off —
and the system must **block** the change, **record** the decision, and make the **chain
reconstructable**.

(2) **Why invented.** Salesforce **Approval Processes** formalized: an entry condition, an ordered
**approval chain** (one or many steps, parallel or serial), **lock the record while pending**,
record **approver + decision + timestamp + comment**, and define **on-approve / on-reject**
actions. The invention is treating approval as **first-class state with its own audit**, not as a
status field someone flips. The chain itself — *who must approve, in what order* — is data, not
code.

(3) **Universal?** The *primitive* (gated state transition + recorded decision + reconstructable
chain) is universal. The *elaborate* multi-step parallel-conditional engines are enterprise
bureaucracy ALH should not import wholesale.

(4) **Does ALH solve it?** **Partially.** M4 owns *approvals-of-organizer-work* and *decisions*
and *lifecycle* — so the slot exists. ALH also has a **verify-don't-trust** principle, which is
philosophically aligned with gated approval. What CRM contributes is the **engineering
discipline**: an approval is (a) a **gate** on a lifecycle transition, (b) an **immutable decision
record** (approver, decision, timestamp, rationale) on the timeline, and (c) a reconstructable
**chain** when more than one approver is involved (e.g., organizer → experienced-organizer review
queue, which already exists in ALH per `EXPERIENCED_ORGANIZER_REVIEW_QUEUE_*`).

(5) **ALH better?** ALH's instinct is better-scoped: approvals attach to *organizer work* and
*lifecycle*, not to arbitrary fields. The existing **experienced-organizer review queue** is
effectively a domain-specific approval chain and is more meaningful than a generic field-flip
approval.

(6) **Conceptual solution:** model approvals in M4 as **gated lifecycle transitions** that emit an
**immutable decision event** (approver, decision, rationale, timestamp) onto the Project timeline,
supporting a **simple ordered chain** (e.g., organizer-self → experienced-organizer review). Keep
it a **small, explicit chain**, not a conditional-parallel workflow engine.

(7) **Owning module:** **M4.** (The decision *content* may concern downstream M5/M6 work, but the
approval *act and record* live in M4, the stateful workspace.)

(8) **Verdict:** **ADOPT** the primitive (gate + immutable decision record + small chain).
**REJECT** the heavyweight workflow-engine elaboration. Trade-off: a real chain needs
"who is the approver" to be answerable — which depends on the cross-project identity layer (§7) if
approvers persist across projects.

---

## 6. Audit trail, field-level history, and "single source of truth"

(1) **Problem.** Two linked needs: **audit** ("prove what changed, who changed it, when, from what
to what") for trust/compliance/dispute resolution; and **single source of truth** ("one canonical
record everyone reads, instead of five divergent copies").

(2) **Why invented.**
- **Field-level history** (Salesforce "field history tracking," Zoho equivalents): the system
  records, per tracked field, *old value → new value, actor, timestamp*. This was retrofitted onto
  **mutable** records, so the history is a **side log** reconstructing change because the record
  itself overwrites. It is the mutable world's compensation for not being append-only.
- **Single source of truth / object model:** the Account/Contact object as the one canonical
  entity, with everything (activities, cases, opportunities) **related to** it by reference, so
  there is one place the truth lives.

(3) **Universal?** Yes — auditability and a canonical record are universal to any trusted
multi-actor system.

(4) **Does ALH solve it?** **Yes, and arguably better by construction.** ALH's upstream artifacts
(FED, IR, Project) are **immutable**, M2/M3 are **deterministic**, and the pipeline is built on
**logical event logs**. This means ALH gets field-history-equivalent guarantees *for free upstream*:
you don't need a side log of "what changed" when the artifact never changes and every transition is
a logged event. CRM's field-history is a **workaround for mutability that ALH largely doesn't have
upstream.** The Project is ALH's "single source of truth" object, and it is immutable — stronger
than CRM's mutable-Account-plus-side-log.

(5) **ALH better?** **Yes, clearly, upstream.** This is a place to *credit ALH*: immutable-upstream
+ deterministic transforms + logical events is a more principled audit foundation than retrofitted
field history. ALH should not adopt CRM field-history upstream — it would be a regression.

(6) **Conceptual solution (only for the mutable part).** The one place ALH *is* mutable is **M4**
(the first stateful module). There, CRM's field-history lesson applies **selectively**: M4's
mutable collaboration state (ownership, membership, decisions, approvals, notes) should record
changes as **append-only timeline events** (§2) rather than overwriting silently. That gives M4 the
audit property the immutable upstream already enjoys, without making M4 immutable (it can't be — it
is the stateful module). So: **upstream = immutable artifacts (already audited by construction);
M4 = mutable state with an append-only change log (CRM field-history's principle, ALH's idiom).**

(7) **Owning module:** upstream audit is **already in the pipeline (M1–M3 immutability)**; mutable
audit belongs to **M4**.

(8) **Verdict:** **ALREADY SOLVED BETTER** upstream (immutable artifacts + logical events).
**ADOPT** field-history's *principle* (append-only change record) for M4's mutable state only.
Trade-off: M4 must distinguish "current state" from "history of state" — a projection concern, not
a storage-of-truth concern.

---

## 7. Cross-project relationship / identity memory — does ALH need it, and where?

This is the central question and the one CRM is genuinely better at than ALH today. **Flagged as
the highest-value finding.**

### 7.1 What CRM does that ALH structurally cannot yet

CRM's deepest engineering property is that **the Contact/Account is the durable spine, and
individual deals/cases/activities are transient things that attach to it over years.** A repeat
customer is *the same object* across the 1st and 50th interaction. Relationship memory —
preferences, history, who-knows-whom, prior outcomes, accumulated trust — accretes on that durable
identity. The transient sales objects come and go; the **identity persists**.

ALH is the inverse by design: the **Project/event is the spine, and it is immutable and
per-event.** FED → IR → Project are scoped to *one* event. There is, today, **no durable object
that is "this client, across all their events"** or "this vendor, across all the projects they
served" or "this organizer's reputation, across everything they ran." Each event is a fresh,
correct, isolated universe. That is excellent for *one* event and **silent about the relationship
across events.**

### 7.2 The concrete entities that need to persist across events

- **Repeat client** — the same human commissioning their 2nd, 3rd event. Their preferences,
  constraints, past FEDs/outcomes, and "what worked last time" are relationship memory.
- **Repeat vendor / staff / rental** — a Marketplace (M5) supplier used across many projects;
  their reliability, past evidence (M7), and history are durable trust signals.
- **Organizer reputation** — accumulated across every project an organizer ran: completion record,
  review-queue outcomes, evidence quality, client repeat-rate. ALH already gestures at this
  (`MARKETPLACE_TRUST_MVP`, `TRUST_AND_VERIFICATION_ARCHITECTURE`, certification/Academy), which
  means a *partial* identity layer already exists for organizers and trust.
- **Relationship edges** — "this organizer has worked with this vendor before," "this client
  prefers this organizer." These are the highest-value, least-built memory.

### 7.3 Is there a missing layer, and where does it belong?

**Yes — there is a missing cross-cutting "relationship/identity" layer**, and the correct answer to
"M4, M5, or nowhere" is nuanced:

- **It is NOT M4.** M4 is the **per-project** stateful workspace. Putting cross-project identity in
  M4 would violate M4's single responsibility and ALH's immutable-upstream/per-project discipline —
  M4 would have to reach across project boundaries, which it must not. Relationship memory that
  outlives a project cannot be owned by a module scoped to one project.
- **It is partly M5-adjacent but not M5 itself.** M5 (Marketplace) deals with **real vendors/staff/
  rentals**, so *vendor* identity and *vendor* trust have a natural gravity toward the M5 side. But
  M5's responsibility is "find real supply for *this* request," not "remember the cross-project
  trust graph." Vendor identity is *referenced by* M5, not *owned inside* M5's per-request job.
- **The honest answer: "a future cross-cutting concern — its own layer, not yet built."** The
  identity/relationship layer is **orthogonal to the per-event pipeline**: M1–M8 all *reference*
  durable identities (client, organizer, vendor) but none should *own* them, because owning them
  would make a per-event module carry cross-event state — exactly the responsibility-bleed ALH's
  modular pipeline principle forbids. By ALH's own §8 responsibility rule (a function that belongs
  to "none" of the modules signals the architecture needs a new clearly-owned home), **cross-project
  identity is a function that belongs to none of M1–M8 and therefore needs its own owned layer.**

**Proposed conceptual placement (research-level, not a design):** a **cross-cutting Identity &
Relationship layer** that the pipeline *references by stable ID* but never mutates from inside a
project. Each Project still **immutably references** durable identities (this client, this
organizer, these vendors); the durable identities accrue memory *outside* any single project, fed by
**logical events emitted from the pipeline** (project closed → organizer reputation event; evidence
accepted → vendor reliability event; repeat client detected → relationship edge). This keeps the
per-event pipeline immutable and per-project while giving relationships a durable home — consistent
with ALH's existing "logical events" and "engine replaceability" principles.

### 7.4 The critical safeguards (so this does not become a CRM)

1. **The pipeline stays per-event and immutable.** The identity layer **reads from** logical events
   the pipeline already emits; it must not write back into immutable upstream artifacts.
2. **Identity is referenced, never embedded.** A Project references `client_id`/`organizer_id`/
   `vendor_id`; it does not absorb their cross-project history. (CRM's mistake was embedding
   everything in one fat object.)
3. **No sales semantics.** This layer holds *relationship memory and trust*, not pipelines, deals,
   lead scores, or revenue attribution. It is identity + history + trust edges — full stop.

(7) **Owning module:** **"nowhere yet" — a future cross-cutting Identity/Relationship layer**,
referenced by M1–M8, owned by none of them. Vendor-facet has gravity toward M5; organizer-trust
facet partially exists already across Marketplace-trust/verification/Academy docs.

(8) **Verdict:** **INVESTIGATE FURTHER (highest priority).** ALH genuinely lacks cross-event
relationship memory, and CRM proves it is load-bearing for repeat-relationship businesses.
Trade-off: introducing a cross-cutting layer is the single biggest deviation from "pure per-event
pipeline"; it must be added as an **orthogonal reference layer fed by logical events**, never by
relaxing upstream immutability, and never by importing sales-CRM structure.

---

## 8. Extraction matrix

| Idea | Problem it solves | Origin | Universal? | ALH today | Owning module | Verdict |
|---|---|---|---|---|---|---|
| Interaction **timeline** (append-only touch log) | Reconstruct everything that happened, in order, durably | ACT!/GoldMine activity history → HubSpot auto-capture → SFDC mixed system+human feed | Yes | Upstream event-log strong; human-collab log under-modeled | **M4** | **ADOPT** (model M4 collab as append-only timeline) |
| **Ownership / assignment** | Who is accountable right now | Siebel territories → SFDC `OwnerId` | Yes | Core M4 responsibility; well-fit | **M4** | **ALREADY SOLVED** (+ log transfers as events) |
| **@mentions / collaboration** | Context-attached, visible, auditable teamwork | SFDC Chatter era | Yes | M4 owns internal comms; shape to borrow | **M4** | **ADOPT** shape; **REJECT** social-feed sprawl |
| **Approval processes** | Gate state changes; record + reconstruct decisions | SFDC Approval Processes | Primitive yes; engine no | M4 owns approvals/decisions; review-queue exists | **M4** | **ADOPT** primitive; **REJECT** workflow engine |
| **Audit / field history** | Prove what changed, by whom, when | SFDC/Zoho field history (mutable-world workaround) | Yes | Immutable upstream + logical events = better by construction | M1–M3 (upstream) + **M4** (mutable) | **ALREADY SOLVED BETTER** upstream; **ADOPT** principle for M4 only |
| **Single source of truth** object | One canonical record, not divergent copies | Siebel/SFDC Account object | Yes | Project = immutable canonical artifact | M1–M3 → **Project** | **ALREADY SOLVED BETTER** (immutable) |
| **Roles & sharing rules** | Govern who sees/acts on what | Siebel/SFDC sharing model | Yes (RBAC) | Membership in M4; org-wide RBAC cross-cutting | **M4** (per-project) + platform | **ADOPT** scoped to M4; keep RBAC simple |
| **Cross-project relationship/identity memory** | Repeat client/vendor/organizer reputation persists across events | CRM Contact/Account as durable spine | Yes (for repeat relationships) | **Missing** — ALH is per-event | **nowhere yet** (future cross-cutting layer; vendor-facet near M5) | **INVESTIGATE FURTHER (top priority)** |
| Pipelines / quotas / deals / forecasting / lead scoring | Sell more | Sales CRM superstructure | **No** (sales-specific) | N/A | N/A | **REJECT** (bloat) |

---

## 9. Roles & sharing rules (brief)

(1) **Problem:** govern visibility/action by role across a large org. (2) **Origin:** Siebel/SFDC
role hierarchies + sharing rules + org-wide defaults. (3) **Universal?** RBAC is universal, but
CRM's combinatorial sharing-rule engine is enterprise-grade complexity. (4) **ALH today:** M4 owns
*membership*; per-project access is naturally scoped. (5/6) ALH's per-project scoping makes most
of CRM's sharing complexity unnecessary — visibility is mostly "members of this Project." A thin
platform-level RBAC (organizer vs. experienced-organizer vs. admin/reviewer) covers cross-project
roles. (7) **Owning module:** per-project sharing → **M4**; platform roles → cross-cutting auth,
not a pipeline module. (8) **Verdict:** **ADOPT** minimal, scoped RBAC; **REJECT** the
sharing-rule engine. Keep it simple — per-project membership does most of the work.

---

## 10. Challenges to conventional wisdom

- **"The customer object is the center of the universe."** CRM's fat Account object is an
  *anti-pattern* for ALH. ALH is right to center the **immutable per-event Project** and reference
  identities, not embed them. The CRM lesson is the **need for durable identity**, not the
  **fat-object implementation** of it. Adopt the need; reject the shape.
- **"Field-level history is how you get audit."** Field history is a **workaround for mutability**.
  ALH's immutable-upstream + logical-events design gets the audit property *without* the workaround
  and is **superior by construction**. Do not retrofit field history upstream — that would be a
  regression. Apply its *principle* only to M4, the one mutable module.
- **"Collaboration needs a social feed."** Chatter-style feeds sprawled into noise. ALH's
  one-responsibility-per-module rule is a *feature* here: internal communication is a **bounded
  facet of the M4 timeline**, not a messaging product. Bound it.
- **"Approvals need a workflow engine."** The valuable primitive is tiny: **gate + immutable
  decision record + small chain.** ALH's existing experienced-organizer review queue already
  *is* a domain-meaningful approval chain — more useful than a generic conditional-parallel engine.
- **"Per-event purity is enough."** This is the one place to challenge **ALH itself**: pure
  per-event design is correct for one event and **structurally blind to repeat relationships.**
  The repeat client, the trusted vendor, the organizer's reputation are real, valuable, and
  **homeless** in the current architecture. This is not a feature gap — it is a missing
  **layer**. (Credit: ALH already has partial organizer-trust scaffolding across
  Marketplace-trust/verification/Academy docs; it just isn't unified as an identity layer.)
- **"Relationship memory belongs in the workspace (M4)."** Tempting and **wrong** — M4 is
  per-project. Cross-event memory in a per-project module is exactly the responsibility-bleed ALH's
  modular-pipeline §8 rule forbids. It belongs in its **own orthogonal layer**, fed by logical
  events, referenced by all modules, owned by none.

---

## 11. Top ideas for ALH (ranked · module · verdict)

1. **Cross-project relationship/identity layer** — *new cross-cutting layer (nowhere in M1–M8 yet;
   vendor-facet near M5)* — **INVESTIGATE FURTHER (highest priority).** The genuine, load-bearing
   CRM idea ALH lacks. Add as an **orthogonal reference layer fed by logical events**, never by
   relaxing upstream immutability, never with sales semantics.
2. **Append-only interaction timeline for M4** — *M4* — **ADOPT.** Unify notes, internal
   communication, decisions, approval state, attachment adds, and system events into one immutable,
   attributed, ordered Project timeline. CRM's single best primitive, in ALH's event-log idiom.
3. **Approval primitive (gate + immutable decision record + small chain)** — *M4* — **ADOPT** (and
   formalize the existing experienced-organizer review queue as the canonical chain). Reject the
   workflow engine.
4. **@mention → logical notification, scoped to Project** — *M4* — **ADOPT** the shape; **REJECT**
   the social-feed sprawl.
5. **Log ownership transfers as timeline events** — *M4* — **ADOPT** (cheap; restores chain of
   custody CRM lost via silent reassignment).
6. **Field-history *principle* for M4's mutable state only** — *M4* — **ADOPT** narrowly; upstream
   is **ALREADY SOLVED BETTER** by immutability + logical events — do not touch it.
7. **Minimal scoped RBAC** (per-project membership + thin platform roles) — *M4 + platform auth* —
   **ADOPT** minimal; **REJECT** the sharing-rule engine.
8. **All sales-CRM superstructure** (pipelines, quotas, deals, forecasting, lead scoring,
   sequences) — *N/A* — **REJECT.** Out of scope by design; the standing warning of §0.

---

## 12. Non-goals of this document

- It does **not** modify code, schema, migrations, prompts, or any ALH engine.
- It does **not** redesign the pipeline, rename modules, or propose implementation. The
  cross-project identity layer is raised as a **research finding to investigate**, not a design.
- It does **not** import sales-CRM features; it extracts **engineering principles** only.
- It records confidence and flags uncertainty (historical dates approximate; module verdicts are
  mapped onto the existing M1–M8 architecture, not changes to it).
```
