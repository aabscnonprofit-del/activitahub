# Procurement & Vendor Management — Engineering Knowledge Extraction

> **Purpose:** reconstruct the hard-won *engineering* of professional procurement and vendor/workforce
> management (SAP Ariba, Coupa, Jaggaer, GEP, SAP Fieldglass and the VMS/services-procurement world) and
> extract what should strengthen ActivLife Hub's **M5 Resource Marketplace** — without importing
> enterprise bloat.
> **Scope:** engineering knowledge extraction only — origin, problem, evolution, why it changed, whether
> it improved. **NOT** competitor analysis, feature/market/UI design, code, schema, or implementation.
> **Method:** study the *evolution* of procurement mechanisms, map each onto the existing ALH pipeline
> (…→OPE/M2→IR→Assembly/M3→Project→Workspace/M4→Marketplace/M5 & Execution/M6→…), challenge designs,
> credit ALH where its decomposition is superior, and flag uncertainty.
> **Stance:** the ALH architecture is fixed. This document **maps onto it**; it does not redesign it.
> **Status:** research / forward-looking. Not built. No implementation implied.
> **Date:** 2026-06-25.

---

## 0. Why procurement is the right teacher for M5

Corporate procurement is the most mature engineering discipline that exists for the exact problem M5
owns: **turning an abstract internal need into a real, sourced, paid-for, received commitment from an
external party — defensibly, repeatably, and at scale.** It has spent forty years discovering where that
process breaks. The mechanisms below (RFI/RFQ/RFP, sourcing, bid leveling, approval chains, supplier
qualification, three-way match, VMS, SOW acceptance) are not features — they are *scar tissue* over
specific failures: fraud, maverick spend, unqualified vendors delivering unsafe work, paying for things
never received, and disputes with no audit trail.

The central ALH question this document answers: **is ALH's "abstract-need → request → sourced-result-by-
reference" seam a stronger engineering decomposition than the monolithic procurement suite — and which
pieces of procurement scar tissue must M5 absorb anyway?**

My thesis, defended in §9–10: **the seam is genuinely stronger** (it cleanly separates *planning the
need* from *sourcing the need* from *receiving the result* — three things every suite conflates), **but**
M5 must adopt four pieces of procurement engineering that suites earned the hard way — **qualification
gates, structured bid comparison, spend-authorization chains, and the three-way match** — or it will
re-learn the same failures.

---

## 1. The ALH pipeline seam this maps onto

```
M2 OPE        → emits the ABSTRACT NEED (kind/quantity/basis) + a cost ESTIMATE. No vendors, no prices.
   IR
M3 Assembly   → carries those needs at the Project root. Deterministic. Immutable upstream.
   Project
M4 Workspace  → LAUNCHES a Marketplace request from an abstract need; ROUTES accepted results back
                 BY REFERENCE into the work package. Does NOT source.
M5 Marketplace→ owns REAL-WORLD SOURCING: finds real vendors/staff/rentals, qualifies, solicits,
                 compares, awards, returns RESULTS. The procurement lifecycle lives here.
M6 Execution  → run-day: actual fulfillment, receipt, acceptance against the award.
```

Procurement, in ALH terms, is **almost entirely M5**, with three deliberate exceptions: the *need* is
born in M2 (never in M5 — M5 must not invent demand), the *authorization to spend* straddles M4↔M5, and
*receipt/acceptance* belongs to M6 (the thing only exists when it actually shows up).

---

## 2. RFI vs RFQ vs RFP — three different questions, not three documents

**Problem.** A buyer facing the open market has three distinct kinds of ignorance, and conflating them
produces bad sourcing. Procurement separated them because each models a different epistemic state.

| Instrument | The question it actually models | When invented / why | Awards on |
|---|---|---|---|
| **RFI** (Information) | *"Who/what exists, and is this even feasible?"* | Discovery instrument; you don't yet know the supply landscape. Never awards. | nothing — it *populates the candidate set* |
| **RFQ** (Quote) | *"I know exactly what I want; give me your price/availability."* | Spec is fully determined; the only open variable is **price/terms**. Optimizes a known thing. | price/availability against a fixed spec |
| **RFP** (Proposal) | *"Here is my problem; propose how you'd solve it (and at what price)."* | Spec is **under-determined**; the *approach* is part of what's being bought (services, complex builds). | weighted score across approach + price |

