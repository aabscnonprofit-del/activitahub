# OPE Sourcing Engine — turning resource needs into real sourcing requests

> **Type:** architecture (no code, UI, or database design).
> **Role:** converts OPE's *resource needs* into *sourcing requests* for workers and vendors, runs an
> acceptance workflow, and returns a shortlist to the organizer.
> **Connects:** `OPE_MASTER_SPEC.md` (§6 Resource Planning, §8 Vendor, §9 Staffing — all PLANNED),
> `OPE_PLANNING_WORKFLOW.md` (resource/local-rule stages), `OPE_EVENT_LIFECYCLE.md` (when sourcing
> happens), `OPE_LEARNING_ARCHITECTURE.md` (sourcing outcomes → matching).
> **Status:** forward-looking, like the Master Spec. Vendor/Staffing sourcing is **not** built in M1–M3;
> the **Level-0 "brief" form below is the near-term realizable slice**.
> **Date:** 2026-06-10.

## 0. Where it sits — and how it works *before* networks exist

OPE produces *what is needed* (Resource/Vendor/Staffing). The Sourcing Engine turns that into *who
provides it*. Its central design rule:

> **The engine is designed once; the SOURCE of candidates upgrades over time** — exactly like the
> `PricingProvider` chain (`local → historical → external → fallback`). A **CandidateProvider chain**
> resolves the best available source and **falls back to a structured brief** when no network exists.

**Capability ladder (degrades gracefully):**

| Level | Candidate source | What the organizer gets | When |
|---|---|---|---|
| **L0 — Brief-only** | none | a structured **sourcing brief** (need + spec + budget + "what to ask for"); organizer sources from their own contacts | **today** (realizable now) |
| **L1 — Seed directory** | curated per-region provider list (like the Honolulu price seed) | **suggested** providers to contact | near-term |
| **L2 — Networks** | Worker Network / Vendor Network (profiles, availability, verification) | real **matching + notifications + acceptance** | future |
| **L3 — Marketplace** | two-sided market | bidding / booking / payments | later |

Because of L0, **sourcing works before any network exists** — it just emits clear briefs and the
organizer does the legwork; as L1→L3 fill in, matching, notifications, and acceptance light up. No state
or contract changes between levels — only the provider.

---

## 1. Inputs — resource requirements from OPE

Each **resource need** (from the Resource/Vendor/Staffing engines) carries:
- **type:** people · venue · equipment · service · supplies
- **role/category** (waiter, catering, AV rental…)
- **quantity** (sized to the confirmed count)
- **spec** (skill/qualification, style/cuisine, capacity)
- **window** (date + start/end from the timeline; setup/delivery times)
- **location** (event region)
- **budget allocation** (the budget line this need maps to — the cap)
- **priority** (must-have vs optional)
- **provenance** (which plan element / occurrence id it came from — the lifecycle link)

---

## 2. Request generation — one need → one or more requests

Normalize needs into **atomic sourcing requests**, applying **split** and **bundle** rules:
- **Split:** "event staff" → waiter ×2 + bartender ×1 = three worker requests (or one team request).
- **Bundle:** "catering + tables + linens" → one vendor request to a full-service caterer when one
  provider can serve several needs (fewer, cheaper bookings).
- **1:1:** "instructor" → one worker request for one instructor.

Each request inherits the need's spec + window + location + budget cap + priority, plus a **kind**
(worker / vendor) and the **originating need + occurrence id**. Split/bundle is a planning choice the
organizer can override (sourcing proposes, organizer disposes).

---

## 3. Worker sourcing

Roles (people): **waiter, bartender, host/greeter, photographer, DJ, instructor, cleaner, security,
lifeguard, first-aider, referee, translator.**

A **worker request** specifies: role, count, **skill/qualification**, **shift window** (start/end from
the timeline), location, and **pay band** (from the staffing budget line). Candidate source per the
ladder (organizer contacts → seed → Worker Network).

**Safety-critical roles** (lifeguard, security, certified instructor, first-aider) carry a
**verification requirement** — they may **not** be auto-confirmed unverified. This ties to the safety
asymmetry in `OPE_LEARNING_ARCHITECTURE` (verification is **expert/credential**-gated, never statistical).
At L0 the brief flags "must verify certification."

---

## 4. Vendor sourcing

Categories (services/supplies): **catering, rentals (tables/chairs/AV/tents), transportation, flowers,
decorations, cake/food, equipment rental, cleaning service.**

A **vendor request** specifies: category, **spec** (cuisine/quantity/style), date, location,
**delivery/setup** window, and budget cap. Vendor **quotes feed back into the Budget Engine** (the
Master Spec §8 price-feedback loop) — real quotes refine the estimate from seed/fallback toward actuals.

---

## 5. Matching — how candidates are selected

A **CandidateProvider** (mirrors PricingProvider) returns ranked candidates for a request. Scoring:

**Hard filters (must pass):**
- **Availability** (free in the window)
- **Capability** (role/category + skill match)
- **Capacity** (can handle the quantity)
- **Verification** (for safety-critical roles)

