# Knowledge Systems — Engineering Knowledge Extraction (Part 7)

> **Purpose:** extract the durable *engineering ideas* behind knowledge systems (Notion, Confluence,
> Guru, Document360; with lineage from wikis, Roam, Obsidian) and map them onto the ActivLife Hub
> (ALH) pipeline — specifically how knowledge becomes **connected with ongoing work**, how
> documentation **evolves during a project**, and how **organizational memory** is preserved.
> **Status:** research only · knowledge extraction. This document studies *evolution*, not products.
> **Scope:** this is a *research/writing* artifact. It does **not** modify code, schema, migrations,
> the OPE engine, or any architecture doc. It does **not** redesign ALH or rename anything. Where it
> names ALH modules it uses the **pipeline-module** scheme (M1–M8), *not* the implementation-milestone
> scheme in `OPE_V1_BUILD_SEQUENCE.md`. It maps ideas *onto* the existing architecture; it does not
> propose building anything here.

---

## 0. Method and framing (read first)

This part studies the *engineering* of knowledge systems — the data models and the maintenance
mechanisms — not their UIs, pricing, or market position. For each idea we reconstruct: the problem,
why it was invented, whether it is universal, whether ALH already solves it (and whether better),
the conceptual solution, the owning ALH module, and a verdict.

**Two scope disciplines, stated up front, because they decide most verdicts:**

1. **ALH is not a wiki, and must not become one.** A wiki's premise is *free-form pages a human
   maintains by hand*. ALH's premise is the opposite: **meaning (M1/FED) is separated from structure
   (M2 IR / M3 Project), the structured plan is immutable and deterministic, and only M4 (the
   Organizer Workspace) is mutable**. The interesting question is therefore *not* "should ALH adopt
   a wiki?" — it is "**which knowledge-system mechanisms strengthen M4/M7/M8 and the learning loop
   without re-introducing the free-form-page failure mode the rest of the pipeline was built to
   avoid?**"

2. **ALH's numbering collides.** `OPE_V1_BUILD_SEQUENCE.md` uses M1–M7 as *implementation
   milestones* (Intake, Plan Generator, Budget, Task/Resource, Workspace, Sourcing, Marketplace).
   This document uses the **pipeline-module** scheme from the benchmark family
   (`EVENT_MANAGEMENT_ENGINEERING.md`, `CRM_ENGINEERING.md`):

   ```
   Client Request → Discovery (M1) → FED → OPE Engine (M2) → IR → Project Assembly (M3) → Project
      → Organizer Workspace (M4) → Resource Marketplace (M5) / Event Execution (M6)
      → Completion Evidence (M7) → Project Closure (M8)
   ```

   **FED (Future Event Description)** and **IR (Intermediate Representation)** are *artifacts /
   seam contracts*, not modules. **FED** = approved, implementation-independent *meaning* (the same
   object `CREATIVE_ENGINE_AXIOMS.md` calls the "Approved Concept"). **IR** = M2's deterministic
   *abstract plan* (needs, dependencies, risks, relative timeline, cost estimate; no real vendors,
   dates, or payments). The canon's standing commitment: upstream artifacts **FED → IR → Project
   are immutable**, M2/M3 are **deterministic**, every Project element traces back
   `projectRef → irRef → fedRef`, and the *only* mutable module is **M4** (sources:
   `CRM_ENGINEERING.md`, `OPE_MASTER_SPEC.md`, `REAL_ORGANIZER_DECISION_MODEL.md`).

