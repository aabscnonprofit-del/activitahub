# OPE Output Contract V1 — Implementation Contract

> **Type:** implementation contract (not architecture). It specifies the **exact
> structured output** every OPE generation must return for a ready plan.
> **Source of truth:** `docs/MASTER_PRODUCT_DECISIONS.md` (§10.3 — OPE output is an
> Executable Event Plan surfaced as a client proposal) and
> `docs/OPE_V1_TECHNICAL_DESIGN.md` (§4, §6, §10.3 — the Event Plan already contains
> its Timeline, Timed Work Items, and Resources; Staff and Vendors are **resource
> types**; the Cost Estimate is computed deterministically from the approved plan).
> **Status:** contract v1 · defines the target output shape; §11 (Source alignment)
> records where the current engine does not yet emit a section.

This contract does **not** introduce new architecture or redesign OPE. It pins down
the shape of `generatePlan`'s `plan_ready` output so every category produces the same
8 sections, and names the gaps between that shape and today's `PlannerOutput`
(`lib/ope/types.ts`).

---

## 0. Global contract rules

These apply to **every** `plan_ready` generation, for every category.

1. **All 8 sections are always present.** A generation that returns a ready plan
   MUST include all eight top-level sections below. A section is **never omitted** —
   when it has no content it is an **empty array** (list sections) or an object with
   explicit `null` fields and a status flag (object sections).
2. **Universal, category-agnostic.** The same 8-section shape is returned for a
   wedding, a barbecue, a yoga session, a retirement-home activity, a proposal event,
   a corporate event, and a community gathering. **Category is metadata** (a label /
   pricing key), never a section that changes shape.
3. **Deterministic numbers.** All money, quantities, headcounts, and ranges are
   produced by the deterministic engine, not an LLM. The LLM (if used) may shape
   prose (`summary`, `headline`); it never sets numeric fields.
4. **Money format.** Cost figures are in **whole currency units** (not cents),
   always expressed as a `{ low, likely, high }` band, with `currency` carried on the
   Budget section. This mirrors `BudgetResult`.
5. **Provenance is explicit.** Pricing source / fallback is surfaced on Budget;
   Resources and Staffing carry a `source`; the contract never hides that a number is
   a fallback estimate.
6. **Statuses outside this contract.** This contract describes the **`plan_ready`**
   output only. `needs_clarification` (Minimum Planning Inputs gate) and `unsupported`
   (coverage handoff) return their existing structured shapes and are **not** subject
   to the 8-section requirement. In-plan choices that do not block generation belong
   to §8 *Organizer Decisions Required*, which is distinct from the pre-plan
   clarification gate.

### Top-level envelope

```
OpeOutputV1 (plan_ready) = {
  status: 'plan_ready',
  event_summary:                {...},   // §1  object, always present
  timeline:                     [...],   // §2  ≥ 1 phase
  resources:                    [...],   // §3  array (may be empty + reason)
  staffing:                     {...},   // §4  object, always present
  venue_requirements:           {...},   // §5  object, always present
  budget:                       {...},   // §6  object, always present (is_priced flag)
  risks:                        [...],   // §7  ≥ 1 for any non-trivial event
  organizer_decisions_required: [...],   // §8  array (may be empty)
  _meta: { contract_version: 'v1', deterministic: true, modules_used: string[] }
}
```

---

## 1. Event Summary — `event_summary`

A one-screen, human-facing snapshot of *what is being planned*.

**Required**
- `title: string` — human label (e.g. "Beach wedding for 80").
- `event_type: string` — category label (metadata only).
- `headcount: { total: number, breakdown: { adults: number, kids: number } | null }`.
- `desired_outcome: string` — the goal/vibe in one line.
- `summary: string` — 1–3 sentence narrative of the plan.

**Optional**
- `headline: string | null`
- `date_or_window: string | null` — ISO date or descriptive window; `null` if unknown.
- `location: { city: string | null, region: string | null, country: string | null }`
- `duration: string | null`
- `recurrence: { frequency, cadence_label } | null`

**Minimum output:** `title`, `event_type`, `headcount.total`, and a non-empty
`summary` and `desired_outcome`. `date_or_window`/`location` may be `null` but their
keys are present.

---

## 2. Timeline — `timeline`

The backbone of the plan: ordered phases from preparation through wrap-up.

