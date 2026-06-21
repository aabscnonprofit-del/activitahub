# Completed Activity — Specification (V1)

> **Status:** Decided (2026-06-20). Product rule of record.
> **Purpose:** define exactly what makes an activity **Completed** on ActivLife Hub, what Completed
> is used for, and what must **not** affect it. This is the single source of truth for the
> "completed activity" unit referenced by the Organizer Growth Program and platform statistics.

---

## 1. Definition

An activity is **Completed** if **all three** conditions hold:

1. **Its scheduled time occurred** — the activity's scheduled date/time has passed.
2. **It was not cancelled** — the activity was not cancelled before or during its scheduled time.
3. **The organizer marked it as successfully completed** — an explicit, organizer-initiated
   confirmation that the activity happened successfully.

All three are **required**. The scheduled time passing, on its own, does **not** make an activity
Completed — the organizer's explicit mark is required. A cancelled activity can **never** be
Completed.

## 2. What is explicitly NOT required

Completed status does **not** require, and must **not** be gated on, any of the following:

- participant confirmations or RSVPs;
- a minimum participant count (an activity with no confirmed participants can still be Completed);
- reviews or ratings;
- payments, invoices, or any Stripe / Stripe Connect status;
- tickets sold;
- photos or media;
- any other evidence of the activity.

**Completed is an organizer-attested fact that the activity happened and was not cancelled — nothing
more.**

## 3. What Completed Activity is used for

Completed Activity is the counting unit for:

- **Organizer experience** — the organizer's track record of real activities run;
- **Organizer Growth Program** — the 3 / 5 / 7 per-period milestones and the 15-in-90 threshold
  (see `ORGANIZER_GROWTH_PROGRAM_90_DAYS_V1.md`);
- **Training reimbursement credits** — eligibility toward the training-fee reimbursement;
- **Certification reimbursement credits** — eligibility toward the certification-fee reimbursement;
- **Platform statistics** — counts of real activities that actually happened.

## 4. Separation of concerns (hard boundary)

The following are **separate systems** and must **not** affect whether an activity is Completed:

- **Reviews, ratings, reputation, trust scores.**
- **Stripe / payment / payout status.**

The dependency is **one-directional only**:

- Completed Activity **may feed** statistics, experience, reputation inputs, and reward eligibility.
- Reviews, ratings, reputation, and Stripe status **may never** be an input to Completed status.

A Completed activity with no reviews, no payments, and no Stripe account is fully Completed. A
five-star-reviewed or fully-paid activity that the organizer did **not** mark completed (or that was
cancelled) is **not** Completed.

## 5. Relationship to existing lifecycle terms (clarification, not new architecture)

- **Completed Activity (this spec)** is an **activity-level**, organizer-attested fact used for
  experience / rewards / statistics.
- It is **distinct from**:
  - the OPE event-lifecycle **Closed** state (actuals captured + reconciled + learning emitted) —
    Closed/actuals are **not required** for Completed;
  - the **booking** lifecycle's `completed` status (an agreement/money record) — booking completion
    and its payment/Stripe status are **independent** of Completed Activity.

Completed = "it happened and the organizer says so." Reconciliation, learning, payment, and
reputation are downstream and separate.

---

## 6. Document consistency audit — contradictions to update

The following existing documents conflict with, or are not yet aligned to, this rule. Listed by
severity. *(Audit only — no other document is modified here.)*

### Must update (direct contradiction)

1. **`OPE_CORE_V2_CHANGE_PLAN.md` — C7 "outcome-based completion."**
   - Conflict: C7 (`:46`, `:133`) flags current "completion = 'event happened' (not outcome)" as a
     gap and proposes "**completion is defined against the requested outcome**." This **contradicts**
     this spec, which defines Completed precisely as *event happened + not cancelled + organizer mark*,
     with **no** outcome evidence required.
   - Required change: re-scope C7 so **outcome reconciliation belongs to Closed / learning**, not to
     Completed. Completed must remain outcome-evidence-free.

