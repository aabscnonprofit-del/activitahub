# OPE Knowledge — Food, Safety, Child Supervision & Logistics (v1 draft)

> **Type:** authored organizer knowledge (product content), not code/UI/schema.
> **What this is:** the concrete, reusable values inside the **Food & Drink Block**, the **Safety &
> Supervision Block**, and the logistics parts of the **Schedule / Venue / Transport blocks** —
> i.e. the "must exist before coding" knowledge named in `OPE_KNOWLEDGE_MODEL.md` §11.
> **Feeds:** the Resource Planning engine (quantities), the Risk engine (applicability + mitigations),
> and the Schedule/Assembly engines (logistics defaults). Pricing is **not** here — it lives in the
> Pricing & Budget block.
> **Status:** **v1 draft — requires review by a practicing organizer / food-safety reference before
> launch.** These are sensible industry norms, not legal or licensing standards.
> **Date:** 2026-06-10.

## Conventions

- **Basis:** per **single event**, typical 3–4 hour gathering, unless noted. Recurring/Community sessions
  reuse the same per-session ratios.
- **Units:** US-centric defaults with metric in parentheses; region adjusts via the Pricing block, not
  these ratios.
- **Buffer principle:** size to **confirmed headcount + a small buffer**, never to the invited list.
  Default RSVP no-show assumption for casual events: **10–20%**.
- **Rule notation** (organizer logic, not code): e.g. `meals = ceil(adults × 1.25 + kids × 0.75)`. These
  map directly to the engine's derived-quantity and risk-applicability rules.
- **Safety-critical values** (food temps, supervision ratios, water) are **conservative on purpose** and
  carry a *never-drop* flag — they are surfaced even when the user didn't ask.

---

## Block A — Food & Drink ratios

> Goal: enough food and drink, sized to guests, with dietary/allergy handling. Outputs feed Resource
> quantities and (via the Pricing block) the budget line items.

### A1. Main food (a meal is served)
- **Plan:** `main_servings = adults × 1.25 + kids × 0.75`, then **+10% food buffer**.
- **Protein (BBQ/grill):** ~**6 oz (170 g) cooked protein per adult**, ~3 oz per child → e.g. ~2 burgers
  or 2 sausages per adult, 1 per child for a full meal.
- **Sides:** **2 side dishes**, ~**4 oz (115 g) each per person**.
- **Bread/buns:** 1.25 per adult, 1 per child (allow seconds).

### A2. Appetizers / finger food (no full meal)
- **First hour:** ~**6 pieces per person**; **+3 pieces per additional hour**.
- For a 3-hour mingling event: ~**12 pieces per person**.

### A3. Cake & dessert
- **Cake servings = guest_count** (1 slice each); order for **×1.1** to allow seconds.
- If dessert table instead of cake: **2–3 dessert pieces per person**.

### A4. Drinks
- **Non-alcoholic:** **2 drinks in the first hour + 1 per additional hour** per adult → ~**4 drinks/adult**
  for a 3-hour event; **~2 drinks per child** total.
- **Water:** always available; **plan ~1.5 L per person** for hot/outdoor events (hydration is a safety
  item, not optional — see B4).
- **Coffee/tea (meetup/daytime):** ~**1.5 cups per person**.
- **Alcohol (if served, of-age only):** ~**1 drink per adult per hour**; wine ≈ **1 bottle per 2–3 guests**
  for a dinner. Always pair with water and a safe-ride plan (B8).
- **Ice:** **1–1.5 lb (0.5–0.7 kg) per person** on a warm day.

### A5. Tableware & consumables
- **Plates:** `guests × 1.5` (people take fresh plates). **Cups:** `guests × 2` (more if no dishwashing).
- **Napkins:** `guests × 3`. **Cutlery sets:** `guests × 1.25`.

### A6. Dietary & allergy handling *(safety-linked — see B3)*
- **Always** collect dietary/allergy needs on the RSVP.
- Provide a **clearly labelled vegetarian option**; for known allergies provide a **separate, labelled,
  cross-contact-safe** item.
- Rule: if `kids_present` or any allergy noted → the **allergy reminder is never dropped**.

---

## Block B — Safety guidance (general, applicability-conditioned)

> Each item carries an **applies-when** condition and a **mitigation**. The Risk engine surfaces those
> whose condition matches the scenario; *never-drop* items always appear when their condition is met.

### B1. Food safety *(applies: food served)* — never-drop
- Cold foods kept **< 40°F (4°C)**, hot foods **> 140°F (60°C)**.
- **2-hour rule:** perishable food out no more than 2 hours (**1 hour if > 90°F / 32°C**).
- Separate **raw meat** (boards, utensils, storage); wash/sanitize hands and surfaces.

### B2. Capacity & egress *(applies: any venue)*
- Do not exceed the venue's stated capacity; keep **exits clear**. For larger gatherings, define a simple
  crowd/flow plan and an emergency exit.

### B3. Allergies *(applies: food + kids, or any noted allergy)* — never-drop
- Collect on RSVP; **label dishes**; keep allergen-free items **physically separate**; brief helpers; have
  an **action plan** (and, where relevant, know where epinephrine is).

### B4. Heat & hydration *(applies: outdoor / warm)* — never-drop when extreme
- Provide **shade, a water station, sunscreen**. Watch for heat illness. **Reschedule** in extreme heat.

### B5. Weather & outdoor *(applies: outdoor)*
- Check the forecast; set a **rain/backup plan** and a **decision trigger + by-when**. Secure canopies/
  decor against wind.

### B6. Water safety *(applies: pool / beach / open water)* — never-drop
- A **designated water-watcher** (no phone) at all times, **independent of headcount**; tighter adult
  ratios (see C); flotation available; know depth/conditions. **Do not rely on a public lifeguard alone**
  for a private group.

