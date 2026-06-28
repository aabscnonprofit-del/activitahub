# OPE Validation Test Suite (V1)

> **Goal:** stress-test current OPE behavior against realistic user requests through the accepted flow
> **Request → Discovery → WSH → Approval → Plan**. **Validation only — no code, no redesign, no
> architecture change.**
> **Critical rule:** flag every point where OPE would **invent** facts instead of **discovering** them.
> **Verdicts:** **PASS** (OPE can safely reach an honest WSH) · **DISCOVERY REQUIRED** (OPE must not
> proceed without clarification / handoff) · **FAIL** (current architecture would produce a wrong
> result — typically by inventing).

## How the current flow actually behaves (the basis for every verdict)

- **Discovery is single-shot, not iterative.** The iterative Discovery engine is doc-only
  (`OPE_DISCOVERY_ENGINE_PRINCIPLES_V1`). In code, "Discovery" = either the request **Minimum Planning
  Inputs gate** (`assessRequestReadiness`: asks *When / Where / Who / Budget / Outcome* when missing) on
  the organizer-request path, **or** a one-shot **WSH draft** (`composeWhatShouldHappen` / deterministic
  `draftWhatShouldHappen`) on the public idea path — then human approval.
- **Supported, priced scope is narrow** (coverage gate / ADR-002): **Celebration** content (kids/adult
  birthday, anniversary, graduation, family reunion, BBQ/picnic, housewarming, dinner party) and
  **Meetup** (networking, *with a budget*) and **Class** (fitness/art/language/workshop) — **Honolulu
  pricing only**. Everything else → `unsupported` → **safe handoff** (no plan; correct, no invention).
- **The WSH draft is generated regardless of scope** on the idea path; the coverage gate only refuses
  at *plan* time — so an out-of-scope request can still reach an **invented WSH** before being refused.

### Invention-point legend (referenced per case)
- **INV-1 — Outcome/experience invention:** the WSH draft fabricates "what people experience / intended
  outcome" the user never stated (`draftWhatShouldHappen` / `composeWhatShouldHappen`).
- **INV-2 — Outcome-gate false pass:** `assessRequestReadiness` accepts any non-empty `notes` as
  "Expected Outcome known" (presence proxy, not a real outcome).
- **INV-3 — Signal blank-fill:** `enrichInputWithWsh` fills venue/budget/headcount from incidental WSH
  text tokens.
- **INV-4 — Category/pricing coercion:** a request priced/patterned against the nearest supported seed
  (e.g., a reunion priced on celebration/birthday seeds) → an invented budget presented as fact.
- **INV-5 — Auto-default completion:** request paths fill missing clarifications with plan-completing
  defaults (`fillClarificationDefaults`) when no human answers — invents specifics to produce a plan.
- **INV-6 — Scope mis-acceptance:** an unsupported request reaches a WSH draft (invented) before the
  coverage gate refuses at plan time.

---

## PERSONAL

### Case 1 — Kids birthday, complete · **PASS** · invention risk: low
1. **Request:** "A 7th birthday party for my son, ~20 kids, in our backyard, next Saturday 2pm, budget ~$500."
2. **Discovery should ask:** nothing required — When/Where/Who/Budget all present; optional: theme, food.
3. **WSH:** "A fun backyard birthday where 20 kids play games and celebrate; the birthday child feels special; parents relax." (grounded in stated facts.)
4. **Approval:** organizer/parent confirms WSH (one edit pass).
5. **Planning inputs:** category birthday, guestCount 20 (kids), venue backyard_home, budget 500, date Saturday.
6. **Failure modes to avoid:** don't invent a theme/entertainer not requested (INV-1/INV-3); keep WSH to stated facts.

### Case 2 — Birthday, vague · **DISCOVERY REQUIRED** · risk: INV-1
1. **Request:** "I want to throw a birthday party for my son."
2. **Discovery should ask:** When? Where? How many/how old? Budget? Indoor/outdoor?
3. **WSH (after answers):** built from the answers, not before.
4. **Approval:** after clarification only.
5. **Planning inputs:** none until When/Who/Where known.
6. **Failure modes:** current idea path may **draft a WSH immediately** (INV-1) instead of asking — flag: it should gate on Minimum Planning Inputs, not fabricate the celebration's shape.

