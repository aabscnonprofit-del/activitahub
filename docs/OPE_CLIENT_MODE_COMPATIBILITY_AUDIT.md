# OPE — Client-Mode Compatibility Audit

> **Type:** consistency audit. **Not** a redesign, new architecture, or replacement document.
> **Scope (read-only):** `MASTER_PRODUCT_DECISIONS.md`, `OPE_MASTER_SPEC.md`,
> `OPE_EVENT_LIFECYCLE.md`, `EVENT_REQUEST_MARKET_ARCHITECTURE.md`.
> **Measured against:** the new *Client-Mode* model — classify clients by **how clearly they
> understand what they want** (Modes 1–4), with the chain
> `Request → Client Mode Detection → Organizer Conversation → What Should Happen → Approval → Plan → Execution`.

---

## 1. Executive summary

The new model adds **two** ideas the current architecture does not have:
1. **Client Mode Detection** — routing by *understanding* (does the client already know
   "what should happen", know only a result, know only a direction, or know nothing), not by
   event category or operational completeness.
2. An **Organizer Conversation / Discovery layer** that *uncovers or formulates the desired
   outcome* for Modes 2–4 — distinct from the existing operational clarification.

The audit finds the architecture **already provides the foundation** for this model — the
*"what should happen"* glossary (MASTER, recently added), an *approval-before-planning* rule,
two `UNKNOWN → ASK` loops (OPE clarification + Event-Request qualification), a `route_decision`
primitive, the *"category = metadata"* stance, and the "Mode 1" recognition primitive
(`recognizeScenario`, already implemented though not in these four docs).

What is **missing** is the *concept itself*: no document classifies clients by understanding,
and the existing `UNKNOWN → ASK` loops resolve **operational facts** (venue, count, budget,
date), **not** the desired outcome. The residual **category-first / direct request→plan**
wording (`Wedding is the template`, `Intake → Classification (direct)`, lifecycle `request →
plan`) is in tension but already softened by *"plans are built around what should happen, not
around a category."*

**Verdict (stated fully in §5):** the architecture supports the model with **significant but
additive extensions** — **no structural redesign** of the engine or the market is required;
two new conceptual layers must be *added* and the category-first phrasing reconciled.

---

## 2. Findings by document

### 2.1 MASTER_PRODUCT_DECISIONS.md

**Compatible sections**
- §5: *"**Categories are metadata** — an event category … is a helpful label and pricing key,
  **not** the core of the system. **Plans are built around what should happen, not around a
  category.**"* — directly endorses *understanding/outcome over category*.
- Glossary (canonical model): *"**What should happen** — … obtained or created from the Request
  and approved **BEFORE planning begins** …"* and *"**OPE** — turns a Request into an **approved
  'what should happen', and only then into an Event Plan**."* — this **is** the spine of the new
  chain (`Request → What Should Happen → Approval → Plan`).
- §5: *"**Many valid sources for a plan** — templates, … archive, AI ideas, or an imported
  plan; no single source is privileged"* and *"AI idea generation is **optional** … used **only
  when** the organizer or customer wants help **creating the event concept**."* — implicitly
  allows different client starting points (Mode 1 vs Mode 4).

**Potential conflicts**
- §11.6 Single Engine Strategy: *"Knowledge Base and Pricing logic … **authored once per
  category (Wedding is the template)**."* — **category-first** content model. *(Tension, not
  contradiction: it concerns knowledge authoring, not client routing.)* — **Minor.**
- §11.6 also frames the Core as *"**request → event plan**"* — a **direct request→plan**
  shorthand that omits the new intermediate (mode → conversation → what-should-happen). The
  glossary already supersedes it, so this is stale phrasing. — **Minor.**
- §6 *"Marketplace Mode / Direct Organizer Mode"* are **routing** modes (where the request
  goes), not **understanding** modes — a name collision worth noting (the new model's "Mode"
  means something different). — **Minor.**

**Missing elements**
- **Client Mode Detection** — absent. The doc distinguishes Ready Activities vs Event Requests,
  and Marketplace vs Direct routing, but **never by how clearly the client understands what they
  want**. — **Major.**
- The *"same category, completely different organizer workflow"* insight (Case A vs Case B
  birthday) is **not represented**: an event category carries no signal about understanding. —
  **Moderate.**
- **Organizer Conversation / discovery-of-outcome** is implied ("creating the event concept")
  but not defined as a distinct step that *uncovers/formulates the desire*. — **Moderate.**

### 2.2 OPE_MASTER_SPEC.md

**Compatible sections**
- §3 terminology note (recently aligned): *"the **'Scenario' object** … is the **input/request
  contract**, not the canonical pre-planning object. … OPE must first obtain or create an
  approved **'what should happen'** … before planning."* — explicitly separates input from
  "what should happen".
