# Organizer Business Workspace — Architecture Proposal

> **Status: PROPOSAL — under evaluation. NOT part of the Product Canon.**
> Designs the **Organizer Business Workspace** from the accepted operational research ("what an organizer
> uses every day, even when no event is happening today"). Consistent with `ACTIVLIFE_HUB_PRODUCT_CANON.md`
> (§13 Workspace, §22 Organizer Business System, §4 Project, §9/§21 AI Organizer, §7, §15, §23, §26–§27),
> `PROJECT_RUNTIME_SPEC.md`, and `PROJECT_ASSEMBLY_ENGINE_SPEC.md` — but changes none of them. Adoption
> requires an explicit decision; only then would the "Promotion recommendations" move into the Canon.
> Product-level design — no database, API, schema, or code.

---

## 1. Why this exists

The Living Project is the center of ActivLife Hub, and the per-Project **Project Workspace** (the Canon
currently labels this the Organizer Workspace, §13) is the organizer's view of *one* activity. But a real organizer spends most of their day on work that
belongs to **no single activity**: answering new inquiries, chasing proposals, keeping clients warm,
scheduling consultations, watching the money across all their events. This is the layer HoneyBook, Dubsado,
and Bonsai are built around, and it is the thinnest part of ALH today (Canon §22 promises it; it is not yet
designed).

The **Organizer Business Workspace (OBW)** is that missing layer: the organizer's **business home** — the
place that represents the business *between and across* Projects.

## 2. Entities, workspaces, ownership, and the boundary

### The two root entities

ActivLife Hub has **exactly two durable business root entities**:

- **Organizer Business** — the organizer's business itself; the durable parent that exists between and across
  all their activities.
- **Project** — one activity; the durable root of one event (Canon §4). The **Living Project** is this
  entity, alive throughout its life.

**Nothing else becomes a root entity.** The Organizer Business Workspace is *not* a root entity, and it is
*not* a second Project.

### Their workspaces

Each entity is seen through a **workspace**. A **workspace is a user-facing projection of an entity — never
the entity itself.**

- **Organizer Business → Organizer Business Workspace** — the organizer's view of their business.
- **Project → Project Workspace** — the view of one activity. *(The Canon currently labels this the
  "Organizer Workspace," §13; this proposal uses **Project Workspace** as the architectural term to keep it
  distinct from the Organizer Business.)*

*(Shorthand: below, "OBW" refers to the Organizer Business layer; ownership statements always attribute to
the **Organizer Business entity**, which the OBW merely projects.)*

### Ownership (the entity owns; the workspace only projects)

**Organizer Business owns:** CRM · Leads · Clients · Stripe Connect · Subscription · Certification ·
Academy · Templates · Business Calendar · AI Business Coach · **Projects** — the portfolio: the Organizer
Business is the durable **parent** that holds all of the organizer's Projects, while each Project remains the
root of its own event.

**Project owns:** Runtime · Timeline · Budget · Participants · Vendors (the vendors engaged for that event) ·
Tasks · Registration · Public Space · Event History · Completed Project.

*(The reusable vendor/venue network and templates are business-level assets the Project **consumes** —
Group D; the vendors a Project **owns** are the ones engaged for that specific event.)*

### Workspace projections (who sees what)

- The **Organizer Business Workspace** is used **only by the organizer** — the business's private home.
- The **Project Workspace** has **different projections by role**, all views of the **same** Project:
  - **Organizer** — the full operational view;
  - **Client** — agreed scope, proposal, progress, deliverables;
  - **Participant** — the activity, updates, registration;
  - **Vendor** — their assignments and requirements;
  - **Worker** — their tasks, time, place, instructions.

Permissions create these views; they never create separate Projects (Canon §14–§16).

### The boundary rule

> **If the work belongs to one activity → the Project (its Living Project, Project Runtime, and Project
> Workspace). If the work spans Projects, precedes a Project, or concerns the organizer's business itself →
> the Organizer Business, seen through the Organizer Business Workspace.**

| | Project (via Project Workspace) | Organizer Business (via Organizer Business Workspace) |
|---|---|---|
| **Scope** | One activity | The whole business, across all activities |
| **Lifespan** | The life of one Project (Canon §4) | The life of the organizer's business |
| **The entity owns** | this event's scope, budget, tasks, timeline, execution, participants | only cross-Project assets (CRM, leads, clients, templates, …); no single event |
| **Question it answers** | "What's happening with *this* event?" | "How is my *business* doing, and what needs me today — even with no event today?" |

The Organizer Business is **not a second Project**. It never re-owns a Project's internals; it **references
and rolls up**. When a lead becomes real, a **Project is born** (Assembly), and the detailed work moves
*into* the Living Project. The Organizer Business keeps the funnel, the clients, the money view, the reusable
assets, and the business's own schedule.

## 3. How the AI Organizer spans both

There is **exactly one AI — the AI Organizer** — and it is the single primary interface across **both**
entities (Canon §9, §21). It works with the Organizer Business and with every Project. **No separate
"Business AI" exists;** business capabilities such as the AI Business Coach are facets of the one AI
Organizer, not a second interface.

In the Organizer Business it *runs the business layer*: triaging inquiries, drafting proposals and
follow-ups, proposing consultation times, surfacing "3 leads waiting, 2 proposals unsigned, this month's
revenue and what needs you." It is the same "AI works, human decides" — the human still authorizes every
commitment (Canon §15). The Organizer Business Workspace is where the AI Organizer surfaces **business-level
attention**, just as the Project Workspace surfaces per-Project attention (§13).

---

## 4. Capability groups

For each group: **why it exists · level · how AI helps · why in ALH, not external software.**

### Group A — Demand & Pipeline (top of funnel)
*Leads / inquiries · business communication inbox · consultation scheduling & availability · lead capture / marketing.*
- **Why:** the daily "no event today" work — filling and moving the funnel from inquiry to booked. It
  precedes any Project.
- **Level:** business-level.
- **AI:** triages and answers inquiries, qualifies, proposes times, follows up so leads never go cold —
  this is exactly the AI Organizer's front door (Canon §9).
- **Why in ALH:** the inquiry *is* the start of the ALH journey (idea → activity). Splitting it into
  external CRM software breaks the one continuous path from first contact to completed activity.

### Group B — Clients & Relationships (CRM)
*Client & contact management across all Projects · reviews / reputation.*
- **Why:** the persistent book of clients and relationship history that spans many events; reputation is
  shared platform trust (Canon §23).
- **Level:** business-level.
- **AI:** remembers every client, recalls history at the right moment, suggests re-engagement, and asks for
  reviews after a Completed Project.
- **Why in ALH:** the client is a first-class ALH participant; ownership of the relationship must stay with
  the organizer inside the platform (Canon §24 — never tax organizer-owned relationships).

### Group C — Money across the business
*Cross-Project financial view (invoices/payments/deposits/refunds rolled up) · bookkeeping / expenses · pipeline & business reporting · taxes.*
- **Why:** the organizer needs to see business health — revenue, outstanding, margins, conversion — not just
  one event's budget.
- **Level:** business-level **rollup**. *(Anti-duplication: per-Project money is owned by the Project, Canon
  §4/§15; the OBW references and aggregates it — it never re-owns or re-issues it.)*
- **AI:** surfaces what's unpaid/overdue, forecasts cash, flags thin margins, prepares reminders.
- **Why in ALH:** the money already flows through ALH's Projects; the business view is a projection of data
  the platform already holds.

### Group D — Reusable assets (owned by the business, used by Projects)
*Templates (proposals, contracts, emails, questionnaires) · persistent vendor / venue network · notes / playbooks / internal knowledge.*
- **Why:** these are created once and reused across many Projects.
- **Level:** business-level; **consumed** by Projects.
- **AI:** generates and personalizes from templates, matches the vendor network to a Project's needs (Canon
  §7), recalls the organizer's own playbooks.