### Case 3 — Adult birthday, emotional · **FAIL** · risk: INV-1
1. **Request:** "Make my 40th unforgettable."
2. **Discovery should ask:** what does "unforgettable" mean to you? guests, vibe, when, where, budget?
3. **WSH:** must come from the person; "unforgettable" is a feeling, not a plan.
4. **Approval:** premature — nothing to approve yet.
5. **Planning inputs:** none.
6. **Failure modes:** `draftWhatShouldHappen` will **fabricate** a concrete "what should happen" (e.g., "an elegant evening with…") the user never said (**INV-1**). FAIL: invention substituted for discovery.

### Case 4 — Wedding, concrete · **DISCOVERY REQUIRED** (out of scope → handoff) · risk: INV-6
1. **Request:** "Wedding for 150 guests, June 14, at Lanikai — ceremony + reception."
2. **Discovery should ask:** confirm scope; weddings are out of OPE's priced scope → route to a human organizer.
3. **WSH:** could be drafted, but OPE cannot plan/price it.
4. **Approval:** N/A for OPE planning.
5. **Planning inputs:** none (coverage gate → unsupported → safe handoff).
6. **Failure modes:** the idea path will still **draft a WSH** (INV-6) before the plan refuses — acceptable only if the refusal is honest and no invented budget appears.

### Case 5 — Wedding, vague · **FAIL** · risk: INV-1 + INV-6
1. **Request:** "Plan my dream wedding."
2. **Discovery should ask:** everything (date, guests, venue, budget, style) — and flag out-of-scope.
3. **WSH:** must not be synthesized from "dream."
4. **Approval:** premature.
5. **Planning inputs:** none.
6. **Failure modes:** double invention — INV-1 (fabricates the "dream") and INV-6 (drafts before the unsupported refusal). FAIL.

### Case 6 — Proposal · **FAIL** · risk: INV-1 + INV-6
1. **Request:** "I want to propose to my girlfriend."
2. **Discovery should ask:** where/when, public or private, who's involved, her preferences, budget — and note out-of-scope (bespoke).
3. **WSH:** intensely personal; must be discovered.
4. **Approval:** premature.
5. **Planning inputs:** none.
6. **Failure modes:** `draftWhatShouldHappen` will invent a proposal scene (INV-1); coverage will refuse the plan (INV-6). FAIL.

### Case 7 — Family reunion · **PASS** (reaches WSH) · risk: **INV-4**
1. **Request:** "Family reunion, ~40 people, at Kapiolani Park, this summer."
2. **Discovery should ask:** exact date, budget, food plan, ages mix.
3. **WSH:** "Extended family gathers for a relaxed day in the park — reconnecting across generations."
4. **Approval:** confirm date + budget.
5. **Planning inputs:** category family_reunion (Celebration), guestCount 40, venue public_park, date, budget.
6. **Failure modes:** **INV-4** — reunion is priced against celebration/birthday seeds; the budget is an *approximation presented as fact*. Flag the seed basis; don't present invented per-line costs as exact.

### Case 8 — Funeral / memorial · **DISCOVERY REQUIRED** (out of scope, sensitive → handoff) · risk: INV-1
1. **Request:** "Organize my father's memorial."
2. **Discovery should ask:** date, guest count, venue, tone/faith, budget — and route to a human (sensitive, out of scope).
3. **WSH:** must be discovered with care; never templated.
4. **Approval:** N/A for OPE planning.
5. **Planning inputs:** none.
6. **Failure modes:** any auto-drafted WSH that invents tone/ritual (INV-1) is a serious failure; OPE must hand off, not fabricate.

---

## COMMUNITY

### Case 9 — Immigrant community gathering, concrete · **PASS** (as Meetup) · risk: INV-2
1. **Request:** "A Filipino community cultural night, ~60 people, community hall, Nov 9, ~$800."
2. **Discovery should ask:** program elements (food, performances), budget confirmation.
3. **WSH:** "The community gathers to share food, music and culture; newcomers feel welcomed and connected."
4. **Approval:** confirm program + budget.
5. **Planning inputs:** category networking/meetup, guestCount 60, venue, budget, date.
6. **Failure modes:** **INV-2** — "cultural night" notes may pass the Outcome gate without a real, agreed outcome; confirm the outcome explicitly.