- §4 Classification emits `route_decision ∈ {self_serve, recommend_organizer}` — a **routing
  primitive** that *could host* mode-based routing (it currently routes by complexity/scale).
- Appendix A includes a **`Stage -1 Concept Funnel … IDEA-FIRST … understand the dream → …`**
  pre-stage — an existing, additive entry point ahead of classification (a partial Mode-2/3
  on-ramp).
- §1: *"Category **labels and helps select knowledge; it does not determine the Event Plan by
  itself** — the request's needs drive module selection."* — anti-category-determinism.
- The **clarification loop** (`UNKNOWN → ASK; never UNKNOWN → INVENT`) is a reusable
  *discovery primitive*.

**Potential conflicts**
- **Canonical pipeline** (§15 / App. A): *"**Intake → Classification (direct) → Assembly → …**"*
  — the word **"(direct)"** is an explicit **request→classification→plan** transition with
  **no mode-detection or discovery stage** between intake and planning. — **Moderate.**
- §4 Classification is *"**Stage 1 — first engine after intake**"* and **assigns a category**
  first — **category-first ordering** of the pipeline (understanding is not the first axis). —
  **Moderate.**
- Scenario-as-input naming (`PlannerInput → Scenario`) still risks **scenario-first**
  conflation, though the terminology note mitigates it. — **Minor.**

**Missing elements**
- **Client Mode Detection** — absent. Classification detects *category + scale/complexity +
  route*, never *understanding-mode*. — **Major.**
- A **discovery workflow that produces "what should happen"** is not a pipeline stage; the
  clarification loop fills **operational** gaps, not the desired outcome. (The newer "what
  should happen" gate lives in code, not in this spec's stage list.) — **Major.**

### 2.3 OPE_EVENT_LIFECYCLE.md

**Compatible sections**
- States `Draft → Planning → Ready` with a **clarification loop** inside Planning
  (`gate (ADR-002) → clarification loop → knowledge → calc → risk`) — an existing place a
  discovery/what-should-happen step could attach, and the loop already supports **iteration**
  (`Planning → Draft → Planning`).
- A refusal/handoff path exists (`unsupported / needs_*` never reaches Ready) — a structural
  hook for "needs a human/organizer" outcomes (relevant to Modes 2–4 escalation).

**Potential conflicts**
- The lifecycle is explicitly *"the bridge between … **request → plan** …"* and its
  clarification loop asks **operational** facts (*"clarification asks venue → 'public park'"*) —
  a **direct request→plan**, operational-only framing with **no "what should happen" state**. —
  **Moderate.**
- **Approval** in this doc = the **`Ready`** state = *"a reviewed, approved `plan_ready`
  plan"* — i.e. approval of the **finished plan, after** knowledge/calc/risk — the **inverse**
  of the new model's *"What Should Happen → Approval → Plan"* (approve the story **before**
  resourcing). — **Moderate.**

**Missing elements**
- **No "What Should Happen (approved)" lifecycle state** between `Draft` and a resourced plan.
  — **Moderate.**
- **No Client Mode** concept; a Mode-1 client (knows everything) and a Mode-3/4 client traverse
  the **same** `Draft → Planning` states with no differentiation. — **Major.**
- **No discovery/conversation phase** — the only pre-plan interaction is the operational
  clarification loop. — **Moderate.**

### 2.4 EVENT_REQUEST_MARKET_ARCHITECTURE.md

**Compatible sections**
- §2 Request qualification: *"**UNKNOWN → ASK, never invent the customer's intent**: if
  location, type, date, or scale is missing/ambiguous, the market **asks the customer**"* — a
  customer-facing **ask primitive** (the demand-side analog of the clarification loop) that the
  discovery/conversation layer could build on.
- Clean **handoff boundary**: *"**Matching ends; planning begins**"* / *"its responsibility ends
  at the handoff … it does **not** own planning (OPE)."* — keeps mode/discovery concerns
  cleanly assignable to OPE, not the market.
- `Request → … → Matched → Planning → OPE` flow leaves planning to OPE — so adding mode/discovery
  inside OPE does **not** disturb the market's contract.

**Potential conflicts**
- Qualification asks only **operational** facts (*location, type, date, scale*) — it does **not**
  determine the client's **understanding-mode** or the **desired outcome**; a Mode-2/3/4 request
  is qualified the same way a Mode-1 request is. — **Moderate.**
- §0 capability matching is by *"Event Type / Capability (pattern/**category** capability)"* —
  organizer matching is **category-capability-first**, with no notion of *which mode of help the
  client needs* (a "discovery-heavy" vs "execute-only" request matches identically). — **Minor.**

**Missing elements**
- **Client Mode Detection** before/at matching — absent. — **Moderate** *(the market is a
  reasonable place for it, but it is not required there; OPE could own it).* 
- A signal carried into the handoff describing **how much discovery the request needs** — absent.
  — **Minor.**

---

## 3. List of contradictions