2. **`ACTIVITY_EXECUTION_AND_PROGRESS_SYSTEM_V1.md` — Completed definition (`:203`).**
   - Conflict: "**Completed** — the user marked the activity done (**or the date passed and it's
     confirmed**)." Two mismatches: (a) "the user" (consumer/Activity-Planner surface) vs this spec's
     **organizer** mark for the reward/stat unit; (b) "or the date passed" implies an
     **auto-complete-by-date** path, but this spec requires an **explicit organizer mark** (date
     passing alone is necessary, not sufficient).
   - Required change: align the Completed trigger to require the explicit mark, and disambiguate the
     consumer "done" badge from the organizer-attested Completed Activity used for rewards/stats.

3. **`ORGANIZER_GROWTH_PROGRAM_90_DAYS_V1.md` — anti-fraud vs participant-free Completed (Part 3 & 4).**
   - Conflict: Part 3 conditions a counted activity on "satisfy **anti-fraud checks**," and Part 4
     lists "**no participants other than the organizer**" as an exclusion signal — yet this spec says
     participants are **not required** for Completed.
   - Required change: clarify that anti-fraud excludes an activity from **reward counting only**, not
     from **Completed status**. An activity can be Completed (experience + statistics) while being
     excluded from rewards by anti-fraud. The program's "completed activities" = Completed (per this
     spec) **minus** anti-fraud-excluded, for reward purposes.

4. **`ORGANIZER_CAREER_PATH_V1.md` / billing & bookings — "completed booking" tied to payment.**
   - Conflict: career path "S7 First Income — Receives payment for the **completed booking** via
     Stripe," plus the booking lifecycle's `completed` status (`complete_booking()` RPC) and the
     Final Billing Architecture (money via Stripe Connect). These attach "completed" to a
     **payment-bearing booking**, which can be conflated with Completed Activity — but this spec
     forbids Stripe/payment from affecting Completed.
   - Required change: state explicitly that **booking `completed`** (an agreement/money event) is a
     **separate** concept from **Completed Activity** (organizer-attested, payment-independent), and
     that neither implies the other.

### Should align (gap / wording, no hard contradiction)

5. **`OPE_EVENT_LIFECYCLE.md` — Completed state (`:33`, `:108-110`).**
   - Status: largely consistent ("Completed = the event physically happened and ended"; "Cancelled =
     terminated before completion"). Gap: it presents Completed as a **physical** state without the
     explicit **organizer-mark** prong, and pairs it tightly with the actuals→Closed pipeline.
   - Required change: add the organizer-mark prong to the Completed definition and note that **Closed
     / actuals / learning are not prerequisites** for Completed-as-reward-unit.

6. **Implementation reality — activities have no `completed` status (architecture gap).**
   - Status: per `IMPLEMENTATION_GAP_AUDIT_V2.md` (Area 5) and `ORGANIZER_GROWTH_PROGRAM_GAP_AUDIT.md`
     (Area 5), the `activities` status enum is `draft | published | archived` — there is **no
     activity-level Completed**; only **bookings** carry `completed`. This spec defines an
     activity-level Completed that the data model does not yet represent.
   - Required change: record this as the foundational build gap for the Completed Activity unit.
     *(Out of scope to implement here — noted so the architecture docs reflect the requirement.)*

### Compatible — no change required (recorded for clarity)

7. **`MARKETPLACE_TRUST_MVP.md` — "completion/cancellation history" as a future trust input (`:112`).**
   - Consistent with this spec's one-directional rule: Completed Activity **may feed** trust/reputation
     statistics. The forbidden direction (reviews/ratings/reputation feeding Completed) is not present.
     No change needed; the dependency direction is correct.

---

*Specification of record + consistency audit. No implementation, no schema, no billing change is made
here; the audit lists where other documents must be reconciled to this rule.*
