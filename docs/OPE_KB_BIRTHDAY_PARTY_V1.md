# OPE Knowledge Base — Birthday Party v1

> **Category:** `birthday` (maps to `activity_category`)
> **Purpose:** the first production-ready OPE knowledge-base category — structured **operational
> knowledge** that OPE Core assembles into a consumer plan (Activity Planner). An operations manual,
> not marketing, lessons, or certification content.
> **Source of truth:** `OPE_CORE_MVP_V1.md`, `OPE_V1_TECHNICAL_DESIGN.md`,
> `ACTIVITY_PLANNER_MVP_V1.md`, `ACTIVITY_PLANNER_OUTPUTS_V1.md`.
> **Date:** 2026-06-06

> **About figures:** all budget numbers are **illustrative USD for a baseline scenario** (see §8) and
> are **regionally calibrated at runtime** (§12). They are seed values for the cost engine, not fixed
> prices.

**ID conventions:** `P#` phases · `T##` tasks · `R##` resources · `CD##` cost drivers · `RK##` risks ·
`M#` milestones · `TPL#` templates · `DQ.*` derived quantities.

---

## 1. Activity definition

- **What it is:** a birthday celebration for one honoree, hosted by a non-professional (the consumer),
  typically for friends/family.
- **Sub-types covered:** **kids birthday** (primary), **adult/casual birthday** (secondary). The
  template adapts by `age_group`.
- **Typical shape:** 2–4 hours; arrival & free time → activities/games → food & cake → wind-down.
- **Common venues:** home/backyard (most common), park (outdoor), rented small venue.
- **Primary drivers** (scenario inputs the plan scales from): `guest_count`, `age_group`,
  `venue_type`, `date`, `region`, `budget` (optional), `theme`, `special_requirements` (allergies,
  accessibility).

---

## 2. Planning phases

| Phase | Window (relative to date) | Goal |
|---|---|---|
| `P1` Foundations | 3–4 weeks before | Date, guest list, budget, venue, theme decided |
| `P2` Bookings & Invites | 2–3 weeks before | Invitations sent; cake, food, entertainment chosen |
| `P3` Preparation | ~1 week before | RSVPs confirmed; supplies bought; food/activities planned |
| `P4` Final days | 1–2 days before | Fresh shopping; cake ready; partial setup |
| `P5` Day-of | day of | Decorate, run the party, wind down |
| `P6` Wrap-up | after | Cleanup, thank-yous, leftovers/returns |

> Short-lead variant (< 2 weeks): collapse P1–P2 into one intake sprint; the dependency graph (§4),
> not the calendar, governs order.

---

## 3. Tasks by phase

Format: `id · priority(high/med/low) · deps · task`.

**P1 — Foundations**
- `T01` · high · — · Confirm date & time window (age-appropriate; early afternoon for young kids).
- `T02` · high · T01 · Decide guest count / list (kids + accompanying adults).
- `T03` · high · — · Set budget target.
- `T04` · high · T01,T02 · Choose & confirm venue (home/backyard/park/venue); check capacity & rules.
- `T05` · med · — · Pick theme / vibe.
- `T06` · med · T02 · Capture special requirements (allergies, dietary, accessibility, age range).

**P2 — Bookings & Invites**
- `T07` · high · T01,T02,T04 · Send invitations with RSVP + **allergy ask**.
- `T08` · high · T03,T05 · Decide & order/plan the **cake** (confirm allergy-safe if needed).
- `T09` · high · T02,T03 · Plan the **menu** (kid food + adult option + allergy-safe item).
- `T10` · med · T03,T05 · Decide **entertainment** (DIY games / entertainer / activity).
- `T11` · med · T05 · Plan **decorations & theme supplies**.
- `T12` · low · T03 · Decide **party favors**.

**P3 — Preparation**
- `T13` · high · T07 · Track & confirm **RSVPs**; chase non-responders.
- `T14` · high · T09,T11,T12 · Buy non-perishable supplies, décor, tableware, favors.
- `T15` · med · T10 · Prepare games/activities (materials, prizes, plan B indoor).
- `T16` · med · T06 · Confirm allergy-safe plan with whoever provides food/cake.
- `T17` · low · T13 · Finalize headcount-based quantities (food, favors, seating).

**P4 — Final days**
- `T18` · high · T09 · Shop for fresh food & drinks.
- `T19` · high · T08 · Bake or collect the cake; store correctly.
- `T20` · med · T11 · Pre-decorate / stage what can be done early.
- `T21` · med · T01 · Confirm weather & backup (if outdoor, §9 RK01).
- `T22` · low · — · Charge camera/phone; prepare a small first-aid kit.

**P5 — Day-of**
- `T23` · high · T20 · Decorate; set up food & activity stations; shaded area if outdoor.
- `T24` · high · T16 · Set out food with **allergy-safe items separated and labeled**.
- `T25` · high · — · Welcome guests; free play while everyone arrives.
- `T26` · med · T15 · Run games/activities.
- `T27` · high · T19 · Cake & candles moment.
- `T28` · med · T12 · Hand out favors as guests leave.

