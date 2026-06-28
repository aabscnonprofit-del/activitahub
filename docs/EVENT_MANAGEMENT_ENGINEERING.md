# Event Management Platforms — Engineering Knowledge Extraction

> **Purpose:** Part 3 of the ActivLife Hub Global Engineering Benchmark — extract durable *engineering*
> ideas from professional event-management platforms (Cvent, Bizzabo, Eventbrite, Whova, Hopin/RingCentral
> Events, Splash, Stova/Aventri, RainFocus, Tripleseat, Social Tables, and their 1990s ancestors), and map
> them onto ALH's pipeline. This is about how software *models an event and its lifecycle* and where it
> helps vs gets in the way — **not** marketing, feature, or UI comparison.
> **Scope:** research and writing ONLY. No code, schema, API, architecture redesign, or implementation
> proposal. ALH's module decomposition (M1–M8) is taken as fixed; ideas are *mapped onto* it, never
> redesigning it.
> **Status:** living research document · benchmark input for orchestrator synthesis.
> **Method:** study evolution, not products — origin → problem solved → why later systems changed it →
> whether the change improved it. Challenge designs; credit ALH where already superior; flag uncertainty,
> never fabricate. **Date:** 2026-06-25.

---

## 0. ALH pipeline (the map we project onto)

```
Client Request → Discovery (M1) → FED → OPE Engine (M2) → IR → Project Assembly (M3) → Project
   → Organizer Workspace (M4) → Resource Marketplace (M5) / Event Execution (M6)
   → Completion Evidence (M7) → Project Closure (M8)
```

- **M1 Discovery → FED** — approved *meaning*: what should happen, the desired result, the moments.
- **M2 OPE: FED → IR** — deterministic plan: tasks, **abstract** needs, dependencies, risks, **relative**
  timeline, cost **estimate**. No real vendors, no real dates, no payments.
- **M3 IR → Project** — deterministic assembly into an **immutable** project structure.
- **M4 Workspace** — stateful org working environment (statuses, checklists, notes, comms, attachments,
  decisions, collaboration). Lifecycle Planning → Preparation → Ready; launches Marketplace requests and
  routes results.
- **M5 Resource Marketplace** — **real** vendors/staff/rentals + sourcing.
- **M6 Event Execution** — run-day actual delivery.
- **M7 Completion Evidence** · **M8 Project Closure.**

**Governing principles:** one responsibility per module; immutable upstream; verify-don't-trust;
deterministic M2/M3; abstract-not-real upstream; engine replaceability; logical events.

The single most important claim this document tests: **ALH separates MEANING (M1) from ABSTRACT PLAN
(M2/M3) from WORKING PREP (M4) from REAL SOURCING (M5) from RUN-DAY (M6). Every major event platform
collapses most or all of these into one mutable "event" record.** That collapse is the root of where event
software gets in the way — and the place where ALH is structurally ahead.

---

## 1. How real organizers work vs how software models it

### How professional organizers actually work

Reconstructed from the production/logistics research, a real organizer's process is **layered and
time-phased**, and the layers are deliberately kept separate *on paper* even when the software smears them
together:

1. **Intent / brief.** A client wants an *outcome* — "an anniversary gala that feels intimate but
   impressive," "a product launch that lands in press." This is meaning, not a plan. Good planners resist
   premature structure here; they protect the brief.
2. **Abstract plan.** The planner reasons about *what is required* — a venue of roughly this size, catering
   for ~N, AV of this class, a 3-hour arc with these beats — **before naming a single real vendor or fixing
   a real date.** Experienced planners hold this abstract layer in their heads and in rough budgets; weaker
   planners (and most software) jump straight to "pick a venue."
3. **Working prep.** The long middle: checklists, vendor shortlists, decisions, contracts pending, room
   sets, comms drafts, a budget that moves from *estimated* → *committed* → *actual*. This is a **stateful
   workspace**, and it is where most of the real labor lives.
4. **Real sourcing.** RFPs to venues/caterers/AV, bid comparison, COIs, deposits, signed BEOs. Real names,
   real prices, real availability.
