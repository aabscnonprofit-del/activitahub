# Organizer Growth Program — First 90 Days (V1)

> **Status:** Decided (2026-06-20). Permanent organizer growth program.
> **Type:** program of record — the canonical specification. Not an implementation; no code is
> described or implied here. Where this document and ad-hoc statements differ, this document governs.

---

## Principle

ActivLife Hub wants **active organizers**.

The purpose of this program is **not** to reward registration, training completion, or certification.
The purpose is to reward **real organizer activity** on the platform.

- The platform is willing to compensate onboarding costs for organizers who **actually begin
  organizing activities**.
- **Rewards are earned only through completed activities.**

---

## Part 1 — 90-Day Activity Program

- The program begins on the **organizer registration date**.
- The program lasts **90 days**.
- The 90-day period is divided into **three 30-day periods**.

| Period | Days | Requirement (minimum completed activities) | Reward |
|---|---|---|---|
| Period 1 | 1–30 | **3** completed activities | +1 month free organizer service |
| Period 2 | 31–60 | **5** completed activities | +1 month free organizer service |
| Period 3 | 61–90 | **7** completed activities | +1 month free organizer service |

**Maximum reward:** **3 free organizer months.**

### Important rule — when free months apply

- Free months are **earned during** the first 90 days but are **applied only after** the initial
  90-day period ends.
- The organizer **continues paying normal subscription fees during the first 90 days.**

---

## Part 2 — Training / Certification Cost Reimbursement

**Applies to:**

- New organizers who completed **training**.
- Experienced organizers who completed **certification**.

**Condition:** the organizer completes **at least 15 activities** during the first 90 days.

**Reward:** the platform **reimburses the full training or certification fee**.

**Form of reimbursement:**

- Credited to the organizer's **internal platform balance**.
- **Cannot be withdrawn as cash.**
- May be used for:
  - organizer subscription fees;
  - internal promotion;
  - future platform services.

---

## Part 3 — Activity Eligibility

Only **completed** activities count toward rewards. To count toward rewards, an activity must:

- be **created after** organizer registration;
- reach **Completed** status — as defined in `COMPLETED_ACTIVITY_SPEC_V1.md` (scheduled time occurred,
  not cancelled, organizer marked it successfully completed). Participant confirmations, reviews, ratings,
  payments, tickets, photos, and Stripe status are **not required** for Completed;
- not be excluded by **anti-fraud checks** (Part 4).

Anti-fraud (Part 4) determines which Completed activities **count toward rewards**; it does **not** change
whether an activity is Completed. An anti-fraud-excluded activity is still Completed for organizer
experience and platform statistics, but earns no reward credit.

**Recurring activities are allowed.** Examples:

- weekly yoga;
- language classes;
- walking groups;
- dance lessons;
- recurring community meetings.

**Each occurrence may count as a separate completed activity.**

---

## Part 4 — Anti-Fraud Controls

The platform **may exclude activities from reward calculations** if suspicious patterns are detected.
Example signals:

- no participants other than the organizer;
- large numbers of nearly identical activities;
- repeated artificial registrations;
- activity-creation patterns inconsistent with genuine participation;
- other signals indicating reward manipulation.

The platform **reserves the right to review and exclude suspicious activities** from reward
calculations.

---

## Part 5 — Promotion Rules

### One-time activities

Examples: weddings; conferences; festivals; birthday parties.

- **Primary promotional object:** the **activity** itself.
- Promotional links should point to the **activity page**.

### Recurring activities

Examples: yoga; fitness classes; walking clubs; language groups; recurring workshops.

- **Primary promotional object:** the **organizer**.
- Promotional links should point to the **organizer profile or recurring activity page** rather than
  to a single occurrence.
- The organizer profile should **automatically display upcoming occurrences**.
- Rationale: this prevents expired promotional links and allows long-term audience growth around the
  **organizer** rather than a single activity instance.

---

## Strategic Goal

- The platform does **not** seek to maximize revenue from organizer onboarding.
- The platform seeks to maximize the **number of active organizers and completed activities**.
- The 90-Day Program exists to accelerate organizer **activation, retention, and platform growth**.

---

*Specification of record. No implementation status is asserted here; building the program (reward
tracking, completed-activity counting, free-month crediting, internal-balance reimbursement,
anti-fraud exclusion, promotion-link behavior) is a separate, not-yet-scoped effort.*
