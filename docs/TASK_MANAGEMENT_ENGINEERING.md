# Task Management Systems — Engineering Knowledge Extraction (Benchmark Part 2)

> **Purpose:** Reconstruct the engineering *evolution* of nine generic task-management systems
> (Trello, Asana, Monday, ClickUp, Jira, Basecamp, Wrike, Smartsheet, Notion Projects) and extract
> reusable engineering ideas for the ActivLife Hub (ALH) pipeline — specifically for **M4 Organizer
> Workspace** (the first stateful module) and secondarily **M3 Project assembly**.
> **Scope:** Research and writing ONLY. No code, no schema, no ALH redesign, no implementation
> proposals. ALH architecture is treated as fixed; ideas are *mapped onto* it (M1–M8) or marked
> "nowhere." This is knowledge extraction, **not** competitor analysis, feature comparison, market
> research, or UI inspiration.
> **Status:** Research draft. Dates/systems cited where confident; uncertainty is FLAGGED, not
> fabricated. Author stance: independent — popular ≠ correct.

---

## 0. Framing — why this comparison is subtle for ALH

Every system in this document shares one foundational assumption that ALH **deliberately rejects**:

> **The user authors the structure.** A human (or admin) decides what the tasks are, how they
> nest, what fields they carry, what depends on what, and what the workflow states mean. The
> system is a *mutable container* for human-authored structure.

ALH inverts this. Its structure is **derived deterministically** from an approved intent:

```
Discovery → FED (approved "what should happen")
  → M2 OPE: FED → IR  (tasks, abstract needs/roles, dependencies, risks, relative timeline, cost estimate)
  → M3:      IR → Project (work packages, acyclic ordered dependency graph, relative timeline; IMMUTABLE)
  → M4 Organizer Workspace: the FIRST mutable layer — statuses/checklists/notes/decisions/attachments,
        launches Marketplace requests, routes results; does NOT modify the Project.
```

So the central engineering question is **not** "which board UI is best." It is:

1. **Where does ALH's "derived-immutable-plan + separate-mutable-overlay" model genuinely beat the
   generic "user-authored mutable board," and why?**
2. **Where have task systems solved *hard sub-problems* (dependency engines, custom fields, saved
   views, automation rules, notification-fatigue control, real-time sync/CRDT, audit history,
   templates) that M4 — a stateful collaboration layer — will hit anyway and should learn from?**

The plan being derived/immutable does **not** exempt M4 from the genuinely hard parts of stateful
collaborative software. The moment M4 has statuses, notes, comments, attachments, multiple
collaborators, and Marketplace I/O, it inherits *exactly* the engineering problems these nine
systems spent 15+ years solving. ALH's advantage is upstream (it never has to let users
hand-build a task graph); its exposure is downstream (M4 is a real-time multi-user mutable state
machine, and those are hard).

A recurring theme below: **most of these systems conflated "the plan" with "the working state of
the plan" in a single mutable object, and spent a decade paying for it.** ALH has already separated
them (Project vs Workspace). That is the single most important validated insight in this entire
document — and ALH had it before reading any of these.

---

## 1. Object-model taxonomy (the load-bearing distinction)

Before per-system analysis, the field divides cleanly into **five object-model families**. The
object model is destiny: it determines what dependencies, views, automation, and scale are *cheap*
vs *impossible*.

| Family | Core primitive | Exemplars | Strength | Structural weakness |
|---|---|---|---|---|
| **Board/list/card** | Card on a List on a Board | Trello (canonical) | Visual WIP, instant comprehension, low cognitive load | Card has no native cross-board relations; status = column = single dimension; dependencies bolt-on |
| **Task-graph / hierarchy** | Task with parent/subtask + dependency edges | Asana, Wrike, ClickUp, Jira | Real dependencies, multi-project membership, custom fields | Complexity explosion; "where does this task live" ambiguity; sync cost |
| **Spreadsheet-grid** | Row × typed Column in a Sheet | Smartsheet, Monday ("board"=grid) | Formulas, rollups, Gantt, finance-grade structure | Rigid; collaboration is cell-level; weak for unstructured discussion |
| **Doc-blocks / database** | Block; rows are pages in a Database | Notion Projects | Infinite flexibility; docs+tasks unified; relations | No opinion = users must design everything; weak at scale/automation determinism |
| **Message/activity thread** | Message in a Message Board + to-do lists | Basecamp | Calm, async, communication-first | Deliberately NOT a project-structure engine; weak dependencies by design |

**Mapping to ALH M4 (preview of the conclusion in §15):** M4 is **not** a place where users *author*
structure, so the families optimized for *authoring* (doc-blocks, spreadsheet-grid) are a poor base.
M4 displays a *derived, fixed* set of work packages and lets organizers *operate* them. The right
fit is a **task-graph as the read-only substrate** (because the Project already IS an acyclic
ordered dependency graph) with a **board/list/Kanban "lens"** as the primary *operating view* over
status — i.e., the **lens model M4's own plan already names** (timeline/budget/resource/task/risk/
communication lenses). Notion's "many views over one database" and Asana's "list/board/timeline/
calendar over one task set" are the directly relevant prior art; the spreadsheet-grid is relevant
only for the **budget lens**. Detail in §15.

---

## 2. Trello — board/list/card; the radical-simplicity origin

**History & philosophy.** Built inside Fog Creek Software, publicly launched 2011; spun out as
Trello Inc. 2014; acquired by Atlassian **January 2017** (~US$425M). Engineering philosophy:
*Kanban as a literal UI metaphor*. The card is a physical index card; the board is a wall. The
entire product is one idea executed with discipline: **a card is a unit of work that moves across
columns.** Early stack was notable — a single-page app (Backbone.js) with a real-time server
(originally Node.js + a custom WebSocket/MongoDB push), unusually ambitious for 2011.

**Data/object model.** Board → List → Card. Card carries: title, description, members, labels,
due date, checklists, attachments, comments, and (later) custom fields via Power-Ups. The model is
*deliberately flat*: there is **no native subtask** (checklists are the fudge) and **no native
cross-board relation**.

**Workflow model.** Status = which list the card is in. Movement is manual drag. This is the
genius and the ceiling: one workflow dimension, perfectly legible.

**Dependency model.** **None, natively.** This is Trello's defining limitation and the clearest
lesson: a pure board cannot express "B cannot start until A finishes." Dependencies were always a
Power-Up bolt-on. Trello bet that *most knowledge work doesn't need a dependency engine* — and for
its segment (small teams, lightweight flow), that bet largely held.

