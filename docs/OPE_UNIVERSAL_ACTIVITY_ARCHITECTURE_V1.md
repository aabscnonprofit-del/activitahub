# OPE Universal Activity Architecture v1

> **Goal:** define the **universal operational architecture** that sits beneath *every* OPE category —
> the smallest common structure shared by all real-world activities.
> **Question answered:** *"What is common to every real-world activity?"*
> **Builds on:** `OPE_KB_BIRTHDAY_ARCHITECTURE_V1.md` (which becomes **one instance** of this),
> `OPE_CORE_MVP_V1.md`, `OPE_V1_TECHNICAL_DESIGN.md`.
> **Date:** 2026-06-06
> **Framing:** the engine stores **one Universal Core + a registry of Category Modules** (each with its
> own internal subtypes), and **composes** any activity plan from a scenario. Birthday, Wedding, BBQ,
> Picnic, Community Meetup, Sports, Volunteer, Workshop, Fundraiser, Family Gathering — all are
> instances of the same skeleton.

**Test for "universal":** an element belongs in the Core only if it is true of **every** activity in the
list above. Anything true of only some activities is a **module**, not Core.

**ID conventions:** `UP#` universal phase · `UM#` universal milestone · `UDP#` universal decision point ·
`URT#` universal resource type · `UCD#` universal cost category · `UCN#` universal comms need ·
`URK#` universal risk category · `USC#` universal success condition · `UFM#` universal failure mode.

---

## 1. Universal Activity Core

The irreducible truth of any activity: **someone organizes people to gather at a place and time to do
something, using resources, within a budget, communicated to participants, executed, and wrapped up.**

The Universal Core is the **invariant skeleton** every category inherits:
- An **organizer** (responsible party) and **participants**.
- A **time** (date/window) and a **place** (location/venue, even if "online" or "the host's home").
- A **purpose / program** (what actually happens).
- **Resources** to make it happen, within a **budget**.
- **Communication** with participants.
- **Execution** on the day, and a **close-out** afterward.

Everything category-specific (the *content*) layers on top via modules. The Core defines the **shape**
(phases, milestones, decision points, resource/cost/comms/risk taxonomies, success/failure), not the
specifics.

---

## 2. Universal planning phases

Every activity moves through the same lifecycle:

| ID | Phase | Universal goal |
|---|---|---|
| `UP1` | **Define** | Decide what, who, when, where, and budget (scope & intent) |
| `UP2` | **Secure** | Commit the essentials — place, key resources/people, invite participants |
| `UP3` | **Prepare** | Confirm participation, acquire resources, finalize logistics |
| `UP4` | **Confirm** | Lock final numbers & readiness; set contingencies |
| `UP5` | **Execute** | Run the activity |
| `UP6` | **Close** | Wrap up, follow up, capture learnings |

Categories rename/expand these (a wedding's many months vs a picnic's few days), but the **order and
intent are universal**.

---

## 3. Universal milestones

The gates that exist for every activity (each maps to a phase):

| ID | Milestone | Phase |
|---|---|---|
| `UM1` | Scope set (what/when/who/budget) | UP1 |
| `UM2` | Location confirmed | UP2 |
| `UM3` | Participants invited / announced | UP2 |
| `UM4` | Participation confirmed (headcount/RSVPs/registrations) | UP3 |
| `UM5` | Resources secured | UP3 |
| `UM6` | Readiness confirmed (final go) | UP4 |
| `UM7` | Activity executed | UP5 |
| `UM8` | Closed out | UP6 |

These are exactly the gates the execution/progress system tracks for any category.

---

## 4. Universal decision points

The scenario inputs that branch *any* plan and select modules:

| ID | Decision point | Effect |
|---|---|---|
| `UDP1` | **Category** | selects the Category Module |
| `UDP2` | **Date / lead time** | timeline compression, booking urgency, seasonality |
| `UDP3` | **Location / venue type** | selects the Venue Module |
| `UDP4` | **Scale (participant count)** | scales quantities; triggers thresholds (staffing, furniture, safety, permits) |
| `UDP5` | **Budget level** | DIY-vs-hired, venue/quality tier, optional extras |
| `UDP6` | **Audience type** (kids / adults / mixed / public) | safety, provisions, supervision, access |
| `UDP7` | **Format** (private/public · free/paid · indoor/outdoor · one-off/recurring) | enables relevant modules |
| `UDP8` | **Special requirements** (safety-sensitive elements, dietary, accessibility, language) | adds handling + risks |
| `UDP9` | **Resourcing model** (DIY / hired / vendor) | toggles vendor & cost modules |
| `UDP10` | **Compliance triggers** (permits, insurance, licensing, alcohol, minors) | adds compliance module + risks |

---

## 5. Universal resource types

The abstract resource categories any activity may draw on (each category instantiates a subset):

| ID | Resource type | Examples (category-agnostic) |
|---|---|---|
| `URT1` | **Space** | venue, room, park, field, online room |
| `URT2` | **People** | helpers, supervisors, staff, vendors, performers, officials |
| `URT3` | **Provisions** | food, drink, consumables |
| `URT4` | **Equipment / materials** | gear, furniture, AV, supplies, kit |
| `URT5` | **Logistics** | transport, parking, setup/teardown, waste |
| `URT6` | **Information / collateral** | invitations, signage, schedules, programs |
| `URT7` | **Safety / compliance** | first-aid, permits, insurance, licenses |

---

## 6. Universal cost-driver categories

Every budget rolls up into the same buckets (categories map their `item_key`s into these):

| ID | Cost category |
|---|---|
| `UCD1` | **Space / venue** |
| `UCD2` | **People / labor** |
| `UCD3` | **Provisions** (food/drink/consumables) |
| `UCD4` | **Equipment / rentals** |
| `UCD5` | **Logistics / transport** |
| `UCD6` | **Materials / collateral** |
| `UCD7` | **Compliance / fees** (permits, insurance, licenses) |
| `UCD8` | **Contingency** |
| `UCD9` | **(Organizer context only)** margin / platform fee |

Consumer plans use UCD1–UCD8 (raw + contingency); the organizer surface adds UCD9.

---

## 7. Universal communication needs

The message set every activity requires (a category provides specific templates per need):

| ID | Communication need |
|---|---|
| `UCN1` | **Invitation / announcement** (the call to attend) |
| `UCN2` | **Confirmation / RSVP capture** (incl. requirements ask) |
| `UCN3` | **Reminder(s)** |
| `UCN4` | **Logistics / info** (where, when, what to bring) |
| `UCN5` | **Day-of coordination** (optional) |
| `UCN6` | **Thank-you / follow-up** |
| `UCN7` | **Feedback request** |

---

## 8. Universal risk categories

The risk taxonomy applicable to all activities (categories instantiate the relevant ones with concrete
mitigations):

| ID | Risk category |
|---|---|
| `URK1` | **Attendance** (too few / too many / no-shows) |
| `URK2` | **Financial** (overrun, unpaid, loss) |
| `URK3` | **Operational / logistical** (timing, setup, supply, vendor no-show) |
| `URK4` | **Environmental** (weather, venue loss/availability) |
| `URK5` | **Safety** (injury; heightened for children, sports, water, food, transport) |
| `URK6` | **Compliance / legal** (permits, licensing, liability, insurance) |
| `URK7` | **Experience** (boredom, mismatch, reputation harm) |
| `URK8` | **Communication** (unclear info, breakdown) |

---

## 9. Universal success conditions

"Good," for any activity:

| ID | Success condition |
|---|---|
| `USC1` | **It happened** — executed as intended |
| `USC2` | **People came** — target participation met |
| `USC3` | **It was safe** — duty of care met, no incidents |
| `USC4` | **It ran to plan** — on time, orderly |
| `USC5` | **Within budget** |
| `USC6` | **Good experience** — participants satisfied |
| `USC7` | **Organizer coped** — not overwhelmed; no single point of failure |
| `USC8` | **Closed out** — follow-up done; learnings/relationships captured |

---

## 10. Universal failure modes

The inverse — the ways any activity fails (each binds to a risk category and mitigations):

