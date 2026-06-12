# OPE Implementation-Ready — blocker resolution & go/no-go

> **Purpose:** resolve every blocker in `OPE_FINAL_ARCHITECTURE_REVIEW.md` with a **decision** (not a
> discussion), and declare whether OPE is ready to build.
> **Authority:** this document is the **canonical resolution**. Where it conflicts with an earlier OPE
> doc, this wins; affected docs are noted for amendment.
> **Sources:** `OPE_MASTER_SPEC`, `OPE_ACTIVITY_TAXONOMY`, `OPE_PATTERN_LIBRARY`, `OPE_PATTERN_VALIDATION`,
> `OPE_CLARIFICATION_ENGINE`, `OPE_KNOWLEDGE_MODEL`, `OPE_PLANNING_WORKFLOW`, `OPE_FINAL_ARCHITECTURE_REVIEW`,
> `ADR_001`, `ADR_002`.
> **Date:** 2026-06-10.

---

## 1. Knowledge Unit — RESOLVED: **Knowledge Block** is canonical

**Decision: the canonical unit of authored knowledge is the *Knowledge Block*. "Module" is retired as a
knowledge term.**

**Reasoning.**
- A **Knowledge Block** is *reusable across patterns* (one Food Block serves Celebration, Meetup, Class,
  Club). That reuse is the entire anti-scenario-library economy (ADR-001 Single Engine). It is the unit
  that makes "10 patterns × content × modifiers" scale.
- "Module" in the code (`data/ope/modules/<category>/*`, `OpeModule`) is **not** that unit — it is a
  *per-category bundle* that already mixes several blocks' worth of content (food, venue, risk, comms) for
  one activity. Keeping the word "module" would keep conflating "reusable unit" with "per-activity bundle."

**Definitions (official):**
- **Knowledge Block** — a reusable, cross-pattern unit of organizer expertise (Food, Venue, Safety, …),
  with inputs, outputs, and rules (`OPE_KNOWLEDGE_MODEL` §4).
- **Content Bundle** — a named composition of Blocks **+ activity-specific content** for one pattern+
  activity (e.g., "kids-birthday bundle"). The current per-category JSON files **are** first-generation,
  un-factored Content Bundles.

**Migration (no rewrite to ship MVP):** the existing JSON keeps working as Content Bundles. New knowledge
is authored as **Blocks**; bundles are re-expressed as compositions of Blocks incrementally. The code
identifiers `OpeModule` / `data/ope/modules/` remain as **legacy implementation names** until a later
mechanical rename — they are an internal detail, not the vocabulary. **Docs and all new authoring use
"Block."**

---

## 2. Official crosswalk — Activity → Pattern → Modifier → Block(s)

**Principle: Patterns are the spine.** Marketplace categories, taxonomy types, and the coded
`PlannerCategory`s are all **content labels** that route to a pattern (+ modifiers) and pull a Block set.

**How the existing coded categories map (the reconciliation):**

| Coded `PlannerCategory` (today) | → Pattern | Modifiers | Knowledge Blocks |
|---|---|---|---|
| `birthday` (+young-kids subtype) | **Celebration** | — | Attendance, **Food**, Venue, Decor, Equipment, Schedule, **Safety**(+supervision), Pricing, Communications |
| `bbq` | **Celebration** | — | Attendance, **Food**, Venue, Equipment, Schedule, **Safety**, Pricing, Communications |
| `networking` (with budget) | **Meetup** | (Recurring/Community optional, gated) | Attendance/RSVP, Venue, Food(light), Schedule, Communications, Pricing(light), Safety(light) |

So **3 coded categories → 2 patterns (Celebration, Meetup)** with no input-layer breakage: the classifier
adds a `pattern` field; the category string stays as the content label.

**MVP crosswalk (the activities Phase 1 ships):**

| Activity (content label) | Pattern | Modifiers | Block set (beyond the 6 universals*) | MVP |
|---|---|---|---|---|
| Kids birthday | Celebration | — | Food, Decor, Equipment, +supervision | **SUPPORTED** |
| Adult / milestone birthday | Celebration | — | Food, Decor, Equipment | **SUPPORTED** |
| Anniversary / baby shower / graduation / housewarming | Celebration | — | Food, Decor, Equipment | **SUPPORTED** |
| Dinner party / potluck | Celebration | — | Food, Equipment | **SUPPORTED** |
| BBQ / family picnic | Celebration | — | Food, Equipment | **SUPPORTED** |
| Family reunion | Celebration | — | Food, Equipment | **SUPPORTED** |
| Networking / business mixer (with budget) | Meetup | — | Food(light) | **SUPPORTED** |
| Social meetup (one-time) | Meetup | — | Food(light) | **SUPPORTED** |

*Six **universal Blocks** (Attendance, Venue, Schedule, Safety, Pricing, Communications) are implied for
every row (`OPE_KNOWLEDGE_MODEL` §6).