**Collaboration / permissions / notifications.** Real-time card updates were a 2011 differentiator.
Permissions are coarse (board-level: member/observer/admin; org-level). Notifications were
mention/assignment/due-based and historically *under*-engineered (a known weak spot — the inbox was
thin compared to Asana).

**Automation.** **Butler** (acquired 2018, integrated) — rule/button/scheduled/due-date triggers.
This is the most important Trello evolution: it added a *deterministic automation layer* on top of
a non-deterministic human board, without changing the object model. Butler is the template for "let
power users encode 'when X then Y' without code."

**Templates / search / scale / API.** Board templates (late addition). Search is decent but
card-centric, weak across boards. Scale: a single huge board degrades (DOM + sync). API: clean,
RESTful, well-documented, *the* model for "your object graph is your API." Power-Ups (iframe-based
extensions) made Trello a small platform.

**Successes:** the simplest correct mental model in the category; real-time-from-day-one; Butler;
Power-Ups. **Failures:** no native dependencies/subtasks forced an ecosystem of bolt-ons; thin
notifications; one-dimensional status couldn't grow with users (who churned up to Asana/Jira when
work got complex). **Why features were added:** custom fields, Butler, and templates were all
*pulled* by users hitting the flat-model ceiling.

**ALH relevance:** Trello proves the **lens of "status = column" is the most legible operating
view ever shipped** — and M4's task lens should borrow it. But Trello's *absence* of a dependency
engine is exactly what ALH **already solves better**: ALH's dependencies come pre-computed from M3
(acyclic ordered graph). M4 never has the "users can't express dependencies" problem because *users
don't author them*. **ALH already solves this better.**

---

## 3. Asana — task-graph; "many views over one task set"; the Work Graph

**History & philosophy.** Founded 2008 by Dustin Moskovitz & Justin Rosenstein (ex-Facebook, where
they built an internal task tool, "Tasks"). Public product 2011/2012; IPO 2020. Philosophy: kill the
*coordination tax* of status meetings and email; make work itself the source of truth. The headline
engineering concept is the **"Work Graph"**: tasks, projects, people, goals, and custom fields as a
connected graph rather than a hierarchy of folders.

**Data/object model.** The pivotal idea: **a task can belong to multiple projects simultaneously**
(multi-homing). This single decision is Asana's biggest object-model bet and its biggest source of
both power and complexity. A task is a node; projects are *views/memberships*, not containers.
Tasks have subtasks (recursive), assignees, due dates, custom fields, dependencies, attachments,
comments, and "stories" (the activity/audit stream).

**Workflow model.** Sections + custom-field status; later **Rules** and **Bundles** (reusable rule
sets). Asana spent years migrating from "status = section" toward "status = a custom field you can
report on" — the same maturation Trello users wanted.

**Dependency model.** Real task-to-task dependencies (mark as blocking/blocked-by), with timeline
(Gantt) visualization. Not a full critical-path scheduler early on; got stronger over time. Cleaner
than Trello, lighter than Jira/Wrike.

**Collaboration / permissions / notifications.** Comments + @mentions + "followers" (the
subscription model — *you get notified about what you follow*, which is the key notification-fatigue
control: **opt-in attention, not broadcast**). The **Inbox** aggregates per-user. Permissions
evolved from coarse to team/project/private-task granularity (still not as fine as Jira).

**Automation.** Rules (trigger→action) and Bundles; webhook/API triggers. Deterministic, no-code,
scoped to a project.

**Templates / search / scale / API.** Project templates and **template bundles**; advanced search +
saved "Reports"/Dashboards. Scale: the multi-homing graph is expensive to keep consistent and
fast — Asana invested heavily in a custom sync/data layer (their **"Luna"/"LunaDb"** internal
framework and a reactive sync system; details partly public, FLAG: internal specifics not fully
documented externally). API + webhooks are strong; the platform is the Work Graph exposed.

**Successes:** multi-homing (one task, many contexts) is genuinely powerful and copied widely;
follower-based notifications; the activity "stories" audit stream baked into every object from the
start. **Failures:** multi-homing creates "where does this *really* live / who owns it" ambiguity
and a steep learning curve; reporting lagged the data model for years; performance/sync was a
constant battle (the cost of the graph).

**ALH relevance — two strong extractions:**
- **"Stories" (per-object immutable activity stream).** Every Asana object has an append-only
  history of what happened to it. This is exactly what M4 needs for **audit/decisions/history** and
  it aligns perfectly with ALH's "logical events inside modules" principle. **ADOPT → M4.**
- **Follower/subscription notifications.** Notify people about objects *they chose to follow* plus
  things that name them, not everything. This is the proven antidote to notification fatigue.
  **ADOPT → M4.**
- **Multi-homing:** mostly **REJECT for ALH** — it solves "the same task appears in many
  user-authored projects," a problem ALH doesn't have because a work package belongs to exactly one
  derived Project. Adopting it would re-import the ambiguity Asana suffered from.

---

## 4. Monday.com — spreadsheet-grid as a "Work OS"; columns-as-types

**History & philosophy.** Founded 2012 as *dapulse* (Israel), rebranded **monday.com** 2017; IPO
2021. Philosophy: not a task tool but a **"Work OS"** — a configurable grid where the *column types*
are the product. The bet: if columns are strongly-typed building blocks (status, person, date,
number, formula, timeline, dependency, mirror), users assemble any workflow without code.

**Data/object model.** Board = grid; **Item** = row; **Column** = typed field; **Group** = a labeled
band of rows; **Subitems** = nested rows (added later). The "status" column with colored labels is
the iconic primitive. **Mirror columns** and **Connect-boards columns** add cross-board relations —
Monday's answer to Asana multi-homing without true graph membership.

**Workflow model.** Status column + automations. Because status is a *typed column value* (not a
physical location like a Trello list), it's reportable and automatable from day one — a structural
advantage over board-as-location.

**Dependency model.** A **dependency column** + timeline column → Gantt-like views; "dependency
behavior" can shift dates automatically. Reasonable but grid-rooted (dependencies are field values,
not first-class scheduler edges), so critical-path logic is weaker than Wrike/Smartsheet/MS Project.

**Collaboration / permissions / notifications.** Updates section per item (the conversation thread);
@mentions; activity log. Permissions: board-level + column-level visibility + private/shareable
boards; **fairly granular** for the category. Notifications are bell + email + mobile.