| ID | Failure mode | Risk category |
|---|---|---|
| `UFM1` | Cancelled / didn't happen | URK3/URK4 |
| `UFM2` | Poor turnout — or overwhelmed by over-turnout | URK1 |
| `UFM3` | Safety incident / duty-of-care breach | URK5 |
| `UFM4` | Late / chaotic execution | URK3 |
| `UFM5` | Over budget / financial loss | URK2 |
| `UFM6` | Poor experience / unmet expectations | URK7 |
| `UFM7` | Organizer burnout / single-point failure | URK3/URK7 |
| `UFM8` | Compliance failure (permit/insurance/legal) | URK6 |
| `UFM9` | Communication breakdown | URK8 |

---

## 11. The composition model

```
   Scenario inputs (UDP1..UDP10)
            │
            ▼
   ┌──────────────────────────────┐
   │   UNIVERSAL ACTIVITY CORE     │  invariant skeleton:
   │   phases · milestones ·       │  UP1–6 · UM1–8 · resource types ·
   │   taxonomies · success/fail   │  cost categories · comms · risks
   └──────────────────────────────┘
            +  Category Module      (UDP1)  e.g. Birthday / Wedding / BBQ / Workshop …
            +  Venue Module         (UDP3)  home / outdoor / rented / online
            +  Optional Modules     (UDP5..UDP10)  alcohol, transport, theme, compliance,
            │                                       staffing, ticketing, accessibility, …
            +  Risk Module          (computed: union of all selected modules' risks)
            ▼
   ┌──────────────────────────────┐
   │      ASSEMBLY PIPELINE        │
   └──────────────────────────────┘
            ▼
        FINAL ACTIVITY PLAN
```

**Universal Activity Core + Category Module + Venue Module + Risk Module + Optional Modules = Final
Activity Plan.**

**Assembly pipeline (category-agnostic, deterministic then AI polish):**
1. Instantiate the **Universal Core** (phases, milestones, taxonomies).
2. Select the **Category Module** from `category` (UDP1). *(A Category Module may itself contain
   subtype/core sub-modules — e.g., the Birthday architecture — recursively applying this same pattern.)*
3. Select the **Venue Module** from `venue_type` (UDP3).
4. Add **Optional Modules** per decision points (UDP5–UDP10), honoring each module's gating rules.
5. **Merge & de-duplicate** tasks / resources / cost drivers / milestones / templates from all modules;
   when two modules overlap, keep the **stricter** parameter (safety/buffers win).
6. **Order** by universal phase, then by the category's dependency graph.
7. Compute **derived quantities** and **price** the merged cost drivers deterministically (cost engine,
   seeded regional values), rolled up into the universal cost categories (§6).
8. Build the **Risk Module** — union of applicable risk-category instances (by `applies_if`),
   de-duplicated and severity-ranked.
9. Emit the **Final Plan** to the appropriate output (consumer plan or organizer proposal); the **thin
   AI layer** personalizes copy — never quantities or prices.

**Invariants the composer always enforces (any category):**
- Exactly one Category Module and one Venue Module.
- The Risk Module is **computed**, never hand-authored per plan.
- **Safety (URK5) and compliance (URK6) instances are never dropped** by any module combination.
- Every plan satisfies the universal milestone set (UM1–UM8), even if a milestone is trivially met.

---

## 12. Why this is the smallest common structure

- **Two levels, one pattern.** The Universal Core defines the *shape*; each Category Module fills the
  *content*; within a category, subtype modules refine further. The same "Core + Modules" composition
  repeats at every level (it's fractal).
- **Authoring unit = a module.** Adding a category (Wedding, Workshop, Fundraiser) = authoring a
  Category Module against this Core — not extending the engine. Adding a variant = one optional module.
- **Birthday is the reference instance.** `OPE_KB_BIRTHDAY_ARCHITECTURE_V1.md` is exactly this pattern
  applied once; every other category follows the same template.
- **Nothing category-specific lives in the Core.** If a future element turns out true of all activities,
  it is promoted into the Core; if true of only some, it stays a module. That rule keeps the Core minimal.

This is the foundation the whole OPE engine stands on: **one skeleton, many modules, composed per
scenario.**

_Universal operational architecture only. No code, API, UI, or marketing._