### Case 10 — Alumni gathering · **DISCOVERY REQUIRED** · risk: INV-1 / category ambiguity
1. **Request:** "A reunion for my college class."
2. **Discovery should ask:** how many, when, where, formal/casual, budget — and whether it's social (meetup) vs celebration.
3. **WSH:** after the format is chosen.
4. **Approval:** after clarification.
5. **Planning inputs:** none until headcount/when/format known.
6. **Failure modes:** mapping ambiguity (reunion→family_reunion vs networking) → wrong pattern/pricing if not clarified; don't auto-pick.

### Case 11 — Hobby club, recurring · **PASS** · risk: low
1. **Request:** "A monthly board-game meetup, ~15 people, the library community room, ongoing."
2. **Discovery should ask:** budget per session, food/snacks, recurrence end.
3. **WSH:** "Regulars and newcomers meet monthly to play games and build a friendly community."
4. **Approval:** confirm cadence + budget.
5. **Planning inputs:** category networking (Meetup), recurrence monthly, guestCount 15, venue, budget.
6. **Failure modes:** ensure recurrence is captured (Meetup recurring); don't invent a per-session cost without a budget (would hit the budget gate).

### Case 12 — Charity event / fundraiser · **DISCOVERY REQUIRED** (out of scope) · risk: INV-6
1. **Request:** "A fundraiser gala for our nonprofit."
2. **Discovery should ask:** guests, venue, ticketing, budget, fundraising mechanics — flag out-of-scope (fundraising not modeled).
3. **WSH:** could be discovered, but OPE can't plan ticketing/fundraising.
4. **Approval:** N/A for OPE planning.
5. **Planning inputs:** none (safe handoff).
6. **Failure modes:** INV-6 — drafting a WSH then refusing; never invent a fundraising/ticketing plan.

---

## BUSINESS

### Case 13 — Networking event, complete · **PASS** · risk: low
1. **Request:** "A networking mixer for ~50 professionals, downtown venue, Oct 3 evening, ~$2,000."
2. **Discovery should ask:** F&B level, format (speed-networking vs open).
3. **WSH:** "Professionals meet, exchange ideas, and leave with new contacts in a relaxed evening."
4. **Approval:** confirm format + budget.
5. **Planning inputs:** category networking, guestCount 50, venue, budget 2000, date.
6. **Failure modes:** networking **requires a budget** to be supported — present; good. Don't invent venue specifics (INV-3).

### Case 14 — Networking, vague · **DISCOVERY REQUIRED** · risk: INV-1/INV-2
1. **Request:** "Host a networking thing for my industry."
2. **Discovery should ask:** how many, when, where, budget, goal.
3. **WSH:** after answers.
4. **Approval:** after clarification.
5. **Planning inputs:** none (no budget → also fails the Meetup budget requirement).
6. **Failure modes:** drafting a generic networking WSH (INV-1); Outcome-gate passing on "for my industry" (INV-2).

### Case 15 — Workshop, concrete · **PASS** · risk: low
1. **Request:** "A 3-hour pottery workshop, 25 attendees, materials provided, instructor needed, Sat morning, ~$1,200."
2. **Discovery should ask:** venue, skill level.
3. **WSH:** "Beginners learn to throw pottery and leave with a piece they made and a sense of accomplishment."
4. **Approval:** confirm instructor + materials.
5. **Planning inputs:** category workshop (Class), guestCount 25, instructor need, materials provided, budget.
6. **Failure modes:** don't invent the curriculum; instructor/materials are real flags (Class pattern).

### Case 16 — Conference · **DISCOVERY REQUIRED → likely out of scope** · risk: INV-5/INV-6
1. **Request:** "A 300-person, 2-day industry conference with tracks."
2. **Discovery should ask:** dates, venue, tracks, A/V, budget — and flag scale/multi-day out of scope.
3. **WSH:** could be discovered, but multi-day/scale exceeds the single-event engine.
4. **Approval:** N/A for OPE planning.
5. **Planning inputs:** none (coverage refuses; multi-day not modeled).
6. **Failure modes:** **INV-5/INV-6** — if forced through, auto-defaults would invent a single-day plan for a 2-day event. Must hand off.

