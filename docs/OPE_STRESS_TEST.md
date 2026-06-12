# OPE Stress Test — product capability as an organizer

> **Method:** 20 realistic scenarios pushed through the **current implementation** (`lib/ope/*`,
> `generatePlan()`), not the spec. Each scenario was run; the numbers below are **actual engine
> output**, captured `2026-06-10`. Where a scenario's true category is unsupported, it was forced to
> the nearest available category (`birthday | bbq | networking`) to show exactly what a user would
> receive. Harness: `tmp/ope/stress.mts`.
> **Verdict up front:** OPE today is a **3-template consumer planner** (birthday, BBQ, networking),
> and **only 2 of those 3 produce a budget**. As a general organizer engine it credibly serves
> ~10% of real demand and **never refuses** the other 90% — it returns a confident, mislabeled,
> mispriced plan instead.

**Supported categories (entire product surface):** `birthday`, `bbq`, `networking`.
**Priced categories:** `birthday`, `bbq` (Honolulu seed only). **`networking` has no pricing seed
anywhere → every networking-class plan returns no budget.**

---

## UPDATE (2026-06-10) — Coverage / Complexity Gate shipped

> The "never refuses" behavior below has been **fixed at the gate level** (see
> `docs/ADR_002_OPE_COVERAGE_GATE.md`). `generatePlan()` now runs a Coverage / Complexity Gate first
> and returns `status: plan_ready | unsupported | needs_human_review | needs_certified_organizer`.
> **The confidently-wrong outputs documented in this report no longer occur** for detectable cases —
> they return a safe refusal/handoff (`plan === null`) instead of a fake plan.
>
> Re-run of the gate against the FAIL set:
> - **wedding** → `needs_certified_organizer` (no more "$2,245 Kids Birthday Party")
> - **soccer tournament, beach cleanup, hiking, yoga, book club, workshop, art class** → `unsupported`
>   (no more BBQ/Networking force-map)
> - **charity fundraiser** → `needs_human_review` (money collection)
> - **networking without a budget** → `needs_human_review`; **networking with a budget** → `plan_ready`
>   (unpriced, honest)
>
> **What this does NOT fix** (still true in the per-scenario analysis below): coverage is still 3
> templates; detection is keyword/threshold over `special_requirements`, not semantic intent (a
> mis-described event can still slip through); networking is still unpriced; the `needs_*` states have
> no live destination yet. The TOP 10 GAPS and build order below remain the roadmap; the gate is
> **step 1 (stop confidently-wrong output)** now done. The analysis below is preserved as the
> pre-gate evidence that motivated it.

---

## Scoreboard *(pre-gate — preserved as the evidence that motivated the gate)*

| Result | Count | Scenarios |
|---|---|---|
| **PASS** | 2 | Kids birthday, BBQ |
| **PARTIAL** | 5 | Adult birthday, Family reunion, Networking event, Startup meetup, Language exchange |
| **FAIL** | 13 | Wedding, Immigrant community meetup, Weekly yoga, Hiking club, Book club, Soccer tournament, Beach volleyball day, Running club, Workshop, Art class, Beach cleanup, Charity fundraiser |

**True pass rate: 2/20 (10%).** Produces-anything-usable: 7/20 (35%). **Fails: 65%.**
The single most dangerous behavior: **OPE has no "I can't plan this" path.** A 120-guest wedding is
returned as a "Kids Birthday Party" budgeted at **$2,245**; a beach cleanup is priced as a **$610 BBQ**.

---

## Per-scenario results

Legend — each row: **Expected** organizer output · **Actual** OPE output (real numbers) · **Grade** ·
**Missing engines** · **Missing data** · **Missing business rules** · **Severity**.

### Personal & Family

**1. Kids birthday — PASS**
- Expected: kid-party plan, age-safe timeline, themed checklist, local budget, safety reminders, invites.
- Actual: label "Kids Birthday Party"; modules birthday-core + young-kids; 6 phases, 24/8/2 tasks, **8 risks**, 4 messages; **priced local $330 / $575 / $1,070**. Theme headline works.
- Missing engines: — (Communication personalization is generic). · Missing data: — · Missing rules: free-text→risk surfacing. · **Severity: Minor.**