**Evolution.** Early procurement used one document for everything and got either over-constrained bids
(RFP rigor on a commodity) or unbid-able vagueness (RFQ sent for a problem with no fixed spec). The split
is the recognition that **the shape of the solicitation must match how determined the spec is**.

**Universal?** Yes — the underlying distinction (is the spec fixed or is the approach part of the buy?)
is universal to any sourcing.

**Does ALH already solve it?** Partially and implicitly. M2 already produces *abstract needs with a
spec*. The crucial ALH insight is that **the spec's determinacy is decided upstream (M2), so M5 should
know which instrument to run from the need itself** — a fully-specified need (a 50-chair rental) is an
RFQ; an under-determined need ("entertainment that fits a 6-year-old's pirate theme") is an RFP.

**Conceptual solution for M5.** The abstract need M2 emits should carry a **determinacy signal**: is the
spec closed (→ RFQ-style: solicit price/availability) or open (→ RFP-style: solicit *approach* + price)?
M5's "discovery" of the candidate set (already the Sourcing Engine's CandidateProvider chain, per
`RESOURCE_MARKET_ARCHITECTURE §3`) is the RFI analog — it never awards. ALH already separates discovery
from quoting; what it lacks is the **explicit RFQ-vs-RFP fork** based on spec determinacy.

**Owning module:** M5 (runs the solicitation), informed by a determinacy flag from **M2**.
**Verdict: ADOPT (lightweight).** Add a determinacy signal to the need; let M5 fork RFQ vs RFP. Reject
the three-heavyweight-document apparatus — that is enterprise bloat. Trade-off: the fork adds a branch in
M5; the benefit is that under-determined needs (most ALH events) get *proposals*, not just *prices*.

---

## 3. Supplier sourcing & discovery — needs pull supply

**Problem.** You cannot solicit from a vendor you haven't found. Discovery is the act of building the
candidate set.

**Origin / evolution.** Procurement moved from static **preferred-supplier lists** → **supplier
directories/networks** (Ariba Network) → **demand-signal discovery** (the buyer's need broadcast pulls
qualified suppliers in). The arc is from *the buyer searches a directory* to *the need attracts supply*.

**Universal?** Yes.

**Does ALH solve it — better?** **Yes, and this is where ALH is already superior.** The Vendor Network's
**demand-driven acquisition** (`VENDOR_NETWORK §6`: Seen → Used → Trusted → Invited → Claimed) is exactly
the modern endpoint of this evolution — supply grows by *observing real demand*, not cold-recruiting from
a scraped directory. ALH explicitly rejects the yellow-pages model (`VENDOR §0`). The candidate set is
produced by the Sourcing Engine's CandidateProvider chain, not by the organizer browsing listings.

**Conceptual solution / owning module:** already M5 (discovery = Sourcing matching surfaced).
**Verdict: ALREADY SOLVED BETTER.** Credit ALH: demand-driven acquisition is more advanced than the
preferred-list-plus-directory model most suites still run on. No adoption needed; the procurement
literature here *validates* ALH's choice.

---

## 4. Vendor comparison, scoring & bid leveling — the hardest engineering, and ALH's weakest spot

**Problem.** Three vendors quote. Their bids are *not comparable as written*: one bundles delivery,
another itemizes it; one quotes 40 chairs and a discount, another 50 at list; one's "catering" includes
staff, another's doesn't. Naively picking the lowest number rewards whoever **scoped out the most**.

**Origin: bid leveling.** Procurement invented **bid leveling** (a.k.a. bid tabulation / normalization)
to force bids onto a **common basis** before comparison: decompose each bid into line items, add back
excluded scope, normalize units and quantities, then compare apples to apples. Bid leveling is the single
most under-appreciated piece of procurement engineering — it is where most naive "marketplaces" fail.

**Then: weighted scoring.** For RFPs, price is one weighted criterion among many (approach, qualification,
risk, timeline). A **scoring rubric defined *before* bids open** (to prevent post-hoc bias) produces a
defensible award. The rigor is the *pre-commitment* of weights.

**Universal?** Yes — comparison-on-a-common-basis is universal to any multi-bid decision.

**Does ALH solve it?** **Today, only weakly.** `RESOURCE_MARKET_ARCHITECTURE §4` says the market
"presents offers/quotes side by side against the need's spec and budget cap; no pricing algorithm sets
values — the market displays and compares." That is the right *ownership* stance (M5 doesn't invent
prices) — **but "displays side by side" is not bid leveling.** Side-by-side display of un-normalized bids
*is exactly the failure mode procurement spent decades fixing.* This is ALH's clearest extraction gap.

