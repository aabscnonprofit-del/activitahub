# OPE Cost Engine — MVP v1

> **Goal:** turn a composed OPE plan skeleton into **Low / Likely / High** budget estimates that fill the
> `budget_placeholder` slot of the Activity Planner output (`ACTIVITY_PLANNER_OUTPUTS_V1.md`, section C).
> **Scope (MVP):** region **Honolulu only**; categories **Birthday** and **BBQ** only.
> **Deterministic only.** The engine computes **quantities × seeded price bands**. It never calls an LLM;
> the thin AI layer may *describe* the result but never sets a number.
> **Builds on:** `MOD-BIRTHDAY-CORE`, `MOD-BIRTHDAY-ST1-YOUNG-KIDS`, `MOD-BBQ-CORE`,
> `OPE_UNIVERSAL_ACTIVITY_ARCHITECTURE_V1.md` (UCD cost categories), `OPE_CORE_MVP_V1.md`.
> **Date:** 2026-06-06
>
> **Money disclaimer:** every dollar figure in this document is an **illustrative placeholder seed**, not a
> researched Honolulu market rate. Seed values are calibration inputs to be replaced before launch. They
> are the *event's* estimated costs (food, supplies, etc.) — never ActivLife Hub's own fees.

---

## 0. Where the engine sits

```
Scenario inputs ─▶ Composer ─▶ plan skeleton (tasks, cost_drivers, derived_quantities, config)
                                     │
                                     ▼
                              ┌──────────────┐
                              │  COST ENGINE │  ← this document
                              │  qty × price │
                              └──────────────┘
                                     ▼
                       budget output contract (§7) ─▶ Planner fills section C
```

The engine consumes the **cost drivers** and **derived quantities** the composer already produces (see
`scripts/compose-ope-samples.mjs`). It adds exactly one thing the modules deliberately omit: **money**.

The split it enforces (from the architecture): **quantities are deterministic** (composer), **prices are
seeded bands** (this engine), **prose is AI** (never touches numbers).

---

## 1. Pricing seed structure

A **price seed** assigns a Low/Likely/High **unit band** to each cost-driver `item_key`, per region. The
engine keys lookups by `(region, category, item_key)`.

### 1.1 Seed schema (per row)

| Field | Meaning |
|---|---|
| `region` | seed region — MVP: `"Honolulu"` only |
| `category` | `"birthday"` \| `"bbq"` |
| `item_key` | matches a module cost driver's `item_key` (e.g. `cake`, `bbq_food_per_head`) |
| `basis` | `per_guest` \| `per_unit` \| `flat` — must equal the module driver's `basis` |
| `cost_category` | universal `UCD#` bucket (carried from the module; used for rollup) |
| `unit_low` / `unit_likely` / `unit_high` | USD unit price band (per guest, per unit, or flat) |
| `optional` | `true` if the driver is opt-in (contributes to High only by default — see §3.4) |
| `seed_note` | provenance / assumption (e.g. "store-bought sheet cake", "owned grill ⇒ rental optional") |

**Invariants:** `unit_low ≤ unit_likely ≤ unit_high`; every module cost driver in scope has exactly one
seed row for Honolulu; `basis` and `cost_category` must agree with the module (the engine asserts this on
load and refuses to price an unseeded driver).

### 1.2 Honolulu seed — Birthday  *(illustrative)*

Drivers from `MOD-BIRTHDAY-CORE` (`BC-CD0x`) + `MOD-BIRTHDAY-ST1-YOUNG-KIDS` (`ST1-CD0x`).

| item_key | basis | UCD | unit_low | unit_likely | unit_high | optional | seed_note |
|---|---|---|---|---|---|---|---|
| `cake` | per_unit | UCD3 | 2.00 | 3.00 | 5.00 | no | per serving; bakery vs custom |
| `party_food_per_head` | per_guest | UCD3 | 6.00 | 9.00 | 14.00 | no | simple kid food → catered |
| `drinks_per_head` | per_guest | UCD3 | 2.00 | 3.00 | 5.00 | no | juice/water → bottled variety |
| `decorations` | flat | UCD6 | 30 | 60 | 120 | no | DIY → themed kit |
| `tableware_per_head` | per_guest | UCD6 | 1.00 | 1.50 | 2.50 | no | plates/cups/napkins |
| `favors_per_kid` | per_unit | UCD6 | 3.00 | 5.00 | 9.00 | no | goodie bag per child |
| `activity_materials` | flat | UCD6 | 15 | 30 | 60 | no | game supplies (DIY) |
| `prizes` | per_unit | UCD6 | 0.00 | 0.00 | 3.00 | **yes** | small prizes (opt-in) |