**Soft ranking (weighted):**
- **Proximity** (within radius)
- **Budget fit** (rate within cap)
- **Reliability / rating** (from learning §9)
- **Diversity / rotation** (don't always surface the same provider)

Output = a **ranked candidate list**, not an auto-booking. Before networks (L0), matching returns the
**spec + search guidance** (no named candidates); at L1, seed-directory suggestions; at L2+, real
ranked candidates.

---

## 6. Notifications

| Channel | Status | Use |
|---|---|---|
| **Push** (in-app / web push) | available today | organizer alerts; candidate invites (L2+) |
| **Email** | queued, pending SMTP | shortlist + acceptance summaries; candidate invites |
| **SMS** | **future** | time-critical candidate invites |

Notifications respect **channel availability** (push now; email when SMTP is wired; SMS later) and
**direction**:
- **To the organizer:** "your sourcing brief is ready / shortlist ready / candidate accepted."
- **To candidates** (L2+ only): "you've been requested for {role} on {date} — accept/decline."

At L0/L1 there are no candidate notifications — only organizer-facing briefs/suggestions.

---

## 7. Acceptance workflow

Per request (and per candidate within it):

```
Requested ─▶ Matched ─▶ Accepted ─▶ Confirmed ─▶ Completed
                 └────▶ Rejected
```

| State | Meaning |
|---|---|
| **Requested** | the sourcing request exists (need → request) |
| **Matched** | candidates identified (shortlist / seed) and, at L2+, invited |
| **Accepted** | a candidate confirms availability (says yes) |
| **Rejected** | candidate declines, or organizer rejects a candidate |
| **Confirmed** | organizer locks a specific candidate (or team) for the slot |
| **Completed** | the work/service was delivered → feeds actuals + learning |

**Lifecycle linkage (`OPE_EVENT_LIFECYCLE`):**
- Requests **generated at Ready** (plan approved).
- **Matched/Accepted during Open for Registration.**
- **Confirmed before Registration Closed / In Progress** — staff and vendors must be locked before the
  event freezes (you can't start without your caterer). Confirmation is part of the execution freeze.
- **Completed at the event's Completed → Closed**, emitting sourcing actuals.

---

## 8. Shortlist generation

For each request the organizer receives **N ranked options** (e.g. top 3 caterers), each showing:
provider, match score, price estimate (vs cap), availability, rating, verification status. The organizer
**picks → Confirm**. The shortlist respects the **budget cap** and **diversity/rotation**, and never
auto-books.

At **L0** the "shortlist" is a **structured brief** ("you need a caterer for 30 at ~\$X — ask about
dietary options, delivery, and setup") rather than named providers; at L1+, real options.

---

## 9. Learning signals — how sourcing improves matching

Sourcing outcomes (captured at **Completed/Closed**) feed two loops, classed per
`OPE_LEARNING_ARCHITECTURE`:

| Signal | Improves | Learning class |
|---|---|---|
| **Acceptance rate** per provider | matching reliability score | auto (statistical) |
| **Actual price vs quote** | matching budget-fit **and** Budget regional pricing | auto regional (price), organizer-confirmed |
| **Quality / satisfaction rating** | matching rank | **organizer-confirmed** |
| **No-show / cancellation** by provider | reliability penalty | organizer-confirmed |
| **Re-hire / repeat** | positive reliability | auto (statistical) |
| **Safety/verification lapse** | **disqualification** | **expert** (never auto) |

So good providers rise, unreliable ones fall, real prices sharpen both matching and the budget — and
**safety verification is never moved by statistics**, only by expert review.

---

## 10. Relationship to future systems

| System | Role vs the Sourcing Engine |
|---|---|
| **Worker Network** | the **CandidateProvider for worker requests** (profiles, availability, verification). Plugs into matching at L2. |
| **Vendor Network** | the **CandidateProvider for vendor requests** (catalog, availability, pricing). Plugs in at L2; vendor quotes feed Budget. |
| **Marketplace** | the **transaction layer** (bidding, booking, payments) at L3. The acceptance workflow (Requested→…→Completed) is its precursor — the Sourcing Engine already models the states a marketplace transacts on. |

These are **plug-in candidate sources**, not rewrites: the Sourcing Engine's inputs, request model,
matching contract, acceptance workflow, and learning signals are **identical** at every level — only the
CandidateProvider changes. That is precisely why sourcing **works before the networks exist** (L0 brief)
and gets richer as they arrive (L1→L3), with no change to the rest of OPE.

---

## Worked example — BBQ (ties to the lifecycle walkthrough)

- **Ready:** OPE resource needs → Sourcing requests: *grill rental* (vendor), *cleaner ×1* (worker,
  post-event shift), *(optional)* *photographer* (worker). Budget caps from the budget lines.
- **L0 today:** organizer receives three **briefs** ("grill rental for a 30-person park BBQ, ~\$X, pickup
  + return"); sources from own contacts; marks each **Confirmed**.
- **Open → Registration Closed:** confirmations locked before the event freezes.
- **Completed → Closed:** actual rental cost \$X logged → **regional Honolulu pricing** + the rental
  provider's reliability/rating. Next BBQ in Honolulu starts with a sharper estimate and a known
  provider — even though no Vendor Network exists yet.

---

## Closing

The Sourcing Engine is the bridge from OPE's *needs* to the real world's *providers*. By modeling
**needs → requests → matching → acceptance → completion** once, and treating Worker/Vendor Networks and
the Marketplace as **swappable candidate sources**, it delivers value at **Level 0 (briefs) before any
network exists**, and scales to full marketplace matching without changing its contracts — feeding
actuals back into both **matching** and the **Budget Engine** so every event sourced makes the next one
easier.

_Architecture only. No code, UI, or database design. Consistent with the Master Spec engines, Planning
Workflow, Event Lifecycle, and Learning Architecture._
