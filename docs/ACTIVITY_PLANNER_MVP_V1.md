# Activity Planner — MVP v1

> **Purpose:** design ActivLife Hub's **first paid consumer product** — the Activity Planner.
> **Who it's for:** **ordinary users** planning one of their own events. **Not** organizers, **not**
> Academy students, **not** professionals.
> **Type:** product design (MVP). No code, no database, no API.
> **Sources:** `ACTIVITY_PLANNER_AND_OPE_RELATIONSHIP.md`, `OPE_V1_TECHNICAL_DESIGN.md`,
> `MASTER_PRODUCT_DECISIONS.md` (§11.4–§11.8), `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md`.
> **Date:** 2026-06-06

**North-star success metric:** a user goes from **"I want to organize something"** to **"I have a
complete plan"** in **under 15 minutes.** Every design choice below serves that.

**Time budget (how we hit < 15 min):**
| Step | Target |
|---|---|
| Choose what you're planning | ~30s |
| Short questionnaire | 3–5 min |
| Plan generates | < 30s |
| Read & adjust the plan | 5–8 min |
| Save / export | ~1 min |
| **Total** | **< 15 min** |

It is the **consumer surface of OPE Core** (Single Engine Strategy, Master §11.6) — same engine as the
Organizer Platform, simpler intake and output, and **no professional layer**.

---

## 1. User journey

The happy path, end to end:

1. **Entry.** From the homepage hero ("plan your own event"), the "Plan an Event" nav item, or the
   Pricing "Activity Planner" card. One clear promise: *plan your event in minutes.*
2. **Pick what you're planning.** A short, friendly picker of activity types (§2). One tap.
3. **Answer a few questions.** A short, mostly-tap questionnaire (§3). Smart defaults; nothing is
   required except the essentials. The user can finish in a few minutes.
4. **Generate.** The planner produces a complete plan in seconds (OPE Core, §5).
5. **Review the plan.** A clear, consumer-friendly plan (§4): what to do, what they'll need, a budget
   range, and key reminders. The user can tweak a couple of inputs (e.g., guest count) and the plan
   updates.
6. **Keep it.** Save, print/export a checklist, or share a link.
7. **Optional next step.** If they'd rather not run it themselves — or the event is bigger than a DIY
   job — one tap **hands the plan to a professional organizer** via the marketplace (§8).

**Emotional arc:** *overwhelmed → "oh, this is actually doable" → in control.* The product's job is to
replace the blank page with a confident starting point — fast.

> **Access note (paid):** the Activity Planner is a paid product (Master §11.8). Recommended placement
> of the paywall and the friction trade-off are in §10 (the < 15-min metric must survive it).

---

## 2. Activity types

The MVP supports a **focused set of simple, personal events** an ordinary person realistically plans
themselves (Master §11.5). Launch set (recommended):

- **Birthday party**
- **Picnic**
- **BBQ / cookout**
- **Family gathering**
- **Hobby / community get-together**
- **Casual celebration** (small anniversary, graduation, housewarming, etc.)

**Deliberately NOT in the consumer planner (routed to organizers instead, §8):**
- **High-stakes / complex events** — weddings, large festivals, corporate events, charity runs. These
  are organizer-grade (and have organizer KB depth). When a user picks or describes one — or their
  answers cross complexity thresholds (very large guest count, high-duty safety, multi-vendor) — the
  planner **recommends a professional organizer** rather than pretending a DIY plan is enough.

**Rationale:** keep the consumer MVP to events where a self-run plan genuinely helps, and use the
boundary itself as a conversion trigger toward the marketplace.

---

## 3. Planner questionnaire

Short, adaptive, mostly single-tap. Maps to OPE scenario inputs (`SI.*`) but consumer-worded. Target
**≤ 8 questions**, ~3–5 minutes. Essentials first; everything else optional with smart defaults.