**General rule for everything else:** every taxonomy type / marketplace category maps to `(primary
pattern, modifiers, block set)` per `OPE_PATTERN_VALIDATION` §1. Types whose pattern, modifier, or block
isn't built in Phase 1 are **GATED** or **UNSUPPORTED** (§4), never force-mapped (ADR-002).

> The 21 marketplace `lib/categories.ts` emotional categories are **content labels** for discovery; each
> resolves to a pattern via this crosswalk. They are not a competing taxonomy — they are merchandising
> over the pattern spine.

---

## 3. Official Region / Currency model — RESOLVED

**A layered override model; most specific layer wins.** This formalizes the existing PricingProvider chain.

| Layer | Provides | Example | Maps to resolver |
|---|---|---|---|
| **Global default** | base reference price bands + base currency | global reference set (USD) | FallbackSeed provider |
| **Country override** | country price index + **country currency** | Germany → EUR bands | (future) country provider |
| **State / province override** | regional adjustment | HI vs mainland US | (future) regional provider |
| **City / local override** | actual local bands | Honolulu seed | Local + Historical providers |

**Precedence (most specific wins):**
> **City/postal → State/province → Country → Global default.**

Resolution is **per line item**: each cost line takes the band from the most specific layer that defines
it; gaps fall through to the next layer.

**Currency rule (resolves the silent-wrong-currency contradiction):**
- The budget renders in the **currency of the most specific region layer that supplies pricing.**
- If only the **Global default** applies (no local/country data), render in the global reference currency
  **with an explicit note:** *"Estimated using <reference region> prices in <currency>; local prices and
  currency may differ."* (This is the existing `is_fallback` + `fallback_note`, now also carrying currency.)
- **Currency conversion** (FX) is **deferred** — MVP shows the reference currency + note, never a silently
  wrong local-currency number.

**Phase-1 launch region:** **Honolulu** is the seeded launch region (the only real data today). Everywhere
else = Global-default fallback + currency note. Adding regions = adding override layers, no engine change.

---

## 4. Official MVP boundary (Phase 1)

| Bucket | Meaning | Phase-1 contents |
|---|---|---|
| **SUPPORTED** | full `plan_ready` plan, priced in the launch region | **Celebration** content (kids/adult/milestone birthday, anniversary, baby shower, graduation, housewarming, dinner party, family reunion, BBQ/family picnic) · **Meetup** content one-time, **with a budget** (networking, business mixer, social meetup) |
| **PARTIAL** | plan generated, with an explicit, honest limitation | Supported pattern **outside the launch region** → fallback pricing + currency note · Meetup priced **light** (no computed estimate) when budget given but no local data |
| **GATED** | refused **with a destination** (ADR-002 routes) | **needs_certified_organizer:** wedding, any event > 60 guests, budget > $5000, sports tournament/large competition, conference/trade show, corporate · **needs_human_review:** fundraising/money, > 30 minors, networking/meetup **without a budget**, sensitive [S] context |
| **UNSUPPORTED** | honest "not yet" handoff, **no destination** | Patterns not built in Phase 1: **Class** (workshops/classes/fitness), **Tournament** (rec), **Conference**, **Performance**, **Expedition/outdoor**, **Volunteer Action**, **Fundraiser** · **Recurring / Community** requests (modifiers deferred) · sensitive/regulated (support group, blood drive) |

**Key boundary decisions:**
- **Recurring + Community modifiers are DEFERRED** out of MVP — recurring requests are GATED/UNSUPPORTED
  via the gate, not faked. (Supersedes the implication in `OPE_PATTERN_VALIDATION`/`OPE_PLANNING_WORKFLOW`
  that they are in the first build.)
- **MVP = Celebration + one-time Meetup only**, on the existing engine. No new engines required.

---

## 5. Official output artifact — RESOLVED (closes P9 / P10)

**Canonical output = the OPE Plan Object, schema `ACTIVITY_PLANNER_OUTPUTS_V1`** (the 6 sections A–F,
already the live `_meta.format`). There is **one** output schema.

