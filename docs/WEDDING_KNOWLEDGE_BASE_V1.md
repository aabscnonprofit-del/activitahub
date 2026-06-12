# Wedding Knowledge Base v1 — OPE™

> **Category:** `wedding` (maps to `activity_category`)
> **Status:** content draft for OPE Knowledge Base v1 · **Date:** 2026-06-04
> **Source of truth:** `docs/MASTER_PRODUCT_DECISIONS.md`, `docs/OPE_V1_TECHNICAL_DESIGN.md`
> **Audience:** OPE planner workflow (§6) + cost engine (§7). This is an **internal**
> knowledge base, never a user-facing catalog (per Master Decisions §9).
> **Serves:** both **beginner** organizers (need the full checklist + the "why") and
> **experienced** organizers (need the edge cases, dependencies, and risk model).

This document is the human-authored source for the wedding entries that will be loaded
into `knowledge_entries` (and the cost references into `knowledge_pricing`). It follows
the OPE structure: **Phases → Tasks → Resources → Risks → Cost Drivers**. Section 7
specifies exactly how each block maps to the `knowledge_entries` schema for import.

Conventions used throughout:
- **IDs:** `T###` tasks, `R###` resources, `RK###` risks, `CD###` cost drivers,
  `P#` phases. IDs are stable handles for dependencies and import keys.
- **Priority:** `high` (do-or-the-wedding-breaks) · `medium` (quality/experience) ·
  `low` (nice-to-have / polish).
- **Severity / Probability:** `high | medium | low`.
- **cost_basis:** `flat | per_guest | per_hour | per_unit` (per OPE §3.1).

---

## 1. Phases (timeline)

Wedding planning is modeled as 10 ordered phases. Phase keys are used as the `phase`
field on every task and as the `timeline` entry for the category.

| Key | Phase | Typical window | Goal |
|---|---|---|---|
| `P1` | Foundations & Vision | 12+ months out | Vision, budget envelope, date, guest-count range, scope |
| `P2` | Budget & Core Vendors | 9–12 months | Lock venue + the highest-demand vendors; sign contracts |
| `P3` | Design & Details | 6–9 months | Style, décor, attire, stationery, menu direction |
| `P4` | Guest & Logistics | 4–6 months | Guest list, invitations, transport, accommodation, layout |
| `P5` | Confirmations & Fittings | 2–4 months | Confirm all vendors, fittings, menu tasting, timeline draft |
| `P6` | Finalization | 4–6 weeks | Final numbers, payments, seating, run-of-show, contingencies |
| `P7` | Final Week | 7 days out | Confirm headcount, brief vendors, assemble kits, rehearse comms |
| `P8` | Day-Before / Rehearsal | 1 day out | Rehearsal, setup, deliveries, handover of items |
| `P9` | Wedding Day | day-of | Execute setup → ceremony → reception → teardown |
| `P10` | Post-Wedding / Wrap-up | +1 to +30 days | Returns, payments, reviews, archive, follow-up |

> **Beginner note:** phases are sequential but overlap in practice — P2 contracts can
> stretch into P3. Use phase order for *dependency sanity*, not as hard gates.
> **Experienced note:** for short-lead weddings (< 4 months) collapse P1–P3 into an
> intensive intake sprint; the dependency graph (not the calendar) is what protects you.

---

## 2. Tasks

Each task: `id · phase · priority · deps · Title — detail`.
`deps` lists task IDs that should complete first (`—` = none).

### P1 — Foundations & Vision

- **T001** · P1 · high · deps: — · **Initial client consultation** — meet the couple,
  capture vision, story, must-haves, hard no's, cultural/religious requirements, and
  decision-makers (who signs off).
- **T002** · P1 · high · deps: T001 · **Define guest-count range** — agree a min/likely/max
  headcount; nearly every cost and logistics decision scales from this.
