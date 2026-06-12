# OPE Birthday Category — Operational Architecture v1

> **Goal:** define the **operational architecture** of the Birthday category — how it decomposes into
> a shared core plus composable modules — *before* building more category templates. A blueprint for an
> operations engine, not content.
> **Builds on:** `OPE_KB_BIRTHDAY_PARTY_V1.md` (the content), `OPE_CORE_MVP_V1.md` (engine = curated
> templates + deterministic rules + thin AI).
> **Date:** 2026-06-06
> **Framing:** the engine does not store a separate plan per birthday variant. It stores **one Core +
> a registry of modules**, and **composes** the right plan from a scenario.

**ID conventions:** `ST#` subtype · `MOD-*` module · `DP#` decision point · `FM#` failure mode ·
`SC#` success condition. Content IDs (`T##`, `R##`, `CD##`, `RK##`, `M#`, `TPL#`) reference
`OPE_KB_BIRTHDAY_PARTY_V1.md`.

---

## 1. Birthday subtypes taxonomy

Primary axis = **age group** (it changes the plan most), with **milestone** as a cross-cutting overlay
and a few format modifiers handled as optional modules (§3).

| ID | Subtype | Range | Defining operational traits |
|---|---|---|---|
| `ST1` | **Young kids** | ≤ 7 | High supervision, short daytime runtime, simple games, allergy-heavy, parents present, favors expected |
| `ST2` | **Older kids / tween** | 8–12 | Activity-led, stronger theme, drop-off common, sleepover/outing variants |
| `ST3` | **Teen** | 13–17 | Autonomy valued, music-led, minimal visible adult footprint, different safety profile (gatecrashing, alcohol-sneaking) |
| `ST4` | **Adult** | 18+ | Evening, bar/alcohol, dinner/social, no kids' provisions, RSVP/no-show sensitive |
| `ST5` | **Milestone** *(overlay)* | any (1st, 16/18/21, 30/40/50, 60+) | Raises formality, scale, budget, and expectations on top of the base subtype |

Exactly **one** base subtype (ST1–ST4) is selected; **ST5** applies *on top* as a modifier.

---

## 2. Common core (shared by all birthday events)

**Birthday Core (`MOD-CORE`)** — the invariant spine present in every birthday plan regardless of
subtype/venue:

- **Phases:** Foundations → Bookings & Invites → Preparation → Final days → Day-of → Wrap-up.
- **Core tasks:** date (T01), guest list (T02), budget (T03), venue decision (T04), invitations + RSVP
  (T07), cake (T08, T19, T27), food (T09, T18, T24), decorations (T11, T23), run the party (T25),
  cleanup (T29), thank-yous (T30).
- **Core milestones:** M1 date · M2 venue · M3 invites · M4 headcount · M5 cake & food · M6 supplies ·
  M7 final confirmation · M8 completed.
- **Core cost drivers:** cake (CD01), food (CD02), drinks (CD03), decorations (CD04), tableware (CD05).
- **Core risks:** headcount uncertainty (RK04), budget overrun (RK05), cake problems (RK06).
- **Core templates:** invitation (TPL1), RSVP reminder (TPL2), thank-you (TPL4).

Everything else is layered by modules.

---

## 3. Variable modules

Each module is a bundle that toggles/parameterizes tasks · resources · cost drivers · risks · templates.