**Everything else is a view or projection of that one object — not a competing schema:**
- **Consumer plan** = the Plan Object rendered for the user (today's Planner). *(MVP output.)*
- **Client proposal** = a **future view** of the same Plan Object for organizers (adds the professional
  layer: framing, margin, branding). *"Proposal" is a view name, not a separate schema.* *(Deferred.)*
- **`request_brief`** = a **projection** of the Plan Object into a marketplace Event Request. *(Deferred.)*

**Retired names:** "plan object" (informal) and "client proposal"/"request_brief" as *separate outputs* —
they are views/projections of `ACTIVITY_PLANNER_OUTPUTS_V1`.
**Amend `MASTER_PRODUCT_DECISIONS` §11.9:** **P10 = resolved** (canonical schema = OUTPUTS_V1);
**P9 = resolved** ("proposal" = a view of the Plan Object, not a distinct artifact).

**Confidence-threshold rule (resolves the band/`plan_ready` mismatch):**
> `plan_ready` **iff** overall confidence **≥ 0.50** *and* no open **critical** (Risk/Legal) dimension.
> Bands realigned: **High ≥ 0.75 · Medium 0.50–0.74 (still plan_ready)** · **Clarify 0.30–0.49** ·
> **Escalate < 0.30 or any unfixable critical gap.** This supersedes the band wording in
> `OPE_CLARIFICATION_ENGINE` §1; networking-with-budget (0.55) is correctly `plan_ready`.

---

## 6. Disposition of every unresolved decision

| # | Item (from Final Review) | Disposition |
|---|---|---|
| B1 | Knowledge unit: block vs module | **RESOLVED** — Block canonical (§1) |
| B2 | Pattern ↔ category mapping | **RESOLVED** — crosswalk (§2) |
| B3 | Region / currency model | **RESOLVED** — layered overrides + currency note (§3) |
| B4 | Output schema / proposal naming (P9/P10) | **RESOLVED** — OUTPUTS_V1 canonical; proposal = view (§5) |
| B5 | Recurring + Community in MVP | **RESOLVED → DEFERRED** — out of MVP, gated (§4) |
| B6 | Organizer sign-off of v1 safety/supervision values | **DEFERRED → launch gate** — required before public exposure, not before coding starts (§7) |
| #1 | Wedding-as-template vs Celebration-first | **RESOLVED** — Celebration is the Phase-1 template; Wedding is the eventual high-complexity template. **Reject** Wedding-as-first-template; amend `MASTER` §11.6 |
| #2 | OPE primary outcome: proposal vs plan | **RESOLVED** — one Plan Object; consumer plan is the MVP outcome; proposal is a deferred view |
| #3 | Confidence band vs threshold | **RESOLVED** — single rule (§5) |
| #14 | Gate thresholds (60 / $5000 / 30) uncalibrated | **DEFERRED** — ship conservative; calibrate from real outcomes (Part 4 of the workflow) |
| — | Proposal/professional layer structure | **DEFERRED** — post-MVP |
| — | Multi-region pricing depth, FX conversion | **DEFERRED** — add override layers later |
| — | Correction-promotion + learning loop | **DEFERRED** — MVP = current-plan-only corrections |
| P11 | Subscription price ($9.99 vs $29) | **DEFERRED** — not OPE-blocking (billing decision) |

No item is left **unresolved-and-blocking.** Everything is RESOLVED, deliberately DEFERRED, or REJECTED.

---

## 7. Implementation readiness

# READY FOR IMPLEMENTATION

All hard blockers (B1–B4) are **resolved**; B5 and the learning/proposal scope are **deliberately
deferred**; B6 is a **launch gate, not a coding-start gate.**

**One launch condition (not a coding blocker):** the v1 safety, child-supervision, and food values
(`OPE_KNOWLEDGE_FOOD_SAFETY_LOGISTICS_V1`) must be **reviewed and signed off by a practicing organizer /
safety reference before the feature is exposed to real users.** Coding may begin with them as the working
values.

### First coding milestone — **M1: "Celebration + Meetup on the existing engine"**

Smallest shippable slice; **no new engines**; gate stays as ADR-002.

1. **Pattern tagging (no behavior change).** Add a `pattern` field in classification: `birthday`/`bbq` →
   Celebration, `networking` → Meetup. Prove **byte-identical** plan output via the existing snapshot test
   (`npm run test:ope`).
2. **Celebration content expansion.** Add the SUPPORTED Celebration neighbors (adult/milestone birthday,
   anniversary, baby shower, graduation, housewarming, dinner party, family reunion) as **Content Bundles**
   reusing the Food/Safety/Logistics v1 Blocks. No new engine code.
3. **Region/currency note.** Implement §3 precedence + the **currency note** on fallback budgets (Honolulu =
   launch region; elsewhere = global default + note).
4. **Light clarification loop.** Add the ≤3-question loop for the highest-value gaps only (venue, count,
   kids, budget), per `OPE_CLARIFICATION_ENGINE`.
5. **Keep OUTPUTS_V1**; budget line-item correction = **current-plan-only** (no learning).

**Acceptance:** snapshot test green (SUPPORTED → `plan_ready`; GATED/UNSUPPORTED → honest handoff, no
fallback); `tsc --noEmit` clean; `next build` compiles; safety values flagged for sign-off before launch.

**Out of M1 (next milestones):** Recurring + Community modifiers (M2–M3), the Class pattern (M2),
additional regions, the proposal view, and the correction-learning loop.

---

_Resolution document. No code changed, nothing committed. This is the canonical disposition of the OPE
architecture blockers and the green light to build M1._