| # | Question (consumer wording) | Type | Maps to |
|---|---|---|---|
| 1 | What are you planning? | choice (§2) | `SI.category` |
| 2 | When is it? | date / "not sure yet" | `SI.date` |
| 3 | About how many people? | range buckets | `SI.guest_count` |
| 4 | Where will it be? | home · outdoors · a venue · not sure | `SI.venue_type` |
| 5 | Which city/area? | text/autocomplete | `SI.region` (budget + local tips) |
| 6 | Do you have a budget in mind? | amount **or** "help me estimate" | `SI.budgetMinor` (optional) |
| 7 | What's the vibe / any must-haves? | chips + short free text | `SI.vibe`, `SI.mustHaves` |
| 8 | Anything important to know? | free text (allergies, kids, accessibility) | `SI.constraints` |

- **Adaptive follow-ups (max 1–2, type-specific):** e.g., birthday → "Whose birthday / age range?";
  outdoors → "Need a weather backup?". Never balloon the form.
- **Smart defaults** for everything optional so a user can reach a plan with only Q1–Q3 if they want.
- **No account required to answer** — friction stays low (account/payment enters at save/unlock, §10).

---

## 4. Planner outputs — "a complete plan"

A consumer-friendly plan the user can act on themselves. **Personal**, not a client proposal (no
quoting, no margins). Sections:

1. **Plan summary** — one short paragraph: what they're planning and the shape of the day.
2. **Your checklist & timeline** — simplified phases (e.g., *Before · Day-of · After*) with the key
   tasks. Consumer-friendly, not a 120-line organizer register.
