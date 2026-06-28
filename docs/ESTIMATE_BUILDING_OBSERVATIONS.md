# Estimate / Quote / Proposal Building — Cross-Industry Observations

> **Purpose:** understand how professionals **build, compare, revise, and present project estimates
> before work begins** — the mechanics of estimate-building as actually practiced across many
> industries.
> **This is NOT:** financial research, accounting, payment research, or budgeting-software research.
> It is about the *craft of estimating and quoting*. It **does not benchmark products, compare
> competitors, propose architecture, or invent solutions**, and it does **not** map findings onto any
> system. It records *how estimating works* — nothing more.
> **Status:** observations only. Changes no code, architecture, or pipeline.
> **Method:** the ten required dimensions are answered **synthesized across domains** (most mechanics
> recur in many industries); short per-domain profiles establish each domain's estimating unit and
> distinctive mechanic first. Cited methods/standards (e.g. AICP bid form, AACE estimate classes, CSI
> MasterFormat, MoSCoW, the cone of uncertainty, the CPQ pattern) are described as *industry
> conventions*, not as products to evaluate.

---

## Part 1 — How estimating works in each domain (brief profiles)

*(The estimating "unit," and the distinctive mechanic each domain contributes.)*

1. **Event proposals.** Unit: per-head costs + flat line items. Distinctive: **package tiers**
   (good/better/best) plus **à-la-carte add-ons**; **allowances** for not-yet-chosen items; the
   client-facing proposal is a branded document with inclusions/exclusions, accepted by signature +
   deposit.

2. **Construction estimating** *(the most mature discipline; many conventions originate here)*. Unit:
   **quantity × unit cost**, organized by **cost codes / work breakdown** (e.g. CSI MasterFormat
   divisions), built up from **quantity takeoff** off drawings and **assemblies**. Distinctive:
   **add/deduct ALTERNATES** against a base bid; **UNIT PRICES** for unknown quantities;
   **ALLOWANCES / provisional sums**; explicit **CONTINGENCY**; **overhead & profit (O&P)** markup
   separate from cost; **estimate classes** with declared accuracy (order-of-magnitude → definitive,
   e.g. AACE Class 5→1 with ranges like −50/+100% down to −5/+10%); **bid tabulation/leveling**;
   formal **change orders**; **value engineering** to reduce cost.

3. **Architecture proposals.** Unit: **fee** (percentage of construction cost / hourly / fixed),
   organized by **phases** (schematic → design development → construction docs → administration).
   Distinctive: scope-of-services with **exclusions** and **reimbursables**; scope growth handled as
   **additional services**; design **options/alternates**.

4. **Interior design estimates.** Unit: **per-item** (furniture/fixtures/equipment — "FF&E") line
   items. Distinctive: the literal **"Chair A / B / C"** — priced product **options** presented on
   spec boards for the client to select; **per-room allowances**; **trade pricing + markup**;
   prices that are **lead-time- and vendor-quote-dependent**; proposal = a specification book + FF&E
   schedule.

5. **Marketing agencies.** Unit: **deliverables** in a Statement of Work, priced as **hours × role
   rate** (a rate card), or retainer. Distinctive: **pass-through costs** (media spend, production)
   with markup; scope change → **change order / new SOW**; **estimate-vs-actual hours** tracked and
   reconciled.

6. **Video production.** Unit: a **standardized, categorized line-item bid** (pre-production / crew /
   equipment / locations / talent / post), with day rates. Distinctive: a widely-used **standard bid
   format** (e.g. the AICP bid form) that makes competing bids directly comparable; **bid-vs-actual**
   reconciliation; built-in **contingency** and "creative allowances."

7. **Consulting proposals.** Unit: **staffing × rates**, or **fixed-fee**, or **value-based**.
   Distinctive: **phased engagements with go/no-go gates**; an explicit **assumptions** section that
   *drives* the price (if an assumption breaks, the price changes); option menus; approval via
   SOW/master agreement.

8. **Software project quotations.** Unit: **effort estimate** (story points, T-shirt sizing,
   three-point/PERT). Distinctive: explicit **uncertainty as ranges** and the **"cone of
   uncertainty"** (accuracy improves as understanding grows); **fixed-bid / time-&-materials / capped
   T&M**; **MoSCoW** (must/should/could) as priced option tiers; **change requests**; deliberate
   **re-estimation** over time.

9. **Printing estimates.** Unit: **parametric from a spec** (size, stock, colors, finishing).
   Distinctive: **quantity-break price tables** — the same job quoted at several quantities (500 /
   1,000 / 5,000) so the buyer sees the **break points**; near-instant **re-quote** when the spec
   changes.

10. **Manufacturing quotations.** Unit: a **bill-of-materials (BOM) cost roll-up** (material + labor
    + overhead + margin). Distinctive: **volume/quantity-break pricing**; **tooling / non-recurring
    engineering (NRE)** separated from per-unit cost; quotes tied to a **revision-controlled
    drawing/spec**; "should-cost" reasoning; lead-time-dependent.

