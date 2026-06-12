# OPE Pattern Library — the reusable shapes of organizing

> **Type:** product architecture document. No code, UI, or database design.
> **Goal:** find the **smallest set of organizational patterns** that covers the majority of real-world
> human activities — the reusable "shapes" OPE assembles, with content and modifiers, into thousands of
> specific activities.
> **Sources:** `OPE_ACTIVITY_TAXONOMY.md` (the activity universe), `OPE_MASTER_SPEC.md` (the engines a
> pattern draws on), `OPE_STRESS_TEST.md` (what breaks without patterns), `MASTER_PRODUCT_DECISIONS.md`
> (§11.6 Single Engine — knowledge authored once, reused everywhere).
> **Date:** 2026-06-10.

## The core idea (think like an organizer, not an engineer)

An organizer does not learn 1,000 different jobs. They learn a **handful of shapes** — "host an
occasion," "gather peers," "teach a skill," "run a competition," "keep a group going" — and apply each
shape to endless topics. A birthday and a retirement party are the *same shape* with different content.
A Spanish conversation night and a board-game night are the *same shape* repeated.

So OPE's real asset is not a scenario library — it is:

> **~10 base Patterns × topic content × modifiers (Recurring, Community, Fundraising/Ticketing).**

A "Saturday-morning beginners' Spanish club" = **Meetup pattern** + Spanish content + **Recurring** +
**Community** modifiers. A "charity 5K" = **Tournament pattern** + **Fundraiser** overlay. This is how a
small, safe, well-authored set assembles into thousands of activities (Single Engine Strategy, §11.6) —
and why the coverage gate (ADR-002) can refuse what it can't yet shape, instead of faking it.

This document defines those patterns.

---

## Part 1 — The Pattern Library (10 patterns)

Each pattern lists: **Purpose · Typical Inputs · Typical Outputs · Required Modules** (OPE engines/KB it
draws on) **· Required Resources · Required Communications · Typical Risks · Recurring? · Community?**