**Automation.** A visual **recipe** builder ("When status changes to Done, notify person and move to
group") — arguably the most *approachable* no-code automation in the category, and a major growth
driver.

**Templates / search / scale / API.** A large template marketplace (heavy marketing investment).
Search and cross-board reporting via **Dashboards** (widgets aggregating boards). Scale: very large
boards degrade; Monday pushes "high-scale" enterprise plans but the grid has practical row limits.
GraphQL **API v2** + apps framework + a marketplace (monetized) — a notable platform/extensibility
bet.

**Successes:** typed-column model makes status reportable/automatable natively; recipe automation's
approachability; aggressive template + marketplace ecosystem. **Failures:** "Work OS" breadth
invites over-configuration (every team reinvents structure → governance chaos); grid is awkward for
deep hierarchy and unstructured docs; cross-board (mirror/connect) is a workaround for not being a
true graph.

**ALH relevance:** Monday's **typed-column / status-as-data** insight is directly useful: M4 should
treat status, sourced-state, risk-handled, etc. as **typed, reportable values**, not as UI
positions — which is good news, because M4's plan already models them as derived/overlay state, not
positions. The **budget lens** specifically benefits from the **spreadsheet-grid + formula/rollup**
pattern (Smartsheet does it better — §9). Monday's "Work OS" *configurability*, however, is the
**anti-pattern** ALH correctly avoids: ALH does not let users assemble structure, so it never pays
the over-configuration/governance tax. **ALH's derived-structure model is better here.**

---

## 5. ClickUp — the "everything app"; maximal object model

**History & philosophy.** Founded 2017; explicit positioning: **"one app to replace them all."**
Philosophy: superset every competitor — tasks, docs, goals, whiteboards, chat, time-tracking,
custom statuses, custom fields, multiple views — all in one product. Engineering philosophy is
*maximalism*, the opposite of Trello.

**Data/object model.** A deep hierarchy: Workspace → Space → Folder → List → **Task** → Subtask →
Checklist. Tasks have custom fields, custom statuses *per list/space*, multiple assignees,
relationships/dependencies, and can appear in multiple lists ("tasks in multiple lists" — multi-home,
a la Asana). Custom statuses-per-container is a distinctive bet: workflow states are user-defined at
many levels.

**Workflow model.** Fully custom statuses + automations + multiple **views** over the same tasks
(List, Board, Calendar, Gantt, Timeline, Table, Mind Map, Workload). "One data set, N views" is the
strongest expression of that idea in the category.

**Dependency model.** Waiting-on / blocking dependencies + Gantt + critical-path toggle. Capable but,
like Monday, not a finance-grade scheduler.

**Collaboration / permissions / notifications.** Comments, assigned comments (a comment becomes a
to-do — clever), @mentions, proofing/annotation, docs. Permissions matured late and were a known
weak point (enterprise governance lagged feature velocity). Notifications are *famously noisy* —
ClickUp's growth-by-features outran its attention-management, making it a textbook case of
**notification fatigue caused by feature maximalism.**

**Automation / templates / search / API / scale.** Rich automation, large template library, global
search, REST API + webhooks. **Scale and reliability were ClickUp's biggest engineering failure:**
through ~2021–2023 the product had visible performance/outage problems widely attributed to the
maximalist surface area outrunning the core platform. They later launched **"ClickUp 3.0"** as an
explicit re-architecture for performance — a public admission that feature maximalism had outrun the
foundation.

**Successes:** "one data set / many views," assigned comments, breadth that genuinely consolidates
tools for small orgs. **Failures:** performance/reliability under feature load (the 3.0 rewrite is
the tell); notification overload; permissions/governance debt; cognitive overload (too many ways to
do everything).

**ALH relevance — the cautionary lesson is the most valuable thing here.** ClickUp is the
**empirical proof of ALH's "one responsibility per module" principle.** ClickUp put authoring,
docs, chat, goals, time-tracking, and execution into one mutable surface and paid with reliability,
notification chaos, and a forced rewrite. ALH's pipeline (M1…M8, each one responsibility, immutable
upstream artifacts) is the *structural prophylactic* against exactly this failure. The useful
*positive* extraction is **"one data set, many views"** — which M4 should adopt as **"one derived
Project, many lenses"** (it already plans this). **Lesson REJECTED as architecture; VALIDATES ALH.**

---

## 6. Jira — issue-tracking origin; the configurable-workflow heavyweight

**History & philosophy.** Atlassian, **2002**, born as a *bug/issue tracker* for software teams
(name from "Gojira"). Philosophy: the **issue** is the atomic unit, and the **workflow** (states +
transitions + conditions + validators + post-functions) is a fully configurable state machine. Jira
is the category's deepest workflow engine — and its heaviest.

**Data/object model.** Project → **Issue** (typed: bug/story/task/epic/sub-task) → custom fields →
linked issues. Epics/stories/sub-tasks encode hierarchy; **issue links** (blocks, relates-to,
duplicates) encode relations. Agile boards (Scrum/Kanban) are *views over a JQL query*, not
containers — a clean separation of data from view that predates ClickUp's version by a decade.

**Workflow model — the crown jewel and the curse.** A per-project (or shared) **workflow scheme**:
states, transitions, and on each transition: conditions (who may), validators (what must be true),
post-functions (side effects). This is a genuine, auditable state machine. It is also Jira's
notorious complexity sink — enterprise Jira admins are a profession because the configuration
surface is enormous.

**Dependency model.** Issue links + Advanced Roadmaps (formerly Portfolio) for cross-team
dependency/capacity planning. Strong at *relationship* dependencies, historically weaker at
auto-scheduling than Smartsheet/MS Project.

**Collaboration / permissions / notifications.** Comments, mentions, watchers (Asana-style follow).
**Permission schemes** are the most granular in the category (permission/notification/security
schemes per project) — genuinely powerful, genuinely heavy. **Notification schemes** map events ×
roles → who gets told; the engineering is sound but defaults are noisy.

**Automation.** **Automation for Jira** (acquired Code Barrel, 2019) — rule engine with triggers/
conditions/actions, smart values, cross-project. One of the most capable no-code rule engines in the
space.

**Templates / search / scale / API / extensibility.** **JQL** (a real query language) is a standout —
saved filters become boards/dashboards/reports. Scale: proven at very large enterprise; Data Center
vs Cloud split. **The biggest architectural change in the category:** the **Cloud re-platforming +
Forge** (a managed serverless app platform, ~2020) replacing/augmenting the older Connect model, and
the multi-year **Server → Cloud/Data Center migration** that deprecated Server (2024). The
**Atlassian Marketplace** is the most successful extensibility ecosystem in the category by revenue.