11. **Procurement comparison.** Unit: a **multi-supplier RFQ** normalized into a **bid tabulation**.
    Distinctive: **bid leveling** — normalizing quotes to a common line-item basis and adjusting for
    inclusions/freight/taxes/terms/lead time; **total-cost-of-ownership** normalization; **weighted
    scoring** (price + non-price criteria); award.

12. **B2B quotation (the "configure–price–quote" pattern).** Unit: a **configured product/bundle**
    priced by **rules**. Distinctive: **configuration constrained by compatibility rules**; **guided
    options/bundles**; internal **discount-approval workflows** before a quote is issued; **versioned
    quotes** and generated proposals with signature.

---

## Part 2 — The ten dimensions, synthesized across domains

### 1. How alternatives are represented (and how the choice affects the estimate)
Three recurring representations, often combined:
- **Selectable swap (one-of-N).** "Chair A / B / C," a stock grade, a material option: choosing one
  **recomputes the affected line(s)**; the total moves by the difference. *(Interior design,
  printing, manufacturing, CPQ.)*
- **Add/deduct alternates (deltas to a base).** A **base estimate** plus separately-priced
  **alternates** quoted as `+$X` or `−$X`. The decision-maker reads the base and adds/subtracts
  alternates to reach a number. *(Construction "bid alternates," video "extra shoot day," events.)*
- **Whole-estimate tiers (packages).** Good/better/best or scope tiers — each alternative is a
  *complete* estimate; choosing one selects the whole number. *(Events, marketing, consulting,
  software MoSCoW.)*

The common principle: **an alternative's effect on the estimate is expressed as a recomputed line, a
signed delta against a base, or a swap between whole versions** — and the estimate is built so the
*effect of the choice on the total is visible.*

### 2. How revisions are handled (evolve? versioning? approval? history?)
- **Estimates evolve continuously** — every domain treats the estimate as a living document until it
  is fixed.
- **Two modes divided by a baseline.** *Before* a baseline is set: **free revision** (working drafts,
  re-quotes). *After* a baseline (as-bid / as-sold / as-signed): **controlled change** only —
  formal **change orders / change requests / additional-services**, each a *priced delta* against the
  preserved baseline, requiring approval. *(Construction, consulting, software, marketing,
  architecture.)*
- **Explicit versioning.** Revisions are numbered/lettered and dated (Rev A/B/C, v1.0/1.1), usually
  with a **per-version change summary**.
- **History is preserved** for audit: who changed what, when, and *why* (the change-order log is the
  canonical artifact). The baseline is never overwritten; changes accrete as attributed entries.

### 3. How optional items are represented
- **Explicitly separated from the base.** Optional / add-on / à-la-carte lines are listed apart and
  **excluded from the base total until selected**; selecting moves them in.
- **Alternates** (construction) are a formal optional mechanism (priced but not in the base).
- **Allowances** stand in for a *not-yet-chosen* item — a held amount the buyer can later spend up or
  down. *(Construction, interior design, events.)*
- The intent is identical everywhere: **keep the committed base clean and show options as priced,
  selectable extras** so the buyer sees both the floor and the upside.

### 4. How uncertainty is represented
A rich, consistent vocabulary across industries:
- **Maturity labels** declaring how firm a number is: "estimate," "budgetary," "ROM" (rough order of
  magnitude), "not-to-exceed (NTE)," "firm," "TBD," "vendor-quote-dependent."
- **Declared accuracy class.** The estimate states its own expected accuracy — **AACE estimate
  classes** (5→1) in construction; the **cone of uncertainty** in software — so the reader knows the
  number's reliability *and that it will tighten*.