**ALH better anywhere?** Yes on ownership (M5 never fabricates a price; `UNKNOWN → ASK`), but the
*comparison engineering* is missing.

**Conceptual solution for M5.** Because the abstract need (M2) already defines the **basis** (kind /
quantity / basis), M5 has the reference frame to **level bids to that basis**: map each quote's line items
onto the need's basis, surface what each bid includes/excludes relative to the need, normalize quantity
and unit, and *then* compare. For RFP-style needs, attach a pre-declared weighting (approach, qualification,
reliability, price) so the award is defensible. Crucially — and consistent with ALH's `UNKNOWN → ASK` —
M5 **normalizes and surfaces; it does not auto-pick.** The organizer still selects; M5 makes the bids
*comparable* and flags the scope gaps so the choice is informed, not tricked.

**Owning module:** M5. (The *basis* it levels against comes from M2's need.)
**Verdict: ADOPT — highest priority.** Bid leveling is the procurement idea M5 most needs and least has.
Trade-off: requires line-item structure on quotes, which adds modeling cost; the payoff is that the
organizer stops being fooled by scoped-out lowball bids. Reject the heavyweight scoring matrices of
enterprise RFP tools; adopt the *normalize-to-a-common-basis* core.

---

## 5. The procurement lifecycle — need → solicit → evaluate → award → PO → fulfill → receive → close

**Problem.** Sourcing is not one act; it is a **state machine with audit points**, and skipping a state
(e.g., awarding without a record, receiving without checking against the order) is where money and trust
leak.

**Canonical lifecycle and its ALH module owner:**

| Procurement stage | What it does | ALH owner | Notes |
|---|---|---|---|
| **Need / requisition** | demand is defined | **M2** (need) / **M4** (launches request) | M5 must *never* originate need |
| **Solicit** | RFI/RFQ/RFP to candidates | **M5** | §2 |
| **Evaluate** | bid leveling + scoring | **M5** | §4 |
| **Award / select** | pick the winner | **M5** runs; organizer selects | maps to Resource Market `Confirmed` |
| **Authorize spend** | approve the commitment | **M4↔M5** | §6 |
| **PO / commit** | the binding order | **M5** | the "selected quote becomes payable" seam (`VENDOR §10`) |
| **Fulfill** | vendor delivers | **M6** | run-day |
| **Receive / accept** | confirm it arrived as ordered | **M6** | §8 — the three-way match |
| **Close** | reconcile actuals, rate, learn | **M6 → M5/Learning** | actual-vs-quote feeds pricing & reputation |

**Evolution.** The lifecycle hardened over time precisely *because* each missing state caused a failure:
no requisition → maverick spend; no PO → no commitment record; no receipt → paying for phantom goods; no
close → no learning and no reconciliation.

**Does ALH solve it?** The Resource Market already models most of this:
`Available→Offered→Reserved→Confirmed→Fulfilled→Completed` (`RESOURCE_MARKET §5`). The lifecycle maps
cleanly. The gap is the **authorize-spend** state (§6) and the **receive/accept** rigor (§8).

**Owning module:** distributed exactly as above — and that distribution is the point.
**Verdict: ALREADY SOLVED (well), with two states to harden.** Credit ALH: its lifecycle is sound and
correctly distributed across modules. ADOPT the missing authorize and three-way-match states.

---

## 6. Approval chains & spend authorization — the M4↔M5 seam question

**Problem.** Not everyone may commit money on the organization's behalf, and not at any amount. Without an
authorization gate you get fraud, duplicate buys, and budget blowout. Procurement's answer: the
**approval chain** — spend above a threshold routes to an approver; chains escalate by amount/category.

**Origin / evolution.** From manual sign-offs → **delegation-of-authority matrices** (who can approve
what, up to what amount) → **policy-driven routing** (category + amount + budget-remaining decide the
chain dynamically). The evolution is toward *the policy decides the route*, not a person remembering it.

**Universal?** Yes for any multi-party buyer. **For a single organizer, the chain may be of length one** —
but the *gate* (does this commitment exceed what I authorized?) is still universal, and becomes essential
the moment a team/client/budget-owner is involved.

**The precise ALH question (prompt's crux): is approval-of-spend M4 or M5?**

My answer: **authorization is M4 (Workspace); the spend-commitment event is M5.** Reasoning from ALH's
own principle — *one responsibility per module*:
- **M5 sources and produces an award** (a selected, priced, real commitment). M5 knows the *amount*.
- **M4 owns the Project/work-package context, collaboration, and who is acting** — it is where the
  organizer (and any collaborators/budget-owner) live. **Authority is a property of the actor and the
  budget, which M4 holds, not of the sourcing, which M5 holds.**
- Therefore the **approval gate sits at M4**: before M4 *accepts* an M5 result that commits spend, the
  gate checks it against the authorized envelope (the M2 estimate / budget reference carried in the
  Project). M4 already owns `accept_marketplace_result`; the spend gate is a natural pre-condition on
  that accept. M5 then records the *committed* award.

This is cleaner than the suites, which bolt approval onto the sourcing tool. In ALH, **sourcing (M5) and
authority (M4) are different responsibilities and belong in different modules** — and the existing
`accept_marketplace_result` is exactly the chokepoint to gate.

**Conceptual solution.** The authorized envelope is the M2 cost estimate / budget reference carried at the
Project root (immutable upstream). M4's accept step verifies the M5 award against that envelope and the
acting member's authority; over-envelope or over-authority commitments route to an approver before accept.
Consistent with `verify-don't-trust`: M4 verifies the commitment is authorized; it does not trust that any
member may commit any amount.

**Owning module:** **M4** owns the authorization gate; **M5** owns the commitment record.
**Verdict: ADOPT.** Trade-off: adds a gate to M4's accept path. Reject enterprise DoA-matrix complexity;
adopt the *threshold gate against the authorized envelope* with a length-1 chain for solo organizers that
extends to N when a team/client/budget-owner exists.

---

## 7. Supplier qualification, onboarding & compliance — the safety gate

**Problem.** Letting an unqualified, uninsured, or non-compliant supplier fulfill a regulated need is how
people get hurt and how liability lands on the platform. Procurement separates **"can they bid"
(qualification)** from **"did they win" (award)**.

**Origin / evolution.** From ad-hoc vetting → **supplier registration/onboarding** (identity, banking,
tax) → **qualification gates** (certifications, insurance, licenses, financial health) → **continuous
compliance monitoring** (certs expire; re-qualification is periodic, not one-time). The key evolution:
**qualification is a gate *before* solicitation, not a tiebreaker after bids.** You don't compare an
unqualified bid at all.

**Universal?** Yes — and **non-negotiable for regulated/safety-critical needs.**

**Does ALH solve it — better?** **Yes, strongly.** This is ALH's second clear superiority. The Vendor
Network's **V0→V3 ladder** with **V2 verification gating regulated/safety-critical capabilities**
(`VENDOR_NETWORK §9`) *is* qualification engineering, and the **safety asymmetry** (`§7`: regulated
capabilities never expand loosely; safety moves only by expert verification, never softened by good
statistics, per the Learning Architecture) is *more principled* than most suites, where a low bid can
quietly override a soft qualification flag. ALH makes qualification an **absolute gate**, not a weight.

**Conceptual solution / owning module:** M5 enforces the qualification gate before a candidate enters the
solicitation set; verification status (V2) is the gate. Already modeled.
**Verdict: ALREADY SOLVED BETTER** for the gate itself. **ADOPT one missing piece: continuous
re-qualification** — certs/insurance/licenses *expire*, and a one-time V2 verification that never lapses
is a latent safety hole. Trade-off: requires expiry tracking on verification. Credit ALH for the
absolute-gate model; flag re-qualification as the gap.

---

## 8. Receipt, acceptance & the three-way match — the M6 responsibility

**Problem.** You ordered 50 chairs at \$5 each. The vendor invoices for 50. Did 50 *arrive*? Were they
chairs? Paying an invoice without checking against (a) what was ordered and (b) what was received is how
organizations pay for phantom and short deliveries.

**Origin: the three-way match.** Procurement's answer is to require agreement among **three documents
before payment**: the **PO** (what was ordered), the **goods/services receipt** (what arrived), and the
**invoice** (what's billed). Payment releases only when all three reconcile. This is one of the most
durable controls in all of finance — it is *verify-don't-trust* made concrete, decades before ALH named
the principle.

**For services:** the analog is **deliverable acceptance** against a **statement of work** — the SOW
defines acceptance criteria, and sign-off (not mere delivery) triggers payment.

**Universal?** Yes — utterly. Any pay-for-delivery relationship needs it.

**Does ALH solve it?** **Partially, and the seam is the interesting part.** The Resource Market models
`Fulfilled→Completed` with "actual cost vs quote" captured at close (`RESOURCE_MARKET §5`, `VENDOR §8`).
But **the match itself belongs to M6, not M5**, because *receipt is a run-day fact*. M5 produced the award
(the "PO": agreed spec, quantity, price). M6 observes what *actually showed up*. Payment/release should
reconcile **M5's award ↔ M6's receipt ↔ the invoice.** This is the precise three-way match in ALH terms.

**The clean seam (this is the prompt's key question — receipt is a Marketplace vs Execution
responsibility?):** **Receipt and acceptance are M6 (Execution), not M5.** M5 owns the *commitment*
(what was agreed); M6 owns the *reality* (what was delivered). M5 must not pretend to know delivery
happened — that would violate immutable-upstream / verify-don't-trust and pull run-day facts into the
sourcing module. M6 feeds the receipt back; the match (award ↔ receipt ↔ invoice) gates release; the
*outcome* (actual-vs-quote, quality) flows back to M5/Learning for pricing and reputation.

**Owning module:** **M6** owns receipt/acceptance; **M5** owns the award it's matched against; the
**three-way match** is the reconciliation across the M5 award, the M6 receipt, and the invoice.
**Verdict: ADOPT.** Trade-off: requires M6 to capture a structured receipt against the award, and a
reconciliation step before release. This is the second-highest-value adoption after bid leveling. Reject
nothing here — the three-way match is pure, time-tested engineering.

---

## 9. Catalogs vs spot-buy, reverse auctions, and what to *reject*

**Catalogs vs spot-buy.** *Problem:* repeatedly re-soliciting for the same routine item is wasteful;
pre-negotiated **catalogs** (punch-out, contracted price lists) let routine buys skip the full lifecycle,
while **spot-buy** runs the full sourcing for one-off needs. *Universal?* Partially — it's an optimization
for *high-frequency repeat* buys. *ALH fit:* an organizer's **private/imported vendors with negotiated
pricing** (`VENDOR §2–3`) are the natural ALH "catalog" — a known vendor at a known price skips
solicitation. *Owning module:* M5 (catalog = a candidate that arrives pre-priced; spot-buy = full
solicitation). **Verdict: INVESTIGATE FURTHER** — the organizer's private network *is* a proto-catalog;
formalizing "pre-priced known vendor short-circuits the RFQ" is valuable but low urgency. Reject
enterprise punch-out/catalog-management machinery.

**Reverse auctions.** *Problem:* for commoditized, fully-specified buys with many interchangeable
suppliers, a live descending-price auction extracts the lowest price. *Universal?* **No — narrowly
applicable** and often *harmful*: it commoditizes relationships, punishes quality, and erodes supplier
goodwill. *ALH fit:* poor. ALH events are mostly *under-determined, relationship-heavy, locally-supplied*
needs — the antithesis of the commodity-with-many-suppliers precondition. A reverse auction on
"entertainment for a child's party" is absurd and corrosive to the organizer-owns-the-relationship ethos
(`VENDOR §2`). **Verdict: REJECT.** Trade-off: none worth it for ALH's domain. This is a case where a
famous procurement mechanism is *wrong* for ALH — credit ALH's relationship-first stance for being
incompatible with it.

---

## 10. Temporary workforce (VMS) & services (SOW) procurement — the staffing seam

**Problem.** Procuring *people* and *services* is not procuring *goods*. Two distinct models emerged:

- **Staff augmentation (VMS):** you're buying **labor by time** against a **rate card** (role × skill ×
  region → rate). You direct the work; you pay for hours. Risk: rate leakage, misclassification, tenure
  limits, no qualification on the worker.
- **SOW (services):** you're buying a **deliverable/outcome**, not hours. The **statement of work** defines
  scope, milestones, and **acceptance criteria**; payment ties to **deliverable acceptance**, not time.

**Why the split matters (engineering, not pedantry):** the *unit of value* differs (time vs outcome), so
the *acceptance test* differs (timesheet approval vs deliverable sign-off), so the *risk controls* differ
(tenure/co-employment vs scope-creep/acceptance disputes). Fieldglass-class systems exist because bolting
staffing onto goods-procurement broke on exactly these differences.

**Universal?** The **staff-aug vs outcome distinction is universal**; the heavy VMS compliance apparatus
(co-employment, tenure tracking) is enterprise-specific.

**Does ALH solve it?** **Yes, and the architecture is *already* the right shape.** ALH's
**Worker Network** (people, priced by **pay band** — a rate card analog) is the staff-aug model; the
**Vendor Network** (services priced by **quote**) is the SOW/outcome model (`VENDOR §0` explicitly:
"vendors *quote a price*, workers signal a *pay band*"). ALH split workers from vendors for the *same
engineering reason* VMS split staff-aug from SOW: **labor-by-time and outcome-by-deliverable have
different value units and acceptance tests.** This is convergent design — strong validation.

**Conceptual solution for M5.** Keep the split. The acceptance test must follow the unit: worker fulfillment
(M6) accepts on *time/attendance/performance against the pay band*; vendor/service fulfillment (M6) accepts
on *deliverable against the quote's terms* (the SOW-acceptance analog). Both feed the three-way match (§8)
with the appropriate "receipt": a timesheet for labor, a deliverable sign-off for a service.

**Owning module:** M5 runs both solicitation paths (worker offer / vendor quote); M6 runs the two
different acceptance tests; M2 supplies the **role need** (kind/quantity/basis) that becomes the rate-card
lookup.
**Verdict: ALREADY SOLVED (well).** Credit ALH for the worker/vendor split mirroring staff-aug/SOW.
**ADOPT** the explicit *unit-appropriate acceptance test* in M6 (timesheet vs deliverable sign-off).
Reject co-employment/tenure VMS machinery as out-of-domain enterprise bloat.

---

## 11. The Need → Request → Source → Result → Receipt seam: who owns what (M2 / M4 / M5 / M6)

This is the spine of the whole analysis. The procurement lifecycle does **not** belong to one module — and
ALH's refusal to put it in one module is its core advantage over monolithic suites.

```
M2  NEED      abstract need (kind/quantity/basis) + cost ESTIMATE + spec-determinacy signal.
              No vendors, no prices, no availability. Deterministic. Immutable downstream.
                 │   (demand is born here and ONLY here — M5 never invents need)
M4  REQUEST   launches a MarketplaceRequest referencing the abstract need. Routes accepted
              results back BY REFERENCE. Owns the SPEND-AUTHORIZATION GATE on accept (§6).
              Does NOT source, qualify, level, or price.
                 │   (the workspace is the initiator/consumer side of the seam)
M5  SOURCE    the procurement lifecycle: discover candidates (RFI analog) → qualify (gate, §7)
   +RESULT    → solicit (RFQ if spec closed / RFP if open, §2) → level & compare bids (§4)
              → produce the AWARD (the "PO": agreed spec/qty/price/terms). Returns RESULTS.
              Real vendors, real prices, real availability live ONLY here.
                 │   (M4 routes the accepted result; M5 records the committed award)
M6  RECEIPT   run-day fulfillment + RECEIPT/ACCEPTANCE. Unit-appropriate acceptance test:
              timesheet (labor) / deliverable sign-off (service) / goods receipt (rental).
              THREE-WAY MATCH: award (M5) ↔ receipt (M6) ↔ invoice → release. Actuals +
              quality flow back to M5/Learning (pricing, reputation).
```

**Responsibility table (the prompt's explicit ask):**

| Procurement responsibility | Owner | Why this module |
|---|---|---|
| Originating the need | **M2** | demand must be deterministic and upstream; M5 inventing demand would corrupt the plan |
| Spec-determinacy (RFQ vs RFP) | **M2** signals → **M5** forks | determinacy is a property of the need, decided when the need is planned |
| Launching the request | **M4** | workspace is the initiator/consumer of the seam |
| Routing accepted results (by reference) | **M4** | workspace owns the Project overlay; results are references, never written into the abstract Project |
| **Spend authorization / approval chain** | **M4** (gate) | authority is a property of the actor + budget, which M4 holds; gated at `accept` |
| Supplier discovery (RFI analog) | **M5** | real-world candidate set |
| **Supplier qualification gate** | **M5** | only qualified candidates may bid; V2 verification gate |
| Solicitation (RFI/RFQ/RFP) | **M5** | real solicitation of real supply |
| **Bid leveling & comparison** | **M5** | normalize-to-the-need's-basis lives with sourcing |
| Award / PO / commitment record | **M5** | the binding real-world commitment |
| Fulfillment | **M6** | run-day reality |
| **Receipt / acceptance** | **M6** | receipt is a run-day fact; M5 must not pretend to know it |
| **Three-way match** | **M6** reconciles **M5 award** ↔ **M6 receipt** ↔ invoice | the reconciliation needs all three; sits where receipt is known |
| Close / actuals / reputation / pricing | **M6 → M5/Learning** | learning flows back from reality |

**Why this beats the monolith.** SAP Ariba / Coupa / Jaggaer / GEP each own the *entire* lifecycle in one
suite. That conflates three genuinely different things: **planning the need, sourcing the need, and
receiving the result.** ALH separates them across M2/M5/M6 with M4 as the authorizing initiator. The
benefits are concrete:
- **Immutable upstream**: the need (M2) can't be quietly rewritten by sourcing pressure (a real failure in
  suites where buyers re-spec to fit a favored vendor's bid).
- **Verify-don't-trust at the right seam**: receipt (M6) verifies against the award (M5); neither trusts
  the other. The three-way match falls out *naturally* from the decomposition instead of being a bolted-on
  control.
- **Replaceable modules**: M5's sourcing internals can change (new candidate sources, new comparison) with
  no change to how M4 launches/routes or how M6 receives — the modularity rule (`OPE_MODULAR_PIPELINE
  §7`).

---

## 12. Extraction matrix

| # | Idea | Universal problem | Origin / why invented | Universal? | ALH today | Owning module | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | RFI / RFQ / RFP split | match solicitation to how determined the spec is | one document over/under-constrained bids | Yes (core distinction) | implicit; no explicit fork | M2 signals → M5 forks | **ADOPT** (determinacy flag; reject 3-doc apparatus) |
| 2 | Supplier discovery | can't solicit who you haven't found | preferred lists → networks → demand-signal | Yes | demand-driven acquisition (`VENDOR §6`) | M5 | **ALREADY SOLVED BETTER** |
| 3 | Bid leveling & comparison | bids aren't comparable as written | lowest number rewards scoped-out bids | Yes | only "side-by-side display" — gap | M5 (level to M2 basis) | **ADOPT — top priority** |
| 4 | Procurement lifecycle state machine | skipping a state leaks money/trust | each missing state caused a specific failure | Yes | well-modeled (`RESOURCE_MARKET §5`) | distributed M2/M4/M5/M6 | **ALREADY SOLVED**; harden 2 states |
| 5 | Approval / spend authorization | not everyone may commit any amount | fraud, maverick spend, budget blowout | Yes (gate); chain length varies | not modeled | **M4** gate; M5 commit | **ADOPT** (threshold gate on accept) |
| 6 | Supplier qualification / compliance | unqualified vendor on regulated need = harm | gate-before-bid, not tiebreaker | Yes (absolute for safety) | V2 gate + safety asymmetry (`VENDOR §7,9`) | M5 | **ALREADY SOLVED BETTER**; ADOPT re-qualification expiry |
| 7 | Three-way match / receipt | paying for phantom/short deliveries | PO↔receipt↔invoice must reconcile | Yes | partial (actual-vs-quote at close) | **M6** receipt; matches M5 award | **ADOPT** (2nd priority) |
| 8 | Catalogs vs spot-buy | re-soliciting routine buys is wasteful | pre-negotiated price lists | Partial (repeat buys) | private/imported vendors ≈ catalog | M5 | **INVESTIGATE FURTHER** |
| 9 | Reverse auctions | extract lowest price on commodities | many interchangeable suppliers | No (narrow; often harmful) | absent, correctly | — | **REJECT** (wrong for ALH domain) |
| 10 | VMS staff-aug vs SOW services | labor-by-time ≠ outcome-by-deliverable | different value unit → different acceptance | Yes (the distinction) | Worker (pay band) vs Vendor (quote) split | M5 solicit; M6 accept | **ALREADY SOLVED**; ADOPT unit-specific acceptance |

---

## 13. Challenges to conventional wisdom

- **"Procurement is one system."** The biggest unexamined assumption in the suite world. It is not one
  system — it is *plan the need* (M2), *source the need* (M5), *receive the result* (M6), with
  *authorization* (M4) as a distinct concern. ALH's decomposition is **more correct**, not just different.
  The suites are monolithic for commercial reasons (lock-in), not engineering ones.

- **"Lowest compliant bid wins."** Bid leveling exists precisely because the lowest *written* number is
  usually the most *scoped-out* bid. The conventional shortcut rewards vendors for excluding scope. M5's
  job is to make bids *comparable*, then let a human choose — not to optimize an un-leveled number.

- **"Qualification is a scoring weight."** No — for regulated/safety needs it is an **absolute gate**, and
  a low bid must never override it. ALH already gets this right (`VENDOR §7` safety asymmetry) while many
  suites let qualification soften under price pressure. This is ALH being *more* principled than the
  incumbents.

- **"Reverse auctions extract value."** They extract *price* by destroying *relationship and quality* —
  and they require a commodity-with-many-suppliers precondition ALH's domain almost never meets. A famous
  mechanism that is simply wrong here.

- **"The procurement tool approves spend."** Authority is a property of the *actor and budget*, not of the
  *sourcing*. ALH can place the gate at M4's accept step — separating *who may commit* (M4) from *what is
  being committed* (M5) — which is cleaner than bolting approval onto the sourcing tool.

- **"Receipt is part of sourcing."** It is not — receipt is a *run-day fact* (M6). A sourcing module that
  claims to know delivery happened is trusting instead of verifying. The three-way match works *because*
  the award (M5) and the receipt (M6) come from different modules and must reconcile.

---

## 14. Top ideas for ALH M5 (ranked, with verdict)

1. **Bid leveling — normalize quotes to the M2 need's basis before comparison.** *Owner: M5.*
   **ADOPT (highest).** Today M5 only displays side-by-side; that is the exact failure procurement spent
   decades fixing. M5 already has the reference frame (the need's kind/quantity/basis). Surface
   includes/excludes and normalize units; never auto-pick (`UNKNOWN → ASK`). *Trade-off:* needs line-item
   structure on quotes.

2. **Three-way match — reconcile M5 award ↔ M6 receipt ↔ invoice before release.** *Owner: M6 reconciles;
   M5 award is one input.* **ADOPT.** Falls out naturally from ALH's decomposition; closes the
   pay-for-phantom-delivery hole. Unit-appropriate receipt: timesheet / deliverable sign-off / goods
   receipt.

3. **Spend-authorization gate on M4's accept.** *Owner: M4 gate; M5 commit.* **ADOPT.** Verify the award
   against the authorized envelope (M2 estimate/budget) and the actor's authority before accept. Length-1
   chain for solo organizers; extends to N for teams/clients/budget-owners. Cleaner than suite approval
   bolt-ons.

4. **Spec-determinacy fork — RFQ for closed specs, RFP (solicit *approach*) for open ones.** *Owner: M2
   signals → M5 forks.* **ADOPT (lightweight).** Most ALH events are under-determined, so RFP-style
   *proposals* matter; carry a determinacy flag on the need.

5. **Continuous re-qualification — verification/insurance/license *expiry*.** *Owner: M5.* **ADOPT.** The
   one gap in ALH's otherwise-superior qualification model: a V2 verification that never lapses is a latent
   safety hole.

6. **Unit-appropriate acceptance test (labor vs service).** *Owner: M6.* **ADOPT.** Honor the
   Worker(pay-band)/Vendor(quote) split through to acceptance: timesheet for labor, deliverable sign-off
   for services.

7. **Catalog short-circuit — pre-priced private/known vendor skips solicitation.** *Owner: M5.*
   **INVESTIGATE FURTHER.** The organizer's private network is already a proto-catalog; formalize but low
   urgency.

8. **Reverse auctions.** **REJECT.** Wrong precondition (no commodity-with-many-suppliers) and corrosive
   to the relationship-first, organizer-owns-the-relationship ethos.

**Net verdict on the seam.** ALH's *abstract-need → request → sourced-result-by-reference* decomposition is
a **stronger engineering decision than the monolithic procurement suite** — it separates the three things
suites conflate (plan / source / receive) and makes the three-way match and immutable-upstream guarantees
*structural* rather than bolted-on. The hard-won procurement engineering M5 must still absorb is narrow and
specific: **bid leveling, the three-way match, a spend-authorization gate, and re-qualification expiry** —
adopted as principles, not as enterprise apparatus.

---

_Research only. No UI, schema, API, payment-processor, or legal design. Consistent with
`OPE_MODULAR_PIPELINE_PRINCIPLE`, `RESOURCE_MARKET_ARCHITECTURE`, `VENDOR_NETWORK_ARCHITECTURE`,
`WORKER_NETWORK_ARCHITECTURE`, and the M4 Workspace seam (`OPE_V2_MODULE4_IMPLEMENTATION_SPEC`). Maps onto
the fixed ALH pipeline; does not redesign it._