**Required** — ordered, non-empty array; each phase:
- `id: string`
- `name: string`
- `when: string` — relative window label (e.g. "6–4 weeks before", "day of").
- `goal: string`

**Optional** per phase:
- `window_days_before: [number, number]`
- `work_items: { id, what, role, location, duration, depends_on: string[], status }[]`
  — **Timed Work Items** (the V2 design target). Optional in V1.

**Minimum output:** at least one phase with `name`, `when`, `goal`. V1 is
phase-level; `work_items` granularity is optional until the Timed-Work-Item model lands.

---

## 3. Resources — `resources`

Everything the event needs procured or assigned. **Staff and vendors are resource
*types*** (per the technical design); the staff-typed subset is *also* surfaced in §4.

**Required** — array; each resource:
- `id: string` (or `item_key`)
- `label: string`
- `type: 'staff' | 'vendor' | 'equipment' | 'material' | 'space' | 'other'`
- `quantity: number | null`
- `required: boolean` — required vs optional/upgrade.

**Optional**
- `unit: string | null`
- `sourced: boolean` — workspace state (whether the organizer secured it).
- `linked_budget_item_key: string | null` — ties the resource to a Budget line.
- `lever: string | null` · `notes: string | null`

**Minimum output:** an array (may be empty). When empty, the plan MUST explain why via
a §8 decision or a Budget note (e.g. unpriced). Every **required, procurable** Budget
line SHOULD have a corresponding resource entry.

---

## 4. Staffing — `staffing`

The people side of Resources, surfaced as its own section (per the client-proposal
structure). This is the staff-typed view of §3 plus a sourcing status.

**Required** — object:
- `roles: { role: string, headcount: number | null, source: 'organizer' | 'vendor' | 'worker' | 'unknown', required: boolean }[]`
- `staffing_status: 'self_serviceable' | 'needs_hiring' | 'unknown'`

**Optional**
- `estimated_hours: number | null`
- `pay_basis: string | null`
- `notes: string | null`

**Minimum output:** the object is always present. `roles` may be empty when the event
needs no staff (then `staffing_status: 'self_serviceable'`). A single-operator event
(e.g. a yoga session the organizer runs) returns one role with `headcount: 1`,
`source: 'organizer'`.

---

## 5. Venue Requirements — `venue_requirements`

What the space must satisfy — independent of whether a venue is chosen yet.

**Required** — object:
- `venue_type: string | null` — e.g. backyard, public park, hall, studio, care-home common room.
- `indoor_outdoor: 'indoor' | 'outdoor' | 'either' | null`
- `capacity_needed: number | null` — ≈ headcount plus buffer.
- `must_haves: string[]` — e.g. power, restrooms, kitchen, parking, accessibility.

**Optional**
- `space_size_hint: string | null`
- `permits_or_restrictions: string[]`
- `setup_notes: string | null`

**Minimum output:** the object is always present. `venue_type` may be `null` (unknown),
but `must_haves` reflects category/headcount basics (e.g. restrooms + shade for an
outdoor BBQ; step-free access for a retirement-home activity).

---

## 6. Budget — `budget`

The deterministic Cost Estimate computed from the plan. Reuses `BudgetResult`.

**Required** — object:
- `is_priced: boolean`
- `currency: string`
- `estimate: { low, likely, high }` *(required when `is_priced`)*
- `breakdown: { item_key, basis, quantity, line: { low, likely, high }, optional, lever }[]` *(when priced)*
- `contingency: { rate_pct, amount, ucd }` *(when priced)*
- `pricing_source: 'local' | 'historical' | 'fallback-seed' | 'none'`
- `is_fallback: boolean`

**Optional**
- `rollup_by_category` · `key_cost_drivers` · `subtotal` · `levers_note`
- `per_session` / `series_total` *(recurring only)* · `meta.disclaimer` · `notes[]`

**Minimum output:** if `is_priced = true` → an `estimate` band and at least one
`breakdown` line. If `is_priced = false` → `is_priced: false` plus a reason (no local
pricing / unsupported), never a silent zero. All money is whole currency units with
low/likely/high.

---

## 7. Risks — `risks`

Operational risks with mitigations. Reuses `section_d_key_risks`.

**Required** — array; each risk:
- `id: string`
- `name: string`
- `severity: 'low' | 'medium' | 'high'`
- `mitigation: string`