| # | Where | Contradiction with the new model | Severity |
|---|---|---|---|
| C1 | OPE_MASTER_SPEC App. A / §15 | *"Intake → Classification **(direct)** → … → Plan"* — a direct request→plan path with no mode/conversation/what-should-happen stage. | Moderate |
| C2 | OPE_MASTER_SPEC §4 | Classification (category) is *"Stage 1 — first engine after intake"* — **category-first ordering**, not understanding-first. | Moderate |
| C3 | OPE_EVENT_LIFECYCLE §1 | **Approval = `Ready` = approved finished plan** (after resources/risk) — inverse of *"What Should Happen → Approval → Plan"*. | Moderate |
| C4 | OPE_EVENT_LIFECYCLE §1 | Lifecycle is *"request → plan"* with an **operational-only** clarification loop and **no what-should-happen state**. | Moderate |
| C5 | MASTER §11.6 | *"authored once per **category** (Wedding is the template)"* + *"request → event plan"* — category-first content + direct-chain shorthand. | Minor |
| C6 | MASTER §6 / ERM §0 | "Mode" already means **routing** (Marketplace/Direct) and matching is **category-capability**-first — name collision + no understanding-mode in matching. | Minor |

*(No hard contradictions were found in MASTER's glossary or §5 — those already align with the
new model; the contradictions are residual category-first / plan-first phrasing elsewhere.)*

## 4. List of missing elements

| # | Missing element | Documents lacking it | Severity |
|---|---|---|---|
| M1 | **Client Mode Detection** (classify by understanding, not category) — the central new idea | All four | **Major** |
| M2 | **Organizer Conversation / discovery-of-outcome** layer for Modes 2–4 (distinct from operational clarification) | All four (OPE clarification + ERM qualification are operational only) | **Major** |
| M3 | A **"What Should Happen (approved)" stage/state** in the *lifecycle* (present in MASTER glossary; absent from Lifecycle & ERM) | OPE_EVENT_LIFECYCLE, EVENT_REQUEST_MARKET | Moderate |
| M4 | Representation of *"same category → different workflow"* (Mode-1 vs Mode-3 birthday) | All four | Moderate |
| M5 | A **mode/discovery-need signal** carried request → match → OPE handoff | EVENT_REQUEST_MARKET, OPE_MASTER_SPEC | Minor |

## 5. Overall assessment

**Foundation present (strong):** MASTER's glossary already encodes *"what should happen ·
approved before planning · plan is its implementation"*, and *"plans are built around what
should happen, not around a category."* Two `UNKNOWN → ASK` loops, a `route_decision`
primitive, an idea-first `Stage -1`, a refusal/handoff path, and a clean market→OPE boundary
are all **reusable scaffolding** for the new model. The Mode-1 case (client already states the
story) is even recognised in implementation today.

**What the model adds is genuinely new but additive:** *Client Mode Detection* (M1) and a
*discovery/conversation layer* (M2) are **not present in any of the four documents**, and the
existing ask-loops resolve **operational facts**, not the **desired outcome**. These attach
*in front of / around* the current Intake → clarification → planning flow; they do **not**
require rebuilding the engine, the lifecycle, or the market. The category-first / plan-first
residue (C1–C5) is **wording reconciliation**, mostly already overridden by the MASTER glossary.

**Severity profile:** 2 Major (both *missing concepts*, M1/M2), 4 Moderate (C1–C4 phrasing +
M3/M4), several Minor. **No issue requires demolishing an existing structure** — the Majors are
*additions*, and the Moderates are *re-sequencing/renaming* against an already-decided glossary.

---

## Final conclusion

**The current architecture already supports the Client-Mode model with additions — it does
NOT require a structural redesign.**

- The **spine** of the new chain (*Request → What Should Happen → Approval → Plan → Execution*)
  is **already decided** in the MASTER glossary, and the engine/lifecycle/market expose the
  primitives (`route_decision`, `UNKNOWN → ASK` loops, idea-first `Stage -1`, refusal/handoff,
  clean market→OPE boundary) needed to host it.
- The model's two genuinely new pieces — **Client Mode Detection** and an **Organizer-Conversation
  / discovery layer that produces "what should happen" for Modes 2–4** — are **missing but
  additive**: they slot before/around the existing clarification and qualification loops.
- The remaining friction (**category-first ordering, "(direct)" request→plan, Ready-as-approval,
  "Wedding is the template"**) is **stale phrasing to reconcile against the already-updated
  glossary**, not a structural conflict.

**One caveat:** the additions are *non-trivial* — introducing a Mode-Detection concept and a
discovery-of-outcome step is more than cosmetic, and three of the four documents (Spec,
Lifecycle, ERM) would each need a small alignment so they stop reading as category-first /
plan-first. But the engine, the lifecycle, and the Event-Request market can remain structurally
as they are.

*(Audit only — no redesign, no new architecture, no implementation proposed.)*