- **T003** · P1 · high · deps: T001 · **Establish budget envelope** — total budget,
  priorities (what's worth overspending on), and a hard ceiling; flag funding sources.
- **T004** · P1 · high · deps: T002, T003 · **Draft budget allocation** — split the envelope
  across categories (venue, catering, photo, décor, attire, contingency 10–15%).
- **T005** · P1 · high · deps: T001 · **Choose target date / date range** — consider season,
  venue availability, guest travel, religious dates, and weather risk (see RK001).
- **T006** · P1 · medium · deps: T001 · **Define wedding style & theme** — formality level,
  palette, mood; produce a short creative brief / moodboard to align vendors later.
- **T007** · P1 · high · deps: T002, T005 · **Shortlist candidate venues** — match capacity,
  style, location, indoor/outdoor, and date availability; 3–5 options.
- **T008** · P1 · medium · deps: T001 · **Identify ceremony type** — civil, religious, or
  symbolic; this drives officiant, documents, and venue rules.
- **T009** · P1 · medium · deps: T001 · **Confirm legal requirements** — marriage license,
  residency/notice periods, documents, and who lodges them (region-specific).
- **T010** · P1 · low · deps: T006 · **Agree communication plan** — cadence, channels,
  single point of contact, and approval workflow with the couple.
- **T011** · P1 · medium · deps: T004 · **Set up planning workspace** — shared budget tracker,
  vendor list, document store, and master timeline skeleton.
- **T012** · P1 · low · deps: T001 · **Capture accessibility & dietary baseline** — known
  mobility, medical, allergy, and dietary needs to carry through every later decision.

### P2 — Budget & Core Vendors

- **T013** · P2 · high · deps: T007 · **Tour shortlisted venues** — verify real capacity,
  power, kitchen, restrooms, noise curfew, parking, wet-weather backup, and access times.
- **T014** · P2 · high · deps: T013, T005 · **Book venue & sign contract** — confirm date,
  hours, deposit, cancellation terms, vendor restrictions, and liability/insurance clauses.
- **T015** · P2 · high · deps: T014 · **Book caterer** — cuisine direction, service style,
  per-head pricing, staffing, dietary handling; align with venue's in-house/preferred rules.
- **T016** · P2 · high · deps: T014, T005 · **Book photographer** — style fit, coverage hours,
  deliverables, second shooter, and backup-gear policy.
- **T017** · P2 · high · deps: T014, T005 · **Book videographer** — if in scope; align coverage
  windows and shot priorities with the photographer to avoid conflicts.
- **T018** · P2 · high · deps: T008, T014 · **Secure officiant / celebrant** — confirm
  availability, ceremony script process, and any rehearsal requirement.
- **T019** · P2 · high · deps: T014 · **Book primary entertainment** — band or DJ; confirm
  power, space, sound limits, and set lengths.
- **T020** · P2 · medium · deps: T014, T006 · **Book florist** — style brief, ceremony +
  reception coverage, seasonal availability of key flowers (see RK013).
- **T021** · P2 · medium · deps: T006 · **Book attire vendors** — wedding dress/suit with
  enough lead time for ordering + alterations (see RK009).
- **T022** · P2 · medium · deps: T014 · **Book cake / dessert vendor** — flavors, size for
  headcount, dietary versions, delivery + setup logistics.
- **T023** · P2 · medium · deps: T014 · **Arrange rentals** — tables, chairs, linens, tableware,
  lighting, tenting if outdoor; reconcile with venue inventory to avoid double-paying.
- **T024** · P2 · medium · deps: T014 · **Plan ceremony + reception layout (v1)** — flow,
  capacity, stage/dancefloor, accessibility routes; validate against venue floor plan.
- **T025** · P2 · high · deps: T004, T014, T015 · **Update budget with signed costs** — replace
  estimates with contracted figures; re-check the contingency line.
- **T026** · P2 · high · deps: T014 · **Verify vendor insurance & licensing** — liability
  cover, alcohol license for bar service, and any venue-required certificates (see RK006).
- **T027** · P2 · medium · deps: T014 · **Confirm date with all booked vendors** — single
  source-of-truth date/time doc to prevent mismatched bookings.

### P3 — Design & Details

- **T028** · P3 · medium · deps: T006, T020 · **Finalize design concept** — palette, florals,
  table styling, signage, and lighting design into one cohesive look book.
- **T029** · P3 · medium · deps: T015 · **Design menu & service style** — courses, canapés,
  late-night food, kids' meals; confirm plated vs buffet vs family-style.
- **T030** · P3 · medium · deps: T015 · **Plan bar & beverages** — open/cash/limited bar,
  signature drinks, corkage, non-alcoholic options, and staffing ratio.
- **T031** · P3 · medium · deps: T006 · **Order stationery suite** — save-the-dates,
  invitations, RSVPs, menus, place cards, signage; align with theme.
- **T032** · P3 · high · deps: T031 · **Send save-the-dates** — especially for destination or
  peak-season weddings so guests can plan travel.
- **T033** · P3 · medium · deps: T021 · **First attire fitting** — dress/suit fitting and
  alteration plan; lock accessories and shoes.
- **T034** · P3 · medium · deps: T006 · **Book hair & makeup** — trial session scheduled;
  confirm number of people and on-site vs salon.
- **T035** · P3 · low · deps: T028 · **Plan décor build & install** — who installs what, in
  what order, and teardown ownership; flag heavy/rigging items.
- **T036** · P3 · medium · deps: T019 · **Draft music plan** — ceremony processional, key
  reception moments (first dance, speeches, cake), and do-not-play list.
- **T037** · P3 · medium · deps: T024 · **Plan ceremony details** — readings, vows, music cues,
  unity ritual, seating for family, and accessibility front-row needs.
- **T038** · P3 · low · deps: T002 · **Plan favors & guest extras** — welcome bags, favors,
  kids' activity packs; keep scoped to budget.
- **T039** · P3 · medium · deps: T016, T017 · **Build shot list & coverage plan** — must-have
  photos, family-group list, and golden-hour timing alignment.
- **T040** · P3 · low · deps: T006 · **Plan photo/social moments** — photo backdrop, guestbook
  alternative, hashtag/QR, and an unplugged-ceremony decision.

### P4 — Guest & Logistics

- **T041** · P4 · high · deps: T002 · **Finalize guest list** — names, contacts, plus-ones,
  kids count; this converts the range (T002) into a working number.
- **T042** · P4 · high · deps: T031, T041 · **Send invitations** — with RSVP deadline, menu
  choices, dietary capture, and travel/accommodation info.
- **T043** · P4 · high · deps: T042 · **Set up RSVP tracking** — single tracker for attendance,
  meal choice, allergies, and song requests.
- **T044** · P4 · medium · deps: T041 · **Arrange guest accommodation** — room blocks /
  recommendations near venue; note for destination weddings (see RK015).
- **T045** · P4 · medium · deps: T014, T041 · **Plan guest transport** — shuttles between
  ceremony/reception/hotels; parking and accessibility drop-off.
- **T046** · P4 · medium · deps: T014 · **Plan couple & VIP transport** — arrival car, timing,
  and backup driver; align with photo timeline.
- **T047** · P4 · high · deps: T024, T041 · **Refine floor plan & capacity** — confirm the
  layout holds the actual guest number with service + dancefloor space.
- **T048** · P4 · medium · deps: T037 · **Plan ceremony rehearsal** — set date/time, who must
  attend, and what is walked through.
- **T049** · P4 · medium · deps: T015, T030 · **Plan staffing levels** — service, bar, coat
  check, security; ratios driven by headcount and service style (see R-staffing).
- **T050** · P4 · low · deps: T041 · **Plan children & accessibility provisions** — kids'
  area/meals, wheelchair access, hearing/visual accommodations, quiet space.
- **T051** · P4 · medium · deps: T005, T013 · **Decide wet-weather / backup plan** — covered
  alternative for outdoor elements; trigger criteria and decision deadline (see RK001).
- **T052** · P4 · low · deps: T042 · **Plan out-of-town welcome** — welcome event, maps, local
  tips; optional but high-impact for destination guests.

### P5 — Confirmations & Fittings

- **T053** · P5 · high · deps: T015 · **Menu tasting** — confirm dishes, portion sizes,
  presentation, and final dietary variants.
- **T054** · P5 · high · deps: T033 · **Second / final attire fitting** — confirm fit, steaming,
  and pickup/delivery date.
- **T055** · P5 · high · deps: all P2 vendors · **Re-confirm every vendor** — date, times,
  arrival, contact, deliverables, and balance-due schedule.
- **T056** · P5 · high · deps: T043 · **Chase outstanding RSVPs** — contact non-responders
  before the catering deadline to firm up numbers.
- **T057** · P5 · medium · deps: T034 · **Hair & makeup trial** — lock the look and the day-of
  schedule per person.
- **T058** · P5 · high · deps: T047, T055 · **Draft run-of-show (timeline)** — minute-by-minute
  day plan with vendor arrival/setup windows and key moments.
- **T059** · P5 · medium · deps: T036 · **Finalize music & cues** — confirm playlists, live
  set times, and announcements with DJ/band and MC.
- **T060** · P5 · medium · deps: T037 · **Finalize ceremony script** — readings, vows, ritual,
  and who does what; share with officiant.
- **T061** · P5 · medium · deps: T028 · **Confirm décor & rental counts** — reconcile final
  guest number against linens, place settings, chairs, and centerpieces.
- **T062** · P5 · low · deps: T031, T041 · **Order day-of stationery** — final menus, place
  cards, table numbers, signage based on confirmed list.
- **T063** · P5 · medium · deps: T025, T055 · **Schedule vendor balance payments** — calendar
  of due dates with amounts and methods (see RK004).

### P6 — Finalization

- **T064** · P6 · high · deps: T056 · **Lock final headcount** — submit guaranteed numbers to
  caterer/venue by their deadline; this fixes most variable costs.
- **T065** · P6 · high · deps: T064 · **Finalize catering numbers & dietary list** — exact
  counts per menu + allergy/medical notes to the kitchen.
- **T066** · P6 · high · deps: T064, T047 · **Finalize seating plan** — table assignments,
  head table, accessibility seating, and conflict avoidance.
- **T067** · P6 · high · deps: T058 · **Distribute run-of-show to all vendors** — single shared
  timeline + contact sheet so everyone arrives and acts on cue.
- **T068** · P6 · high · deps: T063 · **Complete final vendor payments** — clear balances per
  schedule; keep receipts; confirm nothing outstanding (see RK004).
- **T069** · P6 · medium · deps: T066, T062 · **Produce printed collateral** — seating chart,
  place cards, menus, signage; proof carefully for name errors.
- **T070** · P6 · high · deps: T067 · **Build contingency plan & decision tree** — weather,
  no-show vendor, late delivery, medical, power loss; assign who decides what.
- **T071** · P6 · high · deps: T067 · **Assemble vendor contact sheet** — every vendor's name,
  mobile, arrival time, and on-site contact; printed + shared digitally.
- **T072** · P6 · medium · deps: T058 · **Brief the wedding-day team** — roles, radios/phones,
  emergency contacts, and escalation path.
- **T073** · P6 · medium · deps: T070 · **Prepare emergency kit list** — sewing kit, stain
  remover, meds, chargers, tape, scissors, umbrellas, snacks (see R048).
- **T074** · P6 · low · deps: T064 · **Confirm transport schedule** — final pickup times and
  manifests for shuttles and VIP cars.
- **T075** · P6 · medium · deps: T055 · **Confirm setup & teardown access** — load-in times,
  dock/lift access, and end-of-night removal deadline with the venue.
- **T076** · P6 · low · deps: T064 · **Plan leftovers, gifts & valuables handling** — who takes
  cake, gifts, cards, and rented/personal items at the end of night.
- **T077** · P6 · medium · deps: T070 · **Confirm insurance & permits in hand** — event/liability
  cover, alcohol, noise, fireworks/sparkler, and street/parking permits (see RK006, RK011).

### P7 — Final Week

- **T078** · P7 · high · deps: T064 · **Reconfirm headcount & any last changes** — capture
  late cancellations/additions and notify catering if still possible.
- **T079** · P7 · high · deps: T067 · **Final vendor confirmation calls** — verify arrival
  times, contacts, and special instructions one last time.
- **T080** · P7 · high · deps: T058 · **Walk the venue & finalize setup map** — mark table
  positions, power, staging, and signage placement.
- **T081** · P7 · medium · deps: T073 · **Assemble emergency & day-of kits** — pack and label;
  assign who carries each kit.
- **T082** · P7 · medium · deps: T069 · **Collect & sort all printed items** — place cards,
  menus, signage grouped by location/table for fast setup.
- **T083** · P7 · medium · deps: T057 · **Confirm hair & makeup schedule** — per-person times,
  location, and parking for the stylist.
- **T084** · P7 · medium · deps: T046, T074 · **Confirm couple + VIP logistics** — wake/ready
  times, transport, and buffer for photos.
- **T085** · P7 · low · deps: T076 · **Brief family/wedding party on roles** — who gives
  speeches, holds rings, manages gifts, and is an emergency contact.
- **T086** · P7 · medium · deps: T065 · **Send final dietary/allergy sheet to kitchen** — and
  to front-of-house so flagged meals reach the right seats.
- **T087** · P7 · high · deps: T070 · **Check weather forecast & trigger backup if needed** —
  apply the wet-weather decision rule before the no-return deadline (see RK001).

### P8 — Day-Before / Rehearsal

- **T088** · P8 · high · deps: T048 · **Run ceremony rehearsal** — walk processional, positions,
  cues, and timing with the party and officiant.
- **T089** · P8 · high · deps: T080 · **Confirm/begin venue setup** — verify deliveries, rental
  drop-offs, and that the space matches the setup map.
- **T090** · P8 · medium · deps: T089 · **Receive & check key deliveries** — flowers (next-day
  for freshness), cake timing, rentals, and signage; reconcile against orders.
- **T091** · P8 · medium · deps: T082 · **Place non-perishable décor & stationery** — table
  numbers, signage, favors set the night before where venue allows.
- **T092** · P8 · medium · deps: T054 · **Final attire check** — steam, accessories, and
  emergency tailoring; lay out for the morning.
- **T093** · P8 · low · deps: T085 · **Distribute timeline & kits to key people** — printed
  run-of-show and contact sheet to the day-of team and party.
- **T094** · P8 · medium · deps: T071 · **Verify vendor arrival windows for tomorrow** — quick
  confirm; resolve any delivery-window clashes at the dock.
- **T095** · P8 · low · deps: — · **Couple wind-down & rest reminder** — protect sleep and
  hydration; a calm couple is part of a smooth day.

### P9 — Wedding Day

- **T096** · P9 · high · deps: T089 · **Team arrival & briefing** — gather the on-site team,
  hand out timeline + contact sheet, confirm radios/phones.
- **T097** · P9 · high · deps: T096 · **Supervise full setup** — décor, tables, AV, signage,
  and ceremony space completed against the setup map before guest arrival.
- **T098** · P9 · high · deps: T090 · **Receive perishable deliveries** — flowers, cake; inspect
  quality and placement; flag issues immediately.
- **T099** · P9 · high · deps: T083 · **Manage hair & makeup timeline** — keep the getting-ready
  schedule on track; this is the day's first domino.
- **T100** · P9 · high · deps: T097 · **Vendor check-in & sound check** — confirm caterer, bar,
  band/DJ, photo/video ready; test mics and music.
- **T101** · P9 · high · deps: T084 · **Coordinate couple & party transport/arrival** — manage
  timing so the couple arrives unseen/on cue per plan.
- **T102** · P9 · high · deps: T097, T100 · **Pre-ceremony readiness check** — seating, guest
  ushering, accessibility seating, music cue, and officiant in position.
- **T103** · P9 · high · deps: T102 · **Run the ceremony** — cue processional, music, readings,
  ritual, and recessional; manage timing and quiet/unplugged requests.
- **T104** · P9 · medium · deps: T103, T039 · **Manage post-ceremony photos** — gather family
  groups efficiently from the shot list; protect golden-hour window.
- **T105** · P9 · medium · deps: T103 · **Transition guests to reception** — drinks/canapés,
  guide flow, and reset ceremony space if dual-use.
- **T106** · P9 · high · deps: T100, T065 · **Coordinate meal service** — cue courses, ensure
  flagged dietary meals reach correct seats, manage pace with kitchen.
- **T107** · P9 · medium · deps: T059, T106 · **Cue key reception moments** — entrance, speeches,
  first dance, cake cut; sync MC, band/DJ, and photo/video.
- **T108** · P9 · medium · deps: T100 · **Manage bar & beverage flow** — monitor service,
  pacing, and responsible-service issues (see RK008).
- **T109** · P9 · high · deps: T070 · **Handle live issues** — work the contingency tree
  (weather, delays, medical, no-shows) without alarming guests.
- **T110** · P9 · medium · deps: T076 · **Secure gifts, cards & valuables** — designate a safe
  point and a responsible person throughout the night.
- **T111** · P9 · high · deps: T075 · **Manage teardown & load-out** — coordinate vendors,
  return rentals, collect couple's items, and meet the venue removal deadline.

### P10 — Post-Wedding / Wrap-up

- **T112** · P10 · high · deps: T111 · **Return rentals & hired items** — on schedule to avoid
  late fees; reconcile counts against the rental order.
- **T113** · P10 · high · deps: T068 · **Settle final balances & gratuities** — pay any
  remaining vendor balances and tips; collect all receipts.
- **T114** · P10 · medium · deps: T111 · **Reconcile final budget** — actuals vs plan; document
  variances for future estimates (feeds OPE cost calibration).
- **T115** · P10 · medium · deps: — · **Collect deliverables** — confirm timelines for photos,
  video, and any albums; calendar the delivery dates.
- **T116** · P10 · low · deps: — · **Send thank-yous & request reviews** — thank vendors and
  the couple; request a testimonial/review while the experience is fresh.
- **T117** · P10 · low · deps: T114 · **Archive the project** — store contracts, final timeline,
  vendor list, and lessons learned for reuse.
- **T118** · P10 · low · deps: T090 · **Handle returns/exchanges & lost-and-found** — return
  borrowed items, resolve any damage claims, reunite guests with left items.
- **T119** · P10 · low · deps: T116 · **Post-event debrief with couple** — capture what worked
  and what to improve; a referral/relationship moment.
- **T120** · P10 · low · deps: T114 · **Update vendor scorecard** — rate reliability/quality to
  refine future recommendations.

---

## 3. Resources

Each resource: `id · type · cost_basis · pricing_ref · Name — notes`.
`type ∈ {vendor, equipment, staffing, logistics, document}`.
`pricing_ref` links to a Cost Driver / `knowledge_pricing.item_key` (Section 5).

### Venue & spaces
- **R001** · vendor · per_guest · `venue_per_head` · **Ceremony + reception venue** — capacity,
  curfew, wet-weather backup, vendor rules; the anchor resource for most decisions.
- **R002** · equipment · flat · `tent_marquee` · **Tent / marquee** — for outdoor or overflow;
  include flooring, walls, heating/cooling.
- **R003** · equipment · per_unit · `dancefloor` · **Dancefloor / staging** — sized to guest
  count and band footprint.
- **R004** · logistics · flat · `power_generator` · **Power / generator** — essential for
  off-grid or outdoor venues feeding catering, AV, lighting.
- **R005** · logistics · per_unit · `restroom_trailer` · **Restroom facilities** — portable
  units for outdoor venues; ratio to guest count.

### Catering & bar
- **R006** · vendor · per_guest · `catering_per_head` · **Caterer** — service style, dietary
  handling, kitchen needs; usually the largest line.
- **R007** · vendor · per_guest · `bar_per_head` · **Bar service** — beverages + bartenders;
  licensing required (see RK006).
- **R008** · staffing · per_hour · `waitstaff_hour` · **Waitstaff** — ratio ~1 per 10–15 guests
  for plated service.
- **R009** · staffing · per_hour · `bartender_hour` · **Bartenders** — ~1 per 50–75 guests.
- **R010** · vendor · per_unit · `wedding_cake` · **Cake / dessert** — tiers sized to headcount;
  dietary alternatives.
- **R011** · vendor · flat · `late_night_food` · **Late-night food** — optional; sustains energy
  at long receptions.
- **R012** · equipment · per_unit · `glassware_tableware` · **Glassware & tableware** — if not
  included by venue/caterer; reconcile counts (T061).

### Photo / video / AV
- **R013** · vendor · per_hour · `photographer_hour` · **Photographer** — coverage hours +
  deliverables; backup gear policy.
- **R014** · vendor · per_hour · `videographer_hour` · **Videographer** — coordinate with photo
  to avoid blocking shots.
- **R015** · vendor · flat · `second_shooter` · **Second shooter** — coverage of parallel moments
  (couple prep + guest arrival).
- **R016** · equipment · flat · `sound_system` · **Sound system / PA** — ceremony + reception;
  mics for officiant and speeches.
- **R017** · equipment · flat · `lighting_package` · **Lighting** — ambient, uplighting, dance,
  and safety/path lighting.
- **R018** · equipment · per_unit · `microphones` · **Microphones** — lapel for officiant,
  handheld for speeches/MC.
- **R019** · equipment · flat · `projector_screen` · **Projector / screen** — for slideshows or
  live streaming remote guests.

### Entertainment
- **R020** · vendor · flat · `band` · **Live band** — set lengths, power, space, breaks coverage.
- **R021** · vendor · per_hour · `dj_hour` · **DJ** — playlists, MC duties, do-not-play list.
- **R022** · vendor · flat · `ceremony_musicians` · **Ceremony musicians** — string trio,
  soloist, or harpist for processional.
- **R023** · vendor · flat · `entertainment_extra` · **Extra entertainment** — photo booth,
  performers, fireworks/sparklers (permit-dependent, RK011).

### Florals & décor
- **R024** · vendor · per_unit · `bouquet` · **Bouquets** — bridal + party; seasonal availability.
- **R025** · vendor · per_unit · `centerpiece` · **Centerpieces** — per table; scale with table
  count from seating plan.
- **R026** · vendor · flat · `ceremony_florals` · **Ceremony florals** — arch/altar, aisle, and
  installations.
- **R027** · vendor · per_unit · `boutonniere_corsage` · **Boutonnieres / corsages** — party +
  close family.
- **R028** · equipment · per_unit · `table_linens` · **Linens** — tablecloths, napkins, runners.
- **R029** · equipment · per_unit · `chairs` · **Ceremony/reception chairs** — type and count;
  may be venue-included.
- **R030** · equipment · per_unit · `tables` · **Tables** — guest, head, cake, gift, registration.
- **R031** · vendor · flat · `signage_decor` · **Signage & styling** — welcome sign, seating
  chart, directional signs.

### Attire & beauty
- **R032** · vendor · per_unit · `wedding_dress` · **Wedding dress** — order + alteration lead
  time (RK009).
- **R033** · vendor · per_unit · `suit_tux` · **Suit / tuxedo** — purchase or rental + fitting.
- **R034** · vendor · per_unit · `hair_makeup` · **Hair & makeup artist** — trial + day-of; per
  person.
- **R035** · vendor · per_unit · `accessories` · **Accessories** — veil, shoes, jewelry, ties.

### Stationery & documents
- **R036** · vendor · per_unit · `invitation_suite` · **Invitation suite** — save-the-dates,
  invites, RSVPs.
- **R037** · vendor · per_unit · `day_of_stationery` · **Day-of stationery** — menus, place
  cards, table numbers, programs.
- **R038** · document · flat · `marriage_license` · **Marriage license / legal docs** — required;
  region-specific lead time (T009, RK010).
- **R039** · document · flat · `event_insurance` · **Event/liability insurance** — often venue-
  required (RK006).
- **R040** · document · flat · `permits` · **Permits** — noise, alcohol, street/parking,
  fireworks (RK011).

### Transport & logistics
- **R041** · logistics · per_unit · `guest_shuttle` · **Guest shuttle** — between hotel/venue;
  driver + manifest.
- **R042** · logistics · per_unit · `couple_car` · **Couple / VIP car** — arrival/departure;
  backup driver.
- **R043** · logistics · flat · `parking_valet` · **Parking / valet** — capacity + accessible
  drop-off.
- **R044** · logistics · per_unit · `accommodation_block` · **Hotel room block** — for guests;
  destination weddings (RK015).

### Staffing & coordination
- **R045** · staffing · per_hour · `coordinator_hour` · **On-site coordinator(s)** — the
  organizer + assistants running the run-of-show.
- **R046** · staffing · per_hour · `setup_crew_hour` · **Setup / teardown crew** — install and
  load-out labor against venue access windows.
- **R047** · staffing · flat · `security` · **Security** — for large/high-profile events or
  alcohol service.

### Safety & contingency
- **R048** · equipment · flat · `emergency_kit` · **Emergency / day-of kit** — sewing, stain,
  meds, chargers, tools, umbrellas (T073, T081).
- **R049** · equipment · per_unit · `umbrellas_heaters` · **Umbrellas / heaters / fans** —
  weather mitigation for outdoor segments (RK001).
- **R050** · staffing · flat · `first_aid` · **First-aid / medical cover** — trained person or
  service for large guest counts (RK016).
- **R051** · equipment · flat · `coat_check` · **Coat check** — staffed; seasonal/formal events.
- **R052** · logistics · flat · `waste_cleanup` · **Waste & cleanup** — bins, removal, and
  end-of-night cleaning, especially for non-venue sites.

---

## 4. Risks

Each risk: `id · severity · probability · phase(s) · Title — Mitigation`.

### Environmental & venue
- **RK001** · high · medium · P1,P4,P7,P9 · **Bad weather for outdoor elements** — Mitigation:
  confirmed wet-weather backup (T051), tent/heaters/umbrellas (R002, R049), and a decision
  deadline + rule (T087); never leave outdoor with no plan B.
- **RK002** · high · low · P9 · **Venue becomes unavailable** (double-book, damage, closure) —
  Mitigation: written contract with date lock + remedies (T014); know an emergency alternate;
  event insurance (R039).
- **RK003** · medium · medium · P9 · **Noise curfew / overrun** — Mitigation: confirm curfew at
  booking (T013), brief band/DJ on hard stop, build buffer into run-of-show (T058).

### Financial
- **RK004** · high · medium · P5,P6 · **Missed vendor payment / cashflow gap** — Mitigation:
  payment calendar with due dates (T063, T068), reminders, and a tracked balance sheet.
- **RK005** · medium · high · P1,P6 · **Budget overrun / scope creep** — Mitigation: contingency
  10–15% (T004), change-log for additions, and re-baseline after each signed contract (T025).
- **RK006** · high · medium · P2,P6 · **Vendor lacks insurance/license** — Mitigation: verify
  certificates before contracting (T026, T077); refuse unlicensed bar service.
- **RK007** · medium · low · P10 · **Hidden / late fees** (overtime, damage, late return) —
  Mitigation: read contract fine print, confirm teardown deadline (T075), return rentals on
  time (T112).

### Service & operations
- **RK008** · medium · medium · P9 · **Over-service of alcohol / guest incident** — Mitigation:
  trained bartenders, pacing, food alongside bar, water stations, security (R047), and a
  responsible-service brief (T108).
- **RK009** · high · medium · P3,P5 · **Attire not ready / poor fit** — Mitigation: order with
  long lead (T021), two fittings (T033, T054), and an emergency tailoring kit (R048).
- **RK010** · high · low · P1 · **Legal/marriage documents not valid in time** — Mitigation:
  confirm requirements early (T009), lodge documents within notice period, keep copies (R038).
- **RK011** · medium · medium · P6 · **Missing permits** (noise, alcohol, fireworks, parking) —
  Mitigation: identify all permits early and confirm in hand (T077); have copies on-site.
- **RK012** · high · medium · P5,P7,P9 · **Key vendor no-show or cancellation** — Mitigation:
  reconfirm at P5/P7 (T055, T079), keep a backup contact list, and contracts with remedies.
- **RK013** · medium · medium · P2,P3 · **Seasonal flowers unavailable** — Mitigation: brief
  florist early (T020), agree substitution palette, avoid single-source rare stems.
- **RK014** · medium · high · P9 · **Timeline slippage** (hair/makeup, photos run long) —
  Mitigation: build buffers (T058), protect the first domino (T099), and assign a timekeeper.

### Guests
- **RK015** · medium · medium · P4 · **Guest travel/accommodation problems** — Mitigation: early
  save-the-dates (T032), room block (R044), shuttle plan (T045), and clear directions.
- **RK016** · medium · low · P9 · **Medical emergency / accessibility failure** — Mitigation:
  first-aid cover (R050), accessible routes/seating (T050), nearest-hospital info in the kit.
- **RK017** · medium · high · P4,P6 · **Headcount uncertainty / late RSVPs** — Mitigation: chase
  RSVPs (T056), set an internal deadline before the caterer's, and confirm final count (T064).
- **RK018** · low · medium · P6,P9 · **Dietary/allergy mishandling** — Mitigation: capture at
  RSVP (T043), confirm sheet to kitchen + FOH (T086), and seat-map flagged meals (T106).
- **RK019** · low · medium · P9 · **Seating conflicts / family tensions** — Mitigation: gather
  sensitivities at intake (T001), thoughtful seating (T066), and a discreet on-site fixer.

### Technical & assets
- **RK020** · medium · low · P9 · **Power failure / AV breakdown** — Mitigation: generator/backup
  power (R004), spare mic/cables, sound check (T100), and a manual-cue fallback.
- **RK021** · high · low · P9,P10 · **Lost/corrupted photos or video** — Mitigation: dual-card
  shooting, second shooter (R015), and confirmed backup workflow with the vendor.
- **RK022** · medium · low · P9 · **Cake/floral damage in transit or heat** — Mitigation: same-day
  delivery windows (T090, T098), shaded/cool placement, and a quick-fix florist contact.
- **RK023** · medium · low · P9,P10 · **Theft / lost gifts & valuables** — Mitigation: designated
  secure point + responsible person (T110), and end-of-night collection plan (T076).
- **RK024** · low · medium · P9 · **Transport delays** — Mitigation: padded pickup times (T074),
  confirmed manifests (T084), and a backup driver (R042).

### Project & people
- **RK025** · medium · medium · P1–P10 · **Communication breakdown with couple/family** —
  Mitigation: single point of contact and approval workflow (T010); written confirmations.
- **RK026** · medium · low · P9 · **Coordinator overload / single point of failure** —
  Mitigation: assistant coordinators (R045), delegated roles (T072), and a shared run-of-show.
- **RK027** · low · medium · P3,P6 · **Décor install/teardown runs over access window** —
  Mitigation: confirm load-in/out times (T075), pre-place non-perishables (T091), enough crew (R046).
- **RK028** · medium · medium · P2 · **Over-reliance on a single vendor for many services** —
  Mitigation: understand failure blast-radius; keep alternates; stagger critical dependencies.
- **RK029** · low · low · P9 · **Cultural/religious requirement missed** — Mitigation: capture at
  intake (T001), confirm ceremony details (T037, T060) with officiant and family.
- **RK030** · medium · medium · P9 · **Guest count exceeds capacity / fire-safety limit** —
  Mitigation: enforce confirmed headcount (T064), validate layout vs capacity (T047), respect
  venue legal limits.
- **RK031** · low · medium · P10 · **Negative review from unmet expectation** — Mitigation: align
  expectations at intake + debrief (T119), document scope, and resolve issues quickly.
- **RK032** · medium · low · P9 · **Fire/safety hazard** (candles, sparklers, overcrowding) —
  Mitigation: follow venue fire rules, keep exits clear, permitted pyrotechnics only (RK011).
- **RK033** · low · low · P5 · **Menu tasting reveals quality gap** — Mitigation: taste early
  (T053) so there's time to adjust dishes or, worst case, the caterer.
- **RK034** · medium · medium · P7,P9 · **Last-minute guest additions** — Mitigation: hold a small
  buffer of place settings/meals; set a firm cutoff (T078).
- **RK035** · low · medium · P10 · **Delayed deliverables** (photos/video late) — Mitigation: put
  delivery dates in contract, calendar them (T115), and follow up.

---

## 5. Cost Drivers

Cost drivers are the priced line items the engine multiplies by a basis × quantity. They map
to `knowledge_pricing.item_key` (OPE §3.2). **Actual low/mid/high values are region-specific
and belong in `knowledge_pricing`, not here** — the ranges below are *indicative placeholders*
(generic mid-market, single currency) to be regionalized at seed time (OPE §13 Q1).

Format: `id · item_key · basis · driver · Indicative range (placeholder) — note`.

- **CD001** · `venue_per_head` · per_guest · guests · *$$ — varies hugely* — base hire often
  flat; per-head used when venue bundles space+service.
- **CD002** · `venue_flat` · flat · — · *$$$* — flat venue hire alternative to per-head.
- **CD003** · `catering_per_head` · per_guest · guests · *$$* — dominant line; menu/service style
  drives it.
- **CD004** · `bar_per_head` · per_guest · guests · *$* — open bar; consumption or package.
- **CD005** · `waitstaff_hour` · per_hour · staff × hours · *$* — ratio ~1:10–15 guests.
- **CD006** · `bartender_hour` · per_hour · staff × hours · *$* — ratio ~1:50–75 guests.
- **CD007** · `wedding_cake` · per_unit · servings · *$* — per-slice or per-tier.
- **CD008** · `late_night_food` · flat · — · *$* — optional add-on.
- **CD009** · `photographer_hour` · per_hour · coverage hours · *$$* — packages common; map to hours.
- **CD010** · `videographer_hour` · per_hour · coverage hours · *$$* — often paired with photo.
- **CD011** · `second_shooter` · flat · — · *$* — add-on to photo.
- **CD012** · `band` · flat · — · *$$$* — multi-piece live music.
- **CD013** · `dj_hour` · per_hour · hours · *$* — alternative/complement to band.
- **CD014** · `ceremony_musicians` · flat · — · *$* — processional music.
- **CD015** · `ceremony_florals` · flat · — · *$$* — arch/aisle installs.
- **CD016** · `centerpiece` · per_unit · tables · *$* — scales with table count.
- **CD017** · `bouquet` · per_unit · party size · *$* — bridal + party.
- **CD018** · `boutonniere_corsage` · per_unit · party+family · *$* — small per-unit.
- **CD019** · `table_linens` · per_unit · tables · *$* — may be rental-bundled.
- **CD020** · `chairs` · per_unit · guests · *$* — often venue-included.
- **CD021** · `tables` · per_unit · tables · *$* — guest + utility tables.
- **CD022** · `tent_marquee` · flat · — · *$$$* — outdoor/overflow; weather mitigation.
- **CD023** · `dancefloor` · per_unit · area · *$* — sized to guests + band.
- **CD024** · `lighting_package` · flat · — · *$$* — ambient + dance + safety.
- **CD025** · `sound_system` · flat · — · *$* — PA + mics.
- **CD026** · `power_generator` · flat · — · *$$* — off-grid/outdoor essential.
- **CD027** · `restroom_trailer` · per_unit · units · *$$* — outdoor; ratio to guests.
- **CD028** · `hair_makeup` · per_unit · people · *$* — trial + day-of per person.
- **CD029** · `wedding_dress` · per_unit · — · *$$* — incl. alterations.
- **CD030** · `suit_tux` · per_unit · people · *$* — buy or rent.
- **CD031** · `invitation_suite` · per_unit · invites · *$* — scales with household count.
- **CD032** · `day_of_stationery` · per_unit · guests/tables · *$* — menus, place/table cards.
- **CD033** · `guest_shuttle` · per_unit · trips/vehicles · *$$* — transport logistics.
- **CD034** · `couple_car` · per_unit · — · *$* — arrival/departure.
- **CD035** · `accommodation_block` · per_unit · rooms · *varies* — usually guest-paid; track for
  destination.
- **CD036** · `coordinator_hour` · per_hour · staff × hours · *$$* — the organizer's own labor;
  include in client-facing cost.
- **CD037** · `setup_crew_hour` · per_hour · crew × hours · *$* — install/teardown labor.
- **CD038** · `security` · flat · — · *$* — large/high-profile/alcohol events.
- **CD039** · `event_insurance` · flat · — · *$* — liability cover.
- **CD040** · `permits` · flat · — · *$* — noise/alcohol/fireworks/parking.

> **Contingency:** apply the engine's default contingency (OPE §7.3, default 10%; recommend
> 10–15% for weddings given RK005). **Organizer margin / platform fee:** apply per global config
> (Master Decisions §7 — commission not yet implemented).