### Case 17 — Team building · **DISCOVERY REQUIRED** · risk: INV-1
1. **Request:** "An offsite team-building day for my team of 12."
2. **Discovery should ask:** activity type (workshop? outdoor? meal?), when, where, budget, goal.
3. **WSH:** after the *activity* is chosen — "team building" is an intent, not an activity.
4. **Approval:** after clarification.
5. **Planning inputs:** none until activity chosen.
6. **Failure modes:** INV-1 — drafting "a fun team day" invents the format; if it's an outdoor adventure it's out of scope.

---

## TRAVEL / ADVENTURE

### Case 18 — "Visit heaven" · **FAIL** · risk: INV-1
1. **Request:** "I want to visit heaven."
2. **Discovery should ask:** what do you actually mean — a serene place, a spiritual retreat, a view? (metaphor vs literal).
3. **WSH:** undiscoverable as stated; must clarify the real intent.
4. **Approval:** premature.
5. **Planning inputs:** none.
6. **Failure modes:** the worst INV-1 case — OPE could fabricate a literal interpretation and draft a WSH. Must refuse/clarify, never invent meaning.

### Case 19 — Extreme experience · **DISCOVERY REQUIRED** (out of scope + safety) · risk: INV-1
1. **Request:** "Plan something extreme and dangerous for my buddies."
2. **Discovery should ask:** what kind (skydiving? off-road?), how many, when, budget — and flag safety/out-of-scope.
3. **WSH:** after the activity + safety constraints are known.
4. **Approval:** N/A for OPE planning (sourcing/safety).
5. **Planning inputs:** none.
6. **Failure modes:** INV-1 fabricating an activity; safety cannot be invented — must hand off.

### Case 20 — Helicopter tour · **DISCOVERY REQUIRED** (out of scope sourcing) · risk: INV-6
1. **Request:** "Book a helicopter tour for 4 next weekend."
2. **Discovery should ask:** date/time, operator preference, budget — and note OPE doesn't book vendors/tours.
3. **WSH:** simple, but execution is vendor-sourcing, out of scope.
4. **Approval:** N/A for OPE planning.
5. **Planning inputs:** none (safe handoff).
6. **Failure modes:** INV-6 — drafting then refusing; never invent an operator/price.

### Case 21 — Safari · **DISCOVERY REQUIRED** (out of scope, travel) · risk: INV-6
1. **Request:** "A safari trip for our anniversary."
2. **Discovery should ask:** destination, dates, party size, budget — and flag travel (out of scope).
3. **WSH:** discoverable, but OPE can't plan travel.
4. **Approval:** N/A for OPE planning.
5. **Planning inputs:** none (safe handoff).
6. **Failure modes:** INV-6/INV-4 — never invent an itinerary or price; the embedded "anniversary" must not silently coerce to a celebration plan.

---

## UNUSUAL (emotion-first — the headline invention traps)

### Case 22 — "The best day of my life" · **FAIL** · risk: INV-1
1. **Request:** "I want the best day of my life."
2. **Discovery should ask:** what would that look like — what, who, where, when, budget, why it matters.
3. **WSH:** entirely from the person; nothing is implied.
4. **Approval:** premature.
5. **Planning inputs:** none.
6. **Failure modes:** **INV-1, severe** — `draftWhatShouldHappen` will produce a concrete "what should happen" from a pure feeling. FAIL.

### Case 23 — "Surprise my wife" · **FAIL** · risk: INV-1
1. **Request:** "I want to surprise my wife."
2. **Discovery should ask:** occasion, her tastes, budget, scale, when, guests/private.
3. **WSH:** must be discovered (her, not a template).
4. **Approval:** premature.
5. **Planning inputs:** none.
6. **Failure modes:** INV-1 fabricating a "romantic surprise" the user never described. FAIL.

### Case 24 — "I want people to remember me" · **FAIL** · risk: INV-1
1. **Request:** "I want people to remember me."
2. **Discovery should ask:** remember you for what / when — a party? a legacy? a farewell? This may not be an event at all.
3. **WSH:** undiscoverable until intent is clarified.
4. **Approval:** premature.
5. **Planning inputs:** none.
6. **Failure modes:** INV-1 — drafting any event WSH invents both the occasion and the meaning. FAIL.

