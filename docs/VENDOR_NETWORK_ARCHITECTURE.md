# Vendor Network — Architecture

> **Type:** business architecture (concepts, workflows, ownership rules, system behavior). **Not** a
> database schema, API, UI, or implementation design.
> **Role:** the **vendor-side CandidateProvider** for the Sourcing Engine — provides the **non-human**
> resources OPE plans need: **places, equipment, services, supplies**.
> **Source of truth:** `MASTER_PRODUCT_DECISIONS.md`, `OPE_V1_TECHNICAL_DESIGN.md`.
> **Supporting:** `OPE_MASTER_SPEC.md` (§8 Vendor), `OPE_EVENT_LIFECYCLE.md`,
> `OPE_LEARNING_ARCHITECTURE.md`, `OPE_SOURCING_ENGINE.md`, `WORKER_NETWORK_ARCHITECTURE.md` (approved).
> **Status:** forward-looking. Not built in M1–M3; **V0/V1 are the near-term realizable slice** (the
> Sourcing L0/L1 world).
> **Date:** 2026-06-10.

## 0. Where it sits

```
OPE ─▶ Plan ─▶ Resource Needs (non-human) ─▶ Sourcing Engine ─▶ VENDOR NETWORK ─▶ Quotes
                                                                      │
                                                  Organizer Selection ─▶ Fulfilled Resources
```

The Worker Network solves **people**; the Vendor Network solves **places, equipment, services,
supplies**. Both are **fulfillment layers** the Sourcing Engine resolves requests against. The defining
vendor differences from workers: vendors **quote a price** (not a pay band), vendor relationships are
often **owned privately by the organizer**, and vendor supply grows by **observing demand**, not open
onboarding.

**Vendor Network is a fulfillment layer. It is NOT** a yellow-pages directory, a business-listing
website, or a standalone marketplace. Organizers do not browse listings; **needs pull vendors**, and the
platform helps the organizer fill them.

---

## Architectural principles

- **UNKNOWN → ASK, never UNKNOWN → INVENT.** If a need's spec is ambiguous (which cuisine? what
  capacity?), the engine **asks the organizer** — it never fabricates a vendor, a quote, or a spec.
- **Works before the network exists.** External vendors are **valid sourcing targets**: at V0 the
  platform emits a sourcing brief and the organizer uses their own vendor (Sourcing L0). The platform
  plans and sources successfully with **zero registered vendors**.
- **Marketplace is not required for initial operation.** Booking/payments/contracts are a **future V3
  layer**; everything below V3 delivers value without it.

These mirror the Sourcing Engine's graceful-degradation stance: the engine is designed once; the
**source of candidates upgrades over time**.

---

## 1. Vendor capability model

A vendor is a **bundle of capabilities, not a single business category.** Capabilities are the matching
unit. Examples: **Venue, Catering, Bakery, Equipment Rental, Decoration, Transportation, Photography
Service, Entertainment Service, Cleaning Service, Printing Service.**

```
Vendor "Aloha Events Co."
  capabilities: [ Catering, Bakery, Decoration ]
  service_area: Honolulu (radius)
```

**Why capability-based, not category-based:**
- **One business spans many needs** — a caterer that also bakes and decorates is matched as three
  capabilities, not forced into one "category."
- **OPE needs are capability-typed** — the Resource/Vendor engine emits *"catering for 30"*, not *"find a
  catering company"*; matching on what a vendor **provides** beats matching on how they self-label.
- **Avoids miscategorization** — businesses don't fit one box; capabilities do.

Each capability carries attributes: **spec** (cuisine/style/quantity), **service area** (radius),
**capacity**, **lead time**, and — for **regulated/safety** capabilities (food handling, insured
transport, licensed venue) — a **verification requirement** (see §9, V2).

---

## 2. Vendor relationship ownership

**The organizer owns their vendor relationships. The platform is a helper, not the owner**
(`MASTER_PRODUCT_DECISIONS` §11.2 — "the human is the hero; ActivLife Hub is the helper"). This is the
trust foundation of the whole network.

