# OPE v1 — Organizer Planning Engine · Technical Design

> **Status:** Design only. No implementation. This document is the contract we build against.
> **Date:** 2026-06-03 · **Author:** drafted with Claude Code
> **Scope:** v1 — single-organizer, single-event planning assist inside the dashboard.

---

## 1. Summary & goals

**OPE (Organizer Planning Engine)** lets a certified organizer describe an event
**scenario** (e.g. "kids birthday, 15 guests, Barcelona, ~€600, garden, superhero
theme") and get back a **structured, editable plan** — phased timeline, task
checklist, resource/vendor needs, venue suggestions — together with a **cost
estimate** (low / likely / high). The organizer refines it and converts it into a
marketplace **activity**, a **client** engagement, or a shareable proposal.

### Goals (v1)
- Turn a short scenario into a credible first-draft plan in < 30s.
- Ground the plan in a curated **knowledge base** (not free-floating LLM guesses).
- Produce a **defensible cost estimate** with transparent line items — the LLM
  proposes items/quantities; **all money math is deterministic code**, never the LLM.
- Keep every plan **owned, private, and editable** by its organizer (RLS).
- Fit existing conventions: Supabase Postgres + RLS + `SECURITY DEFINER` RPCs,
  Next.js server actions, zod validation, next-intl, the `/dashboard` gate.

### Non-goals (v1 — explicitly later)
- No vector/embedding semantic search (KB retrieval is structured/tag-based in v1;
  pgvector is a documented future step).
- No automated vendor booking or live vendor marketplace integration.
- No multi-event / portfolio planning, no team collaboration on a plan.
- No customer-facing planner (organizer-only — per product decision 2026-06-03).
- No real-time pricing feeds; pricing is from a curated, versioned reference table.

### Who can use it
Reuse the existing dashboard gate (`middleware.ts`): **`role = certified_organizer`
(or `admin`) AND an `active` subscription.** OPE is a subscriber benefit; no new
role. Per-plan generation is metered (see §7.6 cost controls).

---

## 2. Architecture overview

```
 Organizer (dashboard, gated)
        │  1. scenario form (zod-validated)
        ▼
 Server Action: createPlan ──► planning_scenarios (row) ──► plans (status=generating)
        │
        │  2. enqueue generation (same request in v1; see §6.4)
        ▼
 Planner Workflow (server, Node runtime)
   a. retrieve KB context  ◄──── knowledge_entries  (by category + tags + region)
   b. Claude API call (tool-use / structured output)   [KB context prompt-cached]
   c. parse → plan skeleton: phases, tasks, resource lines, venue hints
   d. persist plan_items (kind = task | resource | cost_driver)
        │
        ▼
 Cost Estimation Engine (deterministic, server, pure TS)
   plan_items × knowledge_pricing × scenario drivers
     → cost lines (low/mid/high) → plans.cost_summary (JSONB) + plan status=ready
        │
        ▼
 Organizer reviews/edits ──► saved revisions ──► actions:
     convert→activity · attach→client · export PDF · share link
```

**New runtime dependency:** `@anthropic-ai/sdk` (Claude). Model: **Sonnet 4.6**
default for planning (fast, cheap, structured); **Opus 4.8** optional "deep plan"
toggle for complex/premium scenarios. Prompt caching on the KB + system prompt.

**Layering rule (critical):** the LLM is a *content* engine (what tasks, what
resources, suggested quantities). The **cost engine is a separate deterministic
module** that owns all arithmetic and currency. They never overlap. This keeps
estimates reproducible, testable, and auditable.

---

## 3. Database schema

New tables follow existing conventions: `uuid` PKs (`uuid_generate_v4()`),
`created_at/updated_at` with the shared `update_updated_at_column()` trigger, RLS
enabled with a `_select` + `_modify` policy pair, writes through `SECURITY DEFINER`
RPCs, JSONB for flexible/semi-structured fields. Proposed migration: **`017_ope.sql`**
(KB seed as `supabase/seed/ope_knowledge.sql`).

### 3.1 Enums

```sql
CREATE TYPE plan_status     AS ENUM ('draft','generating','ready','failed','archived');
CREATE TYPE plan_item_kind  AS ENUM ('phase','task','resource','cost_driver','note');
CREATE TYPE cost_basis      AS ENUM ('flat','per_guest','per_hour','per_unit');
CREATE TYPE knowledge_kind  AS ENUM ('timeline','task','resource','checklist','tip','regional');
```

Scenario **event type** reuses the existing `activity_category` enum (birthday,
wedding, glamping, …) — one taxonomy across marketplace + planner.

### 3.2 Tables

**`planning_scenarios`** — the validated input (what the organizer asked for).
```
id              uuid pk
organizer_id    uuid  → profiles(id)            -- owner (auth.uid())
category        activity_category               -- event type
title           text                            -- organizer-given name
params          jsonb  not null default '{}'    -- structured inputs (see §4)
locale          text   not null default 'en'
created_at / updated_at
```

**`plans`** — one generated plan per scenario revision.
```
id              uuid pk
scenario_id     uuid  → planning_scenarios(id) on delete cascade
organizer_id    uuid  → profiles(id)            -- denormalized for RLS/index
status          plan_status not null default 'draft'
model           text                            -- which Claude model produced it
summary         text                            -- short human overview
cost_summary    jsonb                           -- engine output (see §7.4)
generation_meta jsonb                           -- tokens, latency, kb_version, errors
created_at / updated_at
```

**`plan_items`** — ordered building blocks of a plan (timeline/tasks/resources/cost drivers).
```
id              uuid pk
plan_id         uuid  → plans(id) on delete cascade
parent_id       uuid  → plan_items(id)          -- phase grouping (nullable)
kind            plan_item_kind not null
position        int   not null default 0
title           text  not null
detail          text
-- cost-bearing fields (null for pure tasks/notes):
cost_basis      cost_basis
quantity        numeric
unit_price_ref  text                            -- FK-ish key into knowledge_pricing.item_key
est_low / est_mid / est_high  integer           -- minor units (cents), engine-filled
currency        text
meta            jsonb                            -- e.g. {duration_min, vendor_type, optional}
created_at / updated_at
```

**`knowledge_entries`** — curated planning knowledge (grounds the LLM). §5.
```
id          uuid pk
kind        knowledge_kind not null
category    activity_category               -- nullable = applies to all
region      text                            -- nullable = global (ISO country/city)
title       text not null
body        text not null                   -- markdown guidance
tags        text[] not null default '{}'
data        jsonb                           -- structured payload (timeline steps, task lists)
version     int  not null default 1
active      boolean not null default true
created_at / updated_at
```

**`knowledge_pricing`** — cost reference data (grounds the cost engine). §7.
```
id          uuid pk
item_key    text not null                   -- 'catering_per_head','venue_hour','photographer'
label       text not null
category    activity_category               -- nullable = generic
region      text                            -- nullable = global; resolution: exact→country→global
currency    text not null default 'usd'
basis       cost_basis not null
low / mid / high  integer not null          -- minor units per basis unit
version     int not null default 1
active      boolean not null default true
created_at / updated_at
UNIQUE (item_key, coalesce(category,'*'), coalesce(region,'*'), version)
```

**`plan_revisions`** (optional v1, recommended) — immutable snapshots for undo/audit.
```
id, plan_id → plans(id), snapshot jsonb (plan + items), created_by, created_at
```

### 3.3 RLS

KB tables are **read-only to authenticated users, writable only by admins/service**:
```sql
-- knowledge_entries / knowledge_pricing
CREATE POLICY "kb_select" ON knowledge_entries FOR SELECT
  USING (active OR is_admin());
-- no user write policy → only service role / admin via RPC seeds.
```
Organizer-owned tables mirror `activities`:
```sql
CREATE POLICY "scenarios_select" ON planning_scenarios FOR SELECT
  USING (organizer_id = auth.uid() OR is_admin());
CREATE POLICY "scenarios_modify" ON planning_scenarios FOR ALL
  USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());
-- plans / plan_items: same ownership, plan_items joined via plan_id → plans.organizer_id
```
Helper: `owns_plan(p_plan_id uuid) RETURNS boolean` (mirrors `owns_request`).

### 3.4 RPCs (`SECURITY DEFINER`, mirror existing transition fns)
- `create_planning_scenario(p_category, p_title, p_params jsonb) → scenario_id`
- `start_plan(p_scenario_id) → plan_id` (inserts `plans` row, status `generating`;
  enforces ownership + subscription via a guard like the booking flow).
- `save_plan_items(p_plan_id, p_items jsonb)` (replace-set, owner-checked; used by
  both the generator and manual edits).
- `set_plan_cost(p_plan_id, p_cost_summary jsonb, p_items jsonb)` (engine writeback;
  callable by service role from the cost step).
- `finalize_plan(p_plan_id, p_status)` / `archive_plan(p_plan_id)`.
- Reads with logic: `get_plan(p_plan_id)` (plan + nested items), `list_plans()`.

> The LLM/cost steps run server-side and write via the **service-role admin client**
> (same pattern as the Stripe webhook), so generation can populate rows the user's
> RLS client couldn't batch-write directly; the RPCs above re-check ownership.

---

## 4. Scenario storage

The scenario is the **typed, validated intent**. UI collects it; zod validates it;
it persists to `planning_scenarios.params` (JSONB) so we can evolve fields without
migrations. A zod schema is the source of truth and is versioned (`params._v`).

```ts
// lib/ope/scenario.ts  (design sketch — not implemented)
const ScenarioParams = z.object({
  _v: z.literal(1),
  guests: z.number().int().min(1).max(2000),
  date: z.string().date().optional(),
  durationHours: z.number().min(0.5).max(24).optional(),
  budgetMinor: z.number().int().nonnegative().optional(),  // organizer's target, cents
  currency: z.string().length(3).default('usd'),
  region: z.string().optional(),         // city/country for pricing + KB
  venueType: z.enum(['indoor','outdoor','both']).optional(),  // reuse location_type
  vibe: z.array(z.string()).max(8).default([]),               // 'cozy','luxury','kid-friendly'
  mustHaves: z.array(z.string()).max(20).default([]),
  constraints: z.string().max(2000).optional(),              // free text → LLM context
})
```

- **Why JSONB + zod**, not columns: scenario shape will churn; JSONB keeps schema
  stable; zod gives type-safety + server validation; `_v` lets us migrate params in
  code. Indexable bits (category, region) are promoted to real columns.
- **Immutability:** editing inputs creates a *new plan* under the same scenario (or
  a new scenario) rather than mutating a generated plan — keeps cost/plan reproducible.
- **PII:** scenarios may contain client hints; covered by RLS (owner-only) and never
  sent to third parties except the LLM provider (see §9 privacy note).

---

## 5. Knowledge base structure

The KB makes plans *grounded and consistent* instead of generic. Two stores:

1. **`knowledge_entries`** — planning know-how: timeline templates, task lists,
   resource checklists, regional tips. Authored by us/admins, versioned, tagged.
2. **`knowledge_pricing`** — cost references for the engine (§7).

### 5.1 Shape & authoring
- Seeded via `supabase/seed/ope_knowledge.sql` (idempotent `ON CONFLICT`, like phase9).
- Each entry scoped by `(kind, category, region)` with `tags[]` and a structured
  `data` payload. Example timeline entry:
  ```json
  { "kind":"timeline","category":"birthday",
    "data":{"phases":[
      {"key":"4w_before","title":"4 weeks before","tasks":["book venue","send invites"]},
      {"key":"1w_before","title":"1 week before","tasks":["confirm catering","buy supplies"]},
      {"key":"day_of","title":"Day of","tasks":["setup","run program","teardown"]}]} }
  ```

### 5.2 Retrieval (v1 = deterministic, no embeddings)
On generation, `start_plan` (or the workflow) selects KB context by:
`category = scenario.category` **and** (`region = scenario.region` OR `region IS NULL`)
**and** `active`, ordered region-specific-first, capped to a token budget.
Tags from `vibe`/`mustHaves` boost ordering. The selected entries are concatenated
into a compact **context block** injected into the Claude prompt and **prompt-cached**
(stable across plans → high cache hit rate, low cost).

> **Future (documented, not v1):** add `pgvector` + an `embedding` column to
> `knowledge_entries` for semantic retrieval when the KB grows beyond what tag/category
> filtering handles well. The retrieval function is the only thing that changes.

### 5.3 Versioning & quality
- `version` + `active` allow editing KB without breaking historical plans
  (a plan records `generation_meta.kb_version`).
- Admin-only authoring in v1 (no UI; seed files + SQL). A future `/admin/knowledge`
  CRUD is out of scope.

---

## 6. Planner workflow

### 6.1 Steps
1. **Intake** — organizer submits scenario form → `createPlan` server action →
   zod validate → `create_planning_scenario` → `start_plan` (plan `generating`).
2. **Ground** — fetch KB context (§5.2) + the organizer's existing **venues**
   (from `venues`) to let the planner suggest a real owned venue when it fits.
3. **Generate** — single Claude call with **tool-use structured output** (the model
   must return JSON matching our schema; the SDK enforces the tool schema). System
   prompt = role + rules ("propose items & quantities, never compute prices, use the
   provided knowledge, output only the tool call"). KB + system prompt are cached.
4. **Parse & persist** — validate the tool output with zod; map to `plan_items`
   (phases→tasks→resources/cost_drivers); `save_plan_items`.
5. **Estimate** — run the **cost engine** (§7) over the items → write
   `cost_summary` + per-item `est_*`; set status `ready`.
6. **Present** — revalidate `/dashboard/planner/[id]`; organizer sees the plan.

### 6.2 Structured output schema (LLM tool)
```ts
// the tool the model is forced to call (design sketch)
{
  summary: string,
  phases: Array<{
    key: string, title: string,
    items: Array<{
      kind: 'task'|'resource'|'cost_driver',
      title: string, detail?: string,
      // cost hints (engine decides final money):
      cost_basis?: 'flat'|'per_guest'|'per_hour'|'per_unit',
      quantity?: number,
      pricing_ref?: string,   // suggested item_key into knowledge_pricing
      meta?: object
    }>
  }>
}
```
The model maps resources to `pricing_ref` keys it's told about (we pass the list of
available `knowledge_pricing.item_key`s for the category/region in the prompt), so the
deterministic engine can price them. Unknown/again-free-text items get a flagged
"needs pricing" state rather than a hallucinated number.

### 6.3 Reliability
- **Validation + one repair retry:** if tool output fails zod, send the validation
  error back once for self-correction; on second failure → plan `failed` with a
  friendly message and a "retry" button. (Mirrors webhook idempotency mindset.)
- **Idempotency:** `start_plan` returns the same plan row if called twice for a
  scenario in `generating` (guard on status) — no duplicate spend.
- **Timeouts:** Node runtime, `maxDuration` set on the route; on timeout → `failed`.

### 6.4 Sync vs async (v1 decision)
v1 runs generation **inline in the server action** (typical < 20s with Sonnet) and
writes `generating → ready`. The schema already supports async (`status`,
`generation_meta`), so moving to a queue/edge function or webhook-style callback later
needs **no schema change** — just move steps 3–5 off the request. Recommend inline for
v1, revisit if p95 latency or serverless limits bite.

---

## 7. Cost estimation engine

A **pure, deterministic** TS module (`lib/ope/cost/`) — no LLM, no I/O beyond the
pricing table it's handed. Fully unit-testable; identical inputs → identical output.

### 7.1 Inputs
- `plan_items` with `cost_basis`, `quantity`, `pricing_ref`.
- Scenario drivers: `guests`, `durationHours`, `region`, `currency`.
- Resolved `knowledge_pricing` rows (region resolution: exact city → country → global).
- Config: `contingencyPct` (default 10%), optional `organizerMarginPct`,
  `platformFeePct` (reuse the marketplace fee constant if one exists).

### 7.2 Per-line computation
```
unitsFor(basis):
  flat       → 1
  per_guest  → guests
  per_hour   → durationHours
  per_unit   → item.quantity
line.est_low  = price.low  * units
line.est_mid  = price.mid  * units
line.est_high = price.high * units
```
All amounts are **integer minor units** (cents); rounding only at display. Currency
conversion is **out of scope v1** — pricing rows are expected in the scenario currency,
or flagged if mismatched (no silent FX).

### 7.3 Aggregation
```
subtotal_{low,mid,high} = Σ line.est_*
contingency_*           = round(subtotal_* * contingencyPct)
total_*                 = subtotal_* + contingency_* (+ margin/fee if enabled)
```
Output a **range** (low / likely / high) plus a **confidence** signal derived from
how many lines were priced from KB vs flagged "needs pricing".

### 7.4 `cost_summary` (stored on `plans`)
```json
{ "currency":"eur","guests":15,
  "subtotal":{"low":42000,"mid":58000,"high":76000},
  "contingencyPct":10,
  "total":{"low":46200,"mid":63800,"high":83600},
  "unpricedItems":2, "confidence":"medium",
  "lines":[{"item_key":"catering_per_head","basis":"per_guest","units":15,
            "low":18000,"mid":24000,"high":30000}] }
```

### 7.5 Why split from the LLM
Reproducibility, testability, auditability, and trust: an organizer quoting a client
needs numbers that don't drift between regenerations. The LLM proposes *what*; the
engine decides *how much*. Unpriced items are surfaced, never invented.

### 7.6 Cost controls (LLM spend)
- Per-organizer monthly generation quota tied to subscription (config constant;
  enforced in `start_plan` via a count over `plans` in the period → friendly limit msg).
- Prompt caching of system+KB context to cut input-token cost.
- Sonnet default; Opus "deep plan" gated behind an explicit toggle (and a tighter quota).
- `generation_meta` records token usage per plan for observability/billing analysis.

---

## 8. Organizer UI

Lives under the gated dashboard. New routes:
```
/[locale]/dashboard/planner            → list of plans + "New plan" CTA
/[locale]/dashboard/planner/new        → scenario form
/[locale]/dashboard/planner/[id]       → plan view / edit / cost / actions
```
Add a **"Planner"** entry to the dashboard nav (alongside Activities, Requests…).

### 8.1 Screens & flow
1. **Scenario form** (`/new`) — category picker (reuse `CATEGORIES` from
   `lib/categories.ts`), guests, date, duration, budget, region, venue type, vibe
   chips, must-haves, free-text constraints. Submits to `createPlan` server action.
   Validation via the zod schema (§4); inline errors; `useFormStatus` pending state.
2. **Generating state** — plan row exists with `status=generating`; show a skeleton
   / progress affordance; the page resolves to the plan when `ready` (inline await in
   v1, so the redirect already lands on `ready`; design keeps a polling fallback for
   the async future).
3. **Plan view** (`/[id]`):
   - **Header**: title, category, scenario chips, status, cost range badge.
   - **Timeline**: phases → tasks (collapsible), reusing card patterns.
   - **Resources & costs**: line-item table with low/mid/high, "needs pricing" flags,
     editable quantity → triggers re-estimate (server action → cost engine only, no LLM).
   - **Cost summary panel**: subtotal, contingency, total range, confidence.
   - **Edit**: add/remove/reorder items (saves via `save_plan_items`); "Regenerate"
     (new LLM pass, new plan revision) is explicit and quota-aware.
4. **Actions**:
   - **Convert to activity** → prefill `/dashboard/activities` create form (title,
     category, suggested price from `cost_summary.total.mid`, description from summary).
   - **Attach to client** → link plan to a `clients` row.
   - **Export** → printable/PDF view (server-rendered route; v1 = print stylesheet).
   - **Share** → read-only tokenized link (reuse the public-slug/QR patterns; optional v1).

### 8.2 Conventions
- Server Components for reads (via `get_plan`/`list_plans` RPCs), Server Actions for
  mutations; `'use server'` modules in `lib/actions/planner.ts`.
- i18n: all copy through next-intl (`messages/*`); new `planner.*` namespace.
- Gating: dashboard middleware already enforces certified+subscribed; planner adds
  the per-period quota check in the action.
- Empty/error/failed states designed explicitly (no silent dead-ends), matching the
  app's existing tone.

---

## 9. Cross-cutting concerns

- **Security / RLS:** organizer-owned rows are owner-or-admin only; KB is read-only;
  generation writes via service-role with RPC ownership re-checks (Stripe-webhook pattern).
- **Privacy:** scenario/plan text is sent to the LLM provider (Anthropic). Document in
  the privacy policy; no other third-party sharing; KB and pricing are first-party.
- **Idempotency & spend:** status guards prevent duplicate generation; quotas + caching
  bound cost; `generation_meta` gives per-plan token visibility.
- **Observability:** log model, tokens, latency, kb_version, repair-retries per plan.
- **Failure modes:** invalid LLM output (repair→fail), timeout (fail+retry), unpriced
  items (surface, don't invent), quota exceeded (friendly upsell), provider outage
  (fail gracefully, plan stays `draft`/`failed`, never a 500 page).
- **Testing:** cost engine = pure unit tests; workflow = mocked-LLM integration test
  asserting schema→items→cost; RLS = policy tests (owner vs non-owner vs admin).

---

## 10. New artifacts (when we implement — not now)

| Layer | Artifact |
|---|---|
| DB | `supabase/migrations/017_ope.sql` (enums, tables, RLS, RPCs, helper `owns_plan`) |
| DB seed | `supabase/seed/ope_knowledge.sql` (KB entries + pricing, idempotent) |
| Dep | `@anthropic-ai/sdk`; env `ANTHROPIC_API_KEY` (+ model + quota config) |
| Server | `lib/ope/scenario.ts` (zod), `lib/ope/planner.ts` (LLM workflow), `lib/ope/cost/` (engine), `lib/ope/knowledge.ts` (retrieval) |
| Actions | `lib/actions/planner.ts` (createPlan, savePlanItems, reestimate, regenerate, convert) |
| UI | `app/[locale]/dashboard/planner/{page,new,[id]}.tsx` + components; `planner.*` i18n |

---

## 11. Phasing

- **v1 (this design):** scenario → grounded plan → deterministic cost → review/edit →
  convert to activity. Inline generation, tag-based KB retrieval, admin-seeded KB.
- **v1.1:** async generation + polling; share links; PDF export.
- **v2:** pgvector semantic KB; per-organizer custom pricing overrides; vendor
  directory; multi-currency/FX; KB authoring UI.

---

## 12. Open questions (need product decisions before build)

1. **Pricing data source:** who curates `knowledge_pricing`, and at what regional
   granularity for v1 (global + a few launch cities)?
2. **Quota & model policy:** how many generations/month per subscription tier; is the
   Opus "deep plan" a paid add-on or just rate-limited?
3. **Currency:** confirm v1 single-currency-per-scenario (no FX) is acceptable.
4. **Output destination priority:** is "convert to activity" the primary v1 outcome, or
   is client-quoting (attach to `clients` + export) equally important for launch?
5. **KB seed breadth:** which categories must ship with real KB + pricing at v1 launch
   (all 21, or a focused subset like birthday/wedding/corporate/glamping)?

---

_End of design. No code has been written or scheduled; implementation awaits sign-off
and the answers in §12._
