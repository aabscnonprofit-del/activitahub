# Problem Definition — Event Finance (for the Organizer)

> **Purpose:** correctly define the *human financial problem* ActivLife Hub is trying to help an
> organizer with, from the moment a client submits a request until the event is completed. This is
> the basis for a later engineering benchmark — it is **not** that benchmark.
> **This document is NOT:** a solution, an architecture, a benchmark, a UI proposal, or
> implementation. It **invents no solutions** and names no products. It contains research questions
> and the problem they describe — nothing more.
> **Status:** problem definition only. Changes no code, architecture, or pipeline.
> **Grounding:** the organizer reality already established in
> `COGNITIVE_MODEL_OF_A_WORLD_CLASS_EVENT_ORGANIZER.md` and `REAL_ORGANIZER_DECISION_MODEL.md`. Where
> a claim varies by segment (consumer party vs. wedding vs. corporate vs. festival) it is flagged;
> the focus is recurring cross-segment patterns.

---

## 0. Framing — who the organizer is, financially

Before listing problems, one fact reframes all of them: **the organizer is a financial intermediary
who carries timing risk and outcome risk on someone else's event.**

- They sit **between the client's money and the vendors' costs.**
- They frequently must **commit money outward (vendor deposits) before money comes in (client
  payments)** — a timing/working-capital exposure.
- They are usually paid a **fee or margin** that a few bad estimates or one unre-quoted change can
  erase.
- Many of their financial moves are **irreversible** (money paid is gone; a booking is binding),
  made under **uncertainty** (the plan is still moving), against a **clock** (availability,
  deadlines).

So the organizer's financial problem is not "accounting." It is **deciding, under moving
uncertainty, when and how much to commit — and staying aware of where the money stands — so the
event is delivered without a loss, a cash gap, or an unrecoverable mistake.** Every question below is
a facet of that.

---

## 1. What financial problems does an organizer actually face, request → completion?

Organized by the lifecycle stage where the problem first bites.

### A. Inquiry / request received
- **Pricing the under-defined.** A client asks for an outcome ("a memorable 40th birthday") with no
  budget, or an unrealistic one. The organizer must form a cost expectation *before* investing time.
- **Is the budget real / is the client fundable?** Distinguishing a serious, affordable request from
  a fantasy — to avoid spending unpaid hours on something that can never be financed.
- **What do I charge for *me*?** Setting their own fee/margin model (flat, percentage, cost-plus)
  for this kind of event.

### B. Quoting / proposing → agreement
- **Building a budget out of estimates.** Most line items (venue, catering, staff, rentals, décor)
  are *estimates*, not yet quotes. Assembling a credible total from uncertain parts.
- **Win-without-losing pricing.** Quoting high enough to cover cost + fee, low enough to win — and
  not discovering later that the quote was below true cost.
- **Contingency / buffer sizing.** How much slack to reserve for the unknown without pricing
  themselves out.
- **Securing commitment both ways.** A client deposit/retainer to commit the client; vendor
  deposits to hold suppliers — each with its own terms.

### C. Sourcing / committing suppliers
- **Estimate → real quote.** Turning a number into a firm, comparable quote; comparing quotes that
  are *not* apples-to-apples (different inclusions, units, terms).
- **Commitment timing.** When to book a vendor: too early invites change/waste, too late loses price
  or availability. A judgment about *irreversibility vs. scarcity*.
- **Deposit terms & cancellation exposure.** Each vendor has a different deposit %, payment schedule,
  and (often non-refundable) cancellation policy. Committing creates a real, sometimes unrecoverable,
  liability.
- **Cash-flow / float.** Paying vendor deposits before the client's money has fully arrived — a
  working-capital gap the organizer must bridge.

