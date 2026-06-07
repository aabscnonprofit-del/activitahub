# Activity Execution & Progress System — v1

> **Purpose:** design the system that helps a user **successfully execute** an activity *after* the plan
> has been generated. This layer sits on top of the Activity Planner.
> **Not** about creating a plan — the plan already exists. About **getting the user to a successful
> real-world activity.**
> **Type:** product/system design (conceptual). No code, database, or API.
> **Sources:** `ACTIVITY_PLANNER_MVP_V1.md`, `ACTIVITY_PLANNER_OUTPUTS_V1.md`,
> `OPE_V1_TECHNICAL_DESIGN.md`, `MASTER_PRODUCT_DECISIONS.md`, `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md`.
> **Date:** 2026-06-06

**Guiding principle (Organizer Philosophy):** *prevention over recovery.* This system's whole job is to
**spot trouble early and nudge the user to act before it becomes a problem** — turning a static plan
into a living guide that quietly makes sure the event actually happens, and happens well. The human is
the hero; we help (Brand §2). It is part of the **paid Activity Planner product** — the value the user
keeps receiving after purchase.

---

## 1. User journey after plan generation

```
Plan generated (purchased)
   ↓  the plan becomes a living "activity workspace"
Setup        → confirm the date, pin the essentials
Active prep  → work the checklist; system tracks progress + sends reminders
Final week   → tighten everything; resolve any risks; confirm headcount
Day-of       → a focused "today" view of what to do, in order
Wrap-up      → mark complete; thank-yous & feedback (templates)
   ↓
Activity completed  →  optional: plan again / hand future events to a pro / become an organizer
```

The moment a plan is unlocked, it stops being a document and becomes a **tracked activity**: milestones,
a countdown, reminders, risk-watching, and a clear "what to do next." The user is never left staring at
a checklist wondering if they're on schedule.

---

## 2. Progress tracking

**Milestones (gates), not every task.** The system derives a small set of meaningful milestones from
the plan and scenario — the things that decide whether the event happens. Typical set:

- ☐ **Date selected**
- ☐ **Venue/location confirmed**
- ☐ **Invitations sent**
- ☐ **Headcount / RSVPs confirmed**
- ☐ **Key vendor(s) confirmed** *(if the plan includes any — e.g., entertainer, caterer)*
- ☐ **Supplies / food purchased**
- ☐ **Final confirmation** (everything ready; day-of plan set)
- ☐ **Activity completed**

Milestones are **adaptive** — a backyard birthday won't show "permit," a park BBQ will show "venue/
permit"; a vendor milestone only appears if the plan has a vendor.

**How progress is shown:**
- A simple **progress bar / percentage** (milestones completed ÷ applicable).
- An **overall status badge** — *On Track · At Risk · Critical · Completed* (§9).
- A **countdown** to the event date (or "set a date" prompt if none yet).
- The **milestone list** with states: done · upcoming · **overdue**.
- A short **"what to do next"** focus (top 1–3 actions) so progress always has an obvious next step.

---

## 3. Reminder system

Two reminder kinds, kept gentle (no spam — at most one digest per horizon, plus urgent risk alerts):

**A. Time-based, relative to the event date:**
| Horizon | Focus of the nudge |
|---|---|
| **30 days before** | Lock the date, send invitations, book anything in demand (vendor/venue). |
| **14 days before** | Chase RSVPs, finalize menu/supplies plan, confirm vendors. |
| **7 days before** | Confirm headcount, buy non-perishables, weather check (if outdoor). |
| **3 days before** | Final shop, confirm vendors & helpers, prep day-of plan. |
| **1 day before** | Set up what you can, pack kits, recap the day-of flow. |
| **Day of** | A focused, ordered "today" checklist. |

