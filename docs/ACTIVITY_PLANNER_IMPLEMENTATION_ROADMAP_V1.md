> **STATUS: SUPERSEDED** — the current implementation roadmap is `ROADMAP_V2.md`. Kept for record.

# Activity Planner — Implementation Roadmap v1

> **Purpose:** turn the approved Activity Planner + Activity Execution System into a practical, buildable
> MVP roadmap. Implementation planning only — no new product ideas, philosophy, or academy work.
> **Sources:** `ACTIVITY_PLANNER_MVP_V1.md`, `ACTIVITY_PLANNER_OUTPUTS_V1.md`,
> `ACTIVITY_EXECUTION_AND_PROGRESS_SYSTEM_V1.md`, `OPE_V1_TECHNICAL_DESIGN.md`.
> **Date:** 2026-06-06

**Stack assumptions (already in place):** Next.js 15 (App Router, server actions), Supabase
(Postgres + RLS + RPCs), Stripe (checkout verified end-to-end), next-intl (en/es/fr/ru).

**Critical dependency — OPE Core (Phase 0).** The Activity Planner is the **consumer surface of OPE
Core** (Single Engine Strategy). It cannot generate plans until OPE Core exists: the scenario model,
the knowledge base (+ seeded launch categories), the LLM planner workflow (structured output), the
deterministic cost engine, and the plan object (`OPE_V1_TECHNICAL_DESIGN.md`). **OPE Core is the
biggest rock and is assumed built before — or as Phase 0 of — this roadmap.** Every estimate below
flags whether it assumes Core exists.

---

## 1. MVP definition

**Included in Activity Planner v1:**
- Consumer **questionnaire** → **plan generation** (via OPE Core) for the launch activity types
  (birthday, picnic, BBQ, family gathering, hobby/community get-together, casual celebration).
- **Preview → paid unlock** of the full plan (one-time per-plan purchase via Stripe).
- **Plan view**: summary, checklist/timeline, what-you'll-need, **budget range (raw)**, key reminders,
  communication templates; **export/print + share link**.
- **Activity dashboard** (execution): auto-derived **milestones**, progress %, **status badge**,
  **time-based + milestone reminders** (email + in-app), **risk monitoring** + **recommended actions**,
  **mark complete + wrap-up**.
- **Organizer escalation**: one-tap **convert plan → Event Request** (reuses existing request flow).
- **Conceptual vendor/resource nudges** (prompts only).

**Excluded from v1:**
- All organizer/professional features (proposals, quoting, margin, earning).
- Complex/high-stakes events in the consumer planner (routed to organizers).
- Vendor marketplace/booking or payments to vendors inside the planner.
- Live weather feeds, push/SMS, multi-user collaboration, calendar sync, multi-activity portfolio,
  detailed receipt-level expense tracking, regenerate/"deep plan" quotas.

---

## 2. User screens

| Screen | Purpose | Key actions | Required inputs | Required outputs |
|---|---|---|---|---|
| **Planner Landing** (`/plan-an-event`) | Sell the planner; entry point | Start planning | — | CTA → type selection |
| **Activity Type Selection** | Pick what they're planning | Choose a type; route complex → organizer | activity type | selected type (scenario seed) |
| **Questionnaire** | Capture scenario inputs fast | Answer ≤8 questions; smart defaults | guests, date, location, region, budget, vibe, notes | completed scenario |
| **Plan Generation** | Generate the plan | wait/progress | scenario | generated plan object |
| **Plan Preview + Paywall** | Show value, then charge | view preview; **pay**; sign-up | preview plan; payment | unlocked plan (post-payment) |
| **Plan View** | The full deliverable | read; export/print; share; "get a pro" | unlocked plan | checklist, budget, reminders, templates |
| **Activity Dashboard** | Help execute the plan | mark milestones/tasks; send templated messages; act on risks | activity state | progress %, status, next actions, alerts |
| **Day-of View** | Focused "today" checklist | tick tasks in order | day-of tasks | ordered today list |
| **Activity Complete / Wrap-up** | Close out | mark complete; thank-yous; feedback | completion | completed status; wrap-up actions |
| **Convert → Event Request** | Escalation to organizer | confirm; submit request | plan as brief | created Event Request (existing flow) |
| **Auth (reuse)** | Account at save/pay | sign-up / sign-in | credentials | session |

*Plan Generation, Preview, and Plan View can be states of one route (`/plan/[id]`); the Dashboard and
Day-of/Wrap-up are states of the activity workspace.*

---

## 3. User flow

```
Homepage / nav "Plan an Event"
   → Planner Landing
      → Activity Type Selection      (complex type → "get an organizer" → Event Request)
         → Questionnaire (≤8 Qs)
            → Plan Generation (OPE Core)
               → Plan Preview
                  → Sign up + Payment (Stripe)        ← paywall
                     → Plan View (unlocked)
                        → Activity Dashboard
                           → reminders + risk alerts + recommended actions  (loop until event)
                              → Day-of View
                                 → Activity Complete / Wrap-up
                                    → (optional) plan again · become an organizer
   Escalation branch (any time): "Get a pro" → Convert plan → Event Request → Marketplace
```

---

## 4. Database objects (conceptual only — no schema)

Major entities and how they relate (high level):
- **User** — the account (reuse existing `profiles`).
- **Activity** — one planned event a user owns (status, date, type, region). The execution workspace.
- **Scenario** — the questionnaire inputs that produced the plan (belongs to an Activity).
- **Plan** — the generated plan for an Activity (summary, checklist/timeline, resources, budget range,
  reminders, templates). Reuses OPE Core's plan concept.