**Successes:** the configurable state-machine workflow; JQL; permission/notification schemes;
Marketplace; automation. **Failures:** complexity/admin burden (the defining criticism for 20 years);
performance of heavily-customized instances; the painful Server-deprecation migration; defaults that
overwhelm small teams.

**ALH relevance — rich and nuanced:**
- **Configurable workflow state machine (states + guarded transitions + post-functions).** ALH
  *does* have lifecycle (M4: Planning → Preparation → Ready; freeze at Ready) and lifecycle gates
  elsewhere. Jira's lesson is to model these as an **explicit guarded state machine with validators
  on transitions** ("you may only advance to Ready if all risks handled / needs sourced") — which is
  exactly M4's 5-tile readiness model expressed as transition guards. **INVESTIGATE → M4** (adopt the
  *guarded-transition* discipline; **REJECT** the *user-configurability* — ALH workflows are derived/
  fixed, not admin-authored, which is a feature, not a gap).
- **Views as saved queries over data (JQL/boards).** Strong validation of M4's lens model. **ALH
  already aligned.**
- **Permission/notification schemes:** the *granularity* is more than M4 needs initially, but the
  *event × role → recipient* mapping is the right mental model. **INVESTIGATE → M4.**
- **Jira's complexity** is the warning: ALH avoids it precisely by not exposing workflow
  configuration to users. **ALH structurally better.**

---

## 7. Basecamp — communication-first; the anti-complexity stance

**History & philosophy.** 37signals, **2004** (born from their consulting project tooling; the
company later renamed itself Basecamp, then back to 37signals). Philosophy is *ideological*:
**calm software**, anti-feature-creep, opinionated, async-first. Basecamp is deliberately **not** a
dependency/scheduling engine — it's a coordination-and-communication hub. Famous for "**Shape Up**"
(their internal methodology) and for *rejecting* the agile/Gantt complexity arms race.

**Data/object model.** Project → tools: **Message Board**, **To-do lists**, **Schedule**, **Docs &
Files**, **Campfire (chat)**, **Automatic Check-ins**, **Card Table** (a later, simplified Kanban).
The unit is a *project with communication tools*, not a task graph.

**Workflow / dependency model.** Minimal by design. To-dos have assignees + due dates; **no real
dependency engine**. This is a *deliberate rejection* — Basecamp argues most teams don't need
critical-path scheduling and pay for it in complexity. The **Card Table** added a light Kanban with a
"triage/in-progress" flow, but still no dependencies.

**Collaboration / permissions / notifications.** This is where Basecamp leads. **Hill Charts**
(a unique progress visualization: where work sits on an "uphill = figuring out / downhill =
executing" curve) is an original idea worth noting. **Automatic Check-ins** (scheduled recurring
questions — "What did you work on today?") replace status meetings. The **"Hey!" menu / notification
batching** and **work-hours / "off-hours" delivery controls** are the category's most thoughtful
notification-fatigue engineering — explicitly designed to *reduce* interruption.

**Automation / templates / search / API / scale.** Light automation (check-ins, recurring to-dos);
project templates; search across a project; a clean REST API (BC3 API). Scale: targets small-to-mid
teams; not engineered for 10k-person enterprises and doesn't pretend to be.

**Successes:** notification *restraint* (work-hours delivery, batching) — genuinely ahead of the
field; check-ins as meeting-replacement; Hill Charts as honest progress signal; the opinionated "one
right way" that lowers cognitive load. **Failures:** by-design absence of dependencies/reporting
makes it unusable for complex coordinated delivery; opinionatedness alienates teams that need
structure; weak cross-project rollup.

**ALH relevance — disproportionately valuable for M4:**
- **Notification-fatigue engineering (work-hours delivery, batching/digest, restraint by default).**
  This is the single most under-appreciated extraction in the document. M4 will generate
  notifications (status changes, Marketplace results routed back, collaborator actions). Basecamp's
  proven controls — **batch, respect off-hours, default to less** — should shape M4's notification
  design. **ADOPT → M4.**
- **Automatic Check-ins (scheduled prompts replacing status chasing).** Conceptually strong for an
  organizer workspace ("is the venue confirmed?" prompts) — but it's a *capability*, FLAG as
  **INVESTIGATE → M4**, not core.
- **Hill Charts (honest "figuring-out vs executing" progress).** More honest than a % bar; could
  inform M4's readiness display. **INVESTIGATE → M4.**
- **Anti-complexity stance:** validates ALH's module-discipline philosophy.

---

## 8. Wrike — the dependency/scheduling-serious task-graph for operations

**History & philosophy.** Founded 2006; acquired by **Citrix 2021**, later spun into Cloud Software
Group. Philosophy: serious **work management for operations/marketing/professional-services teams** —
heavier than Asana on scheduling/resource/proofing, lighter than enterprise PPM. Aimed at teams that
*do* need real dependencies and capacity.

**Data/object model.** Space → Folder/Project → **Task** → Subtask, with **folder/project as
multi-parent tags** (a task can live in multiple folders — Asana-style multi-homing via a folder
graph). Custom fields, custom item types, **Blueprints** (templates).

**Workflow model.** Custom statuses + **custom workflows** + **request forms** that route into
projects (a notable feature: structured intake → auto-created tasks/projects). Approvals + proofing
built in (strong for creative/marketing ops).

**Dependency model — a relative strength.** Four dependency types (FS/SS/FF/SF, i.e. finish-to-start
etc.), interactive Gantt, auto-rescheduling, critical path, and **resource/workload management**.
This is closer to genuine project-scheduling than Asana/Trello/Monday — second only to Smartsheet/
MS-Project class tools in this set.

**Collaboration / permissions / notifications.** Comments/@mentions/proofing; **granular access
roles + selective sharing** (share a single folder/task); a personal **Inbox**. Permissions are
strong (built for agencies with client/internal separation).

**Automation / templates / search / API / scale.** Automation engine (rules), **Blueprints**
(reusable project/task structures with placeholders), **Request Forms** (dynamic intake → work),
strong search/reporting, REST API + webhooks, integrations. Scale: solid mid-to-enterprise.

**Successes:** real dependency types + auto-scheduling + workload/resource management; request forms
as structured intake; blueprints; proofing. **Failures:** UI complexity/learning curve (the price of
power); historically dense/dated UX; less mindshare than Asana/Monday despite deeper scheduling.