> Entertainer / face-painter is **not** seeded here — it belongs to an optional module
> (`MOD-OPT-ENTERTAINER`), out of MVP scope. Venue hire is out of scope (backyard assumed).

### 1.3 Honolulu seed — BBQ  *(illustrative)*

Drivers from `MOD-BBQ-CORE` (`BQ-CD0x`).

| item_key | basis | UCD | unit_low | unit_likely | unit_high | optional | seed_note |
|---|---|---|---|---|---|---|---|
| `bbq_food_per_head` | per_guest | UCD3 | 6.00 | 9.00 | 15.00 | no | meat + veg per head (driver = `meals`) |
| `drinks_per_head` | per_guest | UCD3 | 2.00 | 3.00 | 5.00 | no | soft drinks/water |
| `fuel` | flat | UCD4 | 10 | 18 | 30 | no | charcoal or propane |
| `ice` | per_guest | UCD3 | 0.40 | 0.65 | 1.00 | no | driver = `guest_count` (module basis); ~1 bag (~$5) per 8 guests, expressed per head |
| `disposables_per_head` | per_guest | UCD6 | 1.00 | 1.50 | 2.50 | no | plates/cutlery/foil |
| `grill_rental` | flat | UCD4 | 0 | 0 | 60 | **yes** | 0 if grill owned (default); rental → High |

> Park permit, canopy/shade rental, alcohol, transport are out of MVP scope (venue/optional modules).

---

## 2. Quantity formulas

The engine **does not invent quantities** — it reads the `derived_quantities` the composer already
computes from `config_defaults` + scenario. Restated here for the in-scope drivers:

### 2.1 Birthday quantities
| Quantity | Formula | Source |
|---|---|---|
| `cake_servings` | `guest_count` | BC `derived_quantities` |
| `meals` | `guest_count` | BC |
| `drinks_servings` | `guest_count` | BC |
| `tableware_units` | `ceil(guest_count × (1 + tableware_buffer_pct/100))` | BC (`tableware_buffer_pct`=10) |
| `kid_count` | `scenario.kid_count` | ST1 |
| `favors_count` | `kid_count` | ST1 |
| `game_count` | `config_defaults.game_count` (=3) | ST1 |

### 2.2 BBQ quantities
| Quantity | Formula | Source |
|---|---|---|
| `meals` | `ceil(guest_count × (1 + food_buffer_pct/100))` | BBQ (`food_buffer_pct`=10) |
| `drinks_servings` | `guest_count` | BBQ |
| `disposables_units` | `ceil(guest_count × (1 + tableware_buffer_pct/100))` | BBQ (=10) |

### 2.3 Driver → quantity binding
Each cost driver's `driver` field names the quantity multiplier:
- `basis: per_guest` → multiply unit band by the named per-head quantity (`guest_count`, `meals`, …).
  `ice` uses `per_guest` / `guest_count` per `MOD-BBQ-CORE` (the price band already absorbs the
  ~1-bag-per-8-guests conversion — see §1.3).
- `basis: per_unit` → multiply unit band by the named count (`cake_servings`, `favors_count`, …).
- `basis: flat` → use the unit band as-is (no multiply); `driver` is `null` or informational.

> **Source-of-truth note:** the engine adds **no** quantities of its own — every quantity comes from the
> module's `derived_quantities` / `driver` fields. `MOD-BBQ-CORE` is authoritative for `ice` (`per_guest`).

---

## 3. Low / Likely / High calculation model

### 3.1 Per-driver line band
For each in-scope cost driver `d` with seed `s` and quantity `q` (from §2):

```
qty(d)        = 1                      if s.basis == "flat"
              = derived_quantity(d.driver)   otherwise

line_low(d)    = round(s.unit_low    × qty(d))
line_likely(d) = round(s.unit_likely × qty(d))
line_high(d)   = round(s.unit_high   × qty(d))
```

Rounding: line items to nearest **$1**.