**Optional**
- `never_drop: boolean` · `source_module: string`
- top-level `excluded_conditional: { id, applies_if }[]` (risks not applied this run).

**Minimum output:** at least one risk for any non-trivial event, each with `severity`
and a concrete `mitigation`. Universally applicable examples: weather (outdoor BBQ /
wedding), guest safety / medical (retirement-home), privacy / timing (proposal),
headcount uncertainty (community gathering), vendor no-show (corporate).

---

## 8. Organizer Decisions Required — `organizer_decisions_required`

Open choices the organizer must make to finalize/execute the plan. **Distinct from the
pre-plan clarification gate** (which blocks generation): these are decisions *within* a
ready plan.

**Required** — array; each decision:
- `id: string`
- `prompt: string` — the decision to make.
- `type: 'choice' | 'confirm' | 'input' | 'lever'`
- `impacts: string` — what it affects (budget / scale / venue / staffing / timeline).
- `required_before: 'send' | 'execute' | 'none'`

**Optional**
- `options: string[]` *(for `choice`)* · `default: <value>` · `recommended: <value>`
- `linked_section: 'venue' | 'staffing' | 'budget' | 'resources' | 'timeline'`

**Minimum output:** an array (may be empty). It MUST surface, when present: any `need`
resource (e.g. `instructor = need` → "Decide how to staff the instructor"), any
fallback/unpriced Budget caveat, any load-bearing input that was defaulted rather than
confirmed, and material Budget levers.

---

## 9. Universality across categories

The same 8 sections are returned for every event type; only the *values* differ.

| Section | Wedding | BBQ | Yoga session | Retirement-home | Proposal | Corporate | Community |
|---|---|---|---|---|---|---|---|
| Event Summary | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Timeline | multi-month | days | single day | single session | tight day-of | multi-week | weeks |
| Resources | large (caterer, decor, AV…) | grill, food, seating | mats, music | activity supplies, accessibility aids | ring/venue/photographer | AV, catering, badges | permits, seating, signage |
| Staffing | many roles, vendors | host + helper | organizer (1) | facilitator + care liaison | organizer (1) + vendor | coordinators, security | volunteers |
| Venue Requirements | hall + capacity | yard/park + restrooms/shade | studio/room | step-free common room | private spot | conference space + AV | public space + permits |
| Budget | high band | low band | low band | low–med band | variable | med–high band | low–med band |
| Risks | weather, vendor, timeline | weather, food safety | low (space, liability) | safety/medical, mobility | privacy, weather, timing | logistics, no-show | turnout, permits |
| Organizer Decisions | venue, guest count, levers | menu, headcount | confirm instructor | accessibility confirm | timing/privacy | budget margin, AV vendor | permit, volunteers |

No category adds or removes a section; empty sections degrade to empty arrays /
null-keyed objects with a status, never omission.

---

## 10. Minimum viable output (must never be empty)

For any `plan_ready` result, regardless of category:

- `event_summary.title`, `.event_type`, `.headcount.total`, `.summary`, `.desired_outcome`
- `timeline` — ≥ 1 phase (`name` + `when` + `goal`)
- `staffing` — object present (`roles` may be empty with a `staffing_status`)
- `venue_requirements` — object present (`venue_type` may be null; `must_haves` reflects basics)
- `budget` — `is_priced` flag set; if priced, an `estimate` band + ≥ 1 `breakdown` line
- `risks` — ≥ 1 risk with `severity` + `mitigation`
- `resources` and `organizer_decisions_required` — arrays present (may be empty, with reasons surfaced elsewhere)

---

## 11. Source alignment (one-line map)

- §1 Event Summary ⇐ `section_a_what_you_told_us` + `section_b_your_plan.{summary,headline}` + `OpeAssessment`.
- §2 Timeline ⇐ `section_b_your_plan.timeline` (phase-level today; Timed Work Items are the design target).
- §6 Budget ⇐ `section_c_budget` (`BudgetResult`) — direct.
- §7 Risks ⇐ `section_d_key_risks` — direct.
- §3 Resources / §4 Staffing / §5 Venue Requirements / §8 Organizer Decisions Required —
  **promotions**: data exists in inputs, budget lines, the `instructor` flag, levers,
  and clarification questions, but is **not yet emitted as these structured sections**.
  See the build-time gap list in the accompanying implementation notes.
