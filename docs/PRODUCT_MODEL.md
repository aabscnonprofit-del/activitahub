# ActivLife Hub — Product Model

---

⚠️ Historical / Supporting Document

The current product definition is:

docs/ACTIVLIFE_HUB_PRODUCT_CANON.md

This document remains for historical context,
additional detail,
or implementation guidance.

If any statement conflicts with the Product Canon,
the Product Canon is authoritative.

---

> **Status: Product Model (user's point of view).** This is **not** an architecture document. It explains
> the product as the people who use it experience it. It is **consolidated only** from five source
> documents — `WHY_ACTIVLIFE_HUB_EXISTS.md` `[WHY]`, `ACTIVLIFE_HUB_CORE_MISSION.md` `[MISSION]`,
> `ALH_PRODUCT_PHILOSOPHY.md` `[PHIL]`, `OPE_AI_ORGANIZER_ARCHITECTURE_V1.md` `[AIORG]`,
> `GLOBAL_PRODUCT_SPECIFICATION.md` `[GLOBAL]` — and adds nothing not stated there. Where those documents
> do not define something, it says **"Not currently defined."** On any conflict, the Constitution
> (`ALH_PRODUCT_PHILOSOPHY.md`) wins `[PHIL]`.
>
> **Update (PM1):** This document now also integrates **approved product decisions made *after* the source
> documents were written**. Those additions are tagged **[Approved decision]** and are canonical parts of the
> Product Model; the original five-source consolidation (with its `[SOURCE]` tags) is unchanged.

---

## 1. Why ActivLife Hub exists

Technology should help people spend more time together **in the real world** `[PHIL §1]`. A good life is
an **active** life, and the real bottleneck to more of it "is not demand but **organizers**" — activities
do not occur naturally at scale; they are *produced*, and the producer is the organizer `[WHY]`. So the
platform's purpose is narrow: **create more organizers, and make the ones who exist more capable** `[WHY]`.

Concretely, ActivLife Hub exists to **remove the human as the operational bottleneck** — to let one
organizer run events whose complexity would normally require a team `[MISSION §1]`. Organizers "manufacture
occasions," and by increasing their number and capability the platform attacks loneliness and inactivity at
their shared root `[WHY]`.

## 2. What people actually buy

At the product level the documents describe what is sold as follows `[GLOBAL §9]`:

- **A consumer One Event License** for the standalone Planner.
- **Certification-gated organizer access** — a paid subscription unlocked after academy certification.
- **A marketplace** connecting participants to certified organizers.
- Vendors/workers are **coordinated, not resold** `[GLOBAL §9]`.

What they are *really* buying, in the product's own terms, is the **inversion of the work**: "the system
does the operational work; the human directs it" `[MISSION §0]` — i.e. AI as the organizer's **operational
team** that does the design and operations work so the organizer reviews and directs rather than invents
`[MISSION §5–6]`.

**Specific prices/amounts:** *Not currently defined* in these five documents (the One Event License and the
subscription are named but not priced here; pricing detail lives in `BUSINESS_MODEL_AND_MONETIZATION.md` and
`MASTER_PRODUCT_DECISIONS.md`, referenced by `[GLOBAL §9]`).

## 3. Who the users are

- **Primary — the independent organizer:** a single person or small company who **personally creates and
  runs activities** `[MISSION §3]` `[GLOBAL §2]`. They are "the person whose name is on the event, who feels
  the stress at 2 a.m." `[MISSION §3]`. The documents describe **two doors into this role**: a path *in* for
  newcomers entering the profession, and *power tools* for organizers already doing the work `[WHY]`.
- **Secondary — the participant / client** who joins an activity `[GLOBAL §2]`.
- **Secondary — the vendors / workers** an organizer coordinates `[GLOBAL §2]`.

**[Approved decision] Two equal user journeys.** People arrive in ActivLife Hub in two equally important,
**first-class** ways: **Journey A** — *"I want to organize something"* — and **Journey B** — *"I want to find
something interesting to participate in."* **Neither journey is secondary.** This elevates the participant's
"find something to do" path above the "secondary" framing recorded above: it is a co-equal, first-class
product experience, not a lesser one.

## 4. What kinds of activities exist in the system

The product is **not organized around a fixed category catalog**; it treats *idea → activity* as the core
transformation and plans from **what should happen**, not from a templated type `[WHY]` `[MISSION §0/§5]`.

The activities named as examples across the documents: a child's birthday party, beach yoga, a picnic, a
city walk, a workshop, a wedding, a conference `[MISSION §3]` `[GLOBAL §2]`; and a hike, a pottery class, a
neighborhood soccer game, a weekend trip, a class, a club, a trip `[WHY]`.

A **formal taxonomy / enumerated set of activity kinds:** *Not currently defined* in these five documents.

**[Approved decision] Real activities surfaced in the Activities Marketplace.** The platform lists real
activities people can find and join — for example: yoga, beach yoga, running groups, neighborhood gatherings,
BBQs, dog walks, workshops, concerts, children's activities, birthday parties, conferences, community events,
and every other real-world activity. These are examples of activities people browse, not a closed taxonomy —
the platform still plans from *what should happen*, not a fixed category set (see Q8).

## 5. How a person goes from an idea to a real activity

From the organizer's point of view: **describe the idea → answer a couple of genuine questions → review the
event the system prepared → set the date → publish** `[GLOBAL §7]`. The smallest natural journey is *one
meaningful conversational decision → one review screen* `[GLOBAL §7]` `[PHIL §3–5]`.

Underneath, the documents describe the sequence as:

- Every request first meets the **AI Organizer**, which **understands the person, then decides** a single
  **verdict** (`discovery_required`, `interpretation_required`, `sufficient_data`, `plan_ready`,
  `infeasible`, `out_of_scope`) `[AIORG §3/§7]`.
- If meaning is unclear, the Organizer opens a **discovery conversation** with real questions and
  re-evaluates with the answers `[AIORG §12]`.
- Planning is gated on an approved **"what should happen" (WSH)**: *no plan before an approved WSH*, and the
  engine "refuses to plan before that exists" `[AIORG §10]` `[WHY]`.
- Only then does the **deterministic planner** produce the plan `[AIORG §11]`.
- The product-level pipeline: `Client → Discovery / OPE → Project (Root) → Planner / Budget → Occurrence →
  Publish → Public Space → Registration → Payment` `[GLOBAL §8]`.

**[Approved decision] This is Journey A.** The "idea → activity" path above is **Journey A** ("I want to
organize something"). It is matched by an equally first-class **Journey B** ("I want to find something
interesting to participate in"), which begins in the Activities Marketplace (see Q3, Q8, Q10).

**[Approved decision] Discovery adapts to the person.** Discovery is adaptive and **never asks unnecessary
questions**: if the user already knows exactly what they want, Discovery asks as few questions as possible;
if the user only knows the desired feeling, goal, experience, or outcome, Discovery becomes a conversational
AI process until the future activity is understood well enough.

## 6. How AI helps

AI is the **operational team** `[MISSION §6]`. It:

- understands the request and asks the clarifying questions a good coordinator would `[MISSION §6]` `[AIORG §4]`;
- infers the real objective behind the words, including for vague/emotional requests `[MISSION §6]` `[AIORG §4]`;
- generates the event concept; decomposes it into delivery components, resource needs, role needs, and work
  packages; assembles the executable project and the budget; prepares the organizer's workspace `[MISSION §6]`.

Two hard rules govern it: **"AI works, human decides"** — the organizer is "never a data-entry operator" and
is shown work already done to approve/adjust `[PHIL §7]`; and **AI proposes, never fabricates** and **never
makes commitments** — "AI does the *work*, not the *commitments*" `[MISSION §6]` `[AIORG §4/§13]`. The AI
Organizer is "the first and only layer allowed to judge a request's meaning and readiness"; everything
deterministic is downstream of its verdict, and if AI is unavailable the system **fails safe to discovery**,
never guessing a plan `[AIORG §2/§9.1]`.

**[Approved decision] Adaptive discovery.** The AI's discovery is adaptive — minimal questions when the user
already knows what they want, a fuller conversational process when the user knows only the desired feeling,
goal, experience, or outcome — and it never asks unnecessary questions (see Q5).

## 7. Why Project exists

So the organizer "has **one place that *is* the event**, instead of carrying its state in their head and
across a dozen tools" `[MISSION §9]`. At the product level the Project is the **Root Entity — one durable
engagement ("the event")** that owns everything realized `[GLOBAL §6]`.

Crucially, Project is **invisible architecture**: the organizer never sees the word "Project" (or
Occurrence, Registration, Budget, Public Space) — they think in terms of *their idea*, *their event*, and
*the date* `[PHIL §6]` `[GLOBAL §5]`.

**[Approved decision] Project is the digital life of the activity.** The Project is much more than an internal
entity — it is the **digital representation of the activity throughout its entire life**. **Before** the
activity it contains preparation, communication, invitations, reminders, notifications, documents, payments,
participant management, and organizer coordination. **During** the activity it becomes the **operational
center**. (What it holds **after** the activity is covered in Q12.)

## 8. How the Marketplace fits into the product

The documents describe the marketplace in two product roles, and state plainly that **the marketplace is a
*module*, not the product** — "It is **not** … a marketplace … those are *modules*" `[GLOBAL §4]`:

- **Sourcing supply for the organizer:** "so the organizer doesn't have to find, contact, and chase vendors
  one by one; it sources external supply against real needs" `[MISSION §9]` — part of the broader **ecosystem
  of supply** (workers, vendors, rentals, resources) that lets a plan actually be resourced into happening
  `[WHY]`.
- **Connecting demand to organizers:** "a marketplace connecting participants to certified organizers"
  `[GLOBAL §9]`.

**[Approved decision] The Marketplace is also a marketplace of real activities.** It is **not only** a
marketplace of vendors and workers — it is **also a marketplace of real activities** people can find and join
(yoga, beach yoga, running groups, neighborhood gatherings, BBQs, dog walks, workshops, concerts, children's
activities, birthday parties, conferences, community events, and every other real-world activity). This
activities marketplace is **one of the primary entry points into ActivLife Hub**: a person may simply want to
**find something interesting to do** (Journey B — see Q3, Q10).

Detailed marketplace mechanics beyond these statements: *Not currently defined* in these five documents.

## 9. What organizers see

The organizer sees **their idea, their event, and the date** — never the internal vocabulary `[PHIL §6]`.
Their experience is **conversation-first**: they describe what they want and the product understands and
responds; a screen appears **only** to compare, choose, confirm, visualize, or pay — never to gather data
`[PHIL §4–5]`. They are presented with work the AI has already done and asked only to **decide** `[PHIL §7]`.

Their role is **director, not producer** — judgment ("is this the right event for this client?"), approval,
taste and relationships, and final accountability `[MISSION §7]`. The **Organizer Workspace** exists "so the
organizer supervises and decides from a single cockpit instead of operating every detail manually"
`[MISSION §9]`. In the journey they: describe the idea → answer a couple of genuine questions → review the
prepared event → set the date → publish `[GLOBAL §7]`.

## 10. What participants see

The documents state that the **participant/client** is who *joins* an activity `[GLOBAL §2]`, and that the
**Public Space** is "the read-only public projection of a published Project" through which, in the pipeline,
participants reach **Registration → Payment** (per-Occurrence sign-up + payment) `[GLOBAL §6/§8]`.

**[Approved decision] Finding something to do is a first-class entry (Journey B).** A participant may arrive
simply wanting to **find something interesting to participate in**. Browsing the Activities Marketplace of
real activities (see Q8) is **one of the primary entry points into ActivLife Hub**, co-equal with the
organizer's journey (Q3). The detailed post-discovery participant experience remains as noted below.

Beyond "participants discover/join a published activity's Public Space and register/pay per occurrence" — and
noting `[GLOBAL §6]` records Registration/Payment as **not yet built** — the detailed participant-facing
experience is **Not currently defined** in these five documents.

## 11. What vendors / workers see

The documents state that vendors/workers are people the organizer **coordinates** `[MISSION §3]` `[GLOBAL §2]`
and are **"coordinated, not resold"** `[GLOBAL §9]`; they are part of the **ecosystem of supply** — workers
who staff an event, vendors who provide goods and services, rentals for venues and equipment `[WHY]`.

A dedicated vendor/worker-facing **view or experience** (what they see/do in the product): **Not currently
defined** in these five documents.

## 12. How a completed Project continues to exist after the activity

The documents establish that the Project is the **one durable engagement** that **owns everything realized —
including history** `[GLOBAL §6]`, and is "one place that *is* the event" rather than state scattered across
tools `[MISSION §9]`.

How a Project specifically **continues, archives, or is reused after the activity has happened** was **Not
currently defined** in these five documents — and is now **defined by approved product decision** below.

**[Approved decision] The Project continues after completion.** Completion of an activity is **not the end of
a Project**. After the activity the Project continues to exist and stores: **photos, videos, history,
memories, documents, changes, outcomes, and feedback**. It remains available as **history, memories, media,
documents, a communication archive, a reusable template, and knowledge for future activities** — and a
completed Project can later become the **starting point for creating similar activities**.

## 13. How success of ActivLife Hub is measured

Success is measured by **the number of real activities the platform brings into the world** — and, through
them, the people moved out of passivity and isolation. It is **explicitly not** measured by fees collected
from organizers, and "when the two ever conflict — and they will — the count of real activities wins"
`[WHY]`.

Consistently: success is "measured by **real gatherings that happen**, not by time spent in the app"
`[GLOBAL §1]`; the product optimizes for people who "**close the app and go meet real people**," not for
sessions, streaks, or attention `[PHIL §1/§9]`; and at the feature level value is measured in **work removed
from the human**, not features added to the screen `[MISSION §8]`.

## Product principles (approved decisions)

These are approved decisions about **how the product is built and grown**. They govern every future feature,
workflow, entity, screen, module, AI agent, and document.

- **[Approved decision] Competition First Principle.** Before introducing any significant capability, study
  how leading products solve the same problem. Reuse proven approaches whenever appropriate. Invent something
  new only when it clearly produces a better product.
- **[Approved decision] Value First Principle.** Nothing is added to ActivLife Hub unless it clearly improves
  the product. Every feature, workflow, entity, screen, module, AI agent, or document must provide measurable
  value — otherwise it should not exist.
- **[Approved decision] HoneyBook Principle.** ActivLife Hub must eventually provide **everything an
  independent organizer needs to operate their business**, so the organizer does not need external software to
  run an event business. Where HoneyBook provides organizer-business functionality that supports the organizer
  journey, ActivLife Hub should eventually provide an equivalent or better capability. **However, ActivLife
  Hub is not a HoneyBook clone:** organizer-business functionality exists **only** because it supports the
  organizer's journey from idea to completed real-world activity.

---

*Consolidated from `WHY_ACTIVLIFE_HUB_EXISTS.md`, `ACTIVLIFE_HUB_CORE_MISSION.md`, `ALH_PRODUCT_PHILOSOPHY.md`,
`OPE_AI_ORGANIZER_ARCHITECTURE_V1.md`, and `GLOBAL_PRODUCT_SPECIFICATION.md`. Nothing was invented; gaps are
marked "Not currently defined." This document explains the product from the user's point of view; for the
technical architecture see `architecture/SYSTEM_ARCHITECTURE.md`.*