**Confidence:** lineage and mechanism claims below are drawn from first-party sources (Notion's
engineering blog, Guru/Confluence/Document360 docs, Nygard's 2011 ADR essay) and graded; the most
load-bearing uncertainties are flagged inline and consolidated in §11. ALH-canon claims cite the
docs above.

---

## 1. The origin problem: knowledge trapped, and knowledge that rots

Every system in this part descends from one failure mode, observed first in the 1945–1995 hypertext
lineage and re-discovered by every company since: **the knowledge needed to do work is fragmented
across tools and people's heads, and once written down it silently goes stale.** Two sub-problems,
historically solved at different times:

- **Fragmentation / "trapped knowledge."** The knowledge exists but is scattered (email, drives,
  chat, individual memory) and not *where the work happens*. The wiki (Ward Cunningham,
  WikiWikiWeb, 25 Mar 1995 — "the simplest online database that could possibly work") solved the
  *capture* half: anyone can edit in-browser, owner-less, with effortless linking. It did **not**
  solve the *maintenance* half.
- **Decay / "knowledge that rots."** A wiki page has **no owner of record, no expiry, and gives the
  reader no freshness signal** — it persists and rots silently. Guru's first-party critique is exact:
  SMEs "forget to update it and are never prompted," readers "can't tell when the wiki was last
  updated… and lose trust in it," producing the cycle *stale → distrust → disuse → wasted
  investment*. (Note: "knowledge half-life" is borrowed academic language — Machlup 1962, Arbesman
  2012 — **not** Guru's coinage; Guru's own term is *stale/staleness*, with *decay* used only as an
  ordinary verb. See §11.)

**The lineage that matters for ALH:**

| Era | System | Conceptual contribution |
|---|---|---|
| 1945–68 | Bush (Memex) → Nelson (hypertext, *transclusion*, bidirectional links, permanent versioning) → Engelbart (working hyperlinks, "augment intellect") | Associative linking; reuse a part of one doc inside another without copying; versioning as first-class |
| 1995 | WikiWikiWeb | Open collaborative editing; effortless linking; per-page history. **Backlinks trace to the 1997 *CvWiki* clone, not the original** (§11) |
| 2004 | Confluence | Enterprise wiki: **spaces / page tree / blueprints**; tight **Jira** coupling (docs ↔ work) |
| 2017–18 | Document360 | KB platform that **builds the freshness loop in** (review reminders → *Stale* state) |
| 2013–15 | Guru | **Verification engine**: owner + expiry clock + visible trust badge + workspace trust score; **knowledge-in-context** delivery |
| 2018→ | Notion | **The typed block as the universal primitive**: docs and structured databases collapse into one editable, linkable, permissionable material |
| 2019–20 | Roam / Obsidian | **Bidirectional links + auto-backlinks + block transclusion** (Roam); same model **local-first / data-owned** (Obsidian) |

The throughline: the field moved from *capture* (wikis) → *connect-to-work* (Confluence/Jira) →
*structure as data* (Notion) → *networked links* (Roam/Obsidian) → *enforced freshness*
(Guru/Document360). ALH should harvest the *last two* selectively and is, in several places,
**already past** the others.

---

## 2. The block / document model — and why ALH already separates what Notion fused

**Notion's bet** is literal in its schema, not a slogan: *everything is a block* — text, an image, a
list, a database row, even a page, all share one structure (UUID + **type** + **properties** +
**content** pointer + **parent** pointer). The decisive property is that **type is decoupled from
data**: changing a block's type doesn't touch its content. A database is "a collection of pages,"
and **every row is itself a page** carrying *both* structured typed properties *and* a free-form
block body. This is what blurs structured vs unstructured knowledge: a record is simultaneously a
typed row and a document. (Source: notion.com/blog/data-model-behind-notion.) The lineage Notion
itself cites is **Engelbart** ("augment human intellect") and the "software as LEGO" toolmaking
thesis — *not* Bret Victor (§11).

**The challenge to conventional wisdom — and where ALH is ahead.** Notion's genius (one universal
primitive) is, for an *execution* system, a *liability*: when meaning, structure, and work all live
in the same mutable block, **nothing is immutable, nothing is deterministic, and nothing is
authoritative.** ALH made the opposite — and, for its purpose, stronger — bet:

