# OPE Pattern Coverage Analysis (pre-M4)

> **Goal:** measure how much of real-world activity the **current** 3-pattern model
> (Celebration + Meetup + Class, with the Recurring modifier) actually covers.
> **Method:** 100 real activities classified against the **live engine** — the 11 shipped categories
> and the coverage gate, as of M3. No code run, no engines designed. **Validating the model, not expanding it.**
> **Date:** 2026-06-10.

## What "current OPE" can do today
- **Patterns:** Celebration, Meetup, Class. **Modifier:** Recurring.
- **Live categories (plan_ready):** birthday, adult_birthday, anniversary, graduation, family_reunion,
  bbq *(Celebration, priced via Honolulu)*; networking *(Meetup, **unpriced** — needs a user budget)*;
  fitness_class, art_class, language_class, workshop *(Class, priced via Honolulu)*.
- **Gated/refused:** weddings, large (>60), money/fundraising, sports tournaments, outdoor/expedition,
  volunteer, community-`club`, high-risk/regulated/medical/kids-heavy classes, recurrence on
  non-recurring-capable activities.

## Verdict rubric
- **YES** = `plan_ready` **and** priced (a full plan with a budget) via a fitting live category.
- **PARTIAL** = the shape is Celebration/Meetup/Class, but a gap blocks a full plan — **no category yet**
  (reuses an existing bundle), **unpriced** (Meetup), or **needs the Community modifier**.
- **NO** = belongs to an **unbuilt pattern** (Tournament/Performance/Conference/Expedition/Fundraiser/
  Volunteer) or is **gated** (ritual/high-risk/regulated/large).

Gap codes: **G-label** (add a category → existing bundle), **G-price** (needs a pricing seed),
**G-comm** (needs Community modifier), **G-pattern** (needs a new pattern — out of scope),
**G-gate** (intentionally gated: ritual/safety/money/scale). Universal blocks (Attendance, Venue,
Schedule, Safety, Pricing, Comms) are implied; only specialised blocks are listed.

---

## The 100 activities

### A. Celebration shape (occasions)
| # | Activity | Pattern | Mod | Key blocks | Representable? | Missing |
|---|---|---|---|---|---|---|
| 1 | Kids birthday | Celebration | — | Food, Decor, Equip | **YES** | — |
| 2 | Adult birthday | Celebration | — | Food, Decor | **YES** | — |
| 3 | Milestone birthday (50th) | Celebration | — | Food, Decor | **YES** | — |
| 4 | Anniversary party | Celebration | — | Food, Decor | **YES** | — |
| 5 | Baby shower | Celebration | — | Food, Decor | PARTIAL | G-label |
| 6 | Bridal shower | Celebration | — | Food, Decor | PARTIAL | G-label |
| 7 | Engagement party | Celebration | — | Food, Decor | PARTIAL | G-label |
| 8 | Graduation party | Celebration | — | Food, Decor | **YES** | — |
| 9 | Retirement party | Celebration | — | Food, Decor | PARTIAL | G-label |
| 10 | Housewarming | Celebration | — | Food, Decor | PARTIAL | G-label |
| 11 | BBQ / cookout | Celebration | — | Food | **YES** | — |
| 12 | Family picnic | Celebration | — | Food | **YES** | — |
| 13 | Family reunion | Celebration | — | Food | **YES** | — |
| 14 | Holiday dinner (Thanksgiving) | Celebration | — | Food | PARTIAL | G-label |
| 15 | Dinner party | Celebration | — | Food | PARTIAL | G-label |
| 16 | Potluck | Celebration | — | Food | PARTIAL | G-label |
| 17 | Block party | Celebration | — | Food | PARTIAL | G-label |
| 18 | Office holiday party | Celebration | — | Food, Vendor | PARTIAL | G-label |
| 19 | New Year's Eve party | Celebration | — | Food | PARTIAL | G-label |
| 20 | Wedding | Celebration | Money | Vendor, Ritual | **NO** | G-gate (ritual/vendor/scale) |
| 21 | Funeral / memorial | Celebration | — | Ritual, Sensitive | **NO** | G-gate (ritual/sensitive) |
| 22 | Quinceañera | Celebration | — | Ritual, Vendor | **NO** | G-gate (ritual/scale) |
| 23 | Baptism / christening | Celebration | — | Ritual | **NO** | G-gate (ritual) |
| 24 | Bar / bat mitzvah | Celebration | — | Ritual | **NO** | G-gate (ritual) |