**2. Adult birthday — PARTIAL**
- Expected: adult celebration (drinks/venue/music), no kid framing.
- Actual: **mislabeled "Kids Birthday Party"**, birthday-core only; priced $360 / $610 / $1,050. Content is kid-flavored (cake/favors/games); no bar/venue logic.
- Missing engines: Classification (no adult-birthday subtype). · Missing data: adult-birthday module/seeds. · Missing rules: age-of-honoree → framing/cost drivers. · **Severity: Major.**

**3. BBQ — PASS**
- Expected: cookout plan, permits, grill logistics, veg options, local budget.
- Actual: label "BBQ / Family Picnic"; 6 phases, 17/4/2 tasks, **5 risks**, 4 messages; **priced local $315 / $525 / $975**.
- Missing engines: — · Missing data: — · Missing rules: dietary free-text→menu line. · **Severity: Minor.**

**4. Wedding — FAIL**
- Expected: multi-vendor, multi-phase wedding plan; $20k+ budget; high-stakes routing to a pro.
- Actual: **"Kids Birthday Party"**, birthday-core; **priced $1,350 / $2,245 / $3,795** for a 120-guest wedding. Confidently, dangerously wrong; no routing.
- Missing engines: Classification routing (organizer-grade → recommend organizer), Vendor, Staffing. · Missing data: wedding KB + pricing. · Missing rules: complexity/scale gate; high-stakes events must not produce a DIY plan. · **Severity: Critical.**

**5. Family reunion — PARTIAL**
- Expected: multi-generational, possibly multi-day, lodging/logistics, group activities.
- Actual: "BBQ / Family Picnic" (label semi-plausible); priced $520 / $870 / $1,575. No reunion depth (multi-day, lodging, age-banded activities).
- Missing engines: — · Missing data: reunion module. · Missing rules: multi-day events; multi-generational activity planning. · **Severity: Major.**

### Community

**6. Language exchange — PARTIAL**
- Expected: pairing/rotation format, venue, light refreshments, small budget.
- Actual: "Networking Event", 18/5/2 tasks, 7 risks, 3 messages; **no budget (is_priced:false)**. Format-agnostic; no language-pairing logic.
- Missing engines: Budget data for networking-class. · Missing data: networking pricing seed; community-meetup module. · Missing rules: recurring format; rotation/pairing. · **Severity: Major.**

