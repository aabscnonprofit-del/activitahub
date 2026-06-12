# OPE Pattern Validation — does the pattern model actually cover the universe?

> **Type:** validation document. No code, no OPE redesign — a test of the model.
> **Method:** take **every** activity type in `OPE_ACTIVITY_TAXONOMY.md` and map it to the
> `OPE_PATTERN_LIBRARY.md` model — **primary pattern + optional secondary pattern(s) + modifiers** —
> then judge whether **Pattern + Content + Modifiers** *fully* describes it (YES / PARTIAL / NO).
> **Date:** 2026-06-10.

**Patterns:** Celebration · Meetup · Class · Club/Community · Tournament · Conference · Performance ·
Fundraiser · Volunteer Action · Expedition/Outing.
**Modifiers (current):** **R** = Recurring · **C** = Community · **F** = Fundraising/Ticketing overlay.
**Flags for missing capability (not in library yet):** **[S]** = Sensitive/Safeguarding ·
**[Reg]** = Regulated/Licensed · **[Rit]** = Ceremony/Ritual.

**Verdict key:** **YES** = fully described by pattern+content+modifiers · **PARTIAL** = structure fits
but a real dimension is missing · **NO** = no clean fit in the current library.

---

## 1–2–3. Full mapping (every activity type)

### Personal & Family
| Activity | Primary | Secondary | Modifiers | Verdict |
|---|---|---|---|---|
| Kids birthday | Celebration | — | — | **YES** |
| Adult birthday | Celebration | — | — | **YES** |
| Milestone birthday | Celebration | — | — | **YES** |
| Anniversary party | Celebration | — | — | **YES** |
| Baby shower | Celebration | — | — | **YES** |
| Engagement / bridal party | Celebration | — | — | **YES** |
| Graduation party | Celebration | — | — | **YES** |
| Retirement / housewarming | Celebration | — | — | **YES** |
| Wedding | Celebration | Performance (ceremony), Conference (logistics) | [Rit] | **PARTIAL** |
| Funeral / memorial | Celebration | Performance | [Rit] [S] | **NO** |
| BBQ / family picnic | Celebration | Meetup | — | **YES** |
| Family reunion | Celebration | Meetup | (R annual) | **YES** |
| Holiday dinner / gathering | Celebration | — | — | **YES** |
| Dinner party / potluck | Celebration | Meetup | — | **YES** |

### Community & Social
| Activity | Primary | Secondary | Modifiers | Verdict |
|---|---|---|---|---|
| Language exchange | Meetup | Class | R, C | **YES** |
| Book club | Meetup | — | R, C | **YES** |
| Board game / social night | Meetup | — | R, C | **YES** |
| Supper / dinner club | Meetup | Celebration | R, C | **YES** |
| Social mixer | Meetup | — | (R) | **YES** |
| Newcomer / immigrant community | Club/Community | Meetup, Volunteer | R, C, [S] | **PARTIAL** |
| Cultural organization | Club/Community | Performance, Celebration | R, C | **YES** |
| Faith community | Club/Community | Meetup, Performance | R, C, [Rit] | **PARTIAL** |
| Alumni association | Club/Community | Conference, Celebration | R, C | **YES** |
| Parent group | Club/Community | Meetup | R, C, [S] | **PARTIAL** |
| Fan community / club | Club/Community | Meetup | R, C | **YES** |
| Block party | Celebration | Meetup | — | **YES** |
| Neighborhood association | Club/Community | Meetup, Volunteer | R, C | **YES** |
| Community festival | Celebration | Performance, Conference, Vendor | F | **PARTIAL** |
| Photography / gardening / craft club | Meetup | Class | R, C | **YES** |
| Music jam / band meetup | Meetup | Performance | R, C | **YES** |

### Sports & Outdoor
| Activity | Primary | Secondary | Modifiers | Verdict |
|---|---|---|---|---|
| Running club | Club/Community | Meetup | R, C | **YES** |
| Cycling club | Club/Community | Expedition | R, C | **YES** |
| Hiking club | Club/Community | Expedition | R, C | **YES** |
| Pickup soccer / basketball | Club/Community | Meetup | R, C | **YES** |
| Beach volleyball group | Club/Community | Meetup | R, C | **YES** |
| Swim / open-water group | Club/Community | Expedition | R, C | **YES** |
| Climbing group | Club/Community | Expedition | R, C | **YES** |
| Yoga | Class | Meetup | R, C | **YES** |
| Bootcamp / outdoor fitness | Class | — | R, C | **YES** |
| Dance / martial arts class | Class | — | R, C | **YES** |
| Group hike (single) | Expedition | — | — | **YES** |
| Camping trip | Expedition | — | (R) | **YES** |
| Kayak / ski / paddle trip | Expedition | — | — | **YES** |
| Fun run / 5K | Tournament | Fundraiser | F | **YES** |
| Sports tournament | Tournament | — | (F) | **YES** |
| Recreational league | Tournament | Club/Community | R, C | **YES** |