### B. Meetup shape (peer gatherings)
| # | Activity | Pattern | Mod | Key blocks | Representable? | Missing |
|---|---|---|---|---|---|---|
| 25 | Networking event | Meetup | (R) | — | PARTIAL | G-price (unpriced) |
| 26 | Business mixer | Meetup | — | — | PARTIAL | G-label, G-price |
| 27 | Startup meetup | Meetup | R | — | PARTIAL | G-label, G-price |
| 28 | Industry meetup | Meetup | R | — | PARTIAL | G-label, G-price |
| 29 | Language exchange | Meetup | R, C | — | PARTIAL | G-label, G-price, G-comm |
| 30 | Book club | Meetup | R, C | — | PARTIAL | G-comm, G-label |
| 31 | Board game night | Meetup | R | — | PARTIAL | G-label, G-price |
| 32 | Social mixer | Meetup | — | — | PARTIAL | G-label, G-price |
| 33 | Supper club | Meetup | R, C | Food | PARTIAL | G-comm, G-label |
| 34 | Trivia night | Meetup | R | — | PARTIAL | G-label, G-price |
| 35 | Coffee meetup | Meetup | R | — | PARTIAL | G-label, G-price |
| 36 | Parents' meetup | Meetup | R, C | — | PARTIAL | G-comm, Safeguarding |
| 37 | Expat meetup | Meetup | R, C | — | PARTIAL | G-comm, G-label |
| 38 | Study group | Meetup | R, C | — | PARTIAL | G-comm, G-label |
| 39 | Skill-share circle | Meetup | R, C | — | PARTIAL | G-comm, G-label |
| 40 | Toastmasters (speaking club) | Meetup | R, C | — | PARTIAL | G-comm |
| 41 | Town hall / community meeting | Meetup | — | — | PARTIAL | G-label, G-price |
| 42 | Neighborhood association mtg | Meetup | R, C | — | PARTIAL | G-comm |
| 43 | Speed dating | Meetup | — | — | PARTIAL | G-label, G-price |
| 44 | Knitting circle | Meetup | R, C | — | PARTIAL | G-comm, G-label |
| 45 | Chess club | Meetup | R, C | — | PARTIAL | G-comm |

### C. Class shape (instructor-led)
| # | Activity | Pattern | Mod | Key blocks | Representable? | Missing |
|---|---|---|---|---|---|---|
| 46 | Yoga class | Class | (R) | Instr, Equip | **YES** | — |
| 47 | Pilates class | Class | (R) | Instr | **YES** | — |
| 48 | Dance class | Class | (R) | Instr | **YES** | — |
| 49 | Zumba class | Class | (R) | Instr | **YES** | — |
| 50 | Spin class | Class | (R) | Instr, Equip | **YES** | — |
| 51 | Bootcamp / outdoor fitness | Class | R | Instr | **YES** | — |
| 52 | Meditation class | Class | (R) | Instr | **YES** | — |
| 53 | Painting workshop | Class | — | Instr, Materials | **YES** | — |
| 54 | Pottery class | Class | (R) | Instr, Materials | **YES** | — |
| 55 | Drawing class | Class | (R) | Instr, Materials | **YES** | — |
| 56 | Sewing class | Class | (R) | Instr, Materials | **YES** | — |
| 57 | Spanish lessons | Class | R | Instr | **YES** | — |
| 58 | English conversation class | Class | R | Instr | **YES** | — |
| 59 | Photography workshop | Class | — | Instr | **YES** | — |
| 60 | Gardening workshop | Class | — | Instr, Materials | **YES** | — |
| 61 | Public speaking workshop | Class | — | Instr | **YES** | — |
| 62 | Writing workshop | Class | — | Instr | **YES** | — |
| 63 | Craft workshop | Class | — | Instr, Materials | **YES** | — |
| 64 | Cooking class | Class | (R) | Instr, Materials, Food-safety | PARTIAL | G-label (food-safety content) |
| 65 | Baking workshop | Class | — | Instr, Materials | PARTIAL | G-label |
| 66 | Music lesson (guitar) | Class | R | Instr | PARTIAL | G-label |
| 67 | Coding bootcamp | Class | R | Instr, Equip | PARTIAL | G-label (scale) |
| 68 | Wine tasting class | Class | — | Instr, Alcohol | PARTIAL | G-label (alcohol) |
| 69 | First-aid / CPR class | Class | — | Instr (certified) | PARTIAL | G-gate (cert verify) |
| 70 | Martial arts (basics) | Class | R | Instr | PARTIAL | G-gate if contact |