- **Ranges / three-point.** Low–likely–high; ±% bands; PERT. *(Software, construction, consulting.)*
- **Allowances & provisional sums** — a budget held for undecided scope, reconciled when chosen.
- **Contingency** — an explicit reserve line for the unknown.
- **Unit prices for unknown quantities** — price the unit, defer the quantity ("$/cubic yard, qty
  TBD"). *(Construction, manufacturing, printing.)*
- **Assumptions as conditions** — documented assumptions that, if false, re-open the price; the
  uncertainty is externalized as stated conditions. *(Consulting, software, agencies.)*

The pattern: **uncertainty is never hidden in a single number — it is labeled, bounded (range/class),
reserved (contingency/allowance), or externalized (assumptions/unit prices).**

### 5. How supplier quotations are compared
- **Bid leveling / bid tabulation** is the universal artifact: a matrix with **normalized line items
  down, suppliers across**, after adjusting each quote to a **common scope and terms** (inclusions,
  exclusions, freight, taxes, lead time) so numbers are apples-to-apples.
- **Standardized bid forms** (e.g. the AICP bid in video; structured RFQ templates in
  manufacturing/procurement) make quotes comparable *by construction*.
- **Total-cost normalization (TCO)** — comparing on landed/total cost and terms, not headline price.
- **Weighted scoring** — combining price with non-price criteria (lead time, qualification, quality).
- The recurring problem everywhere: **raw quotes are not comparable; the work is normalizing them to
  one basis before comparing.**

### 6. How commercial proposals are produced from estimates
- The **internal estimate** (detailed, cost-based, with markup visible) is transformed into a
  **client-facing proposal** (summarized, value-framed). They share the same numbers but differ in
  framing and detail.
- The proposal typically **hides internal cost+markup** (shows *price*, not cost), **rolls detailed
  lines into presentable groupings**, and adds standard sections: **scope/inclusions, exclusions/
  assumptions, options/alternates, the price (lump sum or schedule of values), terms, a validity
  period, and an acceptance block.**
- The proposal is a **derived view of the estimate**, versioned alongside it — change the estimate,
  re-issue the proposal.

### 7. How professionals explain price changes to clients
- **Never a silent total change.** The norm is a **change order / change request**: a documented
  delta stating **what changed, why, and the ± cost impact**, requiring sign-off.
- **Attribution to a cause.** Each change is tied to a reason — a scope addition, a quantity change,
  a **broken assumption**, a **vendor quote that came in higher**, an option the client selected.
- **Baseline-vs-revised comparison.** The old number, the new number, and the **line-by-line
  reasons** are shown together.
- **Allowance reconciliation.** "You held an allowance of $X for flooring; the selected item is $Y;
  the difference is $Z" — a structured way to explain a change as the resolution of a known unknown.
- **Estimate-vs-actual.** Where work is under way (agencies, video, software), changes are framed as
  estimate vs. tracked actuals.

### 8. How multiple estimate versions are managed
- **Numbered/lettered, dated versions**, each with a change summary.
- **One frozen baseline** (as-bid / as-sold) alongside **one working/current version**; only one is
  "current" at a time.
- **Status per version** — draft / issued / under approval / approved / superseded.
- **Prior versions retained** for history and audit; nothing is deleted.
- **Version comparison** ("what changed between Rev B and Rev C") is itself a first-class need.

### 9. How final approval happens
- A **discrete, recorded, usually human event** that converts the estimate into a **commitment**.
- **Client signature / e-sign** on the proposal or contract, frequently accompanied by a **deposit**
  on acceptance.
- **Internal approval first** in many B2B settings — margin/discount sign-off (the CPQ approval
  workflow) — *before* the quote is released.
- **Award** in bid settings (construction/procurement) — selection → letter of intent → contract/PO.
- A **validity period** bounds it ("quote valid for 30 days"); approval must occur within the window
  or the estimate is re-priced.
- After approval, the approved version becomes the **new baseline**, and further change re-enters the
  change-order cycle (Dimension 2).

---

## Part 3 — Dimension 10: Engineering ideas that survive across many industries

The mechanics that recur in nearly every domain above — the durable, cross-industry estimating
ideas:

1. **Line-item decomposition** — `quantity × unit cost`, organized by a code/breakdown structure
   (cost codes / WBS / BOM). The atomic building block everywhere.
2. **Cost vs. price separation** — build cost up, then apply **markup / overhead & profit / margin**;
   the internal cost number and the external price number are different views.
3. **Alternates as priced deltas** — a base plus signed add/deduct options.
4. **Options excluded from the base until selected** — keep the committed base clean.
5. **Allowances / provisional sums** — a held placeholder for undecided scope, reconciled later.
6. **Explicit contingency** — a named reserve for the unknown, separate from the line items.
7. **Unit prices for unknown quantities** — price the unit, defer the quantity.
8. **Declared estimate maturity/accuracy** — the estimate states how firm it is and that it will
   tighten (estimate classes; the cone of uncertainty; ROM/budgetary/firm labels).
9. **Ranges and three-point estimates** — uncertainty expressed as low/likely/high, not a false
   point.
10. **Assumptions as price conditions** — documented assumptions that, if false, re-open the price.
11. **Baseline + controlled change orders** — freeze a number, then change it only via attributed,
    approved, priced deltas; never silently.
12. **Versioning with one current version + retained history** — numbered, dated, status-tagged,
    auditable.
13. **Normalization before comparison (bid leveling)** — quotes are made comparable by reducing them
    to a common basis before they are compared; standardized bid forms encode this up front.
14. **Estimate → proposal as a derived view** — the same numbers reframed for the client, with
    inclusions/exclusions/terms/validity, hiding internal cost detail.
15. **Discrete signed approval that converts estimate → commitment**, bounded by a validity period.
16. **Estimate-vs-actual reconciliation** — closing the loop after the fact, feeding the next
    estimate (a learning input the more mature domains keep).

The deepest recurring shape across all of it: **an estimate is a structured, decomposed, and
*explicitly-uncertain* object that evolves through versions, separates a clean committed base from
options/alternates/allowances, is normalized when compared to others, is reframed (not re-authored)
into a client proposal, and is converted into a commitment only by a discrete, attributed approval —
after which it changes only through documented, approved deltas.**

---

*Observations only. No benchmark, product comparison, competitor analysis, architecture, solution,
or invented concept is proposed; no mapping to any system is made. Intended purely to record how
estimate-building works across industries.*