### Case 25 — "I want to feel alive again" · **FAIL** · risk: INV-1
1. **Request:** "I want to feel alive again."
2. **Discovery should ask:** what makes you feel alive — adventure? people? a milestone? Is an event even the answer?
3. **WSH:** not an event request as stated.
4. **Approval:** premature.
5. **Planning inputs:** none.
6. **Failure modes:** INV-1 — fabricating an "exciting experience" is invention of the user's inner state. FAIL.

### Case 26 — "I want to meet new friends" · **DISCOVERY REQUIRED** · risk: INV-1
1. **Request:** "I want to meet new friends."
2. **Discovery should ask:** through what (a recurring social meetup? a class? an interest), how often, where, budget.
3. **WSH (if a meetup is chosen):** "Like-minded people gather regularly so newcomers form real friendships."
4. **Approval:** after the format is chosen.
5. **Planning inputs:** none until format/when/where known (could become a recurring Meetup — supported).
6. **Failure modes:** INV-1 — auto-drafting "a social event" assumes a format the user didn't choose. Clarify first; this one *can* land on a supported Meetup after discovery.

---

## ADDITIONAL CONCRETE CASES (positive controls + edge contrasts)

### Case 27 — BBQ, complete · **PASS** · risk: low
1. **Request:** "A 4th of July BBQ, ~30 people, at the park, budget ~$400."
2. **Discovery should ask:** food plan, alcohol? (a feature signal).
3. **WSH:** "Friends and family share a relaxed holiday cookout outdoors."
4. **Approval:** confirm food + budget.
5. **Planning inputs:** category bbq, guestCount 30, venue public_park, budget 400, date.
6. **Failure modes:** don't add alcohol/feature lines unless stated (INV-3).

### Case 28 — "A cookout" (vague) · **DISCOVERY REQUIRED** · risk: INV-1
1. **Request:** "I want to do a cookout."
2. **Discovery should ask:** when, how many, where, budget.
3. **WSH:** after answers.
4. **Approval:** after clarification.
5. **Planning inputs:** none until When/Who/Where.
6. **Failure modes:** idea path may draft immediately (INV-1) instead of asking.

### Case 29 — Recurring language class · **PASS** · risk: low
1. **Request:** "A weekly beginner Spanish class, ~10 students, instructor I have, materials provided, ~$60/session."
2. **Discovery should ask:** venue, term length.
3. **WSH:** "Beginners meet weekly to learn conversational Spanish and steadily progress."
4. **Approval:** confirm cadence + venue.
5. **Planning inputs:** category language_class, recurrence weekly, guestCount 10, instructor have, materials provided, budget.
6. **Failure modes:** capture recurrence + instructor/materials (Class pattern); don't invent curriculum.

### Case 30 — Birthday with named features · **PASS** · risk: INV-3 (contained)
1. **Request:** "Kids party with a bouncy castle and a clown, 15 kids, our backyard, Saturday, ~$700."
2. **Discovery should ask:** time, food.
3. **WSH:** "A lively backyard party where kids enjoy a bouncy castle and a clown; the birthday child feels celebrated."
4. **Approval:** confirm features + budget.
5. **Planning inputs:** category birthday, guestCount 15, venue backyard_home, specialRequirements [inflatable/foam, entertainer], budget 700.
6. **Failure modes:** features are **stated** → `extractPlanningSignals` correctly adds them (not INV-3). Don't add unrequested features.

### Case 31 — "Plan something fun this weekend" · **DISCOVERY REQUIRED** · risk: INV-1
1. **Request:** "Plan something fun for this weekend."
2. **Discovery should ask:** for whom, what kind of fun, how many, budget, indoor/outdoor.
3. **WSH:** after answers.
4. **Approval:** after clarification.
5. **Planning inputs:** none (no category/When/Who).
6. **Failure modes:** INV-1 — any drafted WSH invents the activity and audience.

### Case 32 — Itinerary provided (recognized scenario) · **PASS** · risk: none
1. **Request:** "Saturday at my house, ~20 kids: 10am welcome, 11am games, 12pm lunch, 1pm cake, 2pm goodbye."
2. **Discovery should ask:** budget (optional); structure is already given.
3. **WSH:** the user's own story (recognizeScenario → `provided`/`narrative`) — **no synthesis**.
4. **Approval:** light confirm.
5. **Planning inputs:** category birthday, guestCount 20, venue backyard_home, timeline from the itinerary.
6. **Failure modes:** none on invention — this is the gold standard: OPE **discovers** (reads) the scenario rather than inventing it.