### D. Preparation (between agreement and event day)
- **Estimate vs. committed vs. actual.** Three different numbers for the same thing (what I planned,
  what I've now committed to pay, what I will actually pay). Keeping them straight, and the running
  total honest.
- **Re-pricing on change.** Client changes scope (more guests, an upgrade, a new request); the cost
  moves; the question of *who pays for the change* and how it is re-quoted and re-approved.
- **Final counts / guarantees drive final cost.** Per-head costs (catering, seating) only firm up at
  a final-headcount deadline; missing it is costly.
- **Collecting the balance; paying vendors on schedule.** Timing the inbound balance and the
  staggered outbound vendor payments.
- **Margin protection.** Ensuring the fee/margin survives all of the above.

### E. Event day / execution
- **Unplanned, unapprovable-in-time spend.** Overtime, last-minute additions, emergencies — money
  decisions with no time for a normal approval.
- **On-site authority.** Who may spend, up to how much, on the day.
- **Cash, tips, gratuities.**

### F. Completion / closeout
- **Reconciliation.** Actuals vs. budget; explaining the variance.
- **Final settlement.** The client's final bill; the vendors' final payments; releasing or forfeiting
  deposits.
- **Disputes, damages, refunds.**
- **Profitability.** Did this event actually make money? The organizer's own per-event result.
- **Records** for their own accounting/tax obligations.

---

## 2. Which of these problems belong inside ActivLife Hub?

ActivLife Hub's purpose is to help an organizer **turn an approved client dream into a successfully
delivered real-world event.** The financial problems that are *in-domain* are the ones that are
**part of planning, deciding, and coordinating that delivery** — i.e. the organizer's **financial
reasoning and financial awareness across the event lifecycle:**

- Forming and maintaining a **cost expectation / estimate** for an evolving plan.
- Understanding the **financial consequence of plan changes** (this change costs X; can I cover it).
- Tracking **estimate → committed → actual** as one coherent, honest picture tied to the plan.
- Knowing the **reversibility and timing** of each commitment (is this still safe to change?).
- Surfacing **cash-flow timing risk** (I will owe money out before money comes in).
- Supporting **who-may-commit-what** (authorization of spend as a planning decision).
- **Reconciliation and per-event variance/profitability** as a learning signal for next time.

The common thread: these are about **decisions and awareness that keep the event deliverable and the
organizer whole** — the same domain as the rest of the platform. They belong because they are
*inseparable from planning the event*.

---

## 3. Which problems explicitly do NOT belong inside ActivLife Hub?

ActivLife Hub is **not a bank, not a payment processor, not an accountant, not a tax authority, and
not the client's financier.** These are out-of-domain — they belong to other parties/tools and only
*touch* the organizer's world:

- **Moving and custodying money** — processing payments, holding funds/escrow, settlement rails, card
  compliance. (Banks / payment processors.)
- **The organizer's general bookkeeping, ledgers, and tax filing/compliance** — double-entry
  accounting, VAT/sales-tax computation and returns, financial statements. (Accounting software /
  accountants.)
- **Payroll** for the organizer's own employees. (Payroll systems.)
- **The client's financing** — how the client funds the event (savings, loans, corporate budgets).
- **The vendor's internal economics** — a vendor's own cost structure, margins, and books.
- **Legal contract drafting / enforcement** — the legal instrument of a contract (vs. the *decision*
  to commit).
- **Currency exchange / cross-border money movement / financial regulation.**

ActivLife Hub may need to *reference* or *hand off to* these, but **solving them is not its problem.**
The boundary: ActivLife Hub helps the organizer **decide and stay aware**; it does not **hold money,
keep the books, or carry legal/financial-institution obligations.**

---

## 4. Which problems are solved today by existing software?

*(Category-level coverage only — no product comparison, no evaluation. This maps where a problem
already has tooling, to later scope what is genuinely unaddressed.)*

- **Money movement & collection** — payment processing, online deposits/invoicing, card/bank
  transfers: well-served by dedicated payment/processing tools.
- **Bookkeeping, invoicing, tax records** — recording transactions, generating invoices, producing
  statements: served by accounting/bookkeeping software.
- **Generic budget arithmetic** — line items, totals, simple roll-ups: served by spreadsheets and by
  budget features inside some event/CRM tools.
- **Quote/contract storage and e-signature** — storing a proposal and capturing agreement: served by
  document/CRM tools.

These address the **transactional and record-keeping** layer — *moving money* and *writing down what
happened.*

---

## 5. Which problems are solved manually (judgment, spreadsheets, memory)?

The **reasoning** layer is mostly manual:

- **Cost estimation of an under-defined event** — expert judgment and analogy.
- **Re-pricing when the plan changes** — recomputed by hand, often missed.
- **Estimate vs. committed vs. actual tracking** — a hand-maintained spreadsheet, frequently stale.
- **Commitment-timing decisions** — pure judgment ("book the venue now, hold the caterer").
- **Cash-flow / float management** — tracked in the organizer's head or a side sheet (what's due out
  before what's due in).
- **Margin protection across change** — watched manually, eroded silently.
- **On-site spend decisions** — improvised within an unwritten authority.
- **Reconciliation and "did I make money"** — a manual after-the-fact tally, if done at all.

The pattern: **software handles the transactions; humans handle the financial judgment tied to the
moving plan** — and that judgment is where money is actually won or lost.

---

## 6. Which problems are ignored by today's tools?

The gaps are precisely where **money meets the evolving plan and the clock:**

- **The plan ↔ money link.** A plan change's financial consequence is not connected to the plan;
  tools record costs, they don't reason "this change costs X against your remaining budget."
- **Commitment reversibility.** Nothing tracks *which* commitments are still safe to change vs.
  already irreversible (deposit paid, cancellation window closed).
- **Cash-flow timing across the deposit-before-payment gap.** The single most dangerous organizer
  exposure — owing vendors before the client pays — is largely untracked by event tooling.
- **Per-event margin / profitability across the lifecycle.** The organizer's own result is rarely
  surfaced *while it can still be protected.*
- **Financial risk of the plan.** A risk (vendor no-show, weather cancellation) has a *financial*
  size (a forfeited deposit); the financial weight of risk is not modeled.
- **Decision-time awareness.** "What does *this* decision cost me, can I undo it, and can I afford
  it?" — the question an expert asks before every commitment — has no home.

In short: today's tools serve **transactions and records**, not **financial decision-making and
awareness over a moving plan.** That gap is the candidate problem.

---

## 7. What information does an organizer need *before* each financial decision?

A decision → required-information map (information needs only; no mechanism):

| Financial decision | Information needed before it |
|---|---|
| **Whether to pursue / quote a request** | scope & desired outcome, rough headcount, date, location, the client's budget/expectation and seriousness, comparable costs, own fee model, degree of uncertainty |
| **What price to quote** | the estimated cost build-up, contingency for uncertainty, own required margin, the client's willingness/ceiling, competitive context |
| **Whether/when to commit a vendor (pay a deposit)** | the firm quote, the deposit %, the cancellation/refund terms (reversibility), availability/scarcity, how stable the plan is (likelihood of change), current cash position vs. money already collected, the vendor's reliability |
| **Whether to accept a client change** | the cost delta of the change, whether the client will pay it, the impact on margin and on already-committed items, re-approval status |
| **When to collect the client balance / pay vendors** | the agreed amounts and schedules, what's due out and when vs. due in, the float gap |
| **On-site / day-of spend** | budget remaining, authority limit, reversibility, urgency |
| **Closeout (settle, release/forfeit deposits)** | actuals vs. budget, outstanding balances both ways, any disputes/damages, the per-event result |

The recurring inputs behind almost every decision: **how much, by when, how reversible, can I afford
it, and how uncertain is it.**

---

## 8. Which financial decisions are *irreversible*?

The decisions where money leaves or a binding obligation is created — undoable or undoable only at a
penalty:

- **Paying a (non-refundable) deposit / retainer** to a vendor.
- **Signing a vendor contract** with a cancellation penalty or minimum.
- **Committing the date / venue** (often the first and most binding commitment).
- **Final vendor payments.**
- **Guarantee/final-count commitments** (billed on the guarantee even if reality is less).
- **The client agreement itself** (the organizer is now on the hook to deliver at the agreed price).

These are the high-stakes points: an expert slows down, confirms, and checks affordability and
reversibility before each (per the cognitive model's reversibility heuristic). **Getting one of
these wrong is where an event loses money.**

---

## 9. Which financial decisions are *revised repeatedly* during planning?

The "soft," low-commitment numbers that churn throughout — cheap to change, dangerous to leave stale:

- **The overall budget estimate** and its individual **line-item estimates.**
- **Guest count → cost** (the single biggest cost driver, moving until the guarantee).
- **The proposal price** during negotiation.
- **Contingency / buffer** as certainty grows.
- **Scope** — items added, removed, upgraded, downgraded.
- **Which vendor at which price** (while still only estimating, before commitment).

The contrast with §8 is the heart of the problem: **planning is a long sequence of cheap revisions
that must converge into a small number of expensive irreversible commitments** — and the organizer
must know, at every moment, *which kind of decision they are making.*

---

## 10. What is the desired end state for the organizer?

The event is delivered, and financially the organizer ends in this state:

- **Fully paid, with margin intact** — the client has paid; all vendors are paid; the organizer's
  fee/margin survived the plan's changes.
- **No surprises** — no cost appeared that wasn't anticipated, re-quoted, or covered; the final
  number matched the understood plan.
- **No cash gap ever opened** — they were never caught owing more than they had collected.
- **No irreversible mistake** — they never committed money they couldn't recover or afford, and
  every binding commitment was a deliberate, informed choice.
- **Every change was paid for** — scope drift was re-priced and re-approved, not absorbed silently.
- **Clean settlement** — deposits released or fairly forfeited; no lingering disputes or liabilities.
- **They know the result** — they can say exactly what the event cost and what they earned, and carry
  that lesson into the next event.

Stated as one sentence: **the organizer wants to reach the end of the event having delivered it,
been paid in full, kept their margin, never been caught short or trapped by an irreversible
commitment, and to know precisely where every dollar went.**

The *absence* of this end state — surprise costs, eroded margin, a cash gap, a non-refundable deposit
on an event that changed, an unrecovered loss, a fuzzy "I think I made money" — is the problem.

---

## What this defines for the later benchmark (problem statement, not a solution)

The engineering benchmark that follows should treat this as its target:

> **How does an organizer make sound financial decisions and stay financially aware across an event's
> lifecycle — estimating under uncertainty, knowing the reversibility and timing of each commitment,
> seeing the consequence of every plan change, never opening a cash gap, and protecting their margin
> — given that they are a risk-carrying intermediary between the client's money and the vendors'
> costs, and that today's tools serve transactions and records but not this decision-making?**

It should respect the §2/§3 boundary (decision-and-awareness, **not** banking, accounting, tax, or
money custody), and the §8/§9 distinction between irreversible commitments and repeatedly-revised
estimates. **No solution, architecture, or product is proposed here — only the problem.**

---

*Problem definition only. No implementation, UI, architecture, benchmark, or invented solution.*