### 3.2 Variance source
In the MVP, **quantity is a single deterministic value**; the band comes **only from the price seed**
(`unit_low/likely/high`). This keeps spread explainable ("the range is price/quality, not a guess about
how many people come"). Headcount sensitivity is intentionally deferred (see §8).

### 3.3 Subtotals (per band)
```
subtotal_low    = Σ line_low(d)     over included drivers
subtotal_likely = Σ line_likely(d)
subtotal_high   = Σ line_high(d)
```

### 3.4 Optional-driver inclusion rule
A driver with `optional: true` (e.g. `prizes`, `grill_rental`):
- **excluded** from `subtotal_low` and `subtotal_likely` (its `unit_low`/`unit_likely` are typically 0 anyway),
- **included** in `subtotal_high`.
- Exception: a scenario flag can force-include it in Likely (e.g. `grill_owned=false` ⇒ `grill_rental`
  enters all bands). MVP default: optional ⇒ High-only.

This is what makes the High band the "added extras" scenario and the Low band the lean/DIY floor.

---

## 4. Contingency rules

Contingency is the universal `UCD8` bucket — a buffer for the unplanned. It is **band-specific**, because a
lean plan carries no buffer while a high-end plan should:

| Band | Contingency rate | Rationale |
|---|---|---|
| Low | **0%** | optimistic / DIY floor; no slack assumed |
| Likely | **`config_defaults.contingency_pct`** (=10%) | the modules' declared buffer |
| High | **contingency_pct + 5pp** (=15%) | conservative; absorbs overruns + extras |

```
contingency_band   = subtotal_band × rate_band / 100
total_band(raw)    = subtotal_band + contingency_band
```

Then round each total to the nearest **$5** and enforce monotonicity `low ≤ likely ≤ high` (clamp up if a
rounding edge violates it).

The contingency amount is reported separately (§7) so the Planner can show it under `UCD8` if desired.

### 4.1 Worked example — Birthday, 25 guests (15 kids), Honolulu  *(illustrative)*
qty: cake_servings 25 · guest_count 25 · tableware_units 28 · favors_count 15 · game_count 3.

| Driver | Low | Likely | High |
|---|---|---|---|
| cake (25×) | 50 | 75 | 125 |
| party_food_per_head (25×) | 150 | 225 | 350 |
| drinks_per_head (25×) | 50 | 75 | 125 |
| decorations (flat) | 30 | 60 | 120 |
| tableware_per_head (28×) | 28 | 42 | 70 |
| favors_per_kid (15×) | 45 | 75 | 135 |
| activity_materials (flat) | 15 | 30 | 60 |
| prizes (optional → High) | — | — | 45 |
| **Subtotal** | **368** | **582** | **1030** |
| Contingency (0% / 10% / 15%) | 0 | 58 | 155 |
| **Total (rounded $5)** | **$370** | **$640** | **$1,185** |

### 4.2 Worked example — BBQ, 30 guests, Honolulu  *(illustrative)*
qty: meals 33 · guest_count 30 · disposables_units 33 (`ice` is per-guest on `guest_count` = 30).

| Driver | Low | Likely | High |
|---|---|---|---|
| bbq_food_per_head (33×) | 198 | 297 | 495 |
| drinks_per_head (30×) | 60 | 90 | 150 |
| fuel (flat) | 10 | 18 | 30 |
| ice (30×) | 12 | 20 | 30 |
| disposables_per_head (33×) | 33 | 50 | 83 |
| grill_rental (optional → High) | — | — | 60 |
| **Subtotal** | **313** | **475** | **848** |
| Contingency (0% / 10% / 15%) | 0 | 48 | 127 |
| **Total (rounded $5)** | **$315** | **$525** | **$975** |

---

## 5. Budget driver ranking

The Planner's "Key cost drivers" line (section C) is the top drivers by **Likely** line cost, descending:

```
key_cost_drivers = drivers
  .sort(by line_likely desc; tie-break: higher line_high, then UCD order)
  .take(N = 5)
```

Each ranked entry also flags whether it is a **lever**:
- `lever: "down"` if `optional` or its band is wide (`line_high ≥ 2 × line_low`) → "skipping/reducing this
  moves toward Low" (e.g. entertainer/prizes, custom cake).
- `lever: "up"` if `optional` and currently excluded → "adding this pushes toward High".

The engine emits the ranking + lever flags **as data**; the AI layer turns them into the prose sentence
("skipping the entertainer is the easiest way toward the low end") — the engine supplies *which* drivers,
the AI supplies the *wording*.

---

## 6. Inputs required from scenario

| Input | Required | Used for |
|---|---|---|
| `region` | yes — must be `"Honolulu"` | seed lookup; engine refuses other regions in MVP |
| `category` / `activity_type` | yes — `birthday` or `bbq` | selects seed table |
| `guest_count` | yes | per-head quantities (incl. `ice`, per-guest) |
| `kid_count` | birthday only | `favors_count`, supervision (qty already in composer) |
| `venue_type` | yes | confirms in-scope (backyard/home, public_park); flags out-of-scope venue cost |
| `grill_owned` | bbq, optional (default `true`) | toggles `grill_rental` optional inclusion (§3.4) |
| `special_requirements` | optional | may surface out-of-scope drivers (entertainer, alcohol) as **notes**, not priced in MVP |
| `budget` | optional | **comparison only** — engine reports it vs the band; never an input to the calc |

The engine reads **derived quantities from the composer**, not raw scenario math, wherever a quantity
already exists (§2). Missing required inputs ⇒ engine returns a structured error, not a guess.

---

## 7. Output contract consumed by the Planner

The engine returns one `budget` object that drop-in replaces `plan_output_skeleton.budget_placeholder`.

```jsonc
{
  "currency": "USD",
  "region": "Honolulu",
  "category": "birthday",
  "estimate": { "low": 370, "likely": 640, "high": 1185 },
  "contingency": {
    "rate_pct": { "low": 0, "likely": 10, "high": 15 },
    "amount":   { "low": 0, "likely": 58, "high": 155 },
    "ucd": "UCD8"
  },
  "rollup_by_category": {                // sums of line bands by universal UCD bucket
    "UCD3": { "low": 250, "likely": 375, "high": 600 },
    "UCD6": { "low": 118, "likely": 207, "high": 430 }
  },
  "breakdown": [                          // every priced driver, ordered as ranked
    {
      "item_key": "party_food_per_head", "module": "MOD-BIRTHDAY-CORE",
      "basis": "per_guest", "ucd": "UCD3", "quantity": 25,
      "line": { "low": 150, "likely": 225, "high": 350 },
      "included_in": ["low", "likely", "high"],
      "lever": "down"
    }
    // … one entry per driver; optional drivers show "included_in": ["high"]
  ],
  "key_cost_drivers": [                   // §5 ranking, top 5 by likely
    { "item_key": "party_food_per_head", "lever": "down" },
    { "item_key": "favors_per_kid",      "lever": "down" },
    { "item_key": "cake",                "lever": "down" }
  ],
  "vs_budget": {                          // optional, only if scenario.budget present
    "stated": 600, "band": "within_likely", "delta_to_likely": -40
  },
  "notes": [                             // out-of-scope items surfaced, not priced
    "Entertainer requested in special_requirements — not in MVP scope; add MOD-OPT-ENTERTAINER to price."
  ],
  "meta": {
    "engine_version": "cost-mvp-1",
    "seed_region": "Honolulu",
    "disclaimer": "Illustrative estimate of the event's costs, calibrated to Honolulu; not ActivLife Hub fees.",
    "is_priced": true
  }
}
```

**Contract rules**
- `estimate.low ≤ estimate.likely ≤ estimate.high` always (post-clamp).
- `is_priced: false` + `notes` + `estimate: null` if region/category is out of MVP scope or a driver is
  unseeded — the Planner then keeps the placeholder rather than showing a wrong number.
- `breakdown[].quantity` is echoed from the composer (auditable: quantity is never the engine's invention).
- The AI layer may read `key_cost_drivers` and `lever` to write copy; it must treat `estimate`,
  `contingency`, `rollup_by_category`, and `breakdown` numbers as **read-only**.

---

## 8. Out of scope for MVP (explicit)

- Regions other than Honolulu; categories other than Birthday and BBQ.
- Venue hire, permits, entertainer, alcohol, transport, canopy (separate modules).
- Headcount-driven variance (band is price-only in §3.2); seasonal/temperature ice scaling (ice is a
  flat per-guest band in MVP, per `MOD-BBQ-CORE`).
- Real market-rate seeds (all values here are illustrative placeholders).
- Any persistence, API, UI, or code — this is a calculation **specification** only.

_Specification only. No code, API, UI, or database._