---

## 6. How OPE should use this (beginner vs experienced)

- **Beginner organizers** — surface the *full* phase/task checklist with the "why" in each
  `detail`, default conservative quantities (e.g. higher staffing ratios), and foreground
  high-severity risks (RK001, RK004, RK006, RK009, RK012) in the preliminary assessment.
- **Experienced organizers** — compress low-priority tasks, expose the dependency graph and
  edge cases, and let them override quantities; OPE recalculates deterministically (OPE §9.4).
- **Scenario adaptation (OPE §5):** scale per-guest cost drivers by the scenario's guest count;
  switch wet-weather resources (R002, R049) on for outdoor venue types; drop/booze-related lines
  for dry events; expand ceremony tasks (T037, T060) for religious/cultural ceremonies.
- **Assessment outputs (OPE §9.2):** preparation hours ≈ sum of task effort across phases;
  staffing/equipment/vendor/logistics from Resources; budget from Cost Drivers via the engine;
  operational risks from Section 4 (filtered by scenario: outdoor, alcohol, destination, size).

---

## 7. Import mapping → `knowledge_entries`

All entries use `category = 'wedding'`. Field mapping (OPE §3.2):

| This doc | `knowledge_entries.kind` | `title` | `body` | `tags[]` | `data` (JSONB) |
|---|---|---|---|---|---|
| **Phases (§1)** | `timeline` | "Wedding planning timeline" | phase overview | `['wedding','timeline']` | `{ phases:[{key,title,window,goal}] }` |
| **Tasks (§2)** | `task` | task title | task detail | `['wedding', phase, priority]` | `{ id, phase, priority, dependencies:[...] }` |
| **Resources (§3)** | `resource` | resource name | notes | `['wedding', type]` | `{ id, type, cost_basis, pricing_ref }` |
| **Risks (§4)** | `tip` ⚠ | risk title | mitigation | `['wedding','risk', phase]` | `{ id, severity, probability, phases:[...] }` |
| **Cost Drivers (§5)** | — (→ `knowledge_pricing`) | label | note | `['wedding']` | seed `item_key, basis` into `knowledge_pricing`; low/mid/high per region |
| **§6 guidance** | `tip` | usage tips | body | `['wedding','usage']` | `{ audience:['beginner','experienced'] }` |