- **Milestone** — an execution gate derived from the Plan (state: pending/done/overdue).
- **Reminder** — a scheduled nudge tied to the Activity (time- or milestone-based).
- **Risk** — a monitored concern on the Activity (type, severity, status, recommended action).
- **Purchase** — the one-time payment unlocking the Plan (Stripe reference).
- **Event Request** — created on escalation (reuse existing `customer_requests`).

Relationships: a **User** has many **Activities**; an **Activity** has one **Scenario**, one **Plan**,
many **Milestones / Reminders / Risks**, one **Purchase**, and optionally one **Event Request**.

---

## 5. Notifications

**Mandatory in v1 (email + in-app):**
- **Plan ready** (generation complete).
- **Payment receipt / unlock confirmation.**
- **Time-based reminders:** 30 / 14 / 7 / 3 / 1 days before + **day-of**.
- **Milestone/RSVP reminders:** e.g., RSVP deadline, venue not confirmed.
- **Critical risk alert:** when status hits Critical (urgent action / escalation offer).

**Deferred:**
- Push notifications, SMS.
- Live weather alerts (MVP uses a prompted manual check).
- Vendor-suggestion notifications, digest customization, quiet-hours/timezone tuning beyond basics.

---

## 6. MVP build order (one developer)

**Phase 0 — OPE Core (prerequisite).** Scenario model, KB + seeded launch categories, LLM planner
workflow (structured output), deterministic cost engine, plan object/persistence. *Nothing below
generates a plan without this.*

**Phase 1 — The payable plan (core value + revenue).**
1. Planner Landing + Activity Type Selection + Questionnaire.
2. Plan Generation (call OPE Core) → Plan Preview.
3. Sign-up + **Stripe payment** → unlock → **Plan View** (with export/print, comms templates).
*Outcome: a user can go from "I want to organize something" → a paid, complete plan.* This alone is a
shippable product.

**Phase 2 — Execution (make the plan succeed).**
4. Persist the Activity workspace; derive **Milestones**; **Activity Dashboard** with progress % + status.
5. **Reminders** (time + milestone) via email + in-app.
6. **Mark complete + wrap-up**; Day-of view.

**Phase 3 — Intelligence + escalation.**
7. **Risk monitoring** + **recommended actions**.
8. **Organizer escalation** → convert plan → Event Request (wire to existing request flow).
9. **Conceptual vendor/resource nudges.**

Rationale: ship the **payable plan** first (validates willingness to pay + exercises OPE Core), then the
execution layer that retains value, then the risk/escalation intelligence.

---

## 7. Time estimate (single full-stack developer)

*Estimates are for the Activity Planner surface and assume the noted Core state. Ranges, not promises.*

| Build | Scope | Estimate (excl. OPE Core) | Note |
|---|---|---|---|
| **Minimal MVP** | Phase 1 only (questionnaire → generate → pay → plan view + export) | **~2–3 weeks** | Shippable paid plan |
| **Realistic MVP** | Phase 1 + 2 (+ dashboard, milestones, reminders, complete) | **~5–7 weeks** | The recommended launch |
| **Full v1** | Phase 1 + 2 + 3 (+ risk monitoring, escalation, vendor nudges) | **~8–12 weeks** | Complete v1 |

**OPE Core (Phase 0) is separate and larger** — LLM workflow + KB authoring/seeding + cost engine +
structured output + persistence — realistically **~4–8 weeks** on its own depending on KB depth. **Add
this to any timeline above if Core isn't already built.** (+4 languages of consumer KB adds further
content time.)

---

## 8. Launch criteria

**Must work before the first paying customer:**
- Questionnaire → **credible plan generation** for the launch activity types (KB + pricing **seeded** for
  those categories).
- **Stripe payment** unlocks the full plan reliably (already verified end-to-end).
- **Account creation** + plan **saved** to the account.
- **Plan View** renders the full deliverable (checklist, budget range, reminders, comms templates) and
  **export/print** works.
- Works in at least the **launch language(s)** (confirm whether 1 or all 4 at launch).
- Basic legal/clarity: what the customer gets, refund stance.

**Can wait until after launch (fast-follow):**
- Full **dashboard / reminders / risk monitoring** (Phase 2–3) — strongly recommended but can ship
  shortly after a plan-only launch.
- **Organizer escalation** and **vendor nudges**.
- Push/SMS, live weather, multi-activity views, expense tracking.

**Recommended launch bar:** **Realistic MVP (Phase 1 + 2)** — a paid plan *and* the dashboard/reminders
that make it succeed — so the first customers experience the full "plan → pulled it off" value, not just
a document. If speed-to-revenue is paramount, **Minimal MVP (Phase 1)** is a valid earlier launch with
execution as the immediate fast-follow.

---

## Dependencies & risks (implementation)

- **OPE Core readiness** is the gating dependency for everything (Phase 0).
- **KB + pricing seeded** for launch categories — without it, generated plans aren't credible.
- **Pricing decision** for the planner unlock (figure/model) is still open — needed before the paywall
  goes live (Pricing currently shows "Coming soon").
- **Sign-up email-confirmation friction** sits right at the paywall (account at unlock) — a known
  activation risk flagged for future optimization; may dent Phase 1 conversion until addressed.

_Implementation planning only. No new product scope. No code, database, or API in this document._