- **Meaning** lives in the **FED** (M1) — implementation-independent, approved, frozen.
- **Structure** lives in the **IR (M2) → Project (M3)** — deterministic, immutable, fully traceable.
- **Work / free-form knowledge** lives *only* in **M4**.

Notion fuses these into one editable substrate; ALH deliberately splits them. For a knowledge wiki,
fusion wins (flexibility). For a system that must produce auditable, non-fabricated plans, **the
split wins** — it is the entire reason M2/M3 can be deterministic and the plan can be trusted.
**Verdict: ALREADY SOLVED BETTER.** ALH should *not* adopt the universal-block model; it should keep
M4 as the single typed-but-mutable surface and resist letting free-form blocks leak upstream.

---

## 3. Where organizer knowledge lives in ALH (and where the learning loop belongs)

This is the central section. It answers the four prompt questions (a)–(d) directly.

### 3.1 (a) Free-form organizer knowledge / notes / rationale — it lives in M4, as an overlay

Per canon, **M4 already owns** "notes, internal communication, decisions, approvals, attachments,
collaboration" (`EVENT_MANAGEMENT_ENGINEERING.md`, `CRM_ENGINEERING.md`). This is correct and
sufficient *as a home*. The open engineering question is **how M4 knowledge stays connected to a
specific work package without polluting the immutable plan.** The answer the architecture already
implies, and which the knowledge-systems lineage validates, is the **overlay**:

- M4 knowledge is **attached to** Project elements **by reference** (`projectRef`/task-ref), never
  **into** them. The Project/IR/FED stay immutable; the note, the rationale, the decision is a
  separate, attributed object pointing *at* a work package.
- This is conceptually a **one-directional, typed backlink** (see §4): the overlay knows which work
  package it annotates; the work package is not rewritten. ALH's existing provenance chain
  (`projectRef → irRef → fedRef`) is the *plan's* traceability; the M4 overlay adds a parallel
  **annotation graph** *over* that frozen plan.

**This is exactly the wiki-avoidance discipline:** organizer knowledge is *connected to* work
(knowledge-in-context) without *becoming* the work or mutating the plan. M4 is an overlay, not a wiki.

### 3.2 (b) The missing PLAYBOOK / TEMPLATE-MEMORY concern — the learning loop is "nowhere yet"

There are two distinct loops in ALH, and only one exists:

- **Exists — the KB-update loop** (`OPE_LEARNING_ARCHITECTURE.md`): event *actuals/corrections/
  incidents* become *proposed knowledge updates*, promoted **Local → Regional → Global/Pattern**,
  gated **auto / organizer / expert**, feeding regional pricing, no-show buffers, ratios. Safety only
  *tightens* and only via expert; **pattern skeletons are never rewritten by data alone.** This is a
  *parameter/knowledge-block* loop.
- **Does NOT exist — the closed-project → reusable-pattern/template loop.** `OPE_PATTERN_LIBRARY.md`
  patterns are **authored**, not learned from closed projects. `CRM_ENGINEERING.md §7` states the
  honest verdict outright: cross-event memory is "a future cross-cutting concern — its own layer,
  not yet built… owned by none of them." M8 today *emits learning signals* (variance-with-reason,
  reputation/reliability logical events) but there is **no mechanism that turns a closed project into
  a reusable pattern that strengthens future Discovery (M1) or OPE (M2).**

**This is the single most valuable idea in this part for ALH.** Notion's *database templates* and
Confluence's *blueprints* solve precisely "turn one project's structure into the starting point for
the next." The knowledge-systems insight is that **a template is a *frozen pattern extracted from a
worked example*** — which is exactly what a closed ALH project is.