**ALH relevance — two precise extractions:**
- **Typed dependencies (FS/SS/FF/SF) + critical path.** Here ALH must be honest: M3 produces an
  **acyclic ordered dependency graph** with a **relative** timeline. Wrike's typed-dependency
  semantics (does B start when A *finishes* or when A *starts*?) is a *richer dependency model* than
  "ordered acyclic edges." **INVESTIGATE → M2/M3:** could the IR/Project dependency edges carry a
  *type* (finish-to-start vs start-to-start) to make the relative timeline more faithful? This is a
  legitimate place where task systems have *more* dependency expressiveness than ALH currently
  specifies. (Owning module is **M2 (IR derivation)** then **M3 (Project graph)** — *not* M4, since
  M4 must not modify the Project.) Trade-off: more expressiveness vs more determinism-surface to
  validate.
- **Request Forms (structured intake → derived work).** Conceptually, this is *what ALH's entire
  M1→M2→M3 pipeline already is*, done far better: Wrike's form maps fields → tasks heuristically;
  ALH derives a full IR/Project deterministically from FED. **ALH already solves this better.**

---

## 9. Smartsheet — spreadsheet-grid meets project scheduling; the finance-grade end

**History & philosophy.** Founded 2005; IPO 2018; acquired by Vista/Blackstone consortium (going
private, 2024–2025, FLAG: deal timing). Philosophy: meet enterprises *where they already are* — in
spreadsheets — but add real project-management structure (Gantt, dependencies, automation, rollups).
The bet: **a grid is the most universally-understood data UI; make it a real PM engine.**

**Data/object model.** Sheet = grid of **rows × typed columns**; rows have **hierarchy
(indent/outdent → parent/child)**; **cell links** connect cells across sheets; **reports** roll up
across sheets; **Dashboards** visualize. Strongly typed columns (contact, date, dropdown, symbol,
formula).

**Workflow model.** Status columns + **automation workflows** (the most spreadsheet-native automation
builder); approval flows.

**Dependency model — the strongest, most "real-project" end of this set.** Full **predecessor
columns with FS/SS/FF/SF + lag/lead**, auto-scheduling, critical path, working-days/calendar
awareness. This is genuinely MS-Project-class scheduling inside a grid. If you need finance/
construction/PMO-grade dependency math, Smartsheet (and MS Project, outside this set) is where the
category actually delivers it.

**Collaboration / permissions / notifications.** Row/sheet-level sharing, **cell-level comments**,
proofing, granular permissions (viewer/editor/admin per sheet, plus restricted/unrestricted columns).
Notifications via automation (alert/request-update). Built for controlled enterprise collaboration.

**Automation / templates / search / API / scale.** Mature automation; large solution-template
library; **Control Center** (governance/templated-project provisioning at scale — interesting for
"derive many projects from one blueprint"); strong API + Bridge (integration/automation);
**DataMesh/DataShuttle** for data movement. Scale: enterprise PMO-grade; sheets have row limits but
the platform federates via reports/Control Center.

**Successes:** real scheduling math in a familiar grid; rollup reports/dashboards; Control Center
governance; formula/rollup engine. **Failures:** the grid is awkward for discussion/unstructured
work; complexity creeps; cell-link webs become fragile at scale (the spreadsheet original sin —
hidden dependency graphs in formulas).

**ALH relevance — the budget lens's best teacher:**
- **Formula/rollup + finance-grade column types.** M4's **budget lens** (bands, line items, drivers,
  totals, correction overlay — per M4's plan) is *exactly* a Smartsheet-style typed-grid-with-rollups
  problem. Smartsheet is the cleanest prior art for "edit a line item → totals recompute
  deterministically." **INVESTIGATE → M4 (budget lens):** adopt the *typed-grid + deterministic
  rollup* pattern as the conceptual model for the budget lens (ALH's correction-overlay already
  gestures at this). Trade-off: keep it confined to the budget lens; do **not** let the grid become
  the whole workspace (that's Monday/Smartsheet's trap).
- **Predecessor scheduling (FS/SS/FF/SF + lag).** Same note as Wrike — relevant to **M2/M3**
  dependency expressiveness, **not** M4.
- **Control Center "provision many projects from one governed blueprint."** Conceptually echoes
  ALH's "derive a Project from an IR." ALH's version is *more* principled (deterministic vs
  templated). **ALH already solves the spirit of this better.**

---

## 10. Notion Projects — doc-blocks + database; the "design-your-own-tool" extreme

**History & philosophy.** Notion launched ~2016 (block editor) and grew into **databases** (2019);
**Notion Projects / Tasks** (a packaged PM layer with sprints, dependencies, formulas) hardened
~2023–2024. Philosophy: **everything is a block; a database is a collection of blocks-as-pages with
typed properties; you design your own tool.** Maximal flexibility, minimal opinion.

**Data/object model.** **Block** is the atom (text, heading, toggle, embed — and a *page* is a
block). A **Database** is a set of pages with typed **Properties** (text, select, date, relation,
rollup, formula, person). **Relations + Rollups** give true cross-database links and aggregation —
arguably the cleanest relational model in the consumer space. **Views** (Table/Board/Calendar/
Timeline/Gallery/List) are saved configurations over one database.

**Workflow / dependency model.** Status property + views; Notion Projects added **dependencies +
sprints + auto-scheduling-ish** features later and weaker than Wrike/Smartsheet. Dependencies are a
relation/property pattern, not a scheduler.

**Collaboration / permissions / notifications.** Real-time block-level collaborative editing
(operational-transform/CRDT-class sync — Notion engineered a serious collaborative editor).
Comments/mentions; permissions per page/workspace (sharing model matured over time, historically a
weak point for granular control). Notifications are page/mention based, historically thin.