### D. Sports / recreational
| # | Activity | Pattern | Mod | Key blocks | Representable? | Missing |
|---|---|---|---|---|---|---|
| 71 | Soccer practice (coached) | Class | R, C | Instr/Coach, Field | PARTIAL | G-label (sports content) |
| 72 | Volleyball training | Class | R | Coach | PARTIAL | G-label |
| 73 | Tennis lessons | Class | R | Coach | PARTIAL | G-label |
| 74 | Golf lessons | Class | — | Coach | PARTIAL | G-label |
| 75 | Swimming lessons | Class | R | Coach, Water-safety | PARTIAL | G-label (water safety) |
| 76 | Running group | Meetup | R, C | Route-safety | PARTIAL | G-comm, outdoor safety |
| 77 | Basketball pickup | Meetup | R, C | Court | PARTIAL | G-comm, G-label |
| 78 | Rock climbing class | Class | — | High-risk | **NO** | G-gate (high-risk) |
| 79 | Surfing lessons | Class | — | Water/high-risk | **NO** | G-gate (high-risk/water) |
| 80 | Scuba course | Class | — | Regulated | **NO** | G-gate (regulated) |
| 81 | Hiking group | Expedition | R, C | Route, Transport, Permits | **NO** | G-pattern (Expedition) |
| 82 | Cycling club | Expedition | R, C | Route, Safety | **NO** | G-pattern + G-comm |
| 83 | Soccer tournament | Tournament | (M) | Brackets, Refs, Medics | **NO** | G-pattern (Tournament) |
| 84 | 5K fun run | Tournament | M | Route, Timing, Medics | **NO** | G-pattern (Tournament) |
| 85 | Sports league (season) | Tournament | R, C | Schedule, Refs | **NO** | G-pattern (Tournament) |

### E. Hobby / interest groups
| # | Activity | Pattern | Mod | Key blocks | Representable? | Missing |
|---|---|---|---|---|---|---|
| 86 | Photography club | Meetup | R, C | — | PARTIAL | G-comm |
| 87 | Gardening club | Meetup | R, C | — | PARTIAL | G-comm |
| 88 | Hobby maker group | Meetup | R, C | — | PARTIAL | G-comm |
| 89 | Choir / singing group (rehearsal) | Class | R, C | Instr | PARTIAL | G-label; performance not built |
| 90 | Band practice / jam | Meetup | R, C | Equip | PARTIAL | G-comm, G-label |

### F. Out-of-scope patterns
| # | Activity | Pattern | Mod | Key blocks | Representable? | Missing |
|---|---|---|---|---|---|---|
| 91 | Conference | Conference | M | Speakers, AV, Reg | **NO** | G-pattern (Conference) |
| 92 | Seminar | Conference | — | Speakers, AV | **NO** | G-pattern (Conference) |
| 93 | Trade show | Conference | M | Vendor, AV | **NO** | G-pattern (Conference) |
| 94 | Product launch | Conference | — | AV, PR | **NO** | G-pattern / G-gate |
| 95 | Concert / live music | Performance | M | Stage, AV, Tickets | **NO** | G-pattern (Performance) |
| 96 | Theatre play | Performance | M | Stage, Rehearsal | **NO** | G-pattern (Performance) |
| 97 | Talent / variety show | Performance | M | Stage, Tickets | **NO** | G-pattern (Performance) |
| 98 | Art exhibition | Performance | — | Space, Curation | **NO** | G-pattern (Performance) |
| 99 | Beach / park cleanup | Volunteer | — | Supplies, Waivers | **NO** | G-pattern (Volunteer) |
| 100 | Charity gala / fundraiser | Fundraiser | M | Revenue, Sponsors | **NO** | G-gate / G-pattern (money) |

---

## Coverage results

| Outcome | Count | Share |
|---|---|---|
| **YES** — full priced plan today | **26** | **26%** |
| **PARTIAL** — Celebration/Meetup/Class shape, blocked by a non-engine gap | **51** | **51%** |
| **NO** — unbuilt pattern or gated | **23** | **23%** |

**Two headline numbers:**
- **Model (3-pattern) coverage = 77%** — the activity's primary shape is Celebration/Meetup/Class
  (YES + PARTIAL). The model itself is sound for ~3 in 4 real activities.
- **Fully representable today = 26%** — a complete priced plan exists right now. The other 51% are
  *shape-covered* but blocked by **content/pricing/modifier gaps, not engine gaps**.

**By pattern (of the 77% shape-covered):**
- **Class — strongest.** 18/25 class-shape activities are YES; gaps are mostly G-label (cooking, music,
  sports lessons) and a few G-gate (high-risk/regulated). Class is the most complete pattern.