5. **Run-day execution.** A **run-of-show / cue sheet** the crew executes to the second, distinct from the
   public agenda. Show-calling ("standby… go"), live recovery, judgment calls.
6. **Close-out.** Final invoices reconciled against the baseline budget; variance *and its reason*
   captured; lessons retained.

The deep finding: **organizers already think in ALH's layers.** The abstract-before-real and
planning-before-execution separations are not ALH inventions — they are how good practitioners work. The
gap is that *software* historically refused to model those layers as distinct objects.

### How software models it (and the lineage that explains why)

Two distinct lineages produced today's "event object," and the split explains almost everything:

**Lineage A — Corporate MICE / strategic meetings management (1996–1999, B2B).** Passkey (1996,
hotel room-block tech), Cvent (1999, "online event registration"), StarCite (1999, SMM procurement),
etouches→Aventri→Stova (1998+), Certain. These systems grew up around **procurement and registration of
corporate meetings**. The "event" became a large, configurable, **mutable aggregate** that spans build-out,
registration, on-site, and reporting in *one record*. Cvent is the textbook case: Registration Types ×
Admission Items × Audience Segments, Sessions with tracks/rooms/speakers/per-session capacity, a persistent
**Contact** CRM object distinct from per-event registrants. Highly configurable; deeply conflated.

**Lineage B — Consumer self-serve ticketing (2006).** Eventbrite (Hartz/Hartz/Visage, March 2006) served
the long tail of small events the concert/sports incumbents ignored. Its schema is lean and **money-first**:
`Event → Order → Attendee`, plus `Ticket Class`, `Venue`, `Discount`, and custom `Question/Answer`. There
is a crisp explicit state machine — `draft → live → started → ended → completed` (+ `canceled`) — with a
**separate publish call** to go from draft to live. But there is essentially **no native session / track /
speaker model** — it is a transaction ledger, not a program builder.

**A third tradition — venue/hospitality (Tripleseat, Social Tables).** Here the root object is a **Booking**
tied to a space, with a **BEO** ("Living BEO"), floor plans / seating charts, proposals, contracts, and
invoicing. No registration at all — the event *is* a function on a venue calendar.

**RainFocus / Bizzabo (enterprise mega-conference)** push furthest toward CRM-forward identity: a **Global
Attendee Profile** that persists *above* the event, consolidating every registration, session, meeting, and
exhibitor interaction across a portfolio.

> Uncertainty flags carried from research: Cvent/Eventbrite developer docs are JS-rendered, so some Cvent
> specifics (exact status enum names, promo-code object naming) come from support-article summaries, not
> verbatim schema. No authoritative public DB schemas exist for Whova, Hopin, or Splash — those are
> characterized at feature level only. Conflict-detection internals (double-booked rooms/speakers) are
> *implied* by per-slot/per-room assignment but the algorithms are unconfirmed. The BEO's historical
> origin date is unsourced. Theatre's "Go is the only cue word" and warn/standby equivalence are
> practitioner conventions, not codified standards.

---

## 2. The "event" object and its lifecycle — the central engineering question

### What an "event" object *is*, by lineage

| Lineage | Root object | Key children | Lifecycle spans |
|---|---|---|---|
| Corporate MICE (Cvent, Stova) | **Event** (one big aggregate) | Sessions/tracks/rooms/speakers, Registration Types, Admission Items, Segments, Contacts, Invitees | build-out → registration → on-site → reporting, **all in one mutable record** |
| Consumer ticketing (Eventbrite) | **Event** + **Order** ledger | Ticket Class, Attendee, Venue, Discount, Question | `draft→live→started→ended→completed`; planning is thin |
| Venue/hospitality (Tripleseat, Social Tables) | **Booking** on a space | BEO, floor plan, contract, invoice | lead → proposal → signed BEO → service → invoice |
| Enterprise conference (RainFocus, Bizzabo) | **Global Attendee Profile** above events | per-event registration, sessions, meetings | identity persists across the whole portfolio |

### The lifecycle conflation problem (the heart of it)

In the corporate-MICE model the **same Event record** is edited through planning, opened for registration,
run on-site, and archived. That means:

- **Meaning, plan, prep, sourcing, and execution share one mutable object.** There is no clean line where
  "what we want" ends and "what's required" begins, nor where "the plan" ends and "the real bookings"
  begin. Real dates and real vendors are demanded *at creation time* — you cannot model "a venue of roughly
  this size" without picking one.
- **Immutability is impossible.** Because the record is mutable end-to-end, there is no immutable upstream
  artifact; the plan and the execution corrupt each other. A late venue change silently rewrites the
  "plan," and there is no preserved baseline to reconcile against.
- **Premature structure.** The object forces a template (registration form, sessions, ticket types) before
  the organizer has decided what the event *means*.

Eventbrite is *cleaner* on lifecycle (explicit enum, publish gate) precisely because it does **less** — it
only models the ticketing slice and refuses the planning/execution layers. That is an instructive trade:
**a narrow object with a crisp state machine beats a broad object with a mutable blob.**

### How ALH compares — and why it is structurally stronger

ALH does not have *an* event object. It has a **chain of single-responsibility artifacts with immutable
handoffs**:

- **FED (M1 output)** is the *meaning* — approved, implementation-independent. No platform has this. Cvent's
  "event" starts at registration config; Eventbrite's starts at a ticket. ALH alone gives meaning its own
  immutable home, so later structure can never silently overwrite intent.
- **IR (M2 output)** is the *abstract plan* — abstract needs, **relative** timeline, cost **estimate**, no
  real vendors/dates/payments. This is exactly the layer experienced planners hold in their heads and that
  *no* event platform models as a first-class object. Cvent forces real venues; Eventbrite forces real
  prices and a real on-sale date. ALH's "abstract-before-real" is its sharpest structural advantage.
- **Project (M3)** is *immutable structure* — the thing the MICE model can never produce because its event
  is mutable end-to-end.
- **Workspace (M4)** is the *stateful prep cockpit* — the layer that maps directly to the planner's
  "working prep." ALH already models statuses/checklists/notes/decisions/comms here, and crucially **keeps
  it separate from the immutable plan above and the real sourcing below.**
- **Marketplace (M5)** is where *real* vendors finally enter — deliberately downstream of the abstract plan.
- **Execution (M6)** is run-day, separate again.