### 1. Celebration Pattern — *host an occasion*
- **Purpose:** bring invited guests together to mark a milestone or simply celebrate; the host runs a memorable, safe occasion.
- **Inputs:** occasion/honoree, guest list & count, date, venue (home/rented), budget, theme/vibe, dietary & access needs.
- **Outputs:** run-of-show timeline, prep/day-of/after checklist, host budget (food, cake, décor, rentals, favors), guest messages, safety reminders.
- **Required modules:** Assembly, Resource (per-guest scaling), Budget, Risk, Communication; Vendor at scale (catering/rentals).
- **Resources:** food & drink, cake/dessert, décor, tableware, seating/space, entertainment (opt.), favors.
- **Communications:** invitation, RSVP reminder, directions/logistics, thank-you, (feedback).
- **Risks:** RSVP/headcount swings, food/allergies, weather (outdoor), child supervision, budget overrun.
- **Recurring:** No · **Community:** No (a community may *host* celebrations; the pattern itself isn't a container).

### 2. Meetup Pattern — *gather peers around a shared interest*
- **Purpose:** low-formality, peer-to-peer gathering for connection or conversation — no instructor, no competition.
- **Inputs:** topic/interest, expected attendees, venue, date(s), format (discuss/mingle/activity), language & access.
- **Outputs:** simple agenda/format, light checklist, small budget (space, refreshments, materials), invite/RSVP, follow-up to keep the group warm.
- **Required modules:** Assembly, Budget (light), Risk (light), Communication; Recurring modifier for a series.
- **Resources:** venue/space, refreshments, name tags/materials, AV (opt.).
- **Communications:** invite, RSVP, reminder, welcome/icebreaker, follow-up & next date.
- **Risks:** turnout uncertainty, no-shows, newcomer inclusion, venue capacity.
- **Recurring:** Yes · **Community:** Yes (meetups are the heartbeat of communities).

### 3. Class Pattern — *one teaches, others learn*
- **Purpose:** an instructor leads learners through a skill, once (workshop) or as a series (course).
- **Inputs:** subject, instructor, skill level, seats/capacity, materials, session length, single vs recurring, fee.
- **Outputs:** session/lesson plan, materials & supplies list, seat/registration plan, per-seat budget & pricing, learner comms.
- **Required modules:** Assembly, Resource (per-seat materials), Staffing (instructor), Budget (per-seat economics), Risk, Execution (registration; recurring schedule), Communication.
- **Resources:** instructor, space, materials/equipment, seats, handouts.
- **Communications:** enrollment/registration, confirmation, pre-class prep, reminder, follow-up & next session.
- **Risks:** under-enrollment, materials shortfall, skill mismatch, injury (fitness), instructor cancellation.
- **Recurring:** Yes · **Community:** Yes (a class cohort).

### 4. Club / Community Pattern — *keep a group going over time*
- **Purpose:** sustain an ongoing group — a **Club** repeats one activity for its members; a **Community** runs *many* activities for *many* members over months/years. The container that produces repeat organizing. (This is the Recurring + Community modifiers turned into a managed entity.)
- **Inputs:** group purpose/identity, membership, cadence/schedule, organizer roles, the base activity it runs (a Meetup/Class/Outing), communication channel.
- **Outputs:** membership roster, recurring schedule, role assignments, per-session plans (delegated to the base pattern), retention/communication cadence, member onboarding.
- **Required modules:** Execution (recurring schedule), Staffing (roles), Communication (ongoing), Monitoring (attendance/retention) **+ the base pattern it repeats**.
- **Resources:** members, a regular venue/slot, each session's resources, volunteer roles.
- **Communications:** member welcome/onboarding, schedule announcements, per-session reminders, re-engagement, milestone celebrations.
- **Risks:** attrition/retention, organizer burnout, inclusion/safeguarding (esp. minors/vulnerable), scheduling conflicts, cumulative safety.
- **Recurring:** Yes (definitionally) · **Community:** Yes (at scale it *is* the community).

### 5. Tournament / Competition Pattern — *compete to a result*
- **Purpose:** run a structured competition where participants/teams play to an outcome.
- **Inputs:** sport/format, participants/teams, brackets/heats/rounds, venue/fields, officials, schedule, prizes, registration.
- **Outputs:** bracket & schedule, registration plan, officials/medical staffing, scoring/results, prize plan, budget, participant comms.
- **Required modules:** Classification (organizer-grade gate), Assembly, Staffing (referees/medics), Vendor (fields/equipment), Execution (scheduling/scoring), Risk (injury/medical), Communication.
- **Resources:** venue/fields, equipment, officials, first aid/medical, prizes, registration.
- **Communications:** registration, team confirmation, schedule, rules & safety briefing, results, awards.
- **Risks:** injury/medical, disputes/fairness, weather, scheduling, liability.
- **Recurring:** Yes (leagues/seasons) · **Community:** Yes (a league community).

### 6. Conference / Presentation Pattern — *few inform many*
- **Purpose:** transfer knowledge or make announcements from few to many — from a small talk to a multi-track conference.
- **Inputs:** topic, speakers/agenda, audience size, venue, AV, sessions/tracks, sponsors, registration, date.
- **Outputs:** agenda/program, speaker plan, AV/venue plan, registration & ticketing, sponsor plan, attendee comms.
- **Required modules:** Assembly, Vendor (AV/venue), Staffing (speakers/volunteers), Budget (sponsor/ticket overlay), Execution (registration/sessions), Communication.
- **Resources:** venue, AV, seating, speakers, signage, catering (opt.), sponsors.
- **Communications:** save-the-date, registration, speaker coordination, agenda, reminders, follow-up & materials.
- **Risks:** low attendance, speaker drop-out, AV failure, sponsor/budget shortfall.
- **Recurring:** Yes (annual/series) · **Community:** Yes (professional community).

### 7. Performance / Showcase Pattern — *prepared content meets an audience*
- **Purpose:** present rehearsed content (music, art, talent) to an audience.
- **Inputs:** performers/exhibitors, program, stage/space, AV/lighting, audience size, tickets/RSVP, rehearsal, date.
- **Outputs:** program/run-of-show, stage & AV plan, rehearsal schedule, ticketing/RSVP, performer & audience comms.
- **Required modules:** Assembly, Vendor (stage/AV), Staffing (performers/crew), Budget (ticket overlay), Execution (rehearsal/run), Risk (crowd/safety), Communication.
- **Resources:** venue/stage, AV/lighting, performers, seating, tickets.
- **Communications:** call for performers, rehearsal coordination, audience invite/tickets, reminders, thank-you.
- **Risks:** performer readiness, technical failure, crowd safety, ticket/turnout.
- **Recurring:** Yes (recital series, open-mic nights) · **Community:** Yes (arts community).

### 8. Fundraiser Pattern *(money overlay)* — *raise money for a cause*
- **Purpose:** raise funds for a beneficiary — almost always layered **on top of** another pattern (a gala = Celebration + Fundraiser; a charity 5K = Tournament + Fundraiser).
- **Inputs:** cause/beneficiary, financial goal, revenue mechanisms (tickets, donations, auction, sponsors), costs, compliance.
- **Outputs:** revenue plan (goal vs cost = **net proceeds**), ticketing/donation plan, sponsor plan, financial reconciliation, donor comms.
- **Required modules:** Budget **(revenue side — a capability OPE lacks today)**, Classification (money → human review/organizer), Communication (donor/sponsor) **+ the host pattern**.
- **Resources:** the host event's resources + payment/donation handling + sponsor/auction items.
- **Communications:** sponsor outreach, ticket/donation appeals, donor thank-you & receipts, impact report.
- **Risks:** financial (loss/shortfall), legal/compliance (charity rules), trust/transparency, money handling.
- **Recurring:** Yes (annual gala) · **Community:** Yes (cause community).

### 9. Volunteer Action Pattern — *coordinate people to do good*
- **Purpose:** organize volunteers to accomplish a service outcome.
- **Inputs:** cause/task, volunteer count, site, supplies, safety/waivers, roles, date, disposal/handoff.
- **Outputs:** task plan & roles, supplies list, safety briefing & waivers, site logistics, volunteer comms, impact summary.
- **Required modules:** Assembly, Staffing (volunteer roles), Vendor/Resource (supplies/disposal), Risk (safety/waivers/permits), Execution, Communication.
- **Resources:** volunteers, supplies/tools, safety gear, transport, disposal/handoff.
- **Communications:** signup, confirmation, safety briefing, reminder, thank-you & impact.
- **Risks:** safety/injury, liability/waivers, no-shows, permits, environmental.
- **Recurring:** Yes (monthly cleanups) · **Community:** Yes (impact community).

### 10. Expedition / Outing Pattern *(Travel)* — *take a group somewhere*
- **Purpose:** move a group to a place to do an activity, with transport and away-from-base logistics.
- **Inputs:** destination/route, group size, transport, duration (day/overnight), gear, permits, lodging/meals, fitness/skill level, emergency plan.
- **Outputs:** route/itinerary, transport & lodging plan, gear list, permits, safety/emergency plan, participant comms, budget.
- **Required modules:** Assembly, Resource (gear), Vendor (transport/lodging), Staffing (lead/sweep/guide), Risk (outdoor/medical — high), Execution (itinerary), Communication.
- **Resources:** transport, gear, permits, lodging, food/water, first aid.
- **Communications:** signup & waiver, packing/prep, meeting point & transport, safety briefing, en-route updates, follow-up.
- **Risks:** outdoor/medical (high), navigation, weather, transport, permits, group separation.
- **Recurring:** Yes (a club's regular outings) · **Community:** Yes (outdoor community).

---

## Part 2 — Modifiers (how the three forms emerge)

The taxonomy's three **forms** (One-time / Recurring / Community) are **not separate patterns** — they
are **modifiers** applied to the base patterns above. This is the key architectural economy:

- **Recurring modifier** — turns a single instance into a **series**: adds schedule, per-session
  economics, attendance over time. Applies to Meetup, Class, Tournament, Conference, Performance,
  Volunteer, Expedition.
- **Community modifier** — wraps recurring activity in a **container**: members, roles, onboarding,
  retention, long-running communication. The Club/Community Pattern (#4) *is* this modifier made into a
  managed entity hosting other patterns.
- **Fundraising / Ticketing overlay** — adds a **revenue model** (goal vs cost → net proceeds) on top of
  any host pattern. The Fundraiser Pattern (#8) is this overlay.

So: **Base Pattern + topic content + {Recurring?} + {Community?} + {Money overlay?} = a specific
activity.** Ten patterns × three modifiers × open content ⇒ the "thousands of activities."

---

## Part 3 — Coverage matrix (Pattern → activity types)

| Pattern | Activity types it covers (from the taxonomy) |
|---|---|
| **Celebration** | kids/adult/milestone birthday, anniversary, baby shower, engagement, graduation, retirement, housewarming, holiday dinner, dinner party, BBQ/picnic, family reunion, block party, company party · *(wedding = high-intensity → organizer)* |
| **Meetup** | language exchange, book club, board game/social night, supper club, social & business mixer, networking event, industry/startup meetup, study group, skill-share/mentorship, hobby club sessions, town hall |
| **Class** | workshop, masterclass, art class, cooking class, language class, yoga, bootcamp, dance, martial arts, skills bootcamp |
| **Club / Community** | running/cycling/hiking clubs, pickup sports, ongoing book/hobby/craft/garden clubs, fan clubs, alumni associations, parent groups, faith & cultural communities, immigrant/newcomer communities, professional associations, founder/coworking communities, neighborhood associations, mutual aid groups |
| **Tournament** | sports tournament, fun run/5K, recreational league, championship |
| **Conference** | seminar, lecture, panel, conference/summit, trade show, product launch |
| **Performance** | concert, recital, open mic, talent show, exhibition, music-jam showcase, benefit concert |
| **Fundraiser** *(overlay)* | charity fundraiser, gala/benefit, charity walk/run, auction, crowdfunding event |
| **Volunteer Action** | park/beach cleanup, food/clothing drive, volunteer day, community garden build, awareness event |
| **Expedition / Outing** | group hike, camping trip, kayak/ski/paddle trip, day trips, retreats, corporate offsites |

*Notes on overlap:* the **Club/Community** pattern *contains* repeated **Meetups, Classes, Outings**;
the **Fundraiser** pattern *overlays* Celebration/Tournament/Performance/Conference. The matrix assigns
each type its **primary** pattern; real activities often compose two.

---

## Part 4 — Coverage estimate

Two lenses, because "coverage" by type-count differs from coverage by real-world demand.

**By taxonomy type-count (~70 types, primary-pattern assignment):**

| Pattern | ≈ Types | ≈ % of taxonomy |
|---|---|---|
| Club / Community | ~14 | ~19% |
| Celebration | ~13 | ~18% |
| Meetup | ~11 | ~15% |
| Class | ~9 | ~12% |
| Conference | ~6 | ~8% |
| Volunteer Action | ~5 | ~7% |
| Expedition / Outing | ~5 | ~7% |
| Tournament | ~4 | ~5% |
| Fundraiser *(overlay)* | ~4 | ~5% |
| Performance | ~3 | ~4% |

**By real-world organizer demand (volume, not variety):** everyday life is dominated by **hosting
occasions, gathering peers, teaching skills, and keeping groups going**. Weighted by how often ordinary
people actually organize, the big four (Celebration, Meetup, Class, Club/Community) account for the
clear majority of real activity — far more than their ~64% type-count, because most human organizing is
parties, recurring social/interest groups, and classes, not tournaments or galas.

---

## Part 5 — TOP patterns covering ~80% of real-world demand

> **The Big Four: Celebration · Meetup · Class · Club/Community.**

These four cover **~80% of real-world organizer demand**:
- **Celebration** — every household's parties and gatherings (the demand entry point).
- **Meetup** — the universal peer-gathering shape (social, hobby, networking, study).
- **Class** — the universal teach-a-skill shape (workshops + recurring classes).
- **Club / Community** — the container that turns the above into *ongoing* active lives and communities.

Add **Volunteer Action** and **Conference** and the set reaches **~90% of activity types**. The
remaining four — **Tournament, Performance, Fundraiser, Expedition** — are the higher-risk / higher-
stakes / money / safety tail, best served organizer-gated.

Crucially, three of the Big Four (**Meetup, Class, Club/Community**) are **Recurring- and Community-
compatible** — they are exactly the shapes that build *active lives*, the mission's core (§11.1–11.2),
and exactly what OPE cannot do today (`OPE_STRESS_TEST`).

---

## Part 6 — Phase 1 OPE patterns

Aligned with the taxonomy's build order (Part 5 there) and the coverage gate (ADR-002: anything not
yet a supported pattern returns an honest handoff, never a fake plan).

| Phase | Patterns | Rationale |
|---|---|---|
| **1a** | **Celebration** (extend from today's birthday/BBQ) · **Meetup** (networking + social) | Single-event shapes; closest to current capability; the demand entry point. Price them beyond Honolulu. |
| **1b** | **Class** · **Recurring modifier** | Adds instructor/seat/materials and the **series** capability — the first move into *active lives*. |
| **1c** | **Club / Community** *(= Recurring + Community modifiers as a container)* | The highest-leverage shape: one organizer sustains a whole group/community. |
| **1d** | **Volunteer Action** (non-money) | Impact without the financial/legal overlay. |
| **2** | **Tournament · Conference · Performance · Fundraiser · Expedition** | High-risk / high-stakes / money / safety — **Organizer-Only**, routed via the gate (`needs_certified_organizer` / `needs_human_review`) until their knowledge and overlays exist. |

**Phase 1 OPE = the Big Four (Celebration, Meetup, Class, Club/Community) + light Volunteer Action**, with
the **Recurring** and **Community** modifiers built in 1b–1c. That is the smallest pattern set that turns
ActivLife Hub from a party planner into an engine for **active lives and communities**.

---

## Closing — why patterns, not scenarios

The engineer's instinct is to add activity types one by one. The organizer's truth is that activities
are **the same few shapes repeated**. OPE's job is to learn those shapes well — safely, with real
budgets, risks, and communications — and let content and modifiers do the rest. Ten patterns and three
modifiers, authored once (Single Engine, §11.6), assemble into the thousands of activities in the
taxonomy. Build the Big Four first, because they are where real life — and real community — actually
happens.

_Product architecture document only. No code, UI, or database design. Patterns, coverage, and order
reflect the cited taxonomy, master spec, stress test, and product decisions._