### B7. Fire & grill *(applies: grilling / open flame)*
- Grill **away from structures/overhangs**, never unattended, **extinguisher or water bucket** on hand,
  keep children back (see C).

### B8. Alcohol *(applies: alcohol served)*
- Verify of-age; don't over-serve; water available; arrange **safe rides**.

### B9. First aid & emergencies *(applies: always)* — never-drop
- A **stocked first-aid kit** on site; know the **nearest urgent care/hospital**; collect **emergency
  contacts**; designate who holds the allergy/emergency plan. Outdoor/sport adds activity-specific items.

---

## Block C — Child supervision ratios

> **General guidance for events/parties — not a licensed-childcare or legal standard.** Party
> environments are novel and high-energy, so these are **tighter than daycare ratios.** Flagged
> *never-drop* and tied to the safeguarding ([S]) concern. **Requires organizer review.**

### C1. Baseline adult-to-child ratios (event/party context)
| Age band | Adults : children |
|---|---|
| Under 2 (infants/toddlers) | **1 : 3** |
| 2–3 years | **1 : 5** |
| 3–5 years (preschool) | **1 : 6** |
| 6–8 years | **1 : 8** |
| 9–12 years | **1 : 10** |
| 13+ (teens) | **1 : 15** (chaperone, not supervision) |

### C2. Hard rules (never-drop)
- **Minimum two adults present at all times**, regardless of child count (so one can manage an incident).
- One adult is the **designated lead** who holds the allergy/emergency plan and headcount.
- **Mixed ages → use the youngest band's ratio.**
- Derived rule: `supervising_adults = max(2, ceil(young_kids / ratio_for_age_band))`.

### C3. Water present (overrides C1) — never-drop
- **1 actively-watching adult per 2–4 young swimmers**, **plus** a dedicated water-watcher who does
  nothing else. This is in addition to, not instead of, C2.

### C4. Activity escalation
- High-energy or off-site activities (bounce house, pool, park with road/water hazards) → **tighten one
  band** and brief all adults on boundaries before kids arrive.

---

## Block D — Basic logistics

> Defaults for the Schedule, Venue, and Transport blocks. Used to build the timeline, size facilities,
> and set reminders. Tier-0 (defaultable) unless a value is safety-relevant.

### D1. Setup & teardown
- **Setup:** small (≤20) ~**45–60 min**; medium (20–50) ~**1.5–2 h**; outdoor/park → **arrive 45+ min
  early** to claim and set the space.
- **Teardown:** ~**30–45 min** small; more at scale. **Parks: pack out all trash (leave no trace).**

### D2. RSVP & headcount
- Confirm final headcount **2–3 days before**. Cater to **confirmed + ~10% buffer**, not the invited list.
- No-show assumption (casual events): **10–20%**.

### D3. Facilities
- **Restrooms:** ~**1 per 25–50 guests**; provide portable units for larger outdoor events without fixed
  facilities.
- **Seating:** sit-down = `seats = guests`; mingling = **50–70%** seating.
- **Power/AV:** confirm outlets/extension leads; **test mic/speaker before** guests arrive.
- **Trash/recycling:** bags + a disposal plan; parks = pack out.

### D4. Transport & arrival
- **Parking estimate:** ~**1 car per 2–3 guests**; check availability in advance.
- For parks/shared venues: suggest **carpooling**, share the **exact meeting point**, and put a **sign/
  wayfinding** marker at arrival.

### D5. Timeline windows (single event)
- Phases: **Prep** (T-3–4 weeks → T-1 week → T-1–2 days) · **Day-of** · **After**.
- **Reminder cadence:** confirm at **T-1 week**, reminder at **T-1–2 days**, day-of note. *(Recurring
  activities reuse this per session; the Schedule block adds the series cadence.)*

### D6. Weather backup *(outdoor)*
- Identify the backup option **before**, define the **go/no-go trigger** and **decision deadline**, and
  communicate it in the reminder.

---

## How this knowledge feeds the engines

- **Resource Planning:** A1–A5 become the **derived-quantity rules** (`meals`, `cake_servings`,
  `drinks_servings`, `tableware_units`, `supervising_adults`). C2's formula sets `supervising_adults`.
- **Risk:** B1–B9 become **risk rules** with applicability conditions (`food`, `outdoor`, `water`, `kids`,
  `heat`, `alcohol`, `fire`, `always`) and mitigations; never-drop items (B1, B3, B4-extreme, B6, B9, C)
  always surface when their condition holds.
- **Schedule / Assembly:** D1, D5, D6 set the **timeline phases and reminder cadence**.
- **Venue / Transport:** D3, D4 sized facilities and arrival logistics.
- **Communications:** A6 dietary asks, D2 RSVP confirmation, D6 weather decision → message content.

---

## Needs organizer validation (open)

- Child supervision ratios (Block C) — confirm against a childcare/event-safety reference for the launch
  region; these are deliberately conservative and **must be reviewed**.
- Food quantities (Block A) — sanity-check portions against a caterer for the launch region.
- Food-safety temperatures/times (B1) — confirm against the local food-safety authority.
- Restroom and parking ratios (D3, D4) — confirm local norms.

## Not in this document

- **Prices** (Pricing & Budget block) · **vendor sourcing** · **permits/licensing specifics** (Legal
  block) · **regulated/medical** guidance · **ceremony/ritual** · anything Phase-2 per
  `OPE_KNOWLEDGE_MODEL.md` §10.

---

_Authored knowledge content (v1 draft) only. No code, UI, or schema. Values are reusable organizer
expertise feeding the Resource, Risk, and Schedule engines, and require organizer review before launch._