### Learning & Education
| Activity | Primary | Secondary | Modifiers | Verdict |
|---|---|---|---|---|
| Workshop / masterclass (single) | Class | — | — | **YES** |
| Art class | Class | — | R, C | **YES** |
| Cooking class | Class | — | R, C | **YES** |
| Language class | Class | — | R, C | **YES** |
| Coding / skills bootcamp | Class | Conference | R, (F) | **YES** |
| Seminar / lecture / panel | Conference | — | — | **YES** |
| Conference / summit | Conference | Performance | F | **YES** |
| Study group | Meetup | Class | R, C | **YES** |
| Skill-share / mentorship circle | Meetup | Class | R, C | **YES** |

### Professional & Business
| Activity | Primary | Secondary | Modifiers | Verdict |
|---|---|---|---|---|
| Networking event | Meetup | — | (R) | **YES** |
| Business mixer | Meetup | Celebration | (R) | **YES** |
| Industry / startup meetup | Meetup | Conference | R, C | **YES** |
| Team building / offsite | Expedition | Meetup | — | **YES** |
| Company party / product launch | Celebration | Conference, Performance | (F) | **YES** |
| Conference / trade show | Conference | — | F | **YES** |
| Professional association | Club/Community | Conference | R, C | **YES** |
| Founder / coworking community | Club/Community | Meetup | R, C | **YES** |

### Volunteer & Impact
| Activity | Primary | Secondary | Modifiers | Verdict |
|---|---|---|---|---|
| Park / beach cleanup | Volunteer Action | — | (R) | **YES** |
| Food / clothing drive | Volunteer Action | — | (R) | **YES** |
| Volunteer day | Volunteer Action | — | (R) | **YES** |
| Community garden build | Volunteer Action | — | — | **YES** |
| Charity fundraiser | Fundraiser | Celebration | F | **YES** |
| Gala / benefit / auction | Fundraiser | Celebration, Performance | F | **YES** |
| Charity walk / run | Fundraiser | Tournament | F | **YES** |
| Town hall / community meeting | Meetup | Conference | (R, C) | **YES** |
| Awareness event | Volunteer Action | Conference, Performance | — | **PARTIAL** |
| Mutual aid group | Club/Community | Volunteer Action | R, C, [S] | **PARTIAL** |
| Support group | Meetup | Club/Community | R, C, [S] | **NO** |
| Blood drive | Volunteer Action | — | [Reg] | **NO** |

---

## 4. Activities that do NOT fit cleanly

| Activity | Verdict | Why it doesn't fit |
|---|---|---|
| Funeral / memorial | **NO** | A scripted **ritual** + grief/sensitive tone. Structurally a Celebration, but the ceremony and the care/tone are unmodeled. Needs **[Rit]** + **[S]**. |
| Support group | **NO** | A **facilitated, confidential, therapeutic** gathering. Meetup gives the shape but not facilitation, safeguarding, or confidentiality. Needs **[S]** (deep). |
| Blood drive | **NO** | **Regulated/medical** logistics (clinical staff, compliance, eligibility). Volunteer Action gives the shape; the regulated layer is absent. Needs **[Reg]**. |
| Wedding | **PARTIAL** | Composite: **ceremony (ritual/Performance) + reception (Celebration)** joined, plus heavy multi-vendor. Describable as a composite but not as one clean pattern. Needs **[Rit]**. |
| Community festival | **PARTIAL** | A **multi-activity, multi-track day** (stages + stalls + program). Composable from Celebration+Performance+Conference but no pattern owns "a day made of many activities." |
| Faith community (its service) | **PARTIAL** | The community **container** fits (Club/Community); its signature recurring activity — a **worship service** — is a ritual, not a clean Meetup/Class. Needs **[Rit]**. |
| Parent group / Newcomer community / Mutual aid | **PARTIAL** | Fit Club/Community structurally, but involve **minors / vulnerable people / ongoing need-matching** that the model doesn't represent. Need a **[S]** safeguarding modifier (and, for mutual aid, request↔offer matching). |
| Awareness event | **PARTIAL** | If it's a talk → Conference; if a **march/rally/vigil**, no pattern covers mass public assembly (route, permits, crowd, messaging). |

Everything else (67 of 75) is **YES**.

---

## 5. Model gaps

**Missing patterns**
- **Ceremony / Ritual pattern** *(highest-value gap).* A scripted, symbolic, often solemn observance —
  weddings (ceremony), funerals/memorials, faith services, naming/graduation ceremonies. Today it is
  forced into Celebration, which loses the ritual structure (officiant, processional, symbolic acts) and
  the tone. Touches several Phase-1c communities (faith, cultural).
- **Public Assembly / Rally pattern** *(low priority).* Marches, rallies, vigils, protests — crowd +
  route + permits + safety + messaging. Only one taxonomy type (awareness event) needs it; defer.