**Where it should live — explicitly, not nowhere:** a **learning loop owned by M8, emitting to M1/M2
through the existing expert-gated promotion path.** M8 already reconciles actuals against the frozen
baseline; closure is the natural point to *propose* (never auto-commit) a pattern/template
candidate. The candidate flows through the **same expert review gate** that
`OPE_LEARNING_ARCHITECTURE.md` already mandates for pattern-skeleton changes — preserving the
invariant that *data never silently rewrites a pattern or the deterministic transform*. The loop is
**explicit, expert-gated, and one-directional** (M8 proposes → expert approves → M1/M2 strengthen);
it is **not** an automatic feedback edge into the deterministic engine. **Verdict: INVESTIGATE
FURTHER (highest priority).**

### 3.3 (c) Decision records / rationale capture for M4

M4 already "owns decisions/approvals," but `REAL_ORGANIZER_DECISION_MODEL.md` notes pre-mortem and
go/no-go rationale "has no structured home (only free-form notes/decisions in M4)." The ADR lineage
(§5) is the precise fix: a **lightweight, append-only, superseded-never-edited decision record**
attached to the Project by reference. This *fits* the two existing (unbuilt) proposals — go/no-go as
a "human-gated M4 transition that records the decision," and M4 collaboration as an "append-only,
attributed timeline where corrections are new entries." **Verdict: ADOPT the ADR *shape* (immutable,
superseding, rationale + consequences) for M4 decision capture; M4.**

### 3.4 (d) Knowledge verification / freshness — mostly *not* relevant to ALH, with one exception

Guru's verification engine answers "is this free-form page still true?" — a question that **mostly
does not arise in ALH** because the upstream artifacts are *immutable and versioned by construction*
(an immutable FED cannot go stale; it is superseded by a new event, not silently rotten). So the
core Guru mechanism is **already solved better** for the *plan*. **The one place freshness genuinely
applies is the M4 overlay knowledge and any reusable templates from §3.2** — free-form organizer
knowledge and harvested playbooks *can* decay. There, a *staleness signal* (not a heavyweight
verification queue) is warranted. See §6 and §10.

---

## 4. Bidirectional links / backlinks vs ALH provenance — ALH's is the stronger engine

**The idea.** Roam (2019) popularized `[[wiki-links]]` that auto-create **backlinks** and
**block-level transclusion** (every bullet has an ID, embeddable anywhere); Notion added backlinks
in Sept 2020 and *synced blocks* (transclusion) in June 2021; Obsidian brought the same model
local-first. A backlink answers "what references this?" — turning a pile of pages into a graph
("networked thought").

**The challenge to conventional wisdom.** A wiki backlink is a *weak, untyped, symmetric, mutable*
edge: it says "page A mentions B" but not *why*, not *which direction the dependency runs*, and both
ends can be edited freely. **ALH's provenance chain is a stronger relative of the same idea.** Every
Project element carries `source_refs ≥ 1` and traces `projectRef → irRef → fedRef`, with explicit
provenance (`source_module`, `pricing_source`, rule that produced it) — a **typed, directional,
immutable, *explanatory* link**. Where a backlink lets you *navigate*, ALH provenance lets you
**explain and audit** any line back to the meaning that justified it.

**Conclusion:** ALH's traceability is **already a better "knowledge-in-context" engine than wiki
backlinks** for the *plan*. The only thing to *borrow* from the backlink lineage is the **M4
annotation graph** (§3.1): typed, one-directional references *from* overlay knowledge *to* work
packages — backlinks pointed the safe way, so they connect without mutating. **Verdict: ALH plan
provenance = ALREADY SOLVED BETTER; adopt one-directional typed M4 annotation links only.**

---

## 5. Decision records / ADRs — the cleanest idea to import wholesale (into M4)