3. **What you'll need** — resources: food/drink, supplies, equipment, space — sized to the guest count.
4. **Budget estimate** — a **low / likely / high range** with a few visible line items, in the user's
   currency. **Raw cost only** — no organizer margin or platform fee (that's the professional layer).
5. **Key reminders** — the few most important things, written kindly; safety notes surfaced when
   relevant (kids, outdoors, food, etc.).
6. **Shopping / prep list** *(optional, derived from #3)* — a tickable list.

**Actions on the plan:** save · print / export (printable checklist) · share a link · **"Get a pro to
handle this"** (→ §8). Editing a key input (e.g., guest count) re-runs the **deterministic cost
recompute** instantly (no new generation needed).

---

## 5. OPE Core reuse

The Activity Planner is **a surface over the same OPE Core** — it reuses, not rebuilds:

| OPE Core component | How the Activity Planner uses it |
|---|---|
| **Scenario model** | The questionnaire (§3) fills the same scenario inputs, consumer-simplified. |
| **Knowledge Base** | Same category KB (phases, tasks, resources, risks) — rendered **simply** (key tasks/reminders, not the full register). |
| **Planner workflow** | Same generation step turns scenario + KB into a structured plan. |
| **Cost engine** | Same deterministic budget logic → **low/likely/high**, but shown **raw** (no margin/fee). |
| **Plan object** | Same underlying plan structure; consumer output template renders a friendlier view. |
| **Risk model** | Same risks; the planner surfaces only the top, most user-relevant ones. |

**What the consumer surface does *not* include** (these stay organizer-only): client proposals,
quoting, organizer margin/platform fee, marketplace earning, the full task/risk depth, regenerate
quotas / "deep plan." One engine, gated and dressed differently (Master §11.6;
`ACTIVITY_PLANNER_AND_OPE_RELATIONSHIP.md`).

**Consistency guarantee:** because both surfaces share the cost engine, a user's budget range and an
organizer's later quote for the same event come from the *same* math — so the §8 handoff doesn't
contradict itself.

---

## 6. MVP scope

**In scope for v1:**
- The **consumer planner** for the launch activity types (§2).
- The **short questionnaire** (§3) with smart defaults and minimal adaptive follow-ups.
- **Plan generation** + the **consumer plan output** (§4): summary, checklist/timeline, what-you'll-need,
  budget range, key reminders, optional shopping list.
- **Instant re-estimate** on editing a key input (cost engine only).
- **Save · print/export · share link.**
- **Paid access** to the complete plan (§10).
- **Conversion bridge** to the Organizer Marketplace (§8) — "get a pro" → Event Request.
- Fits existing platform conventions (multi-language UI; consumer KB depth may start in one language and
  expand — see §11).

**Explicitly small:** a few activity types, a short form, one clean output. Depth and breadth come later.

---

## 7. Out of scope (explicit)

- **Any organizer/professional feature** — client proposals, quoting, organizer margin, platform fee,
  marketplace earning, the Organizer dashboard.
- **Complex / high-stakes events** in the consumer planner (weddings, large/corporate/charity, high-duty
  safety) — these route to organizers (§2, §8).
- **Vendor booking or payments inside the planner** — no transacting with venues/suppliers here.
- **Multi-event / portfolio planning, collaboration, or shared editing** of a plan.
- **Regenerate quotas / "deep plan" tiers** — consumers get a single standard generation.
- **Real-time / live vendor pricing** — budget uses the curated reference (raw range).
- **Free-form AI chat / open assistant** — the planner is a guided flow, not a chatbot.
- **Offline / native apps** — web MVP only.

---

## 8. Conversion path to the Organizer Marketplace

The Activity Planner is also the **top of the demand funnel** (Brand §6 — users create demand).

**Primary path — hand it to a pro (demand → marketplace):**
- After a plan, a clear option: **"Want a professional to handle this?"** → creates an **Event Request**
  pre-filled from the plan (the OPE assessment becomes the request brief) → qualified organizers respond
  with proposals (Marketplace Mode), or the user picks an organizer directly (Direct Organizer Mode).
- Because the plan was built on OPE Core, the organizer starts from the *same* structured assessment —
  a smooth, consistent handoff.

**Trigger-based path — when DIY isn't enough:**
- If the chosen type is organizer-grade, or answers cross complexity/safety/size thresholds (§2), the
  planner **recommends getting an organizer** and offers the same one-tap Event Request.

**Secondary path — become the supply (mission loop):**
- A soft, non-pushy prompt: **"Enjoyed planning this? You could do it for others."** → Become an
  Organizer / Academy. This is how some users discover the profession (Brand §1; Career Path S1).

This closes the loop the platform depends on: consumer demand → either self-served (paid plan) or
fulfilled by an organizer (marketplace), and occasionally a consumer becomes a future organizer.

---

## 9. Monetization & access

- **The Activity Planner is a paid product** (Master §11.8 — no free core).
- **Recommended model:** **one-time per-plan unlock** (a consumer planning one event rarely wants a
  subscription). A user can complete the questionnaire and see a **preview** (e.g., the summary +
  outline), then **pay to unlock the complete plan** (full checklist, budget detail, export/share).
  This preserves the < 15-min, low-friction feel while honoring "all paid."
- **No prices published here** — pricing is unresolved (Pricing page shows "Coming soon"); the figure
  and exact model are a business decision (see §11).
- **Account:** required at **save/unlock**, not to start. (The sign-up email-confirmation friction is a
  known activation risk, noted for future optimization — not solved here.)

---

## 10. How the design guarantees < 15 minutes

- **One decision to start** (activity type), not a blank brief.
- **≤ 8 mostly-tap questions** with smart defaults — answerable in minutes; only 3 are truly required.
- **Instant generation** (seconds) and **instant re-estimate** on edits (no regeneration).
- **A single, scannable plan** — not an overwhelming document.
- **No account/payment until the user already sees value** (preview-then-unlock).

If any step threatens the budget (e.g., questionnaire creep, slow generation), it's cut or defaulted —
the 15-minute promise is the constraint everything bends to.

---

## 11. Open decisions (need product calls before build)

1. **Paywall placement:** preview-then-unlock (recommended) vs pay-upfront — affects the < 15-min feel.
2. **Price & model:** one-time per plan vs small pack/credits; the actual figure (ties to Pricing / P11).
3. **Launch activity-type set:** confirm the six in §2 (or trim further for v1).
4. **Launch languages:** UI is 4-language; does consumer **KB depth** ship in all four at launch or
   start with one and expand?
5. **Guest vs account:** can a user reach the preview fully anonymously, or is a lightweight account
   required earlier?
6. **Event Request handoff:** exactly what plan data pre-fills the request brief (the consumer↔organizer
   data contract).
7. **KB readiness:** which consumer categories have sufficient knowledge + pricing seeded to generate a
   credible plan at launch.

---

_Product design only. No code, database, or API. Aligned with the Single Engine Strategy: the Activity
Planner is the consumer surface of OPE Core._