**P6 — Wrap-up**
- `T29` · med · — · Pack up & clean the space.
- `T30` · low · — · Send thank-you messages.
- `T31` · low · — · Handle leftovers / return rentals or borrowed items.
- `T32` · low · — · Quick note of what worked for next time.

---

## 4. Dependencies

Critical chains the engine should respect:
- **Date → guest list → venue:** `T01 → T02 → T04` (venue sizing needs the count).
- **Invites → RSVPs → final quantities:** `T07 → T13 → T17 → T18` (don't buy fresh food before headcount).
- **Allergy capture → safe provisioning → safe service:** `T06 → T16 → T24` (a safety chain, never skipped).
- **Cake decision → cake ready → cake moment:** `T08 → T19 → T27`.
- **Theme → décor plan → setup:** `T05 → T11 → T23`.
- **Weather check gates outdoor setup:** `T21 → T23` for outdoor venues.

---

## 5. Timeline recommendations

| When | Focus | Key tasks |
|---|---|---|
| **3–4 weeks before** | Lock foundations | T01–T06 |
| **2–3 weeks before** | Invites + bookings | T07–T12 |
| **~1 week before** | Confirm + buy | T13–T17 |
| **1–2 days before** | Fresh shop + setup | T18–T22 (T21 weather check) |
| **Day of** | Execute | T23–T28 |
| **After** | Wrap up | T29–T32 |

Reminder cadence for execution: 14 / 7 / 3 / 1 days before + day-of (RSVP-deadline and weather nudges
inserted as relevant).

---

## 6. Resources and supplies

`id · type(food/supply/equipment/service/space) · scaling(per_guest/per_kid/flat/per_unit) · resource`.

- `R01` · food · per_guest · Party food (kid-friendly mains/snacks)
- `R02` · food · flat/per_unit · Birthday cake (sized to guest count)
- `R03` · food · per_guest · Drinks (juice/water for kids; adult option)
- `R04` · food · flat · Allergy-safe / dietary alternative items
- `R05` · supply · per_guest · Tableware (plates, cups, napkins, cutlery)
- `R06` · supply · flat · Decorations (theme: balloons, banner, tablecloth)
- `R07` · service/supply · flat · Entertainment (entertainer **or** DIY games kit)
- `R08` · supply · per_kid · Party favors / goodie bags
- `R09` · supply · per_unit · Activity materials & small prizes
- `R10` · equipment · per_unit · Tables & seating (if not at home/venue-provided)
- `R11` · equipment · flat · Shade / canopy (outdoor) + sunscreen/water
- `R12` · equipment · flat · Music/speaker
- `R13` · supply · flat · First-aid kit + allergy action items
- `R14` · space · flat · Venue/space (home = none; park/venue = booked)
- `R15` · supply · flat · Cleanup supplies & trash bags
- `R16` · supply · per_unit · Candles & lighter; cake-cutting kit

---

## 7. Cost drivers

`id · item_key · basis · driver · note`.

- `CD01` · `cake` · per_unit · servings (≈ guest_count) · single biggest discretionary line
- `CD02` · `party_food_per_head` · per_guest · guest_count · kid + adult portions
- `CD03` · `drinks_per_head` · per_guest · guest_count ·
- `CD04` · `decorations` · flat · theme tier · scales loosely with guest_count
- `CD05` · `tableware_per_head` · per_guest · guest_count ·
- `CD06` · `entertainment` · flat · entertainer vs DIY · 0 if DIY games
- `CD07` · `favors_per_kid` · per_unit · kid_count · per child
- `CD08` · `activity_materials` · flat · games chosen ·
- `CD09` · `venue_hire` · flat · venue_type · 0 for home; > 0 for park permit / rented venue
- `CD10` · `furniture_rental` · per_unit · tables/chairs needed · 0 if provided
- `CD11` · `shade_canopy` · flat · outdoor only · weather mitigation
- `CD12` · `late_addons` · flat · optional · photographer, bounce house, etc. (optional)

---

## 8. Budget ranges

**Baseline scenario for the figures below:** ~15 kids + ~10 adults, home/backyard, DIY-leaning.
Illustrative USD; the engine scales per-guest lines by actual count and applies regional factors (§12).

| Driver | Low | Likely | High |
|---|---|---|---|
| Cake (CD01) | $25 | $60 | $150 |
| Party food (CD02) | $80 | $150 | $260 |
| Drinks (CD03) | $20 | $40 | $70 |
| Decorations (CD04) | $25 | $60 | $130 |
| Tableware (CD05) | $15 | $30 | $55 |
| Entertainment (CD06) | $0 (DIY) | $120 | $350 |
| Favors (CD07) | $20 | $45 | $90 |
| Activity materials (CD08) | $10 | $30 | $70 |
| Venue/permit (CD09) | $0 | $0–50 | $250 |
| Furniture rental (CD10) | $0 | $0 | $120 |
| Shade/canopy (CD11) | $0 | $0 | $120 |
| **Total (typical)** | **~$200** | **~$550** | **~$1,400** |

**Range levers:** DIY vs hired entertainer (CD06) and home vs rented venue (CD09) are the two biggest
swings. Contingency: apply ~10% on top per cost-engine default.

---

## 9. Risk reminders

`id · severity · probability · mitigation`.

- `RK01` · high · medium · **Weather (outdoor)** → confirm shade + an indoor backup; decide by the day before.
- `RK02` · high · medium · **Food allergy / dietary** → capture at RSVP; confirm allergy-safe cake/food; label & separate; keep an action plan.
- `RK03` · high · medium · **Child supervision** → ensure adult-to-child ratio (≈1 adult per 5–6 young kids); watch boundaries/water.
- `RK04` · medium · high · **Headcount uncertainty / late RSVPs** → chase before fresh-food shopping; confirm count.
- `RK05` · medium · medium · **Budget overrun** → entertainer + venue are the swings; track against target.
- `RK06` · medium · low · **Cake problems** (melt, late, wrong) → confirm pickup/bake timing; cool storage; have a backup dessert.
- `RK07` · medium · low · **Over-tired / over-sugared kids** → schedule calm wind-down; pace sweets.
- `RK08` · low · medium · **Entertainment falls flat / runs short** → have 2–3 backup games ready.
- `RK09` · low · low · **Venue/permit issue** (park rules, capacity) → confirm rules at booking.
- `RK10` · medium · low · **Minor injury** → first-aid kit on hand; know nearest help.

---

## 10. Milestones

Execution gates (consumed by the progress/execution system):
- `M1` Date confirmed (T01)
- `M2` Venue confirmed (T04)
- `M3` Invitations sent (T07)
- `M4` RSVPs / headcount confirmed (T13/T17)
- `M5` Cake & food sorted (T08/T18/T19)
- `M6` Supplies & décor purchased (T14)
- `M7` Final confirmation (setup plan + weather check, T20–T22)
- `M8` Party completed (T28/T29)

---

## 11. Communication templates required

`id · template · required variables`.

- `TPL1` · **Invitation** · honoree_name, date, time, location, theme, rsvp_deadline, allergy_ask
- `TPL2` · **RSVP reminder** · guest_name, honoree_name, date, time, location
- `TPL3` · **Allergy / dietary ask** *(can be embedded in TPL1)* · — (collects allergies/diet)
- `TPL4` · **Thank-you** · guest_name, honoree_name
- `TPL5` · **Feedback request** *(optional)* · guest_name

> Templates are content stubs OPE personalizes; they are **required** for this category's plan output.

---

## 12. Regional adjustment points

Resolution order for any regional value: **metro_area → country → global default.**

- **High regional sensitivity:** `venue_hire`/permits (CD09), `entertainment` (CD06),
  `furniture_rental` (CD10) — labor/real-estate driven.
- **Medium:** `cake` (CD01), `party_food_per_head` (CD02), `drinks` (CD03) — local food costs.
- **Low:** `decorations`, `tableware`, `favors`, `activity_materials` — broadly priced goods.
- **Availability/rules that vary regionally:** park **permit** requirements, alcohol rules (adult
  birthdays), typical venue types, seasonal weather (affects RK01 weighting).
- **Currency:** values seeded per region in the seed currency; no silent FX.

---

## 13. Structured data model (for future OPE engine use)

Conceptual data shape (illustrative, not code) the category record provides to OPE Core:

```
category: "birthday"
sub_types: ["kids", "adult"]
scenario_inputs:
  required: [guest_count, venue_type, region]
  optional: [date, age_group, theme, budget, special_requirements]
derived_quantities:
  kid_count:            from guest_count split (age_group)
  cake_servings:        guest_count
  meals:                guest_count
  favors:               kid_count
  tableware_units:      guest_count (+ buffer)
  supervising_adults:   ceil(kid_count / kids_per_adult)        # config ~5–6
  tables_needed:        ceil(guest_count / seats_per_table)     # if not home/venue
  outdoor:              venue_type in [outdoor, both]
phases:    [{ id, window_days_before, goal }]
tasks:     [{ id, phase, priority, deps[], title }]
resources: [{ id, type, scaling, name, pricing_ref }]
cost_drivers: [{ id, item_key, basis, driver_quantity }]
pricing:   per item_key → { region → { low, mid, high, currency } }   # seeded
risks:     [{ id, severity, probability, mitigation, applies_if }]    # e.g. outdoor
milestones:[{ id, label, from_tasks[] }]
templates: [{ id, name, required_variables[] }]
config_defaults: { kids_per_adult, seats_per_table, contingency_pct }
regional: { sensitivity_by_item_key, resolution: [metro, country, global] }
```

**How OPE Core uses it:** scenario inputs → compute `derived_quantities` → select & scale
`tasks`/`resources` → price `cost_drivers` against seeded `pricing` (deterministic) → attach
applicable `risks`/`milestones` → fill `templates` → hand the assembled plan to the consumer output
(and the thin AI layer personalizes summary/copy on top). The cost engine is deterministic; AI never
sets quantities or prices.

---

_Operational knowledge only. No marketing, lessons, certification content, code, API, or UI._
