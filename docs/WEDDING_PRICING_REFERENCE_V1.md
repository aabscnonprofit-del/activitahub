# Wedding Pricing Reference v1 — OPE™ Cost Engine basis

> **Category:** `wedding` · **Date:** 2026-06-04 · **Status:** logic spec for OPE Cost Engine
> **Source of truth:** `docs/MASTER_PRODUCT_DECISIONS.md`, `docs/OPE_V1_TECHNICAL_DESIGN.md`,
> `docs/WEDDING_KNOWLEDGE_BASE_V1.md`
> **Audience:** the deterministic Cost Estimation Engine (OPE §7). The LLM proposes *what*;
> this document defines *how the engine computes how much* — **without any prices**.

**Hard rule — no money in this file.** This is NOT a price list. It contains **no currencies,
no amounts, no rates**. Every "estimate" is expressed as *logic* (which tier, which drivers,
which regional dimensions). Actual `low/mid/high` numbers live in `knowledge_pricing`, seeded
per region at build time (OPE §3.2, §5, §13 Q1). This file tells the engine **how to assemble**
an estimate once those base values exist.

Each Cost Driver (CD001–CD040, mirrored from Knowledge Base §5) is specified with:
`item_key · basis · requirement · quantity_logic · regional_modifier_logic ·
low_estimate_logic · likely_estimate_logic · high_estimate_logic · dependencies · notes`.

---

## 1. How to read this

**Estimate model (OPE §7).** For each priced line:
```
line_estimate(tier) = base_price[item_key, region, tier] × units × regional_index
units = quantity_logic(scenario, derived_quantities)
tier ∈ { low, likely, high }
```
`base_price[...]` is the only piece that carries money, and it is **out of scope here** (it lives
in `knowledge_pricing`). This document defines `units` (quantity_logic), the tier *assumptions*,
and the `regional_index` *resolution* — never the numbers themselves.

**basis recap (OPE §3.1):** `flat` → units = 1 · `per_guest` → units = guest count ·
`per_hour` → units = hours · `per_unit` → units = a derived count (§3).

**Estimate tiers (qualitative).** `low` = budget/minimum-viable assumption · `likely` = standard
market-typical assumption · `high` = premium/upgraded assumption. The spread is driven by the
named scenario inputs, not by guessing a number.

**Regional resolution (OPE §7.1).** `regional_index` is resolved by hierarchy:
`metro_area → state/region → country → global default`. The **first** level with data wins.
Per-CD we declare *regional sensitivity* (`high | medium | low`) and which dimension dominates:
- **Labor-driven** items (staffing, coordination, beauty) → dominated by **metro labor cost**.
- **Venue / real-estate-driven** → dominated by **metro + state**.
- **Goods / rentals** (equipment, florals, cake) → **medium**, freight + local availability.
- **Nationally-priced goods** (printed stationery, attire purchase) → **low** sensitivity.

**Requirement classes.**
- `mandatory` — always in a wedding estimate (engine always includes; quantity may scale).
- `conditionally_required` — included **only if** a stated scenario condition holds.
- `optional` — included only if the organizer/scenario opts in (default off).

---

## 2. Scenario inputs (canonical variables)

These are the inputs `quantity_logic` and `dependencies` reference. They come from the OPE
scenario (OPE §4) or sensible defaults. Symbol `SI.*`.