**Origin and problem.** Michael Nygard, "Documenting Architecture Decisions" (15 Nov 2011): "one of
the hardest things to track… is the *motivation behind certain decisions.*" A newcomer facing an
undocumented decision can only "blindly accept" it (stay constrained by an outdated choice) or
"blindly change" it (break a requirement they didn't know it protected). The fix is a short,
numbered record with five parts — **Title · Status (proposed/accepted/superseded/deprecated) ·
Context (forces, value-neutral) · Decision (active voice, "We will…") · Consequences (all of them,
not just the good ones)**.

**The two load-bearing engineering moves** (both already native to ALH's worldview):

1. **Immutability via supersession.** "If a decision is reversed, we will keep the old one around,
   but mark it as superseded." You write a *new* record; you never edit the accepted one. This is
   **the same discipline as ALH's immutable upstream + overlay-only edits + append-only log** — ADRs
   are simply that discipline applied to *human rationale*.
2. **Append-only numbered log.** "Numbered sequentially and monotonically. Numbers will not be
   reused." A *decision log* is the durable organizational memory of *why*. (MADR later enriched the
   format with explicit *Considered Options + per-option pros/cons*; the Y-statement compresses it to
   one line that *forces* naming the rejected alternatives.)

**Why it fits ALH perfectly.** ALH already commits to immutable artifacts, append-only event logs,
and overlay-only edits — the ADR is *isomorphic* to ALH's own architectural instincts (the repo even
keeps `ADR_001`/`ADR_002` for its own architecture). Bringing the *shape* into M4 gives organizer
rationale a structured, immutable, auditable home without any wiki. **Verdict: ADOPT (M4).**

---

## 6. Knowledge that decays — Guru's verification engine, narrowly applicable

**The mechanism (Guru, founded 2013, launched ~2015).** Every Card carries: a **verifier**
(accountable owner/expert), a **verification interval** (30/60/90 days, 6mo, 1yr, or never) that
lapses the Card to **Unverified** and re-queues it with reminders, a visible **trust badge**
(Verified/Unverified/None), and a workspace-level **Verification Score** (% verified, recommended
≥80%) with a *Verification Health* dashboard that ranks "most urgent cards to verify" by view count.
Auto-archive removes content unverified ~6 months *and* unviewed. AI answers are **RAG over the
team's own verified content** with first-class citations, and unverified sources get routed to
experts — a "verification flywheel." (Sources: help.getguru.com.)

**Why it mostly does not apply to ALH — and where it does.** Guru exists to fight decay in
*free-form, human-maintained pages*. ALH's **FED/IR/Project cannot decay**: they are immutable and
superseded, not edited; a stale plan is impossible by construction. So Guru's core engine is
**ALREADY SOLVED BETTER** for the plan. **The exception is exactly the two free-form surfaces:**

- **M4 overlay knowledge** (notes, rationale) — can drift relative to the live project state.
- **Harvested templates/playbooks** (§3.2) — a pattern extracted from a 2024 project may not reflect
  2026 reality.

For these, ALH should borrow the *lightest* Guru idea — a **freshness/staleness signal with an
owner**, akin to Document360's *review reminder → Stale state* (a red dot; the article stays live)
rather than Guru's full verification queue. The borrowed concept is "**knowledge that no one has
re-confirmed since date X gets a visible, non-blocking staleness mark and an owner**," not a
heavyweight workflow. **Verdict for templates/overlay: INVESTIGATE FURTHER (M4 overlay; M8 template
memory). Verdict for the plan: ALREADY SOLVED BETTER.**

---

## 7. Templates, blueprints, and playbooks — the reusable-pattern idea

**The idea, across systems.** Confluence **blueprints** are "templates *with added functionality*"
— pre-structured page types (Meeting notes, Decision, Product requirements, Retrospective) that *do
something*. Notion **database templates** predefine *both* property values and the page-body block
structure, so every new row (project/ticket) is *born* with the same skeleton; a database can set a
**default template**. The deep idea: **a template is a frozen, reusable abstraction of a worked
structure** — and the highest form is "this closed project becomes the starting structure for the
next one."