---

## Summary

| # | Case | Verdict | Primary invention risk |
|---|---|---|---|
| 1 | Kids birthday (complete) | PASS | — |
| 2 | Birthday (vague) | DISCOVERY | INV-1 |
| 3 | 40th "unforgettable" | **FAIL** | INV-1 |
| 4 | Wedding (concrete) | DISCOVERY (handoff) | INV-6 |
| 5 | Wedding (vague) | **FAIL** | INV-1, INV-6 |
| 6 | Proposal | **FAIL** | INV-1, INV-6 |
| 7 | Family reunion | PASS | **INV-4** |
| 8 | Funeral/memorial | DISCOVERY (handoff) | INV-1 |
| 9 | Immigrant community night | PASS | INV-2 |
| 10 | Alumni gathering | DISCOVERY | INV-1 |
| 11 | Hobby club (recurring) | PASS | — |
| 12 | Charity/fundraiser | DISCOVERY (handoff) | INV-6 |
| 13 | Networking (complete) | PASS | — |
| 14 | Networking (vague) | DISCOVERY | INV-1, INV-2 |
| 15 | Workshop (concrete) | PASS | — |
| 16 | Conference | DISCOVERY → out of scope | INV-5, INV-6 |
| 17 | Team building | DISCOVERY | INV-1 |
| 18 | "Visit heaven" | **FAIL** | INV-1 |
| 19 | Extreme experience | DISCOVERY (handoff) | INV-1 |
| 20 | Helicopter tour | DISCOVERY (handoff) | INV-6 |
| 21 | Safari | DISCOVERY (handoff) | INV-4, INV-6 |
| 22 | "Best day of my life" | **FAIL** | INV-1 |
| 23 | "Surprise my wife" | **FAIL** | INV-1 |
| 24 | "Remember me" | **FAIL** | INV-1 |
| 25 | "Feel alive again" | **FAIL** | INV-1 |
| 26 | "Meet new friends" | DISCOVERY | INV-1 |
| 27 | BBQ (complete) | PASS | — |
| 28 | "A cookout" (vague) | DISCOVERY | INV-1 |
| 29 | Recurring language class | PASS | — |
| 30 | Birthday w/ named features | PASS | INV-3 (contained) |
| 31 | "Something fun this weekend" | DISCOVERY | INV-1 |
| 32 | Itinerary provided | PASS | — |

**Counts:** PASS 9 · DISCOVERY REQUIRED 15 · FAIL 8.

### The systemic finding (the critical rule)
The single largest invention surface is **INV-1**: on the public idea path, `draftWhatShouldHappen` /
`composeWhatShouldHappen` **generate a concrete WSH from any input — including pure feelings and
out-of-scope requests** — rather than first asking the Minimum Planning Inputs (When/Where/Who/Budget/
Outcome). For emotion-first requests (Cases 3, 5, 6, 18, 22–25) this is **fact invention**, mitigated
only by the human approving/editing the draft. Secondary surfaces: **INV-2** (Outcome gate passes on any
non-empty `notes`), **INV-4** (celebration-seed pricing presented as a real budget, e.g. family
reunion), **INV-5** (request-path auto-defaults completing a plan), and **INV-6** (out-of-scope requests
reaching an invented WSH before the coverage gate refuses).

### What "correct" looks like (no redesign implied — validation only)
- **FAIL cases** must become **DISCOVERY REQUIRED**: OPE should withhold the WSH draft until the request
  has a real anchor (category + at least When/Who, or an explicitly stated outcome), instead of
  synthesizing one.
- **Out-of-scope cases** should reach the **safe handoff without first emitting an invented WSH**.
- **Supported, complete cases** (1, 7, 11, 13, 15, 27, 29, 30, 32) are safe today — note that the **only
  invention-free WSH path is the recognized-scenario one** (Case 32), where OPE *reads* the user's story
  rather than drafting it.

*(Validation only — no code, no implementation, no architecture change. Test cases describe intended
vs current behavior to locate invention points; they are not assertions that the engine was executed.)*