A **two-layer model:**
- **Private organizer layer (owned):** the organizer's vendor contacts, **private notes**, **negotiated
  pricing**, and relationship history. **Owned by the organizer, never exposed**, never used to compete
  with them.
- **Platform shared layer (aggregate only):** anonymized, capability-level signals (§4).

**The platform must not take ownership of organizer relationships** — it does not poach contacts,
re-sell a private vendor, or surface one organizer's negotiated price to another. This anti-
disintermediation guarantee is *why* organizers will safely **import** (§3) and contribute to the
**shared graph** (§4): contributing never costs them their relationships.

---

## 3. Vendor import

Organizers may **optionally** import their existing vendors. Import is **not required for onboarding**;
the platform **works fully without it**.

- **Sources:** CSV, Excel, manual entry, contact import, future integrations.
- **Purpose:** accelerate **OPE personalization** (OPE can suggest *the organizer's own* trusted vendors)
  and **planning efficiency** (no re-entering known suppliers).
- **Ownership preserved:** imported vendors enter the **private organizer layer** (§2). Importing
  **does not surrender** them to the platform or expose them to others — it only helps *that* organizer
  plan faster.
- **Import ≠ public listing.** Importing a vendor into an organizer's private network does **not** create
  a public or marketplace listing, does **not** expose the organizer's contacts or negotiated pricing, and
  does **not** make the vendor discoverable to other organizers. A vendor becomes publicly discoverable
  only via **claim** (§5) or the **aggregate** shared graph (§4) — never through one organizer's import.

Import accelerates value; its absence never blocks operation (V0/brief still works).

---

## 4. Shared vendor graph

A **platform-level graph** built from **aggregate** signals across organizers:
- **Aggregate vendor usage** — which capabilities are fulfilled, where, how often.
- **Capability discovery** — what capabilities exist in a region (supply map), feeding OPE pricing and
  the coverage picture.
- **Vendor popularity signals** — anonymized "frequently used for catering in Honolulu."

**Must never expose:** private organizer **notes**, **negotiated pricing**, or **organizer-owned
contacts**. The graph knows *"a catering capability is widely used in Honolulu"* — it does **not** know
*"Organizer A pays Vendor X \$1,200 and notes 'ask for Maria.'"*

The shared graph powers **demand-driven acquisition** (§6) and capability discovery — strictly through
**privacy-preserving aggregation**, never by leaking the private layer.

---

## 5. Vendor claim

A vendor may exist on the platform (as a demand-seeded reference, §6) **before** it registers. The
**claim** workflow gives the real business control of its presence:

```
Vendor (seen / referenced)
   ↓  Claim Business
   ↓  Ownership Verification   (prove they represent the business)
   ↓  Vendor Account           (controls capabilities, service area, availability)
```

**Claim principles:**
- A vendor can be **referenced before claiming** (it doesn't have to opt in to be usable at V0).
- **Claiming grants control** of the public profile (capabilities, service area, availability) and is the
  step from V1 toward **V2 verification** (§9).
- Claiming is **vendor-initiated or demand-invited** (§6) — never an involuntary listing the vendor can't
  control.
- **Claiming exposes nothing private** — it gives the vendor its own profile; it never reveals any
  organizer's private notes or negotiated pricing about it (§2).

---

## 6. Demand-driven vendor acquisition

Vendor supply grows by **observing real demand**, not cold recruitment:

```
Vendor Seen ─▶ Vendor Used ─▶ Vendor Trusted ─▶ Vendor Invited ─▶ Vendor Claimed
```

| Stage | Meaning |
|---|---|
| **Seen** | an organizer references an external vendor (entry / import) |
| **Used** | the vendor fulfills needs across events |
| **Trusted** | good outcomes + popularity accumulate in the shared graph (aggregate) |
| **Invited** | the platform invites the vendor to **claim** — because real demand already exists |
| **Claimed** | the vendor registers and takes control (§5) |

**Why demand-driven:** a vendor invited this way already has **customers waiting**, so conversion is high
and outreach is welcome — the opposite of scraping a directory and cold-emailing. The platform **earns
the right to invite** a vendor by first proving demand. (This is the vendor analog of the Worker
Network's earned-trust ethos, applied to acquisition rather than fairness — vendors don't face a
new-worker cold-start, because V0 external vendors are valid from day one.)

- **Consent & anti-spam.** Vendor invitations are triggered **only by demonstrated demand** (above); they
  **respect communication-frequency limits**, **support one-tap opt-out** (an opted-out vendor is never
  re-invited), and **comply with applicable messaging/email regulations** (consent and unsubscribe rules).

---

## 7. Capability expansion

When the **specific** capability has no available vendor, matching may **expand to a broader/adjacent
capability**:

```
Birthday Cake        → Bakery
Wedding Venue        → Event Venue
Bounce House Rental  → Party Equipment Rental
```

A broader vendor can acceptably serve the specific need. **Governance (parallels Worker Network §8):**
- **Exhaustion first** — expand only after the specific capability is insufficient and there is time
  pressure.
- **Organizer awareness/consent** — expansion is surfaced; the system never silently swaps a generic
  rental for a specialty item the organizer asked for.
- **Bounded generalization** — specific → adjacent/broader, not arbitrary hops.
- **Safety / regulated hard rule** — **regulated or safety-critical capabilities never expand loosely**:
  allergen-safe catering, licensed transport, insured venues keep their **verification** (V2) and are not
  substituted by an unverified general vendor. Absolute, per `OPE_LEARNING_ARCHITECTURE` safety asymmetry.
- **Learned adjacency** — substitution outcomes (reviews) tune the adjacency graph over time.

Expansion supports fulfillment the way it does for workers: better an organizer-approved broader vendor
than an unfilled need — but never at the cost of safety or a regulated requirement.

---

## 8. Vendor fulfillment workflow

```
Need ─▶ Request ─▶ Matching ─▶ Quote ─▶ Selection ─▶ Fulfillment
```

| Stage | Architecture |
|---|---|
| **Need** | OPE Resource/Vendor engine emits: capability + spec + quantity + window + location + budget cap (provenance to the occurrence) |
| **Request** | Sourcing Engine normalizes the need into a vendor request (split/bundle per `OPE_SOURCING_ENGINE` §2) |
| **Matching** | a **CandidateProvider** ranks vendors by availability, service area, capability/spec, capacity, budget fit, reliability/popularity, and **verification** (for regulated); returns a shortlist — or a **brief** at V0 |
| **Quote** | matched vendors return a **quote** (price + availability + terms). Quotes **feed back into the OPE Budget Engine** (`OPE_MASTER_SPEC` §8 price-feedback loop), refining the estimate from seed/fallback toward real prices. **UNKNOWN → ASK:** ambiguous specs are clarified with the organizer before quoting |
| **Selection** | the organizer selects a quote, **locking the vendor**. Per `OPE_EVENT_LIFECYCLE`, selection must complete **before Registration Closed** (the execution freeze) |
| **Fulfillment** | delivery/setup at the event (In Progress); **Completed → Closed** captures **actual cost vs quote** and quality → learning + regional pricing |

**Fulfillment is not final at selection.** A vendor that **cancels or fails to deliver** reopens the
need; the Network **re-sources** (re-quote / expand / escalate to organizer/V0) and **informs the
organizer** — never a silent under-fill (the vendor analog of Worker Network §7A).

---

## 9. Vendor capability ladder

Parallels the Sourcing L-ladder and the Worker W-ladder (related, **not** a strict 1:1 — V0 ≈ Sourcing
L0; V1 and V2 both live inside Sourcing L2; V3 ≈ L3):

| Level | Who | Responsibilities & eligibility |
|---|---|---|
| **V0 — External** | the organizer's own/private vendor, off-platform | represented as a name/contact the organizer enters; sourced via **brief**; lives in the **private layer** (§2); **works today** |
| **V1 — Registered** | a profile exists (demand-seeded or self-registered/claimed) with capabilities + service area | **discoverable + suggestible + quotable**; reputation/popularity accrue; **no verification → non-regulated services only** |
| **V2 — Verified** | business identity and (for regulated) **licenses/insurance** verified | eligible for **regulated/safety-critical services** (food-safety catering, insured transport/venue); higher trust weight |
| **V3 — Marketplace** | transactable | **bookings, payments, contracts, ratings, disputes** via the future Marketplace |

Rules across levels: which services a vendor may fulfill rises with the level; **regulated/safety
services require V2+**; **payments/transactions exist only at V3**. **Monetization** lives at **V3**
(marketplace transactions) and within the (paid) organizer platform that consumes V0–V2 sourcing — keeping
free vendor onboarding consistent with `MASTER_PRODUCT_DECISIONS` §11.8 ("no free *core*"; the monetized
value layer is the transaction, not vendor registration).

---

## 10. Future Marketplace integration (interfaces only)

The Marketplace is a **separate, future document**; here we define only the **seams**. The Vendor Network
already models the precursor states a marketplace transacts on (Need → Request → Matching → **Quote → Selection** → Fulfillment), so the Marketplace plugs in at **V3** without changing the matching/quote
contracts:

| Marketplace capability | Interface from the Vendor Network |
|---|---|
| **Payments** | the **selected quote** becomes a payable transaction (price + terms already captured) |
| **Bookings** | **Selection** becomes a confirmed booking with the agreed window/spec |
| **Contracts** | the quote's **terms** become the contract record at booking |
| **Ratings** | **Fulfillment → Closed** outcomes (quality, actual-vs-quote) become vendor ratings (Learning Architecture: organizer-confirmed) |
| **Disputes** | **fulfillment failures** (cancellation, non-delivery, §8) become dispute cases |

Vendor/Worker Networks are **swappable candidate sources** for the Sourcing Engine; the Marketplace is the
**transaction layer** that turns their selections into money/legal flows. Nothing below V3 depends on it —
which is exactly why the Vendor Network **works before the Marketplace exists** and scales into it.

---

## Architecture summary

The **Vendor Network** is the **capability-based, demand-driven, ownership-respecting fulfillment layer**
for ActivLife Hub's **non-human** resources (places, equipment, services, supplies) — the vendor-side
CandidateProvider the Sourcing Engine resolves against.

- **Capabilities, not categories** — one vendor is a bundle of capabilities; OPE matches on what they
  *provide*.
- **Organizer owns the relationship** — a two-layer model (private owned layer + aggregate shared graph);
  the platform helps, never poaches. This makes **import** and the **shared graph** safe to contribute to.
- **Works before the network/marketplace** — V0 external vendors + briefs deliver value with zero
  registered vendors; the Marketplace (V3) is a future transaction layer, not a prerequisite.
- **Supply grows from demand** — Seen → Used → Trusted → Invited → Claimed; the platform earns the right
  to invite by proving demand, never cold-recruits.
- **Quotes refine the plan** — vendor quotes feed the OPE Budget Engine; actuals feed regional pricing
  and vendor reliability (Learning Architecture classes; safety/regulated only via expert/verification).
- **Graceful capability expansion** — specific → broader fallback under governance, never crossing a
  safety/regulated line.
- **V0 → V3 ladder** — external → registered → verified → marketplace, with regulated services gated at
  V2+ and money at V3.
- **UNKNOWN → ASK, never invent** — ambiguous specs are clarified; vendors, quotes, and safety are never
  fabricated; under-fill is never silent.

_Architecture only. No UI, schema, API, screens, or implementation. Consistent with the OPE Master Spec,
Sourcing Engine, Event Lifecycle, Learning Architecture, the approved Worker Network, and the platform's
helper-not-protagonist philosophy._