**How this maps to ALH — and the important distinction.** ALH *already has* authored templates: the
**Pattern Library** (`OPE_PATTERN_LIBRARY.md` — ~10 base Patterns × content × modifiers) and
knowledge blocks (`OPE_KNOWLEDGE_MODEL.md`). What it lacks is **learned** templates: patterns/
playbooks *extracted from closed projects*. The knowledge-systems lineage shows the missing piece is
not "templates" (ALH has them) but the **harvest step** — §3.2's M8 → expert → M1/M2 loop. **Verdict:
templates as a concept = ALREADY SOLVED (authored); template-*memory from closed projects* =
INVESTIGATE FURTHER (M8 → M1/M2, expert-gated).**

---

## 8. Versioning, history, and search — small borrows, mostly already covered

- **Versioning/history.** Notion records page snapshots every ~10 min; Confluence/Document360 keep
  per-page version history with diff/rollback. ALH's equivalent is *stronger in kind*: upstream is
  **immutable and superseded** (versioning is intrinsic, not a snapshot afterthought), and M4 should
  be **append-only** (`CRM_ENGINEERING.md`). **Verdict: ALREADY SOLVED BETTER** for the plan; for M4
  the borrow is "append-only timeline, corrections are new entries" (already proposed).
- **Search/retrieval.** Guru's *knowledge-in-context* (surface the right card inside the tool you're
  in, via Knowledge Triggers) is the genuinely good retrieval idea. ALH's analog is **in-workspace,
  work-package-scoped retrieval** — surface the relevant overlay note / decision / harvested playbook
  *next to the task it pertains to*, scoped by `projectRef`. This is knowledge-in-context done the
  ALH way: scoped by the immutable structure rather than by client-side keyword matching. **Verdict:
  INVESTIGATE FURTHER (M4), low urgency.**
- **Structured vs unstructured.** Document360's *content health* (readability, broken-link, no-result
  search queries as content-gap signals) and Guru's gap detection are mostly out of scope for an
  execution system. The one transferable signal: **"searches that returned nothing"** is a cheap
  content-gap detector that could feed the §3.2 learning loop. **Verdict: REJECT for the plan; note
  for the learning loop only.**

---

## 9. Where organizer knowledge lives in ALH (consolidated map)

```
          MEANING            STRUCTURE                     WORK (mutable)            MEMORY
   ┌──────────────────┐  ┌──────────────────────┐  ┌────────────────────────┐  ┌──────────────┐
   │ FED (M1)         │  │ IR (M2) → Project(M3) │  │ Organizer Workspace M4 │  │ Closure  M8  │
   │ immutable,       │  │ deterministic,        │  │ — notes                │  │ — reconcile  │
   │ approved concept │  │ immutable,            │  │ — internal comms       │  │ — emit       │
   │                  │  │ provenance chain      │  │ — attachments          │  │   learning   │
   │                  │  │ projectRef→irRef→fedRef│ │ — DECISIONS / rationale│  │ → propose    │
   └──────────────────┘  └──────────────────────┘  │ — collaboration        │  │   PATTERN/   │
            ▲                      ▲                │  (append-only overlay) │  │   TEMPLATE   │
            │                      │                └───────────┬────────────┘  └──────┬───────┘
            │   expert-gated promotion (learning loop)          │ typed, one-directional │
            └───────────────────────────────────────────────────┘  annotation links      │
                                          ▲                         (to work packages)    │
                                          │                                               │
                                          └───────────  M8 → expert → M1/M2  ◄────────────┘
                                                 (closed project becomes reusable pattern)
```

- **Free-form organizer knowledge → M4**, as an **overlay** referencing work packages
  (`projectRef`), never mutating the plan.
- **Decisions/rationale → M4**, in **ADR shape** (immutable, superseding, context+consequences).
- **The learning loop → owned by M8, emitting to M1/M2 through the existing expert gate.** Today it
  is "nowhere yet"; it should be **explicit and expert-gated**, never an automatic edge into the
  deterministic engine.
- **Freshness signal → only on M4 overlay knowledge and harvested templates**, lightweight
  (Document360-style *Stale* mark + owner), never on the immutable plan.