ALH's lifecycle (`Draft → Planning → Ready → Open → Registration Closed → In Progress → Completed →
Closed`, per `OPE_EVENT_LIFECYCLE.md`) with **freeze points** (safety + comms freeze at Ready; budget +
resources freeze at Registration Closed) is *more disciplined* than any surveyed platform: it converts a
live recomputable estimate into a committed plan in **stages**, and preserves a baseline to reconcile
actuals against at Closed. The MICE platforms have statuses but no freeze discipline and no immutable
baseline; the variance-vs-baseline rigor that good planners do *by hand in spreadsheets* is something ALH
encodes structurally.

**Verdict on the central question: ALH's meaning-first, abstract-before-real, planning-separate-from-
execution decomposition is genuinely stronger than the conflated mutable "event" object.** This is the
benchmark's clearest "ALH already superior" finding.

---

## 3. Where event platforms have hard-won engineering ALH should respect

The flip side: decades of event software have accumulated real operational engineering that ALH's docs
touch only lightly. These are the places to *learn from*, mapped to the owning module.

### 3a. Run-of-show / cue sheets → M6 (Execution)

This is the strongest piece of engineering the event world has that ALH under-specifies. A **run-of-show**
is the minute-by-minute master (segment, clock time, duration, owner, speaker, what-happens). A **cue
sheet** is the technical execution slice within it (audio/video/lighting/graphics triggers, version-
numbered because changes are constant). The lineage is deep: theatre's **prompt book** with strict
**"standby… go"** calling convention (Go being the only word permitted to fire a cue), and broadcast's
**rundown** with second-level timing and **back-timing** (counting backward from a fixed end). The modern
corporate ROS is the convergence of both.

Two engineering lessons ALH's M6 should absorb:

- **Run-of-show ≠ public agenda.** The agenda is what attendees see (M2/M4-level structure). The ROS is
  what the *crew executes*, including non-public cues, transitions, buffers, and **contingencies as if/then
  logic** ("IF CEO delayed → move Panel B up, trigger sponsor loop"). ALH's M6 needs an internal run-day
  artifact distinct from the participant-facing schedule.
- **Time-coded, owner-tagged, version-controlled rows** are the universal shape. ALH's deterministic
  *relative* timeline (M2) is a natural seed for an *absolute* time-coded ROS that M6 materializes on
  run-day from real (M5) dates — abstract relative timeline → concrete cue sheet is a clean module handoff.

> Caution from research: software has *repeatedly failed* to displace the spreadsheet here (Shoflo/Lasso,
> Rundown Studio, Stagetimer exist but Excel dominates). The reasons — speed, flexibility, universality,
> offline reliability, and the need to *bend to each shop's process rather than impose a template* — are a
> direct warning to ALH: a rigid ROS template will be abandoned. Model the *structure* (time/owner/cue/
> contingency) but keep it editable and exportable; do not force premature rigidity.

### 3b. Logistics tracking → M4 (planning prep) and M6 (run-day)

Real logistics: **production schedule** (load-in/technical install/rehearsal/show/turn/load-out in strict
dependency order — perishables last), **production book** (often *printed* for offline day-of reference),
vendor arrival, deliveries, room sets, rentals. Planning-phase tracking lives in Trello/monday/Asana/
Sheets; granular day-of freight/dock/room-turn tracking stays in spreadsheets and printed books.

Mapping: dependency-ordered logistics *planning* (load-in sequence, owner, deadline) belongs in **M4** as
checklist/decision state; the *day-of physical tracking* (vendor arrived, equipment in, room set) belongs
in **M6**. ALH's M4 already has checklists/statuses/attachments — the gap is the **dependency-ordered
logistics timeline** as a recognized prep artifact (load-in is not just "a task," it is a sequenced
critical path).

### 3c. Vendor / supplier coordination → M5 (Resource Marketplace)

Hard-won mechanics: the **Cvent Supplier Network** RFP model (one RFP → many venues, in-thread comms, bid
comparison exportable), **COIs** (Certificate of Insurance — vendor's insurer names planner/venue as
"additional insured"; deadlines 7–30 days out; late COI → work stoppage), preferred-vendor lists, deposits.
This maps cleanly to **M5**. ALH's `RESOURCE_MARKET_ARCHITECTURE` / `VENDOR_NETWORK_ARCHITECTURE` already
own RFP-style sourcing and trust/verification; the specific artifacts worth adopting are **COI/compliance
tracking** (a verify-don't-trust fit) and **bid-comparison-as-data**. Note ALH's deliberate "no first-click
race, no auction" stance (`EVENT_REQUEST_MARKET_ARCHITECTURE`) is a *better* posture than lead-sale
marketplaces — credit ALH here.

### 3d. BEO (Banquet Event Order) → M5 → M6 bridge

The BEO is the venue's **execution contract**: signed, binding, the single document every operational
department (kitchen, servers, AV, setup) works from on event day. Contents: guaranteed count, menu in
serving order, service times, room set diagram, staffing counts, per-item pricing, deposit/payment terms,
signature. The **guaranteed count** mechanic (final headcount ~72h out; billed on guarantee *or* actual,
whichever greater) is exactly ALH's **Registration Closed freeze point** in another industry's vocabulary —
strong corroboration that ALH's freeze-at-final-count design is correct.

Mapping: the BEO is the artifact at the **M5→M6 seam** — it is real (M5: real vendor, real count, real
price) *and* it is the run-day operational contract (M6 reads it). ALH lacks an explicit "execution
contract" object that consolidates the confirmed real sourcing into a single day-of operational sheet per
vendor/venue. Worth investigating as an M5-produced, M6-consumed artifact.

### 3e. Budgeting (estimate → committed → actual) → M2 (estimate) + M4 (committed) + M8 (actual)

The **3-column budget** (Estimated → Committed/contracted → Actual + Variance), **10–20% visible
contingency**, F&B mechanics (guarantee ~80–90%, service charge ~22–26% + tax, attrition clauses), and
post-event reconciliation that records variance *and its reason* **without overwriting the baseline**.

This maps *beautifully* onto ALH's existing design and largely **validates it**: M2 produces the
**estimate** (low/likely/high bands), M4 tracks the **committed** state as real prices come in from M5, and
M8 reconciles **actuals** against the frozen baseline — exactly the "never overwrite the approved baseline"
discipline ALH already enforces via freeze points and `OPE_LEARNING_ARCHITECTURE`'s asymmetric corrections.
The one idea to *adopt explicitly*: **visible contingency reserve** as a first-class budget line (M2/M4),
and **variance-with-reason** at M8 (which the learning architecture wants anyway as a signal).

### 3f. Attendee / guest modeling → *where?* (the open question)

This is the modeling question the prompt flags. The lineages diverge:

- Corporate/enterprise (Cvent, RainFocus): a **persistent Contact / Global Attendee Profile** distinct from
  per-event registration. Durable identity above the event.
- Consumer (Eventbrite): the **Attendee is a child of an Order** — a transaction line-item, weak durable
  identity.

ALH's lifecycle already names *participants* who register/RSVP (no payments in scope) and tracks
capacity/headcount/no-show at the lifecycle level. But **where does the attendee/guest object live across
modules?** It is upstream-abstract at M2 (an *abstract count* — "~30 guests," never real people), becomes
**real at M5/M6** (actual RSVPs, check-in, attendance actuals at M7). The clean ALH answer, consistent with
abstract-before-real: **headcount is an abstract input at M2/M3; real attendees/guests are M5/M6 objects;
attendance actuals are M7.** A persistent cross-event *participant identity* (the Cvent Contact / RainFocus
profile idea) has **no current home** — it is arguably a platform-identity concern, not a pipeline-module
concern, and should be flagged as INVESTIGATE rather than forced into a module. This is the one place the
prompt's "attendee modeling → where?" question does not resolve cleanly to a single M-module.

---

## 4. Extraction matrix

| Idea | Problem it solves | Origin | Universal? | ALH today | Owning module | Verdict |
|---|---|---|---|---|---|---|
| Event as one mutable aggregate (planning+reg+exec) | Single place to manage everything | Corporate MICE, Cvent 1999 | No — anti-pattern | Deliberately decomposed into FED/IR/Project/Workspace | n/a (rejected pattern) | **ALREADY SOLVED BETTER** — ALH's separation beats the blob |
| Explicit lifecycle state machine + publish gate | Know what state an event is in; gate going live | Eventbrite 2006 (`draft→live→…`) | Yes | `Draft→Planning→Ready→Open→…→Closed` with freeze points | M1–M8 spine | **ALREADY SOLVED BETTER** — ALH adds freeze discipline + immutable baseline |
| Abstract plan before real vendors/dates | Reason about requirements without premature commitment | Practitioner habit; *no* platform models it | Yes | IR = abstract needs, relative timeline, cost estimate | M2 | **ALREADY SOLVED BETTER** — ALH's signature advantage |
| Meaning/brief as a first-class artifact | Protect intent from premature structure | Practitioner habit; *no* platform models it | Yes | FED = approved meaning | M1 | **ALREADY SOLVED BETTER** |
| Run-of-show / cue sheet (time-coded, owner-tagged, versioned, contingencies) | Execute a show to the second; crew coordination | Theatre prompt book + broadcast rundown | Yes (any timed delivery) | Under-specified; M4 mentions "run-of-show" but no model | **M6** (seeded by M2 relative timeline) | **ADOPT** — model structure, keep editable/exportable; avoid rigid template |
| Run-of-show ≠ public agenda (internal cues vs attendee view) | Separate crew execution from participant view | Live production | Yes | Not modeled distinctly | **M6** vs M2/M4 | **ADOPT** |
| Dependency-ordered logistics timeline (load-in/out critical path) | Sequence physical setup correctly | Production scheduling | Yes (physical events) | M4 has checklists but not sequenced critical path | **M4** (plan) + **M6** (day-of) | **INVESTIGATE FURTHER** |
| RFP / supplier network + bid comparison | Source vendors at scale, compare offers | Cvent Supplier Network; StarCite SMM | Yes | Resource Market / Vendor Network own this | **M5** | **ALREADY SOLVED** (ALH posture better: no auction/lead-sale) |
| COI / compliance tracking (additional insured, deadlines) | Risk transfer; gate vendor work | Insurance/venue practice | Yes (real vendors) | Not explicit | **M5** | **ADOPT** — fits verify-don't-trust |
| BEO / execution contract (consolidated day-of operational sheet) | One binding doc every dept executes | Hotel/banquet F&B | Yes (catered/venued events) | No explicit M5→M6 execution-contract object | **M5→M6 seam** | **INVESTIGATE FURTHER** |
| Guaranteed count (final headcount ~72h out, bill on guarantee-or-actual) | Freeze count to size resources/cost | Hotel/catering | Yes | **Registration Closed freeze point** already does this | M4→M5 (freeze) | **ALREADY SOLVED** — strong corroboration of ALH design |
| 3-column budget (Estimated→Committed→Actual + Variance) | Track money across commitment stages | Event finance practice | Yes | M2 estimate, M4 committed, M8 actual — largely present | **M2 + M4 + M8** | **ALREADY SOLVED** (mostly) |
| Visible contingency reserve (10–20%) | Absorb unknowns honestly | Event finance practice | Yes | Not explicit as a line | **M2/M4** | **ADOPT** — small, high-value |
| Variance-with-reason at reconciliation (never overwrite baseline) | Learn from estimate vs actual | Event finance practice | Yes | `OPE_LEARNING_ARCHITECTURE` asymmetric corrections + Closed | **M8** | **ALREADY SOLVED** |
| Persistent Contact / Global Attendee Profile (cross-event identity) | Durable person identity across events | Cvent Contact; RainFocus | Partly (large orgs) | Participants modeled per-event; no cross-event identity object | nowhere clean (platform identity?) | **INVESTIGATE FURTHER** — don't force into a module |
| Abstract headcount upstream, real attendees downstream | Don't bind to real people while planning | ALH design | Yes | M2 abstract count; M5/M6 real; M7 actuals | **M2→M5/M6→M7** | **ALREADY SOLVED BETTER** |
| Sessions/tracks/rooms/speakers with conflict detection | Build a multi-track conference program | Cvent/RainFocus | Partly (conferences only) | Not modeled (ALH not conference-program-centric) | M2/M3 (structure) if needed | **INVESTIGATE FURTHER** — niche; only if conferences become a pattern |
| Order-centric ticketing ledger (Event→Order→Attendee) | Sell tickets, track money | Eventbrite 2006 | Partly (paid public events) | Bookings/payments exist separately; no payments in M2 | M5/payments | **INVESTIGATE FURTHER** — keep out of upstream modules |

---

## 5. Where software gets in the way

The recurring failure modes — each is an argument *for* ALH's decomposition:

1. **Forcing real dates and real vendors too early.** Cvent's event cannot exist without a venue;
   Eventbrite's without a price and on-sale date. This destroys the abstract-plan layer that good planners
   rely on. **ALH avoids this by construction** (M2 is abstract; reals enter at M5).
2. **One mutable record corrupting the plan with execution edits.** No baseline survives; a late change
   silently rewrites "the plan." **ALH's immutable IR/Project + freeze points fix this.**
3. **Rigid templates that won't bend to a shop's process.** The single biggest reason run-of-show software
   keeps losing to spreadsheets. Warning to ALH's future M6: model structure, not a straitjacket; keep it
   editable and exportable.
4. **Premature structure over meaning.** The registration form / ticket type / session grid appears before
   the organizer has decided what the event *is*. **ALH's FED-first design refuses this.**
5. **Conflating the public agenda with the internal run-of-show.** Platforms that expose one schedule force
   crew cues and contingencies into the same object attendees see — or, more often, simply don't model the
   crew layer at all, pushing it back to spreadsheets.
6. **Cloud tools that fail offline on event day.** Widely cited (flagged as soft in research) reason crews
   distrust day-of software and print production books. A real constraint for any M6 design.

---

## 6. Challenges to conventional wisdom

- **"A unified all-in-one event platform is the goal."** Challenge: the all-in-one (Cvent) *is* the
  conflated-mutable-blob anti-pattern. Eventbrite is cleaner precisely because it does **less**. ALH's
  modular pipeline says the right unification is **at the interface level (clear handoffs), not the object
  level (one record)**. The benchmark supports ALH.
- **"The event object should hold real dates/vendors from the start — that's just being concrete."**
  Challenge: concreteness too early is a *cost*, not a virtue. The most valuable planning happens in the
  abstract layer that real-data-first software cannot represent. Abstract-before-real is an engineering
  discipline, not a limitation.
- **"Run-of-show is a solved problem — there are tools."** Challenge: it is *not* solved; spreadsheets keep
  winning because the tools impose templates and fail offline. The unsolved problem is a run-of-show model
  that is structured *and* flexible *and* offline-robust. Open opportunity for ALH M6 — but only if it
  resists rigidity.
- **"Attendee = a row in the event."** Challenge: the consumer-ticketing collapse of person-into-order
  loses durable identity; the corporate split of Contact-from-registration is heavier but *more correct*.
  ALH's abstract-count-upstream / real-attendee-downstream split is a third, arguably cleaner answer — but
  the cross-event *identity* question genuinely has no clean module home and should not be forced into one.
- **"Freeze points / guaranteed counts are an ALH novelty."** Challenge (in ALH's favor, with humility):
  the hotel industry's **guaranteed count** is the same idea decades earlier. ALH didn't invent
  freeze-at-final-count — it *generalized* it correctly. Credit the convergence, don't claim originality.

---

## 7. Top ideas for ALH (ranked, module + verdict)

Ranked by value-to-ALH given the modules it lacks engineering for:

1. **Run-of-show / cue-sheet model for M6** — time-coded, owner-tagged, version-controlled rows, with
   **internal cues + contingencies distinct from the public agenda**, materialized on run-day from the
   M2 relative timeline + real M5 dates. **Module: M6.** Verdict: **ADOPT** (model structure; keep editable/
   exportable/offline-robust — do *not* ship a rigid template).
2. **BEO-style execution contract at the M5→M6 seam** — a consolidated, confirmed-real, per-vendor day-of
   operational sheet that M5 produces and M6 executes against. **Module: M5→M6.** Verdict: **INVESTIGATE
   FURTHER** (high value; needs a clean single-owner definition before building).
3. **COI / vendor compliance tracking** — additional-insured, deadlines, work-stoppage gating; a natural
   verify-don't-trust fit. **Module: M5.** Verdict: **ADOPT** (small, well-scoped).
4. **Dependency-ordered logistics timeline (load-in/out critical path)** as a recognized M4 prep artifact
   (sequenced, owner-tagged) feeding M6 day-of physical tracking. **Module: M4 + M6.** Verdict:
   **INVESTIGATE FURTHER**.
5. **Visible contingency reserve (10–20%) as a first-class budget line** + **variance-with-reason** at
   close-out. **Module: M2/M4 estimate, M8 reconciliation.** Verdict: **ADOPT** (cheap; the learning
   architecture wants the variance signal anyway).
6. **Cross-event participant identity (Contact / Global Attendee Profile)** — durable identity above the
   per-event participant. **Module: nowhere clean — platform identity, not a pipeline module.** Verdict:
   **INVESTIGATE FURTHER** (do not force into M1–M8).

**Everything else is ALREADY SOLVED (BETTER) by ALH:** the conflated mutable event object → ALH's
single-responsibility chain; explicit lifecycle → ALH's lifecycle + freeze points + immutable baseline;
abstract-before-real → IR; meaning-first → FED; guaranteed count → Registration Closed freeze; 3-column
budget → M2/M4/M8; no-auction sourcing posture → Event Request Market. The benchmark's headline conclusion:
**ALH's meaning → abstract → prep → real → run-day decomposition is structurally stronger than every
surveyed platform's conflated mutable "event" object — and the genuine gaps are all in run-day execution
(M6) and the M5→M6 hand-off, exactly where event software's hard-won production engineering still lives.**

---

_Research and writing only. No code, schema, API, or architecture redesign. ALH module boundaries (M1–M8)
taken as fixed and mapped onto, never modified. Uncertainty flagged inline; concrete systems cited where
confident; specifics not fabricated._