- **Why in ALH:** reuse is where the organizer's effort compounds; keeping assets in the platform makes every
  next activity easier (Assembly §12, Completed Project reuse §20).

### Group E — Agreements & business documents
*Contracts / e-signature (capability + templates) · business documents (license, insurance, brand assets).*
- **Why:** binding agreements are first-class; some documents belong to the business, not one event.
- **Level:** mixed — the **capability and templates** are business-level; a **signed contract instance
  belongs to its Project** (Canon §15 immutable issued artifacts). *(Anti-duplication: the OBW does not
  store a Project's signed contract; it provides the capability and holds business-wide documents.)*
- **AI:** drafts and populates agreements; the human signs; issued artifacts become immutable.
- **Why in ALH:** the agreement is the commitment gate of the journey; it must live where the Project and
  payments already are.

### Group F — Business coordination
*Unified calendar (all events + meetings + deadlines) · business-level tasks (e.g. "renew insurance") · team / collaborators.*
- **Why:** the organizer's own schedule and to-dos span everything they run.
- **Level:** business-level. *(Anti-duplication: event tasks and the run-of-show live in the Living Project /
  Runtime; the OBW holds only business tasks and a cross-Project calendar view.)*
- **AI:** keeps one calendar coherent, protects against conflicts, reminds on business obligations.
- **Why in ALH:** a single coherent calendar across events is only possible where the events already live.

### Group G — Growth
*Academy · certification · AI Business Coach · growth recommendations · scaling.*
- **Why:** grow the organizer's capability and business over time (Canon §23; product tree "Organizer
  Growth").
- **Level:** business-level.
- **AI:** the same single AI Organizer, acting as a business coach — reading the organizer's real business
  and recommending next steps (pricing, capacity, which activities to repeat). The "AI Business Coach" is a
  capability of the one AI Organizer, not a separate AI.
- **Why in ALH:** growth advice is only credible when grounded in the organizer's actual business data, which
  ALH holds.

### Group H — Automation (cross-cutting, not a module)
- **Why:** trigger-based follow-ups and sequences are the connective tissue of a service business.
- **Level:** cross-cutting.
- **AI:** in ALH, automation **is the AI Organizer acting adaptively** — not a rules builder the organizer
  configures. It does the follow-up work and asks the human to decide (Canon §9, §26).
- **Why in ALH:** ALH's differentiator is that AI *runs* the workflow rather than the human *building* it.

---

## 5. Anti-duplication guarantees (does not overlap Living Project or Project Runtime)

- The **Organizer Business owns no event's** scope, budget, tasks, timeline, execution, or participants —
  those are owned by the **Project** (its Living Project and Project Runtime).
- The OBW's financial view is a **rollup/reference**, never a second source of a Project's money (Canon §4,
  §15).
- Event tasks and run-of-show stay in the **Runtime**; the OBW holds only **business** tasks.
- A **signed contract** belongs to its Project; the OBW holds the **capability and templates**, not the
  Project's issued artifact.
- When a lead converts, the OBW **hands off to Assembly**; it does not become a shadow Project.
- Time and schedule truth for an event stay in the **Runtime** (per `PROJECT_RUNTIME_SPEC` — the Runtime owns
  Project time); the OBW only shows a cross-Project **calendar view**.

## 6. Evaluation of every capability

| Capability | Verdict | Justification |
|---|---|---|
| Leads / inquiry pipeline | **Essential** | The daily "no event today" work and the start of the ALH journey. |
| CRM (clients across Projects) | **Essential** | The persistent relationship book HoneyBook is built on; ALH lacks it. |
| Business communication inbox | **Essential** | Logged client conversation is where the journey actually happens. |
| Consultation scheduling / availability | **Essential** | A core daily use (discovery calls, tastings, site visits). |
| Contracts / e-signature | **Essential** | The binding commitment gate; ALH has proposals/payments but no signed contract. |
| Cross-Project financial view | **Essential** | Business health, not just one budget; built from data ALH already holds. |
| Templates library | **Essential** | Reuse is where effort compounds; needed for proposals/contracts/emails. |
| Marketing / lead capture | **Important** | Fills the funnel; ALH already has a promotion generator to build on. |
| Reviews / reputation | **Important** | Shared trust (Canon §23); drives future demand. |
| Bookkeeping / expenses | **Important** | Real margins across events; supports honest pricing. |
| Reporting / pipeline analytics | **Important** | The organizer needs to see conversion, revenue, workload. |
| Persistent vendor / venue network | **Important** | Reused across Projects; feeds Assembly sourcing (Canon §7). |
| Unified calendar | **Important** | One coherent view across all events + meetings. |
| Business documents (license/insurance/brand) | **Important** | Business-level docs that no single event owns. |
| Workflow automation (AI-driven) | **Important** | Delivered as the AI Organizer acting, not a rules builder. |
| Intake questionnaires / forms | **Important** | Useful — but delivered ALH-style (conversation-first, Canon §8), never as a data-entry wall. |
| Business-level tasks | **Future** | Valuable but secondary to the pipeline and money loop. |
| Team / collaborators | **Future** | Matters as the solo organizer scales; not day-one for one person. |
| Notes / internal knowledge base | **Future** | Helpful, not blocking. |
| AI Business Coach / growth recommendations / scaling | **Future** | High value, but depends on the OBW's data existing first. |
| Taxes (1099 / summaries) | **Future** | Year-end, region-specific; layer on top of bookkeeping later. |
| Heavy time tracking | **Reject** | A freelancer/agency concept, not how event organizers work; low journey value (Canon §26). |
| A generic, journey-detached CRM identity | **Reject** | ALH must not become a generic CRM (Canon §27); the business layer exists only to serve the journey. |
| Any per-Project finance/task module rebuilt in the OBW | **Reject** | Would duplicate the Living Project / Runtime (§5 above). |

---

## 7. Promotion recommendations

If the Organizer Business Workspace is accepted, the following should eventually become part of
**`ACTIVLIFE_HUB_PRODUCT_CANON.md`** (extending §13/§22), as product concepts — not implementation:

1. **The two root entities** — **Organizer Business** and **Project** — and the rule that nothing else is a
   root entity. The Organizer Business is the durable parent that holds all of the organizer's Projects; each
   entity is seen through its workspace (**Organizer Business Workspace** and **Project Workspace**), and a
   workspace is a projection of an entity, never the entity itself.
2. **The boundary rule** — one-activity work lives in the Project (Living Project); cross-Project /
   pre-Project / business-identity work lives in the Organizer Business; the Organizer Business references and
   rolls up, never re-owns.
3. **The essential B-layer capabilities** as canonical business-level product elements: **leads / pipeline,
   CRM, business communication, consultation scheduling, contracts, templates, and a cross-Project financial
   view.**
4. **The AI Organizer as the operator of the business layer** — it works the pipeline and surfaces
   business-level attention, while the human authorizes every commitment (reinforcing §9, §15, §21).

Everything else in this proposal (the "Important" and "Future" capabilities, and all group internals) should
**remain proposal/spec-level or implementation detail** until reached — the Canon should gain only the
concept, the boundary, and the essential capabilities, not the full catalog.

---

*This is a proposal for evaluation. It modifies no existing document and redesigns nothing. The Living Project
remains the center; the Organizer Business Workspace is the business-level home around it.*