> ⚠ **Schema note (not a change, a flag):** `knowledge_kind` (OPE §3.1) currently has
> `timeline · task · resource · checklist · tip · regional` — **no `risk`**. v1 stores risks as
> `kind='tip'` tagged `'risk'` with structured `data` (severity/probability), which imports
> cleanly today. If risks become first-class, adding a `risk` value to the enum is a future
> design decision — recorded here, **not** made in this document.
>
> **Pricing** is intentionally **not** populated with numbers here: per OPE §5/§7 and §13 Q1,
> `knowledge_pricing` rows are region-specific and curated at seed time. Section 5 fixes the
> stable `item_key`s and `basis`; values come later.

---

## 8. Coverage summary

- **Phases:** 10 (`P1`–`P10`)
- **Tasks:** 120 (`T001`–`T120`) — each with phase, priority, dependencies
- **Resources:** 52 (`R001`–`R052`) — typed, with cost_basis + pricing_ref
- **Risks:** 35 (`RK001`–`RK035`) — each with severity, probability, mitigation
- **Cost drivers:** 40 (`CD001`–`CD040`) — item_key + basis (values → `knowledge_pricing`)

All within the requested ranges. This document is the wedding source for OPE Knowledge Base v1
and is ready for structured import once the pricing layer is seeded.