**7. Immigrant community meetup — FAIL**
- Expected (this is the concept's own Example 3): accessible hall, multilingual promo, kids' corner, cultural catering, soft RSVP, local budget.
- Actual: **"Networking Event"**, **no budget**; none of the accessibility / kids-corner / multilingual logic the scenario (and the concept sample) require.
- Missing engines: Classification (no community-meetup category), Budget data. · Missing data: community-meetup module + seeds. · Missing rules: accessibility, multilingual, child-corner, cultural-dietary. · **Severity: Critical** (a concept-promised category is absent and unpriced).

**8. Weekly yoga — FAIL**
- Expected: recurring class — instructor, space, mats/waivers, per-session cost, attendance series.
- Actual: "Networking Event", one-off 18-task plan, **no budget**. **Recurring/series events are entirely unmodeled.**
- Missing engines: Execution (recurring series), Staffing (instructor). · Missing data: class module. · Missing rules: recurring schedule; per-session economics; liability waiver. · **Severity: Major.**

**9. Hiking club — FAIL**
- Expected: route plan, trail/weather safety, transport/permits, gear list, emergency plan.
- Actual: **"Networking Event"** with networking risks; **no trail safety, no permits, no transport**, no budget. Actively misleading for an outdoor-risk activity.
- Missing engines: Classification, Staffing (lead/sweep), Execution (recurring). · Missing data: outdoor-adventure module. · Missing rules: outdoor safety/permits/emergency; recurring. · **Severity: Critical** (safety-relevant scenario → networking plan).

**10. Book club — FAIL**
- Expected: tiny recurring gathering; minimal checklist; near-zero budget.
- Actual: "Networking Event" with an **18-task** plan for 10 people; no budget. Massively over-engineered and mislabeled.
- Missing engines: Classification (scale-down), Execution (recurring). · Missing data: small-recurring module. · Missing rules: scale-appropriate output; recurring. · **Severity: Minor** (low stakes, but wrong).

### Sports

**11. Soccer tournament — FAIL**
- Expected: brackets, referees, registration, first aid, fields/permits, prizes; tournament budget.
- Actual: **"BBQ / Family Picnic"** priced as a cookout **$820 / $1,355 / $2,425**; **no brackets, refs, registration, or first aid.**
- Missing engines: Classification, Staffing (referees/medics), Vendor (field/equipment). · Missing data: tournament module + seeds. · Missing rules: competition format; registration; medical cover. · **Severity: Critical.**

**12. Beach volleyball day — FAIL**
- Expected: courts/nets, teams, sun/water safety, light gear budget.
- Actual: "BBQ / Family Picnic", priced as BBQ $255 / $430 / $815; no nets/teams/rotation.
- Missing engines: Classification, Staffing. · Missing data: sports-day module. · Missing rules: equipment, team format. · **Severity: Major.**

**13. Running club — FAIL**
- Expected: route, pace groups, hydration, route safety, recurring series; near-zero budget.
- Actual: "Networking Event", no budget, no route/safety/recurring logic.
- Missing engines: Classification, Execution (recurring), Staffing (lead/sweep). · Missing data: running module. · Missing rules: route safety; recurring. · **Severity: Major.**

### Professional

**14. Networking event — PARTIAL** *(a SUPPORTED category)*
- Expected: venue, name tags, AV, agenda, follow-up; local budget.
- Actual: coherent networking plan — 18/5/2 tasks, **7 risks**, 3 messages — but **is_priced:false, no budget at all.** A launch category that **cannot produce its core value (the budget).**
- Missing engines: — (engine fine). · Missing data: **networking pricing seed (missing for every city).** · Missing rules: —. · **Severity: Critical** (supported category, zero budget).

**15. Startup meetup — PARTIAL**
- Expected: pitch format, projector/AV, sponsors, catering; budget.
- Actual: "Networking Event", no budget; no sponsor/pitch/AV-rental logic.
- Missing engines: Vendor (AV), Budget data. · Missing data: networking seed; meetup module depth. · Missing rules: sponsorship; pitch agenda. · **Severity: Major.**

### Education

**16. Workshop — FAIL**
- Expected: curriculum/agenda, materials, registration, room, facilitator; per-seat budget.
- Actual: "Networking Event", no budget, no materials/registration/curriculum.
- Missing engines: Classification, Staffing (facilitator), Execution (registration). · Missing data: education module + seeds. · Missing rules: per-seat economics; materials; registration. · **Severity: Major.**

**17. Art class — FAIL**
- Expected: instructor, supplies (easels/paint), seats, per-seat materials budget.
- Actual: "Networking Event", no budget, no supplies/instructor/seats.
- Missing engines: Classification, Staffing, Vendor (supplies). · Missing data: class module + seeds. · Missing rules: per-seat materials; recurring class. · **Severity: Major.**

### Volunteer

**18. Beach cleanup — FAIL**
- Expected: gloves/bags/disposal, waivers, safety brief, volunteer roster, permits; minimal budget.
- Actual: **"BBQ / Family Picnic"** priced as catering **$365 / $610 / $1,130**; suggests food spend, **no gloves/bags/waivers/disposal.** Wrong on purpose of the event.
- Missing engines: Classification, Staffing (volunteer roster), Vendor (disposal). · Missing data: volunteer module + seeds. · Missing rules: waivers/liability; supplies; permits. · **Severity: Critical.**

**19. Charity fundraiser — FAIL**
- Expected: ticketing/donations, auction, sponsors, financial **goal vs cost** model, venue, program.
- Actual: "Networking Event", **no budget, no revenue model at all** — the opposite of a fundraiser's point.
- Missing engines: Classification, Budget (revenue side), Vendor. · Missing data: fundraiser module + seeds. · Missing rules: donations/ticketing/auction; net-proceeds (revenue − cost). · **Severity: Critical.**

**20. (Networking already covered as #14.)** — included in Professional.

---

## What the run proves about the engine (brutally honest)

1. **Coverage is 3 templates, not an engine.** 17 of 20 scenarios have **no real category**; they are
   silently forced into birthday/BBQ/networking and **mislabeled** accordingly.
2. **It never refuses.** There is no scale/complexity gate. The engine produced a confident plan and
   (for birthday/BBQ-mapped cases) a **confident budget** for a wedding, a soccer tournament, and a
   beach cleanup. Confidently wrong is worse than empty.
3. **Networking is a category with no budget.** Every networking-class scenario (6 of 20) returns
   `is_priced:false`. The product's core promised value — a credible budget — is **absent for a third
   of the test set**, including the supported "Networking event".
4. **Risks/checklists are module-generic, not scenario-true.** "Hiking club" inherits networking risks
   (no trail safety); "beach cleanup" inherits BBQ risks (no waivers). The safety value is illusory
   outside birthday/BBQ.
5. **Whole event classes are unmodeled:** recurring/series (yoga, running, book club), revenue events
   (fundraiser), competitions (tournament), education (workshop, class), high-stakes (wedding),
   volunteer (cleanup). These aren't thin — they're absent.
6. **Pricing is Honolulu-only.** Every priced result above used the Honolulu seed; any other city would
   fall back (USD), and most categories have no seed at all.

---

## TOP 10 PRODUCT GAPS

1. **No activity classification / scale-complexity routing.** The engine can't recognize an
   out-of-scope event and route it (e.g., wedding/tournament → organizer). It mislabels and proceeds.
   *(Affects every FAIL.)*
2. **Category coverage is 3.** No wedding, community-meetup, sports, education, volunteer, recurring,
   or fundraiser knowledge. ~85% of demand has no home.
3. **Networking (and all professional/community) has no pricing → no budget.** A supported category
   that can't deliver the product's core value.
4. **Pricing data is one city (Honolulu) and a handful of items.** No real location pricing; no
   multi-currency. Budgets are wrong-currency/wrong-market off-island.
5. **No revenue model.** Fundraisers, ticketed and paid events have no income side — OPE only costs.
6. **No recurring / series concept.** Clubs and classes (a huge organizer segment) are modeled as
   one-off events.
7. **No Staffing model.** Referees, instructors, lifeguards, volunteer rosters, facilitators — none
   exist; "supervising adults" is the only staffing primitive.
8. **No Vendor model.** Equipment, AV, supplies, disposal, rentals — needed by most non-trivial events
   — are absent; budgets can't reflect them.
9. **Risks and checklists are generic to the module, not derived from the real scenario** (and from
   free-text). Safety is only real for birthday/BBQ.
10. **No "cannot plan this" / confidence signal.** The engine emits the same confident artifact whether
    it understands the event or not. There is no honesty about coverage.

---

## Recommended build order (capability-first, not code-first)

Ordered by **risk to the user × breadth of demand unlocked**. This is product capability sequencing,
not implementation.

1. **Stop confidently-wrong output (safety first).** Add a coverage/complexity gate: if the activity
   isn't a supported, in-scope category at a sane scale, **refuse or route** instead of mislabeling.
   This is the highest-value change and unblocks trust. *(Capability: honesty + routing.)*
2. **Make every supported category priced.** Seed pricing for **networking** (and confirm birthday/BBQ
   beyond Honolulu) so no supported path returns an empty budget.
3. **Add the concept's promised launch categories with real KB + pricing:** **community meetup**, then
   **adult birthday** as a proper variant (kill the "Kids Birthday Party" mislabel).
4. **Introduce recurring/series events** (yoga, running, book/clubs, classes) — one capability unlocks
   five tested scenarios and a large organizer segment.
5. **Add a Staffing capability** (roles: instructor, referee, volunteer, lifeguard) — required by
   sports, education, volunteer, large events.
6. **Add a Vendor/equipment capability** so budgets reflect rentals/supplies/AV/disposal (sports,
   education, cleanup, meetups).
7. **Add a revenue model** for fundraisers/ticketed events (donations, tickets, auction, net proceeds).
8. **Broaden pricing to real locations + currency** (replace the single-city seed with location data).
9. **Make risks/checklists scenario-derived** (free-text + thresholds), so safety is real beyond
   birthday/BBQ — especially outdoor/sport/volunteer.
10. **Then high-stakes domains** (wedding, large festivals) — explicitly as organizer-routed, not DIY.

**Bottom line:** as an *organizer* engine, OPE is not yet an engine — it is two trustworthy consumer
templates (kids birthday, BBQ), one unpriced template (networking), and a silent mislabel machine for
everything else. The first job is not more categories; it is to **stop pretending it can plan events it
cannot**, then make the supported set fully priced, then widen coverage in the order above.

---

_Evaluation only. All figures are real `generatePlan()` output from the current `lib/ope`
implementation. No code changes proposed before product-capability assessment, per the request._