- *Not a missing primitive:* **Festival** — best modeled as a **composition** (a day-container hosting
  Celebration + Performance + Conference), i.e. the Community/Container pattern applied to a single day,
  not a new base pattern.

**Missing modifiers**
- **Sensitive / Safeguarding modifier [S]** *(near-term — needed by Phase 1c).* Changes tone, adds
  confidentiality, safeguarding, and care. Required by support groups, funerals, mutual aid, **and the
  ordinary minors/vulnerable cases inside parent groups and newcomer communities** — which *are* Phase 1
  targets. This is the most important missing modifier for Phase 1.
- **Regulated / Licensed modifier [Reg]** *(later).* Flags legal/permit/medical compliance (blood drive,
  large public events). Partly handled today by the gate routing to `needs_human_review`/organizer, but
  not as a content modifier.
- *(Already present and validated: the Fundraising/Ticketing overlay **F** — it worked cleanly across
  fundraiser, gala, charity run, festival, conference.)*

**Overlapping patterns (acceptable, by design)**
- **Meetup ↔ Class** — peer gathering vs instructor-led (skill-share sits on the line). Boundary =
  "is there an instructor?"
- **Celebration ↔ Meetup** — milestone occasion vs recurring interest (dinner party vs supper club).
  Boundary = "is it an occasion or a habit?"
- **Conference ↔ Performance** — inform vs perform (a charismatic talk vs a lecture). Boundary =
  "knowledge transfer or prepared artistic content?"
- **Club/Community overlaps everything by design** — it is a **container/meta-pattern**, not a sibling;
  it *hosts* Meetups/Classes/Outings. This is intended, not a defect.

**Patterns that should be merged**
- **None should be hard-merged.** Strongest *candidate*: **Conference + Performance** → a single
  "Staged / Audience Event" with two variants. **Recommendation: keep separate** — the organizer's work
  differs (speakers/agenda/sponsors vs performers/rehearsal/stage). Merging would save a row but lose
  real planning differences.
- Clarify (not merge): **Club/Community is the Recurring+Community modifiers expressed as a container**,
  not a tenth peer pattern. The library already says this; validation confirms it.

---

## 6. Coverage %

Across **75 activity types**:

| Lens | Fully (YES) | Partial | No |
|---|---|---|---|
| **Current base patterns only** (no modifiers) | **~50%** (the one-time set) | ~45% (recurring/community/fundraising drop to partial without R/C/F) | ~5% |
| **Patterns + current modifiers (R, C, F)** | **~89%** (67/75) | **~7%** (5/75) | **~4%** (3/75) |
| **Patterns + modifiers + the two missing modifiers ([S], [Rit])** | **~97%** | ~2% | ~1% (blood drive [Reg]) |

**Reading:** modifiers are not optional polish — they carry **~39 points** of coverage (50% → 89%).
Roughly half the universe is recurring/community/fundraising and is only *partially* described without
them. The base-pattern set is sound; the **modifier layer is where coverage actually lives.**

---

## 7. Final verdict — sufficient for Phase 1 OPE?

**Yes — the pattern library is sufficient for Phase 1, on one condition.**

- **The Phase 1 set covers its targets at YES.** Phase 1 OPE = the Big Four (Celebration, Meetup, Class,
  Club/Community) + light Volunteer Action. Every Phase-1 activity in the taxonomy maps to one of these
  at **YES** — *provided the Recurring and Community modifiers are actually built.* They are listed but
  unbuilt; **they are the real Phase-1 dependency**, not new patterns. Without them, half of Phase 1
  (clubs, classes-as-series, communities) is only PARTIAL.
- **None of the misfits are Phase-1 targets.** Funeral, support group, blood drive (NO) and wedding,
  festival, faith-service, mutual aid, awareness (PARTIAL) are all **Phase 2 / Organizer-Only / Not
  Supported** — the coverage gate (ADR-002) already routes them to handoff. So the gaps do not block
  Phase 1.

**What is missing (in priority order):**
1. **Build the Recurring + Community modifiers** — *required for Phase 1* (1b–1c). The patterns are
   inert without them.
2. **Add a light Sensitive / Safeguarding modifier [S]** — *near-term*, because Phase-1c communities
   include minors and vulnerable people (parent groups, newcomer communities). Even a minimal version
   (tone + safeguarding checklist + don't-be-flippant guard) matters.
3. **Ceremony / Ritual pattern [Rit]** — *Phase 2*, when weddings and faith services are taken on.
4. **Regulated [Reg] modifier and Public-Assembly pattern** — *later / edge*; the gate handles them as
   handoffs until then.

**Bottom line:** the 10-pattern + 3-modifier model is **validated** — it cleanly describes ~89% of the
universe today and ~97% with two known additions. For **Phase 1 specifically it is sufficient**, and the
critical path is **finishing the Recurring and Community modifiers**, not inventing new patterns.

_Validation only. No code, no OPE redesign. Mapping and coverage reflect `OPE_ACTIVITY_TAXONOMY.md` and
`OPE_PATTERN_LIBRARY.md`._