| Module | Adds / changes | Selected by |
|---|---|---|
| **Subtype modules** | | |
| `MOD-ST1` Young kids | supervision tasks, simple-games entertainment default, favors, heavy allergy capture, short runtime | age ≤ 7 |
| `MOD-ST2` Older kids | activity-led entertainment, theme emphasis, optional sleepover/outing hooks | age 8–12 |
| `MOD-ST3` Teen | autonomy-friendly flow, music, light-touch adult/safety tasks, gatecrash/alcohol-sneak risks | age 13–17 |
| `MOD-ST4` Adult | evening flow, dinner/social, removes kids' provisions, enables alcohol module | age 18+ |
| `MOD-OV-MILESTONE` (overlay) | scales quantities, raises formality, adds extras (photographer, larger venue) | milestone date |
| **Venue modules** | | |
| `MOD-VEN-HOME` | no venue cost; home setup/cleanup tasks | venue_type = home |
| `MOD-VEN-OUTDOOR` | permit check, shade/canopy, weather backup, restrooms, furniture | venue_type = outdoor/park |
| `MOD-VEN-RENTED` | venue hire, booking/curfew rules, furniture often provided | venue_type = venue |
| **Risk module** | | |
| `MOD-RISK` (computed) | the de-duplicated union of risks from Core + all selected modules | always (derived) |
| **Optional modules** | | |
| `MOD-OPT-ALCOHOL` | bar/drinks, responsible-service & ID risks | adult + has_alcohol |
| `MOD-OPT-ENTERTAINER` | hired entertainer task + cost (replaces DIY) | entertainment = hired |
| `MOD-OPT-ACTIVITY-VENUE` | activity-venue package (trampoline park, etc.) replaces home setup | format = outing-activity |
| `MOD-OPT-SLEEPOVER` | overnight logistics, bedding, parental consents, night supervision | sleepover = yes (kids/teen) |
| `MOD-OPT-TRANSPORT` | transport/carpool/parking for off-site or outings | off-site or multi-stop |
| `MOD-OPT-THEME` | theme décor, costume ask, themed cake/favors | theme provided |
| `MOD-OPT-FAVORS` | goodie bags (per kid) | kids subtypes (default on) |
| `MOD-OPT-DIETARY` | extra dietary/allergy handling intensity | special_requirements present |
| `MOD-OPT-SURPRISE` | secrecy logistics, separate comms to honoree's contact | surprise = yes |

---

## 4. Decision points that change the plan

The scenario inputs that branch module selection and scaling:

| ID | Decision point | Effect |
|---|---|---|
| `DP1` | **age_group** | selects base subtype ST1–ST4; sets supervision ratio, runtime, default entertainment |
| `DP2` | **milestone?** | applies `MOD-OV-MILESTONE` (scale/formality/extras) |
| `DP3` | **venue_type** | selects venue module (home/outdoor/rented); toggles permit/shade/furniture/weather |
| `DP4` | **guest_count** (+ thresholds) | scales per-guest lines; large counts trigger furniture/security considerations |
| `DP5` | **has_alcohol** | enables `MOD-OPT-ALCOHOL` (adult only) |
| `DP6` | **entertainment choice** | one-of: DIY (default) / `MOD-OPT-ENTERTAINER` / `MOD-OPT-ACTIVITY-VENUE` |
| `DP7` | **sleepover?** | `MOD-OPT-SLEEPOVER` (kids/teen) |
| `DP8` | **off-site / outing?** | `MOD-OPT-TRANSPORT` (+ activity-venue) |
| `DP9` | **theme provided?** | `MOD-OPT-THEME` |
| `DP10` | **special_requirements** | `MOD-OPT-DIETARY`; accessibility tasks |
| `DP11` | **surprise?** | `MOD-OPT-SURPRISE` |
| `DP12` | **date/season** | weighting of weather risk; lead-time for bookings |
| `DP13` | **budget tier** | nudges DIY-vs-hired, venue choice, milestone extras |

---

## 5. Failure modes by subtype

| ID | Subtype | Typical failure |
|---|---|---|
| `FM1` | ST1 Young kids | Supervision lapse; allergy incident; over-tired/over-sugared meltdown; runtime too long |
| `FM2` | ST2 Older kids | Boredom (activity underplanned); uneven group dynamics; sleepover logistics breakdown |
| `FM3` | ST3 Teen | Safety gaps (gatecrashers, smuggled alcohol); too-visible adults → social flop; transport/pickup chaos |
| `FM4` | ST4 Adult | Over-service of alcohol; food/drink quantity miscalc; venue curfew/noise breach; RSVP no-shows |
| `FM5` | ST5 Milestone | Scale/logistics overwhelm the host; budget overrun; expectations mismatch |
| `FM-X` | cross-cutting | Weather (outdoor) unhandled; headcount wrong; cake fails (all subtypes — covered by Core risks) |

Each failure mode binds to mitigations in `MOD-RISK` (e.g., FM1→supervision ratio + allergy chain;
FM4→responsible-service + curfew confirm).

---

## 6. Success conditions by subtype