| Input | Meaning / domain |
|---|---|
| `SI.guest_count` | confirmed/likely attending guests (the master driver) |
| `SI.service_style` | `buffet · family_style · plated · stations · cocktail` |
| `SI.has_alcohol` + `SI.bar_type` | bool; `open · limited · cash · dry` |
| `SI.venue_type` | `indoor · outdoor · both` (reuses `location_type`) |
| `SI.venue_pricing_model` | `per_head · flat · external` (couple's own/none) |
| `SI.event_hours` | reception/event duration (drives per_hour lines) |
| `SI.ceremony_included` + `SI.ceremony_separate_site` | bool; affects florals, seating, transport |
| `SI.is_destination` | bool; affects transport, accommodation, logistics |
| `SI.off_grid` | bool; venue lacks mains power/facilities |
| `SI.venue_has_restrooms` | bool |
| `SI.indoor_backup_exists` | bool (weather contingency) |
| `SI.wedding_party_size` | attendants count (bouquets/boutonnieres/beauty) |
| `SI.close_family_count` | for corsages/boutonnieres/VIP |
| `SI.beauty_party_size` | people needing hair/makeup |
| `SI.region` | `{ metro_area, state, country }` |
| `SI.season` | drives floral availability + outdoor weather mitigation |
| `SI.formality` | `casual · semi_formal · formal · black_tie` (shifts tiers up) |
| `SI.needs_guest_transport` | bool (multi-site or destination) |

**Config defaults** (assumptions, not prices) referenced below: `seats_per_table` (default by
formality, ~8–10), `guests_per_server` (plated ~12, family ~16, buffet/stations ~25),
`guests_per_bartender` (~75), `guests_per_restroom_unit`, `vehicle_capacity`,
`avg_guests_per_household`, `area_per_seated_guest`, `area_per_dancing_guest`, `dancing_fraction`,
`vendor_meal_count`. These are engine config, regionally tunable, **non-monetary**.

---

## 3. Derived Quantities

Computed once per scenario, then consumed by `quantity_logic`. All are counts/areas/hours — **no money**.
`ceil()` rounds up; `⌈ ⌉` same.

| Derived | Rule |
|---|---|
| `DQ.attending_guests` | `SI.guest_count` (if only invited known: `invited × rsvp_rate`) |
| `DQ.guest_tables_needed` | `ceil(attending_guests ÷ seats_per_table)` |
| `DQ.utility_tables` | head + cake + gift + registration + DJ/band/buffet (config count) |
| `DQ.tables_needed` | `guest_tables_needed + utility_tables` |
| `DQ.ceremony_seats` | `attending_guests` if `SI.ceremony_included` else 0 |
| `DQ.chairs_needed` | `attending_guests + ceremony_seats(if separate from reception seating) + buffer`, rounded up to rental lot |
| `DQ.centerpieces_needed` | `guest_tables_needed` (+1 head table if styled) |
| `DQ.linens_needed` | `tables_needed` (+ specialty/overlay count) |
| `DQ.place_settings_needed` | `attending_guests + vendor_meal_count` |
| `DQ.meals_needed` | `attending_guests + vendor_meal_count` |
| `DQ.cake_servings` | `attending_guests` (minus dessert-table offset if present) |
| `DQ.bartenders_needed` | `ceil(attending_guests ÷ guests_per_bartender)` if `SI.has_alcohol` else 0 |
| `DQ.waitstaff_needed` | `ceil(attending_guests ÷ guests_per_server[SI.service_style])` |
| `DQ.service_hours` | `SI.event_hours + setup_teardown_buffer` (per staff role) |
| `DQ.bar_hours` | `SI.event_hours` (minus formal-dinner pause if configured) |
| `DQ.coordinator_hours` | `SI.event_hours + prep_buffer`, scaled by scope (×assistants for large) |
| `DQ.setup_crew_hours` | `setup_window + teardown_window`, scaled by décor/rental volume |
| `DQ.bouquets_needed` | `1 (to-be-wed carrying) + bridal_party_carrying` |
| `DQ.boutonnieres_needed` | `partners + groomsmen/ushers + fathers + grandfathers + officiant` |
| `DQ.corsages_needed` | `mothers + grandmothers + honored guests` |
| `DQ.hair_makeup_people` | `SI.beauty_party_size` (couple + attendants + mothers) |
| `DQ.shuttle_vehicles_needed` | `ceil(guests_needing_transport ÷ vehicle_capacity)` |
| `DQ.shuttle_trips` | `shuttle_vehicles_needed × trips_per_vehicle(schedule)` |
| `DQ.restrooms_needed` | `ceil(attending_guests ÷ guests_per_restroom_unit)` if outdoor/no facilities |
| `DQ.invitations_needed` | `ceil(attending_guests ÷ avg_guests_per_household) + extras` |
| `DQ.day_of_stationery_units` | `attending_guests (place cards/menus) + tables_needed (numbers) + signage_set` |
| `DQ.dancefloor_area` | `attending_guests × dancing_fraction × area_per_dancing_guest` |
| `DQ.tent_area` | `attending_guests × area_per_seated_guest + service_area + dancefloor_area` |
| `DQ.vendor_meal_count` | count of on-site vendors requiring a meal (photo, band, coordinator, etc.) |

> **Beginner vs experienced (OPE §6):** beginners get conservative config (lower
> `guests_per_server`, larger buffers → higher quantities); experienced organizers may override
> config, and the engine recomputes deterministically (OPE §9.4) — quantities change, logic doesn't.

---

## 4. Cost Driver pricing logic (CD001–CD040)

Grouped by formula bucket (§5). Each block: the 9 required fields + requirement class.

### Venue

#### CD001 · `venue_per_head` (basis: per_guest)
- **requirement:** conditionally_required — when `SI.venue_pricing_model = per_head`.
- **quantity_logic:** `DQ.attending_guests`.
- **regional_modifier_logic:** **high** sensitivity; metro_area + state dominant (real-estate driven).
- **low_estimate_logic:** off-peak/weekday, basic package, minimal inclusions.
- **likely_estimate_logic:** standard weekend package, typical inclusions (tables/chairs basic).
- **high_estimate_logic:** peak-season prime venue, premium inclusions/exclusivity.
- **dependencies:** `SI.guest_count`, `SI.season`, `SI.venue_pricing_model`, `SI.formality`.
- **notes:** mutually exclusive with CD002; pick one per scenario. May bundle CD020/CD021/CD006.

#### CD002 · `venue_flat` (basis: flat)
- **requirement:** conditionally_required — when `SI.venue_pricing_model = flat`. (One of CD001/CD002 is **mandatory** unless `external`.)
- **quantity_logic:** `1`.
- **regional_modifier_logic:** **high**; metro_area + state.
- **low_estimate_logic:** off-peak hire, bare space, short hire window.
- **likely_estimate_logic:** standard weekend hire window with core amenities.
- **high_estimate_logic:** peak prime venue, extended hours, exclusivity buyout.
- **dependencies:** `SI.season`, `SI.event_hours`, `SI.venue_type`.
- **notes:** if venue is the couple's own/external, set requirement to none and exclude both.

### Food

#### CD003 · `catering_per_head` (basis: per_guest)
- **requirement:** mandatory.
- **quantity_logic:** `DQ.meals_needed` (= attending_guests + vendor meals).
- **regional_modifier_logic:** **high**; metro labor + food-cost index (country → state → metro).
- **low_estimate_logic:** budget buffet / limited menu.
- **likely_estimate_logic:** standard plated 3-course (or equivalent family-style).
- **high_estimate_logic:** premium plated multi-course + canapés / stations.
- **dependencies:** `SI.guest_count`, `SI.service_style`, `SI.formality`.
- **notes:** the dominant line; `SI.service_style` shifts both the tier and `DQ.waitstaff_needed`.

#### CD007 · `wedding_cake` (basis: per_unit)
- **requirement:** conditionally_required — included by default unless explicitly removed; off for dessert-only/none.
- **quantity_logic:** `DQ.cake_servings` (or tier count when priced per tier).
- **regional_modifier_logic:** **medium**; metro bakery labor.
- **low_estimate_logic:** simple single-tier / sheet-cake backup.
- **likely_estimate_logic:** standard multi-tier, moderate decoration.
- **high_estimate_logic:** elaborate tiered design, premium flavors, dietary variants.
- **dependencies:** `SI.guest_count`, dietary needs.
- **notes:** dessert-table offset reduces servings; align delivery to RK022.

#### CD008 · `late_night_food` (basis: flat)
- **requirement:** optional.
- **quantity_logic:** `1` (package) — internally scaled to `attending_guests` by the vendor package.
- **regional_modifier_logic:** **medium**; metro food/labor.
- **low_estimate_logic:** simple single snack item.
- **likely_estimate_logic:** one popular station for the crowd.
- **high_estimate_logic:** multiple premium stations.
- **dependencies:** `SI.guest_count`, `SI.event_hours`.
- **notes:** value scales with long receptions; default off.

### Bar

#### CD004 · `bar_per_head` (basis: per_guest)
- **requirement:** conditionally_required — when `SI.has_alcohol` and `SI.bar_type ∈ {open, limited}`.
- **quantity_logic:** `DQ.attending_guests` (drinking-age fraction may reduce; config).
- **regional_modifier_logic:** **high**; metro beverage + licensing cost.
- **low_estimate_logic:** beer/wine only, limited window.
- **likely_estimate_logic:** standard open bar, house spirits.
- **high_estimate_logic:** premium/top-shelf open bar + signature cocktails, full window.
- **dependencies:** `SI.has_alcohol`, `SI.bar_type`, `SI.guest_count`, `DQ.bar_hours`.
- **notes:** if `bar_type = cash` → near-zero platform cost (guest-paid); if `dry` → exclude. Pairs with CD006; licensing per RK006.

### Staffing

#### CD005 · `waitstaff_hour` (basis: per_hour)
- **requirement:** conditionally_required — when service requires servers (`service_style ∈ {plated, family_style, stations}`); minimal for pure buffet/cocktail.
- **quantity_logic:** `DQ.waitstaff_needed × DQ.service_hours`.
- **regional_modifier_logic:** **high**; metro labor index dominant.
- **low_estimate_logic:** minimum viable ratio, no overtime.
- **likely_estimate_logic:** standard ratio for the service style.
- **high_estimate_logic:** generous ratio + captain/maître d', overtime buffer.
- **dependencies:** `SI.service_style`, `SI.guest_count`, `SI.event_hours`.
- **notes:** often bundled inside CD003 by full-service caterers — avoid double-count (see §5 note).

#### CD006 · `bartender_hour` (basis: per_hour)
- **requirement:** conditionally_required — when `SI.has_alcohol`.
- **quantity_logic:** `DQ.bartenders_needed × DQ.bar_hours`.
- **regional_modifier_logic:** **high**; metro labor + certification.
- **low_estimate_logic:** minimum bartenders, standard hours.
- **likely_estimate_logic:** standard ratio (~1:75), setup/teardown included.
- **high_estimate_logic:** higher ratio for fast service + barback/overtime.
- **dependencies:** `SI.has_alcohol`, `SI.guest_count`, `DQ.bar_hours`.
- **notes:** may be bundled in CD004 packages — reconcile to avoid double-count.

#### CD036 · `coordinator_hour` (basis: per_hour)
- **requirement:** mandatory.
- **quantity_logic:** `DQ.coordinator_hours` (× assistant headcount for large events).
- **regional_modifier_logic:** **high**; metro labor.
- **low_estimate_logic:** day-of coordination only.
- **likely_estimate_logic:** partial planning + full day-of + assistant for mid-size.
- **high_estimate_logic:** full planning + multi-assistant team for large/complex.
- **dependencies:** `SI.guest_count`, `SI.event_hours`, complexity (multi-site, destination).
- **notes:** this is the organizer's own labor; always include in client-facing cost (Master §7).

#### CD037 · `setup_crew_hour` (basis: per_hour)
- **requirement:** conditionally_required — when décor/rental volume or venue access window needs dedicated install/teardown labor.
- **quantity_logic:** `crew_size × DQ.setup_crew_hours`.
- **regional_modifier_logic:** **high**; metro labor.
- **low_estimate_logic:** minimal crew, tight window.
- **likely_estimate_logic:** standard crew sized to décor volume.
- **high_estimate_logic:** large crew + rigging/heavy installs + overtime.
- **dependencies:** décor volume (CD015/CD016/CD024), venue access window (RK027).
- **notes:** scales with RK027 risk; beginners default to a larger buffer.

#### CD038 · `security` (basis: flat)
- **requirement:** conditionally_required — when large guest count, alcohol service, or high-profile.
- **quantity_logic:** `1` (package; internally scales guards to guest_count).
- **regional_modifier_logic:** **high**; metro labor + licensing.
- **low_estimate_logic:** single guard, short window.
- **likely_estimate_logic:** guards scaled to guest count + bar.
- **high_estimate_logic:** full team + access control for large/VIP.
- **dependencies:** `SI.guest_count`, `SI.has_alcohol`.
- **notes:** trigger thresholds configurable; ties to RK008/RK023/RK032.

#### CD050-adjacent · first-aid / medical — *not a CD in KB v1*; tracked as a resource (R050). If priced, add as a future CD; for now fold into CD038 package or coordinator scope.

### Decor

#### CD015 · `ceremony_florals` (basis: flat)
- **requirement:** conditionally_required — when `SI.ceremony_included`.
- **quantity_logic:** `1` (install package).
- **regional_modifier_logic:** **medium–high**; metro labor + seasonal stem availability.
- **low_estimate_logic:** minimal aisle/altar accents.
- **likely_estimate_logic:** standard arch/altar + aisle markers.
- **high_estimate_logic:** large floral installations / suspended designs.
- **dependencies:** `SI.ceremony_included`, `SI.season`, `SI.formality`.
- **notes:** seasonal substitution per RK013; may be repurposed to reception (note the saving).

#### CD016 · `centerpiece` (basis: per_unit)
- **requirement:** conditionally_required — default on for seated receptions; off for cocktail-only.
- **quantity_logic:** `DQ.centerpieces_needed`.
- **regional_modifier_logic:** **medium**; seasonal florals + metro labor.
- **low_estimate_logic:** simple low arrangement / greenery.
- **likely_estimate_logic:** standard mixed arrangement per guest table.
- **high_estimate_logic:** elevated/large statement pieces, premium stems.
- **dependencies:** `DQ.guest_tables_needed`, `SI.season`.
- **notes:** scales directly with table count; the most quantity-sensitive décor line.

#### CD017 · `bouquet` (basis: per_unit)
- **requirement:** conditionally_required — default on (personal florals).
- **quantity_logic:** `DQ.bouquets_needed`.
- **regional_modifier_logic:** **medium**; seasonal stems.
- **low_estimate_logic:** small single-type bouquets.
- **likely_estimate_logic:** standard mixed bouquets for the carrying party.
- **high_estimate_logic:** large premium designs.
- **dependencies:** `SI.wedding_party_size`, `SI.season`.
- **notes:** the carried-by-one bouquet is the centerpiece of personal florals.

#### CD018 · `boutonniere_corsage` (basis: per_unit)
- **requirement:** conditionally_required — default on.
- **quantity_logic:** `DQ.boutonnieres_needed + DQ.corsages_needed`.
- **regional_modifier_logic:** **low–medium**.
- **low_estimate_logic:** simple single-bloom.
- **likely_estimate_logic:** standard for party + close family.
- **high_estimate_logic:** premium designs.
- **dependencies:** `SI.wedding_party_size`, `SI.close_family_count`.
- **notes:** small per-unit; quantity driven by party + honored family.

#### CD019 · `table_linens` (basis: per_unit)
- **requirement:** conditionally_required — when not bundled by venue/caterer.
- **quantity_logic:** `DQ.linens_needed`.
- **regional_modifier_logic:** **low–medium**; rental + laundering.
- **low_estimate_logic:** house/standard linens.
- **likely_estimate_logic:** upgraded color/texture for guest tables.
- **high_estimate_logic:** specialty/designer linens + overlays + napkins.
- **dependencies:** `DQ.tables_needed`.
- **notes:** reconcile against venue inclusions to avoid double-pay (T061).

#### CD020 · `chairs` (basis: per_unit)
- **requirement:** conditionally_required — when not venue-included.
- **quantity_logic:** `DQ.chairs_needed`.
- **regional_modifier_logic:** **low–medium**; rental + freight.
- **low_estimate_logic:** standard banquet chairs.
- **likely_estimate_logic:** upgraded chair (e.g., chiavari).
- **high_estimate_logic:** premium/specialty seating + ceremony-set swap.
- **dependencies:** `DQ.attending_guests`, `SI.ceremony_included`.
- **notes:** ceremony→reception chair re-set may add CD037 labor.

#### CD021 · `tables` (basis: per_unit)
- **requirement:** conditionally_required — when not venue-included.
- **quantity_logic:** `DQ.tables_needed`.
- **regional_modifier_logic:** **low–medium**; rental + freight.
- **low_estimate_logic:** standard rounds/banquets.
- **likely_estimate_logic:** mix incl. specialty (head/sweetheart/cake).
- **high_estimate_logic:** premium tables (farmhouse, etc.) + specialty shapes.
- **dependencies:** `DQ.guest_tables_needed`, `DQ.utility_tables`.
- **notes:** drives CD019 and CD016 quantities.

#### CD024 · `lighting_package` (basis: flat)
- **requirement:** conditionally_required — default on for evening/indoor-dim/outdoor; off for daytime full-light.
- **quantity_logic:** `1` (package; internally scales to venue size/guest count).
- **regional_modifier_logic:** **medium**; metro labor + gear.
- **low_estimate_logic:** basic ambient + path/safety lighting.
- **likely_estimate_logic:** uplighting + dancefloor wash.
- **high_estimate_logic:** full design (pinspotting, gobo, festoon, rigging).
- **dependencies:** `SI.venue_type`, `DQ.tent_area`/venue size, `SI.event_hours` (evening).
- **notes:** evening + outdoor raise both need and tier; ties to safety (RK032).

#### `signage_decor` (resource R031 — no CD number) — *In KB v1 signage has no cost-driver ID: `R031` is a **resource** id, not a cost driver (it is **not** `CD031`).* In cost terms it is folded under décor + day-of stationery (CD032); if priced separately, treat as a flat optional add-on.

### Photo / Video

#### CD009 · `photographer_hour` (basis: per_hour)
- **requirement:** mandatory (near-universal; can be downgraded, rarely removed).
- **quantity_logic:** `coverage_hours` (from run-of-show: prep → reception; ≈ `SI.event_hours + prep/exit buffer`).
- **regional_modifier_logic:** **high**; metro talent market.
- **low_estimate_logic:** short coverage, single shooter, digital-only.
- **likely_estimate_logic:** full-day coverage, edited gallery.
- **high_estimate_logic:** extended coverage + album + premium artist.
- **dependencies:** `SI.event_hours`, `SI.ceremony_included`, coverage scope.
- **notes:** packages are common — map package to coverage hours for the per_hour basis.

#### CD010 · `videographer_hour` (basis: per_hour)
- **requirement:** optional (default on for `formal/black_tie`, else opt-in).
- **quantity_logic:** `coverage_hours` (aligned to CD009).
- **regional_modifier_logic:** **high**; metro talent.
- **low_estimate_logic:** highlight reel, short coverage.
- **likely_estimate_logic:** full-day + feature film.
- **high_estimate_logic:** multi-cam + drone + same-day edit.
- **dependencies:** `SI.event_hours`, photo coordination (RK021).
- **notes:** coordinate windows with CD009 to avoid blocking shots.

#### CD011 · `second_shooter` (basis: flat)
- **requirement:** optional.
- **quantity_logic:** `1`.
- **regional_modifier_logic:** **high**; metro talent.
- **low_estimate_logic:** partial-day add-on.
- **likely_estimate_logic:** full-day add-on.
- **high_estimate_logic:** experienced second + extra deliverables.
- **dependencies:** CD009.
- **notes:** also a risk mitigation for RK021 (coverage + backup).

### Entertainment

#### CD012 · `band` (basis: flat)
- **requirement:** conditionally_required — when music = live band (mutually exclusive default with CD013).
- **quantity_logic:** `1` (package; size scales internally).
- **regional_modifier_logic:** **high**; metro talent.
- **low_estimate_logic:** small ensemble, single set.
- **likely_estimate_logic:** standard multi-piece, full reception.
- **high_estimate_logic:** large premium band + extended sets.
- **dependencies:** `SI.event_hours`, space/power (R016, CD025).
- **notes:** one of CD012/CD013 typically required; band usually requires CD025 sound.

#### CD013 · `dj_hour` (basis: per_hour)
- **requirement:** conditionally_required — when music = DJ (default alternative to CD012).
- **quantity_logic:** `SI.event_hours (+ ceremony set if same vendor)`.
- **regional_modifier_logic:** **medium–high**; metro talent.
- **low_estimate_logic:** basic DJ, house sound.
- **likely_estimate_logic:** DJ + MC + basic lighting.
- **high_estimate_logic:** premium DJ + production add-ons.
- **dependencies:** `SI.event_hours`.
- **notes:** often includes basic sound; reconcile with CD025 to avoid double-count.

#### CD014 · `ceremony_musicians` (basis: flat)
- **requirement:** conditionally_required — when `SI.ceremony_included` and live ceremony music wanted.
- **quantity_logic:** `1`.
- **regional_modifier_logic:** **high**; metro talent.
- **low_estimate_logic:** soloist.
- **likely_estimate_logic:** duo/trio.
- **high_estimate_logic:** larger ensemble.
- **dependencies:** `SI.ceremony_included`.
- **notes:** independent of reception music choice.

#### CD023 · `dancefloor` (basis: per_unit)
- **requirement:** conditionally_required — when venue lacks a suitable floor / outdoor.
- **quantity_logic:** `ceil(DQ.dancefloor_area ÷ panel_area)` (panels/units).
- **regional_modifier_logic:** **low–medium**; rental + freight.
- **low_estimate_logic:** minimal floor.
- **likely_estimate_logic:** sized to dancing fraction.
- **high_estimate_logic:** premium/custom (monogram, LED).
- **dependencies:** `DQ.dancefloor_area`, `SI.venue_type`.
- **notes:** outdoor often forces this on.

#### CD025 · `sound_system` (basis: flat)
- **requirement:** conditionally_required — when not provided by band/DJ/venue; mandatory for ceremony speech audibility.
- **quantity_logic:** `1` (+ ceremony PA if separate site).
- **regional_modifier_logic:** **medium**; gear + labor.
- **low_estimate_logic:** basic PA + one mic.
- **likely_estimate_logic:** PA + lapel + handheld for speeches.
- **high_estimate_logic:** multi-zone (ceremony + cocktail + reception) production.
- **dependencies:** `SI.ceremony_included`, music vendor inclusions, R016/R018.
- **notes:** reconcile with CD013/CD012 inclusions to avoid double-count.

#### CD-extra · `entertainment_extra` (R023) — photo booth / performers / sparklers.
- **requirement:** optional.
- **quantity_logic:** `1` per add-on selected.
- **regional_modifier_logic:** **medium**.
- **low/likely/high:** single basic add-on / popular add-on / multiple premium add-ons.
- **dependencies:** permits for pyrotechnics (CD040, RK011/RK032).
- **notes:** KB lists this as R023; no fixed CD number in v1 — treat as optional flat add-on(s).

### Transportation

#### CD033 · `guest_shuttle` (basis: per_unit)
- **requirement:** conditionally_required — when `SI.needs_guest_transport` (multi-site/destination).
- **quantity_logic:** `DQ.shuttle_trips` (vehicles × trips).
- **regional_modifier_logic:** **medium–high**; metro transport labor + fuel.
- **low_estimate_logic:** single shared run.
- **likely_estimate_logic:** scheduled runs covering arrival + departure.
- **high_estimate_logic:** continuous loop + premium coaches.
- **dependencies:** `DQ.shuttle_vehicles_needed`, schedule, `SI.is_destination`.
- **notes:** strongly tied to RK015/RK024.

#### CD034 · `couple_car` (basis: per_unit)
- **requirement:** optional (default on for `formal/black_tie`).
- **quantity_logic:** `vehicles_needed` (usually 1; +party cars).
- **regional_modifier_logic:** **medium**; metro transport.
- **low_estimate_logic:** standard car, single transfer.
- **likely_estimate_logic:** premium car, arrival + departure.
- **high_estimate_logic:** luxury/specialty vehicle + standby.
- **dependencies:** `SI.formality`, photo timeline (T046).
- **notes:** include backup driver per RK024.

#### CD035 · `accommodation_block` (basis: per_unit)
- **requirement:** conditionally_required — when `SI.is_destination` or many travelling guests.
- **quantity_logic:** `rooms_needed = ceil(travelling_guests ÷ guests_per_room)`.
- **regional_modifier_logic:** **high**; metro hospitality rates.
- **low/likely/high:** standard block / mixed inventory / premium block + welcome.
- **dependencies:** `SI.is_destination`, guest origins.
- **notes:** usually **guest-paid** — track for planning, flag as non-platform cost in §5.

### Attire & Beauty

#### CD028 · `hair_makeup` (basis: per_unit)
- **requirement:** conditionally_required — default on for the couple; scales with party.
- **quantity_logic:** `DQ.hair_makeup_people` (× services: hair + makeup).
- **regional_modifier_logic:** **high**; metro labor.
- **low/likely/high:** couple only / couple + attendants / full party + trials + premium artist.
- **dependencies:** `SI.beauty_party_size`.
- **notes:** trial (T057) + day-of; on-site vs salon affects logistics, not basis.

#### CD029 · `wedding_dress` (basis: per_unit)
- **requirement:** optional from the *platform-estimate* view (often the couple's personal purchase).
- **quantity_logic:** `1` (incl. alterations as a sub-line).
- **regional_modifier_logic:** **low**; nationally/internationally priced goods.
- **low/likely/high:** off-the-rack / designer made-to-order / couture.
- **dependencies:** lead time (RK009).
- **notes:** include only if the engagement covers attire; otherwise exclude as client-owned.

#### CD030 · `suit_tux` (basis: per_unit)
- **requirement:** optional (client-owned typically).
- **quantity_logic:** `people_needing_attire` (couple ± party if covered).
- **regional_modifier_logic:** **low**.
- **low/likely/high:** rental / off-the-rack purchase / bespoke.
- **dependencies:** `SI.wedding_party_size` (if party attire covered).
- **notes:** include only if in scope of the engagement.

### Stationery

#### CD031 · `invitation_suite` (basis: per_unit)
- **requirement:** conditionally_required — default on unless fully digital.
- **quantity_logic:** `DQ.invitations_needed`.
- **regional_modifier_logic:** **low**; nationally-priced print goods.
- **low/likely/high:** digital/simple flat-print / standard suite / premium (letterpress, foil).
- **dependencies:** `DQ.attending_guests`, `avg_guests_per_household`.
- **notes:** quantity is per household, not per guest — a common over-count trap.

#### CD032 · `day_of_stationery` (basis: per_unit)
- **requirement:** conditionally_required — default on for seated receptions.
- **quantity_logic:** `DQ.day_of_stationery_units`.
- **regional_modifier_logic:** **low**.
- **low/likely/high:** essentials only / full suite / premium custom signage.
- **dependencies:** `DQ.attending_guests`, `DQ.tables_needed`.
- **notes:** menus/place cards scale per guest; table numbers per table; signage flat-ish.

### Admin & Compliance

#### CD039 · `event_insurance` (basis: flat)
- **requirement:** conditionally_required — when venue requires it or alcohol/large event (recommended always).
- **quantity_logic:** `1`.
- **regional_modifier_logic:** **medium**; jurisdiction-driven (country/state).
- **low/likely/high:** basic liability / liability + cancellation / high coverage + add-ons.
- **dependencies:** venue requirements (RK006), `SI.has_alcohol`.
- **notes:** low absolute weight but high risk-reduction value.

#### CD040 · `permits` (basis: flat)
- **requirement:** conditionally_required — when noise/alcohol/fireworks/street/parking permits apply.
- **quantity_logic:** `count_of_required_permits`.
- **regional_modifier_logic:** **high**; jurisdiction-specific (country → state → metro).
- **low/likely/high:** single basic permit / standard set / multiple incl. pyrotechnics.
- **dependencies:** `SI.venue_type`, `SI.has_alcohol`, entertainment add-ons (RK011/RK032).
- **notes:** purely jurisdictional — strongest country/metro dependency in the set.

### Infrastructure (outdoor / off-grid)

#### CD022 · `tent_marquee` (basis: flat)
- **requirement:** conditionally_required — when `SI.venue_type ∈ {outdoor, both}` or weather backup needed.
- **quantity_logic:** `1` package sized to `DQ.tent_area`.
- **regional_modifier_logic:** **medium–high**; rental + install labor + freight.
- **low/likely/high:** basic frame tent / walled + flooring / premium clear-span + climate control.
- **dependencies:** `DQ.tent_area`, `SI.venue_type`, `SI.season`, `SI.indoor_backup_exists`.
- **notes:** primary weather mitigation (RK001); drives CD037 setup labor + CD024 lighting.

#### CD026 · `power_generator` (basis: flat)
- **requirement:** conditionally_required — when `SI.off_grid` (outdoor/remote without mains).
- **quantity_logic:** `units_needed` sized to load (catering + AV + lighting).
- **regional_modifier_logic:** **medium**; rental + fuel + delivery.
- **low/likely/high:** single small unit / sized + backup / redundant silent units.
- **dependencies:** `SI.off_grid`, load from CD003/CD024/CD025.
- **notes:** mitigates RK020; include fuel + delivery in package.

#### CD027 · `restroom_trailer` (basis: per_unit)
- **requirement:** conditionally_required — when `not SI.venue_has_restrooms` (outdoor/remote).
- **quantity_logic:** `DQ.restrooms_needed`.
- **regional_modifier_logic:** **medium**; rental + servicing + delivery.
- **low/likely/high:** basic units / trailer units / luxury restroom trailer.
- **dependencies:** `DQ.attending_guests`, `SI.venue_has_restrooms`.
- **notes:** ratio-driven; underestimating harms guest experience.

#### CD-extra · `waste_cleanup` (R052) — bins, removal, end-of-night cleaning.
- **requirement:** conditionally_required — non-venue/outdoor sites.
- **quantity_logic:** `1` package scaled to guest_count.
- **regional_modifier_logic:** **medium**.
- **notes:** KB resource R052; no fixed CD number in v1 — treat as conditional flat line for off-site events.

> **CD coverage:** CD001–CD040 are all specified above (CD001, CD002, CD003, CD004, CD005, CD006,
> CD007, CD008, CD009, CD010, CD011, CD012, CD013, CD014, CD015, CD016, CD017, CD018, CD019, CD020,
> CD021, CD022, CD023, CD024, CD025, CD026, CD027, CD028, CD029, CD030, CD031, CD032, CD033, CD034,
> CD035, CD036, CD037, CD038, CD039, CD040). KB resources without a numbered CD (signage R031,
> entertainment-extra R023, waste R052, first-aid R050) are noted inline as conditional/optional
> add-ons for future CD assignment.

---

## 5. Wedding Cost Formula Map

How the engine assembles the total from category subtotals. Each subtotal sums its CDs at a given
tier; the total is computed independently for `low`, `likely`, `high`.

```
SUBTOTALS (per tier ∈ {low, likely, high}):

Venue           = CD001 OR CD002                              (one of)
Food            = CD003 + CD007 + CD008
Bar             = CD004 + CD006                               (if has_alcohol)
Staffing        = CD005 + CD036 + CD037 + CD038               (coordinator CD036 always)
Decor           = CD015 + CD016 + CD017 + CD018 + CD019
                  + CD020 + CD021 + CD024                      (+ signage)
Photo/Video     = CD009 + CD010 + CD011
Entertainment   = (CD012 OR CD013) + CD014 + CD023 + CD025
                  + entertainment_extra
Transportation  = CD033 + CD034                               (+ CD035*, guest-paid)
Infrastructure  = CD022 + CD026 + CD027 (+ waste)             (outdoor/off-grid only)
Attire/Beauty   = CD028 (+ CD029, CD030 if in scope)
Stationery      = CD031 + CD032
Admin/Compliance= CD039 + CD040

DIRECT_TOTAL(tier) = Venue + Food + Bar + Staffing + Decor + Photo/Video
                   + Entertainment + Transportation + Infrastructure
                   + Attire/Beauty + Stationery + Admin/Compliance

CONTINGENCY(tier)  = round(DIRECT_TOTAL(tier) × contingency_pct)   # default 10%, rec. 10–15% (RK005)

PLANNED_TOTAL(tier)= DIRECT_TOTAL(tier) + CONTINGENCY(tier)

CLIENT_TOTAL(tier) = PLANNED_TOTAL(tier)
                   + organizer_margin (if configured)
                   + platform_fee     (if/when configured — not implemented today, Master §7)
```

Mapping back to the user's requested buckets:

| Bucket | CDs |
|---|---|
| **Venue** | CD001 / CD002 |
| **Food** | CD003, CD007, CD008 |
| **Bar** | CD004, CD006 |
| **Staffing** | CD005, CD006*, CD036, CD037, CD038 |
| **Decor** | CD015, CD016, CD017, CD018, CD019, CD020, CD021, CD024 |
| **Photo/Video** | CD009, CD010, CD011 |
| **Entertainment** | CD012/CD013, CD014, CD023, CD025, entertainment_extra |
| **Transportation** | CD033, CD034, CD035* |
| **Contingency** | computed % of DIRECT_TOTAL |

\* `CD006` is shown under both Bar and Staffing conceptually — **count it once** (assign to Bar to
avoid double-count). `CD035` accommodation is typically **guest-paid**: include in planning view,
exclude from `CLIENT_TOTAL` unless the engagement covers it.

**Double-count guards (engine must enforce):**
- Venue = exactly one of CD001/CD002.
- If caterer bundles service → CD005 included in CD003; do not add CD005 separately.
- If bar package bundles bartenders → CD006 inside CD004; do not add CD006 separately.
- If band/DJ includes sound/lighting → reduce CD025/CD024 accordingly.

---

## 6. Estimate roll-up & confidence

- **Tiers roll up independently:** `low/likely/high` totals are each the sum of their tier's lines,
  so the final output is a **range** (OPE §7.3), not a point.
- **Conditional inclusion first:** evaluate each CD's `requirement` against scenario inputs *before*
  pricing — excluded CDs contribute 0 and are listed as "not applicable" (transparent, not hidden).
- **Unpriced lines:** if a required CD has no `knowledge_pricing` base for the resolved region, mark
  it `needs pricing` (do not invent a number, OPE §7.5); it lowers `confidence`.
- **Confidence signal:** `high` when all required CDs priced from region-specific data; `medium`
  when some fall back to country/global; `low` when several are `needs pricing` or derived from
  wide assumptions.
- **Beginner vs experienced:** beginners → conservative config + wider high/low spread + all
  high-severity risks surfaced; experienced → tighter spread, override config, engine recomputes
  deterministically (OPE §9.4).

---

## 7. Import / next step

- This file defines **logic only**. The numeric `low/mid/high` base values per `item_key` × region
  are seeded separately into `knowledge_pricing` (OPE §3.2) at build time — that is where money lives.
- `item_key` and `basis` here are authoritative and must match Knowledge Base §5 and the
  `knowledge_pricing` seed exactly.
- Derived-quantity config defaults (§2/§3) are engine configuration, regionally tunable, and
  **non-monetary**.

**No prices, no amounts, no code, no SQL, no migrations** — by design.