---

## 10. Extraction matrix

| # | Idea | Problem it solves | Origin | Universal? | ALH today | Owning module | Verdict |
|---|------|------------------|--------|-----------|-----------|---------------|---------|
| 1 | Universal typed **block** model | One substrate for docs + structured data | Notion (Engelbart lineage) | No — flexibility tool, not execution tool | Deliberately split: FED / IR-Project / M4 | — | **ALREADY SOLVED BETTER** — keep the split; don't fuse |
| 2 | **Bidirectional links / backlinks** | "What references this?" navigation | Roam 2019; Notion 2020 | Partially | Provenance chain `projectRef→irRef→fedRef` (typed, immutable, *explanatory*) | M2/M3 (plan); M4 (overlay) | **ALREADY SOLVED BETTER** for plan; **ADOPT** one-directional typed links for M4 overlay |
| 3 | **Transclusion / synced blocks** | Reuse content without copying | Nelson; Roam; Notion 2021 | No | Immutability + reference, not duplication | — | **REJECT** (mutable shared blocks conflict with immutable plan) |
| 4 | **Decision records / ADRs** | *Why* a decision was made gets lost | Nygard 2011; MADR | Yes | M4 "owns decisions" but rationale "has no structured home" | **M4** | **ADOPT** (immutable, superseding, context+consequences) |
| 5 | **Verification engine** (owner+expiry+badge+score) | Free-form pages rot silently | Guru 2013/15 | Yes for wikis | Plan can't decay (immutable/superseded) | M4 overlay; M8 templates | **ALREADY SOLVED BETTER** for plan; **INVESTIGATE** light staleness signal for overlay/templates |
| 6 | **Freshness / Stale state** (review reminder) | Lighter decay signal than full verification | Document360 2017/18 | Yes | None for free-form surfaces | M4 overlay; M8 templates | **INVESTIGATE FURTHER** (non-blocking *Stale* mark + owner) |
| 7 | **Templates / blueprints** (authored) | Reusable structure for the next thing | Confluence; Notion DB templates | Yes | Pattern Library + knowledge blocks (authored) | M2 (patterns) | **ALREADY SOLVED** (authored patterns exist) |
| 8 | **Template-memory from closed work** | Turn one project's learnings into the next's starting pattern | (implicit in templates) | Yes | "Nowhere yet" (`CRM_ENGINEERING.md §7`) | **M8 → M1/M2 (expert-gated)** | **INVESTIGATE FURTHER (highest priority)** |
| 9 | **Knowledge-in-context delivery** | Surface knowledge where work happens | Guru triggers; Confluence/Jira | Yes | Provenance is in-context for plan; overlay not yet scoped-surfaced | M4 | **INVESTIGATE FURTHER** (low urgency) — surface overlay/playbooks by `projectRef` |
| 10 | **Page version history** (snapshots) | Recover/inspect prior states | Wikis; Notion; Confluence | Yes | Immutable+superseded upstream; M4 should be append-only | M4 | **ALREADY SOLVED BETTER** for plan; append-only for M4 |
| 11 | **Docs-connected-to-work** (Jira links) | Documentation drifts away from the work | Confluence + Jira 2004+ | Yes | M4 overlay references work packages | M4 | **ADOPT** (overlay-by-reference; = idea #2) |
| 12 | **Content-gap signal** (no-result searches) | Detect what knowledge is missing | Document360; Guru | Partially | None | M8 learning loop | **REJECT** for plan; note as a learning-loop signal only |

---

## 11. Challenges to conventional wisdom (and corrected premises)

1. **"Adopt a wiki / block model for organizer knowledge" — rejected.** The knowledge-systems field
   prizes the *universal mutable block* (Notion) and *free-form pages* (wikis). For an execution
   system that must produce auditable, non-fabricated plans, that is the **failure mode**, not the
   goal. ALH's separation of meaning/structure/work is *stronger* than fusion. The win is to keep M4
   as a disciplined overlay, not to wiki-fy it.
2. **Backlinks are the weaker cousin of provenance.** A backlink is untyped, symmetric, and mutable;
   ALH's provenance is typed, directional, immutable, and *explanatory*. ALH should not adopt
   backlinks for the plan — it already has something better. Borrow only the *one-directional
   annotation link* for M4.
3. **Verification engines fight a problem ALH largely doesn't have.** Immutable, superseded artifacts
   cannot rot. Guru's whole machine is moot for the plan; it matters *only* for the two free-form
   surfaces (overlay + harvested templates), and there a Document360-style *non-blocking* staleness
   mark beats a Guru-style verification queue.
4. **The genuinely missing thing is not "templates" but the *harvest loop*.** ALH has authored
   templates; what it lacks is the M8 → expert → M1/M2 path that turns a closed project into a
   reusable pattern. This is the highest-value idea in this part, and the canon already admits it is
   "nowhere yet."
5. **Sourcing/attribution flags (do not repeat as fact):** "knowledge half-life" is **not** Guru's
   term (Machlup/Arbesman); Guru's term is *stale/staleness*. Notion does **not** cite Bret Victor
   (Engelbart is the cited lineage). WikiWikiWeb backlinks trace to the **1997 CvWiki clone**, not
   the 1995 original. Notion's internal concurrency algorithm (OT vs CRDT) is **unverified** — do not
   state it. Guru's LLM provider (OpenAI) is single-sourced and not first-party-confirmed. ALH's
   M-numbering collides (build-sequence M1–M7 ≠ pipeline-module M1–M8) — this doc uses the latter.

---

## 12. Top ideas for ALH (ranked, module + verdict)

1. **Template-memory / learning loop from closed projects** — turn a closed M8 project into a
   *proposed* reusable pattern/playbook that strengthens M1 (Discovery) and M2 (OPE), through the
   **existing expert-gated promotion path**. Explicit, one-directional, never an automatic edge into
   the deterministic engine. → **M8 → M1/M2 · INVESTIGATE FURTHER (highest priority).**
2. **ADR-shaped decision records in M4** — immutable, superseding, with Context + Decision +
   Consequences; gives organizer rationale (go/no-go, pre-mortem) a structured, auditable home.
   → **M4 · ADOPT.**
3. **M4 overlay = knowledge attached to work packages by reference** — typed, one-directional
   annotation links (`projectRef`) so notes/comms/decisions stay connected to work *without* mutating
   the immutable plan; append-only, corrections-as-new-entries. → **M4 · ADOPT.**
4. **Lightweight staleness signal for the two free-form surfaces** (M4 overlay + harvested
   templates) — Document360-style *Stale* mark + owner, non-blocking; *not* applied to the immutable
   plan. → **M4 overlay; M8 template memory · INVESTIGATE FURTHER.**
5. **Work-package-scoped knowledge retrieval** — surface relevant overlay notes / decisions /
   harvested playbooks next to the task they pertain to, scoped by the immutable structure
   (knowledge-in-context, ALH-style). → **M4 · INVESTIGATE FURTHER (low urgency).**
6. **Reject the universal-block / mutable-transclusion / backlink-for-the-plan ideas** — ALH's
   meaning/structure/work split and provenance chain are already stronger for an execution system.
   → **ALREADY SOLVED BETTER.**

---

## Non-goals of this document

- It does **not** modify code, schema, migrations, the OPE engine, or any architecture doc.
- It does **not** redesign ALH, rename modules, or create new modules; it maps ideas onto M1–M8.
- It does **not** propose building anything — verdicts (ADOPT/INVESTIGATE) are *research conclusions*
  for later specification, not implementation instructions.
- It does **not** turn the Organizer Workspace into a wiki; every borrow is constrained to preserve
  immutable upstream artifacts, deterministic M2/M3, and overlay-only/append-only M4.