**B. Milestone- & risk-based (event-relative isn't enough on its own):**
- "RSVP deadline is tomorrow — chase non-responders" (with one-tap reminder template).
- "You haven't confirmed a venue yet" (when a horizon passes with the gate still open).
- "Forecast looks wet — confirm your backup" (outdoor, near date).

**No fixed date yet?** Reminders become **milestone-relative** ("you set a date 3 days ago — invites are
the next step") and the first nudge is always *"pick a date to unlock your timeline."*

Channels (conceptual): **in-app + email** at MVP. Each reminder links straight to the relevant tasks.

---

## 4. Risk monitoring — "this activity may fail"

The system continuously compares **what's done** against **what should be done by now** (timeline) and
**what the plan flagged** (OPE risk model). Detection signals:

| Risk | How it's detected |
|---|---|
| **No venue/location** | Venue milestone still open as the date nears (horizon thresholds). |
| **Low RSVP response** | Confirmed count well below expected as the RSVP deadline approaches. |
| **Budget exceeded** | Logged/known spend trending above the plan's estimate range. |
| **Vendor not confirmed** | A required vendor milestone open close to the date. |
| **Weather concern** | Outdoor event + unfavorable outlook near the date (MVP: a prompted check, see §10). |
| **Missing critical task** | A safety/critical item (e.g., allergy plan, supervision, backup) unchecked near day-of. |
| **Stalled progress** | Little/no milestone movement while the date approaches. |

Each risk carries a **severity** and **time-sensitivity**. True to *prevention over recovery*, the
system raises them **early** — when there's still time to act — not on the day.

---

## 5. Recommended actions

Every surfaced risk comes with a **clear, specific next action** — never just an alarm:

| Risk | Recommended action |
|---|---|
| No venue | "Confirm where it'll happen." → quick options incl. (conceptual) venue suggestions (§7). |
| Low RSVP | "Send a reminder to non-responders." → one-tap using the reminder template. |
| Budget exceeded | "Review your costs — here's where it's running high, and the easiest things to trim." |
| Vendor not confirmed | "Confirm your [vendor], or pick an alternative." → (conceptual) suggestions (§7). |
| Weather | "Confirm your wet-weather backup (shade/indoor/rain date)." |
| Missing critical task | "This one matters for safety — complete it before the day." (highlighted, not skippable silently). |
| Stalled | "Let's get one thing done today: [the single most important next step]." |

Actions favor **one tap** (send a templated message, mark a milestone, set a backup). The dashboard
always answers "what should I do right now?"

---

## 6. Organizer escalation

When DIY success is genuinely at risk — or the event has outgrown the user — the system offers a
**calm, helpful** path to a professional (not a guilt trip). Triggers:

- **Scope outgrew DIY** — guest count/complexity rose past the consumer comfort zone (Planner §2 thresholds).
- **Multiple unresolved critical risks** close to the date (high failure probability).
- **Stalled with the clock running** — low progress + approaching date.
- **High-stakes / high-duty signals** — safety-heavy elements the user isn't handling.
- **User asks** — an always-available "this feels like a lot — get help" option.

The offer: *"This is getting big. Want a professional to take it from here?"* → **one tap converts the
plan into an Event Request** (the Planner §8 bridge): the work already done becomes the brief, and
certified organizers can respond. The user loses nothing — they keep the plan, and gain a safety net.
This is also the **demand→supply loop** (Brand §6) in action.

---

## 7. Vendor / resource recommendations *(conceptual only — no marketplace implementation)*

The system suggests sourcing a resource **when the plan needs it, the user hasn't secured it, and time
matters**:

| Resource | When suggested |
|---|---|
| **Venue** | No venue confirmed and the date is near, or guest count exceeds a home/park. |
| **Catering** | Food at a scale that's hard to self-cater (large headcount). |
| **Entertainer** | Plans that benefit from it (e.g., kids' party) and the user wants help. |
| **Equipment** | Tent/canopy, AV/sound, grill, seating, restrooms for outdoor/large events. |
| **Transportation** | Multi-site events, parking constraints, or many guests needing transit. |
| **Contractors** | Specialized setup the user can't do themselves. |

At MVP these are **conceptual nudges** ("you may need a canopy for 30 guests outdoors — here's how to
sort it") that can later link to a vendor directory or convert into an Event Request. **No marketplace
transactions are built here.**

---

## 8. Activity dashboard

After purchasing the plan, the user lands in their **activity workspace** — the home base for execution:

- **Header:** activity name · date + **countdown** · **status badge** (On Track / At Risk / Critical /
  Completed) · **progress %**.
- **"What to do next":** the top 1–3 actions (including any risk-driven ones) — the single most useful
  panel.
- **Milestones tracker:** the gates (§2) with done/upcoming/overdue states.
- **Risk alerts:** any active risks with their recommended action (§4–§5); empty and reassuring when all
  is well.
- **Upcoming reminders / timeline:** what's coming and when.
- **Budget snapshot:** the plan's estimate range, with optional simple "what I've spent so far" tracking.
- **Quick actions:** send invitation/reminder (templates), mark tasks/milestones, export/print the
  checklist, and **"Get a pro"** (escalation).
- **Tone:** calm, encouraging, never nagging — "you've got this, here's the next step." If the user has
  more than one activity, a simple **list** lets them switch; each activity has its own workspace.

The day-of view collapses to a **focused "today" checklist** in order, so the dashboard is useful right
up to the moment the event happens — then flips to **wrap-up** (mark complete, thank-yous, feedback).

---

## 9. Success metrics (status definitions)

The status badge is computed from milestone timeliness + active risks:

- **On Track** — applicable milestones are on schedule for the timeline; no high-severity unresolved
  risks. *(Reassure, light-touch reminders.)*
- **At Risk** — one or more milestones overdue, or a medium-severity risk is active; still recoverable
  with prompt action. *(Surface the fix clearly.)*
- **Critical** — a critical milestone is missing/overdue with the date close, or multiple/high-severity
  risks are unresolved — the activity may fail without urgent action. *(Strong nudge + offer organizer
  escalation.)*
- **Completed** — the user marked the activity done (or the date passed and it's confirmed). *(Switch to
  wrap-up: thank-yous, feedback, "plan another / get help next time.")*

Status drives everything downstream: the badge, the urgency of reminders, which actions are surfaced,
and whether escalation is offered. **Platform-level success** is simply: more activities reaching
**Completed** — real events that actually happened.

---

## 10. MVP scope

**In v1:**
- The plan becomes a **tracked activity workspace** with the **dashboard** (§8).
- **Milestone tracking** (auto-derived gates) + **progress %** + **status badge** (§2, §9).
- **Time-based reminders** (30/14/7/3/1 days + day-of) and **key milestone/RSVP reminders** (§3),
  in-app + email.
- **Risk monitoring** for the listed signals (§4) and **recommended next actions** (§5).
- **Organizer escalation** trigger + one-tap **convert to Event Request** (§6).
- **Conceptual vendor/resource nudges** (§7) — prompts only, no marketplace.
- **Reuse of the Planner's communication templates** for the one-tap actions.
- One active activity per plan (a simple list if the user has several).

**Deferred:**
- **Live weather integration** — MVP prompts a manual weather check near the date instead of a real feed.
- **Real vendor marketplace / booking** inside execution (only conceptual nudges in v1).
- **Detailed expense tracking** (receipts, itemized spend) — start with a simple estimate-vs-spent.
- **Push/SMS notifications** — start with in-app + email.
- **Collaboration / multi-user** on one activity; **calendar sync**; **multi-activity portfolio** views.
- **Automated headcount capture** from invites — start with the user updating the count.

---

## Summary

The Activity Planner sells a plan; **this layer makes the plan succeed.** By tracking milestones,
reminding at the right moments, watching for the handful of things that make events fail, and offering a
clear next action — or a professional — exactly when needed, it turns *"I have a plan"* into *"I pulled
it off."* That is prevention over recovery, applied to ordinary people's real-life events.

_System design only. No code, database, or API._