**Automation / templates / search / API / scale.** **Database automations** + buttons (added
~2024); a vast community **template** ecosystem (Notion's real moat); search improved with AI;
**public API** (note: the API exposes blocks/databases but has historically been *rate-limited and
not real-time*, a known constraint). Scale: large databases and deeply-nested block trees have known
performance ceilings; Notion has publicly discussed re-engineering its data layer (sharding/caching;
FLAG: specifics partly public via their engineering blog).

**Successes:** the unified block model (docs + tasks + wiki in one fabric); relations/rollups;
many-views-over-one-database; real collaborative editing; template ecosystem. **Failures:** **no
opinion = the user must architect everything** (the "blank Notion paralysis"); weak deterministic
automation vs Jira/Monday; performance at scale; permissions/governance lag; API non-real-time +
rate limits.

**ALH relevance — sharpest contrast in the document:**
- Notion is the **maximal expression of "user authors all structure"** — the exact opposite of ALH.
  Its central failure ("blank-page paralysis; everyone reinvents the schema") is precisely the
  problem ALH's **derive-structure-from-FED** eliminates. **This is ALH's strongest validation:
  ALH already solves Notion's biggest problem by construction.**
- **Worth extracting:** (a) **relations + rollups** as a clean aggregation model (relevant to budget/
  resource rollups in M4 — overlaps Smartsheet); (b) **real-time collaborative editing (CRDT/OT)** —
  relevant if/when M4 supports concurrent multi-organizer editing of notes/checklists (see §13);
  (c) **many-views-over-one-database** — re-confirms M4's lens model. **INVESTIGATE → M4** for (b);
  the rest re-confirm existing M4 direction.

---

## 11. Cross-system extraction MATRIX

| Idea | Problem it solves | Origin (system / ~date) | Universal? | ALH today | Owning module | Verdict |
|---|---|---|---|---|---|---|
| **Derived-not-authored structure** | "blank-page paralysis"; every team reinvents schema (Notion/Monday/ClickUp) | — (ALH's own inversion) | No — most systems are authored | **Yes — FED→IR→Project derives it deterministically** | M1→M2→M3 | **ALREADY SOLVED BETTER** |
| **Plan vs working-state separation** | mutable board conflates plan with its execution state → audit/immutability loss | implicit; nobody fully separates | Should be | **Yes — Project (immutable) vs M4 (mutable overlay)** | M3/M4 | **ALREADY SOLVED BETTER** |
| **Status = column / Kanban lens** | legible at-a-glance work state | Trello 2011 | Yes | Partial — task lens planned | M4 (task lens) | **ADOPT** (as a lens) |
| **Status-as-typed-data (not position)** | make status reportable/automatable | Monday 2012 / Jira 2002 | Yes | Yes — overlay state is data | M4 | **ALREADY SOLVED / ADOPT discipline** |
| **Many views over one data set** | one truth, many work modes | Jira (board=JQL) 2002; Asana; ClickUp; Notion | Yes | **Yes — M4 lens model** | M4 | **ALREADY ALIGNED** |
| **Per-object activity/audit stream** | "what happened to this, when, by whom" | Asana "Stories" ~2011 | Yes | Partial — "logical events in modules" principle | M4 | **ADOPT** |
| **Follower/subscription notifications** | broadcast → fatigue | Asana followers / Jira watchers | Yes | Not specified | M4 | **ADOPT** |
| **Notification batching + off-hours/work-hours delivery** | interruption / fatigue | Basecamp ~2014+ | Yes | Not specified | M4 | **ADOPT** |
| **Automatic check-ins (scheduled prompts)** | status-meeting tax; chasing | Basecamp | Partly | No | M4 | **INVESTIGATE** |
| **Guarded workflow transitions (validators/conditions)** | illegal state changes; ungated advance | Jira workflow schemes 2002 | Yes | Partial — M4 phases + 5-tile readiness | M4 | **INVESTIGATE** (adopt guards; reject user-config) |
| **No-code automation rules (when X→Y)** | repetitive manual ops | Trello Butler 2018; Jira Automation 2019; Monday recipes | Yes | No (M4 routes Marketplace, doesn't auto-rule) | M4 | **INVESTIGATE** |
| **Custom fields (typed)** | one model can't fit all work | Jira; Asana; Monday | Yes | N/A — fields are derived, not user-defined | nowhere (upstream derives them) | **REJECT** (anti-fit; ALH derives needs) |
| **Saved views / saved queries (JQL)** | reusable slices of work | Jira JQL 2002 | Yes | Lens model ≈ this | M4 | **ALREADY ALIGNED** |
| **Typed dependencies (FS/SS/FF/SF + lag)** | "B after A" is too coarse for real timelines | Smartsheet/Wrike/MS-Project | For scheduling-serious work | Partial — acyclic *ordered* edges, relative timeline | **M2 (IR) → M3 (Project)** | **INVESTIGATE** |
| **Critical path / auto-reschedule** | find the binding sequence | Smartsheet/Wrike | For complex projects | No (relative timeline only) | M2/M3 | **INVESTIGATE** (likely overkill for ALH event scale) |
| **Formula/rollup typed grid** | finance-grade totals from line items | Smartsheet 2005; Monday | Yes (for $) | Partial — budget bands + correction overlay | M4 (budget lens) | **INVESTIGATE** |
| **Relations + rollups (cross-object aggregation)** | aggregate across linked items | Notion 2019; Smartsheet cell-links | Yes | Partial — needs/cost roll to Project root | M3/M4 | **ALREADY PARTLY SOLVED** |
| **Real-time collaborative editing (CRDT/OT)** | concurrent multi-user edits without conflict | Notion; Trello (early RT) | If multi-editor | Unspecified | M4 | **INVESTIGATE** |
| **Request forms → structured work** | turn intake into work items | Wrike; Smartsheet | Yes | **Yes — entire M1→M3 pipeline, deterministically** | M1–M3 | **ALREADY SOLVED BETTER** |
| **Multi-homing (task in many projects)** | same work in many contexts | Asana ~2011 | Sometimes | No (work package ⊂ one Project) | nowhere | **REJECT** (re-imports ambiguity) |
| **Templates / blueprints** | repeatable project starts | Wrike Blueprints; Smartsheet; Monday | Yes | **Yes — IR/Project derivation is the principled version** | M2/M3 | **ALREADY SOLVED BETTER** |
| **Provision many projects from one governed blueprint** | scale + governance | Smartsheet Control Center | Enterprise | Yes — deterministic derivation | M2/M3 | **ALREADY SOLVED BETTER** |
| **Hill charts (figuring-out vs executing)** | honest progress signal vs fake % | Basecamp | Niche | No (5-tile readiness) | M4 | **INVESTIGATE** |
| **Managed app/extension platform** | extensibility w/o core risk | Atlassian Forge/Connect; Power-Ups; Monday/Notion APIs | Enterprise-scale | N/A this stage | nowhere (later) | **REJECT for now** |
| **One-app maximalism** | tool sprawl | ClickUp 2017 | No | Anti-pattern; ALH = module discipline | — | **REJECT (validates ALH)** |

---

## 12. Cross-system engineering lessons (synthesis)

1. **The object model is destiny.** Board/grid/graph/doc-block/thread each make a different set of
   operations cheap and another set impossible. Trello can never natively schedule; Smartsheet can
   never feel like calm async chat; Notion can never be deterministic. **Pick the substrate for the
   *dominant* operation.** For M4 the dominant operation is *operating a fixed derived plan*, not
   *authoring structure* — so a read-only **task-graph substrate + multiple lenses** is correct, with
   a **grid lens only for budget**.

2. **Separating "the plan" from "the working state of the plan" is the missing discipline in the
   whole category.** Every system bolts execution state onto the same mutable object the user
   authored, which destroys immutability, complicates audit, and tangles "what was planned" with
   "what happened." ALH already separated them (immutable Project + mutable M4 overlay). This is the
   field's hardest-won and least-articulated lesson, and **ALH got it right a priori.**

3. **Views/lenses must be projections over one data set, never copies.** Jira (board = JQL), Asana,
   ClickUp, Notion all converged here; the laggards (early Trello) suffered. M4's lens plan is on the
   right side of history.

4. **Status should be typed data, not a UI position.** Monday/Jira win because status is a value you
   can report and automate on; Trello's "status = which list" is legible but a reporting dead-end.

5. **Notifications are an attention-budget problem, not a delivery problem.** The category's mature
   answer is: *subscription/follow + name-mentions + batching + off-hours suppression + digest*.
   Basecamp leads, Asana/Jira have the follow model, ClickUp is the cautionary failure. M4 should
   start from restraint.

6. **Automation belongs in a deterministic rule layer *on top of* the data, not woven into the
   object.** Butler, Jira Automation, Monday recipes, Smartsheet workflows all externalize "when X →
   Y" as inspectable rules. This matches ALH's "deterministic transforms + logical events" instincts.

7. **Dependencies have a spectrum of fidelity.** "Ordered edges" (ALH/Trello-bolt-on) < typed edges
   FS/SS/FF/SF (Wrike) < typed-edges-with-lag-and-critical-path-and-calendar (Smartsheet/MS Project).
   More fidelity = more value for complex timelines *and* more determinism-surface to validate. ALH
   should consciously choose where on this spectrum its relative timeline sits.

8. **Feature maximalism is a reliability tax (ClickUp 3.0, Jira complexity, Notion scale rewrites).**
   Every system that tried to be everything paid with performance, notification chaos, governance
   debt, or a forced rewrite. ALH's per-module single-responsibility pipeline is the structural cure.

9. **Custom fields / user-authored structure is the field's universal default — and ALH's
   deliberate non-feature.** The systems built their flexibility moat there; ALH built its
   *correctness* moat by *deriving* fields/needs/dependencies instead. These are opposite strategies;
   ALH's is right for a system that must produce *trustworthy, deterministic* plans rather than
   *configurable* ones.

10. **Real-time collaborative editing is a discrete, expensive engineering commitment (CRDT/OT).**
    It is worth it only when concurrent multi-editor mutation is core. M4 should decide this
    explicitly rather than drift into it.

---

## 13. Challenges to conventional wisdom

- **"A good PM tool lets users model any workflow."** *Challenged.* This is precisely why Notion/
  Monday/ClickUp suffer blank-page paralysis, schema sprawl, and governance debt. For ALH's mission —
  produce a *trustworthy, deterministic* plan — **maximal configurability is a liability, not a
  feature.** ALH's derive-and-freeze model is the correct heresy.

- **"Dependencies must be a rich scheduler (critical path, FS/SS/FF/SF, calendars)."** *Partly
  challenged.* For construction/PMO, yes (Smartsheet earns it). For ALH's domain (events, organizer
  activities at human scale), full critical-path scheduling is likely **over-engineering**; the
  honest extraction is *typed* edges (does B start at A's start or finish?), not a full scheduler.
  Don't cargo-cult MS Project into an event planner.

- **"Multi-homing (one task in many projects) is obviously good."** *Challenged.* Asana's most-copied
  feature is also its biggest source of ownership ambiguity and sync cost. For ALH, where a work
  package belongs to exactly one derived Project, multi-homing would *create* a problem ALH doesn't
  have. **Decline it.**

- **"Templates are how you get repeatability."** *Challenged/superseded.* Templates are a *weaker,
  heuristic* version of what ALH does deterministically. Wrike Blueprints and Smartsheet Control
  Center are reaching toward "derive a structured project from a definition" — ALH already arrives
  there with FED→IR→Project. ALH should not regress to templates; it has the better mechanism.

- **"More notifications = more engagement."** *Challenged.* ClickUp's growth-by-features produced
  notification fatigue; Basecamp's restraint is the mature counter-position. M4 should treat the
  user's attention as a scarce, defended budget.

- **"The workspace should be one unified everything-app."** *Challenged.* ClickUp's 3.0 rewrite and
  Jira's complexity are the empirical refutation. ALH's module discipline is vindicated; M4 should
  resist absorbing M5/M6/M7 responsibilities.

---

## 14. Where ALH is *already* ahead (do not regress)

1. **Structure is derived, not authored** → eliminates Notion/Monday/ClickUp blank-page paralysis &
   schema sprawl (M1–M3).
2. **Immutable upstream artifacts** (FED, IR, Project) → the "plan vs working-state" separation the
   whole category lacks (M3 vs M4).
3. **Deterministic transforms** (M2/M3) → no heuristic template drift; reproducible plans.
4. **Single responsibility per module** → structural immunity to the ClickUp/Jira complexity/
   reliability tax.
5. **Request-intake-to-work is the entire pipeline, done better** than Wrike/Smartsheet request forms.
6. **Engine replaceability behind contracts** → the "automation as external rule layer" discipline,
   generalized.

These are not gaps to fill; they are advantages to *protect*. The risk is **regression** — adding
user-authored fields/dependencies/templates "because every competitor has them" would *undo* ALH's
core advantage.

---

## 15. Object-model verdict for M4 (the central recommendation)

**Question:** board/list/card vs task-graph vs spreadsheet-grid vs doc-blocks — which fits M4?

**Reasoning.** M4 does **not** author structure (the Project is fixed, immutable, and already an
*acyclic ordered dependency graph*). M4 *operates* that fixed graph: statuses, checklists, notes,
decisions, attachments, Marketplace I/O, lifecycle. Therefore:

- **Doc-blocks (Notion):** wrong base. Its whole value is letting users *design* structure — M4's
  structure is fixed. Would import blank-page-paralysis risk for zero benefit. Useful only as a
  pattern for the *notes/decisions* sub-surface (free-form rich text per work package), not the
  spine.
- **Spreadsheet-grid (Smartsheet/Monday):** wrong base for the spine (rigid, discussion-hostile,
  cell-link fragility), but **the right model for exactly one lens — the budget lens** (typed
  columns + deterministic rollups + correction overlay).
- **Board/list/card (Trello):** wrong as the *data model* (too flat, no dependencies) but **the
  right model for the primary *task lens*** (status-as-column Kanban is the most legible operating
  view ever shipped).
- **Task-graph (Asana/Jira/Wrike):** **the correct substrate**, because the Project already *is* a
  task graph. M4 reads it; the overlay attaches mutable state to its nodes.

**Verdict — the fit is a layered model M4's own plan already gestures toward:**

> **Read-only task-graph substrate** (the immutable Project) **+ multiple lenses as projections**
> (Jira/Asana/Notion "many views over one data set"): a **Kanban/board lens** for task status, a
> **timeline lens** over the relative ordering, a **grid lens** for budget (Smartsheet-style rollups),
> and **risk/resource/communication lenses** — with **per-node mutable overlay state** (status,
> sourced/handled flags, notes, attachments) carrying a **per-node append-only activity stream**
> (Asana "Stories"), governed by **guarded lifecycle transitions** (Jira validators: advance to
> Ready only when readiness tiles pass), and surfaced through **restraint-first, subscription +
> batched notifications** (Basecamp/Asana).

This is **not a redesign of M4** — it is the existing M4 plan (lenses + overlay + readiness +
freeze) *named in the field's own engineering vocabulary*, with three concrete borrowings flagged
for investigation (activity stream, guarded transitions, notification restraint) and one for M2/M3
(typed dependency edges).

---

## 16. Top engineering ideas for ALH (ranked: idea → module → verdict)

1. **Per-object append-only activity/audit stream (Asana "Stories").** → **M4.** **ADOPT.**
   Aligns with "logical events inside modules"; gives audit/decisions/history M4 needs anyway.
   Trade-off: storage + UI surface; low risk.

2. **Notification restraint: subscription/follow + name-mentions + batching + off-hours/digest
   (Basecamp + Asana/Jira watchers).** → **M4.** **ADOPT.** Prevents the ClickUp fatigue failure
   from day one. Trade-off: must define the follow/subscription unit (work package vs Project).

3. **Many-lenses-over-one-derived-Project (Jira JQL boards / Asana / ClickUp / Notion).** → **M4.**
   **ADOPT / ALREADY ALIGNED.** Formalize lenses as *projections*, never copies, of one immutable
   Project + overlay.

4. **Status-as-typed-data, Kanban as a lens (Monday/Jira data + Trello legibility).** → **M4 (task
   lens).** **ADOPT.** Status is overlay *data* you can roll into readiness; render it as a board.

5. **Guarded lifecycle transitions / validators (Jira workflow schemes).** → **M4.** **INVESTIGATE.**
   Model Planning→Preparation→Ready with explicit transition guards (= the 5-tile readiness as
   pre-conditions). **Reject** user-configurability; keep it derived/fixed. Trade-off: formalizes
   freeze logic; low risk, high clarity.

6. **Deterministic "when X → Y" automation as an external, inspectable rule layer (Butler / Jira
   Automation / Monday recipes).** → **M4.** **INVESTIGATE.** E.g., "when all needs sourced → tile
   green," "when Marketplace result routed → update overlay." Trade-off: must stay deterministic and
   *not* mutate the Project; bounded scope only.

7. **Typed dependency edges FS/SS/FF/SF (Wrike/Smartsheet).** → **M2 (IR) → M3 (Project).**
   **INVESTIGATE.** Give the relative timeline edges a *type* so ordering is faithful (B-at-A-finish
   vs B-at-A-start). **Not M4** (M4 must not modify the Project). Trade-off: richer timeline vs more
   determinism-surface to validate; likely worthwhile, *short* of full critical-path scheduling.

8. **Typed-grid + deterministic rollups for the budget lens (Smartsheet/Monday).** → **M4 (budget
   lens).** **INVESTIGATE.** Adopt the typed-column + rollup model *only* for budget (matches M4's
   correction-overlay). Trade-off: confine to budget; do not let the grid metastasize into the spine.

9. **Real-time collaborative editing (CRDT/OT) for shared notes/checklists (Notion/Trello).** →
   **M4.** **INVESTIGATE.** Only if concurrent multi-organizer editing is genuinely required; it is a
   discrete, expensive commitment to make *consciously*, not by drift.

10. **Automatic check-ins + Hill-chart-style honest progress (Basecamp).** → **M4.** **INVESTIGATE.**
    Scheduled prompts ("venue confirmed?") and figuring-out-vs-executing progress could enrich the
    readiness display. Lower priority; nice-to-have.

**Explicit REJECTS (with reason):** custom user-defined fields (ALH *derives* fields — adopting
authoring undoes the core advantage); multi-homing (re-imports Asana's ownership ambiguity ALH
doesn't have); user-authored templates (FED→IR→Project is the superior deterministic mechanism);
one-app maximalism (validates, by counterexample, ALH's module discipline); full critical-path
scheduler (over-engineering for ALH's event scale — adopt typed edges, not MS-Project).

**ALREADY-SOLVED-BETTER (protect, don't regress):** derived-not-authored structure; immutable-plan
vs mutable-overlay separation; deterministic intake-to-work pipeline; single-responsibility modules.

---

### Confidence & uncertainty flags
- Acquisition/IPO dates cited from well-established public record (Trello/Atlassian 2017; Asana IPO
  2020; Monday IPO 2021; Jira 2002; Wrike/Citrix 2021; Smartsheet IPO 2018). **FLAGGED uncertain:**
  exact Smartsheet take-private timing (2024–2025); ClickUp 3.0 exact GA date; internal Asana
  ("LunaDb") and Notion data-layer specifics (partly public via engineering blogs, not fully
  documented externally). These flags do not affect the engineering conclusions, which rest on the
  *designs*, not the dates.
- No ALH code, schema, or architecture was modified or proposed. All "INVESTIGATE/ADOPT" items are
  *conceptual* extractions mapped onto existing modules for the orchestrator's cross-document
  synthesis.