| ID | Subtype | "Good" looks like |
|---|---|---|
| `SC1` | ST1 | Safe throughout; honoree happy; on-time wind-down; zero allergy/supervision incidents |
| `SC2` | ST2 | Group engaged the whole time; the activity landed; sleepover (if any) ran smoothly |
| `SC3` | ST3 | Teens felt autonomy; safety held invisibly; socially a hit; everyone got home safely |
| `SC4` | ST4 | Food & drink flowed; responsible service; ran to time; guests stayed and enjoyed |
| `SC5` | ST5 | Memorable and well-organized; within budget; expectations met or exceeded |
| `SC-X` | all | Started on time; nothing critical forgotten; host not overwhelmed; guests felt cared for |

These are the targets the execution system's status (On Track / At Risk / Critical / Completed) measures
toward.

---

## 7. Module composition model

How OPE assembles a final plan from a scenario:

```
                         ┌───────────────────────────┐
   Scenario inputs  ───▶ │  Birthday Core (MOD-CORE) │  (always)
   (DP1..DP13)           └───────────────────────────┘
            │                         +
            ├── DP1/DP2 ─▶  Subtype Module (one of ST1–ST4) [+ Milestone overlay]
            ├── DP3     ─▶  Venue Module (one of HOME / OUTDOOR / RENTED)
            ├── DP5..DP11 ▶ Optional Modules (alcohol, entertainer/activity, sleepover,
            │               transport, theme, favors, dietary, surprise — 0..n)
            │                         ▼
            └──────────────▶  MOD-RISK  = de-duplicated union of all selected modules' risks
                                      ▼
                          ┌───────────────────────────┐
                          │   ASSEMBLY PIPELINE        │
                          └───────────────────────────┘
                                      ▼
                              Final composed plan
```

**Assembly pipeline (deterministic, then AI polish):**
1. **Start with `MOD-CORE`** (phases, core tasks/milestones/cost drivers/templates).
2. **Select base subtype** (ST1–ST4) from `age_group`; apply `MOD-OV-MILESTONE` if milestone.
3. **Select venue module** from `venue_type`.
4. **Add optional modules** per decision points (§4), honoring **selection rules** below.
5. **Merge & de-duplicate** the tasks / resources / cost drivers / milestones / templates from all
   selected modules into one set.
6. **Order** by phase, then by dependency graph (§4 of the content KB); resolve conflicts (below).
7. **Compute derived quantities** (supervision ratio, cake servings, favors, tables…) and **price**
   the merged cost drivers deterministically (cost engine, seeded regional values).
8. **Build `MOD-RISK`** — union of applicable risks (by `applies_if`), de-duplicated, severity-ranked.
9. **Hand to output:** consumer plan (checklist/timeline, resources, budget range, risks, templates);
   the **thin AI layer** personalizes summary/copy on top — never quantities or prices.

**Selection & conflict rules (the composer must enforce):**
- **Exactly one** base subtype (ST1–ST4); **milestone is additive**, never standalone.
- **Exactly one** venue module.
- **Entertainment is one-of:** DIY (default) ⊕ entertainer ⊕ activity-venue — never two.
- **`MOD-OPT-ALCOHOL` requires ST4** (gated; ignored for kids/teen).
- **`MOD-OPT-SLEEPOVER` only for ST1/ST2/ST3** (not adult).
- **`MOD-OPT-FAVORS` defaults on for ST1/ST2**, optional otherwise.
- **`MOD-VEN-OUTDOOR` forces the weather backup task + risk**; activity-venue replaces home setup tasks.
- **De-dup on merge:** if two modules contribute the same task/cost driver (e.g., dietary handling),
  keep one, take the stricter parameter (e.g., higher supervision ratio, larger buffer).
- **Safety is non-negotiable:** allergy chain (T06→T16→T24) and the supervision task are never dropped
  by any module combination.

**Why this model:** one curated Core + a small module registry composes *all* birthday variants (young
kids at home, teen sleepover, adult evening with bar, milestone at a rented venue) without authoring a
separate template per combination — and the same composition pattern generalizes to future categories.

---

## 8. What this enables next (not built here)

- A **module registry** is the unit of authoring: adding "teen sleepover" support = one optional module,
  not a new template.
- New birthday support is added by **filling module content**, not rewiring the engine.
- The composition pattern (**Core + Subtype + Venue + Risk + Optional**) is the template for **every
  future OPE category** — birthday is the reference implementation.

_Operational architecture only. No code, API, UI, or marketing._