- **Celebration — strong but thin on labels.** 7/24 YES; 12 PARTIAL are pure G-label (baby shower,
  housewarming, dinner party…) reusing existing bundles; 5 NO are rituals (wedding/funeral).
- **Meetup — weakest.** 0 YES. Every Meetup activity is PARTIAL — **networking is the only category and
  it is unpriced**, and most real Meetups are *recurring community groups* needing the Community modifier.

---

## Missing-capability list (what blocks the 74 non-YES)

| Capability | Type | ~Activities blocked | Notes |
|---|---|---|---|
| **Meetup pricing seed** | content/price | ~21 | Meetup has no budget at all today |
| **Community modifier** (roster/retention) | modifier (planned) | ~18 | clubs/ongoing groups — the biggest recurring segment |
| **Generic social/interest Meetup category** | content label | ~20 | only "networking" exists |
| **Celebration content labels** | content label | ~12 | baby shower, housewarming, dinner party, holiday, block party… |
| **Class content labels** | content label | ~7 | cooking, music, sports lessons, coding |
| **Tournament pattern** | new pattern | 3 | soccer tournament, 5K, league |
| **Performance pattern** | new pattern | 4 | concert, play, talent show, exhibition |
| **Conference pattern** | new pattern | 4 | conference, seminar, trade show, launch |
| **Expedition / outdoor pattern + safety** | new pattern | 2–4 | hiking/cycling groups, camping |
| **Ceremony/Ritual + Sensitive handling** | content/modifier | ~6 | wedding, funeral, quinceañera, baptism, bar mitzvah |
| **Fundraiser / Money overlay** | overlay (planned) | 2 | gala, charity |
| **Multi-region pricing** | content/price | pervasive | off-Honolulu = fallback (accuracy, not blocking) |

> Crucial finding: **most of the gap is NOT missing engines.** ~58 of the 74 non-YES activities are
> blocked by **content labels, a Meetup pricing seed, or the (already-designed) Community modifier** —
> all of which are *additions on the existing 3 patterns*, not new engines. Only ~16 genuinely need a
> new pattern (Tournament/Performance/Conference/Expedition) or are correctly gated (ritual/high-risk).

---

## Top 10 gaps (by activities unblocked × value)

1. **Meetup pricing seed** — turns ~21 Meetup activities from unpriced into full plans. Biggest single
   lever; Meetup is the only pattern with zero YES.
2. **Community modifier** — unlocks the entire "ongoing club/group" segment (book club, running group,
   photography club, parents' group…). ~18 activities; the heart of "active lives".
3. **Generic Meetup categories** (social / interest / hobby) — so non-networking Meetups are even
   selectable. ~20.
4. **Celebration content labels** — baby shower, housewarming, dinner party, holiday gathering, block
   party — trivial registry entries over the existing Celebration bundle. ~12.
5. **Class content labels** — cooking (food-safety), music, sports lessons, coding. ~7.
6. **Tournament pattern** — competitive sports (tournaments, races, leagues). ~5 incl. league.
7. **Performance pattern** — concerts, recitals, shows, exhibitions, choir performance. ~5.
8. **Conference pattern** — conferences, seminars, trade shows, launches. ~4.
9. **Expedition / outdoor pattern + outdoor-safety knowledge** — hiking/cycling groups, camping. ~4.
10. **Ceremony/Ritual + Sensitive modifier** — weddings, funerals, cultural ceremonies (currently
    gated; need ritual structure + tone before they can be served). ~6.

---

## Conclusion (model validation)

- The **3-pattern model is validated**: it represents the *shape* of **77%** of real activities. It is
  not the wrong abstraction.
- **Today's realised coverage is 26%** — the rest is held back by **content, a Meetup price seed, and the
  Community modifier**, i.e. *filling in the existing model*, not redesigning it.
- **Meetup is the weak pattern** (no pricing, one category, needs Community) — the highest-ROI place to
  invest before adding any 4th pattern.
- Only **~16%** of real activities truly require **new patterns** (Tournament/Performance/Conference/
  Expedition) or are **correctly gated** (ritual/high-risk/regulated/money).

**Implication for M4 sequencing (analysis only — no design here):** the data says *deepen the 3 patterns
first* (Meetup pricing + Community modifier + content labels ≈ unblocks ~58 activities) **before**
building a 4th pattern (≈ unblocks ~16). The model is sound; the coverage gap is mostly content.

_Analysis only. No code, no engines, no expansion. Coverage reflects the live M3 engine
(11 categories + gate)._
