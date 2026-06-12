# Mission, Philosophy & Organizer Standard — Integration Proposal

> **Purpose:** promote the recently adopted mission, philosophy, and organizer standard from product
> decisions into **foundational company-level decisions** in `MASTER_PRODUCT_DECISIONS.md`, and
> separate **long-term company principles** from **temporary product decisions**.
> **These are not marketing slogans** — they are governance-level commitments.
> **Type:** proposal for review. **No file is modified here.**
> **Sources:** `MASTER_PRODUCT_DECISIONS.md` (esp. §11.1–§11.3, §9, §3), `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md`,
> `ACTIVLIFEHUB_ORGANIZER_PHILOSOPHY_V1.md`, `ORGANIZER_CAREER_PATH_V1.md`.
> **Date:** 2026-06-06

> **Context:** Master already records the Mission (§11.1) and Philosophy (§11.2) as ✅ *product*
> decisions. This proposal **elevates their status to FOUNDATIONAL** (a protected tier) and adds a
> foundational **Organizer Standard** distilled from the Organizer Philosophy.

---

## 1. Mission — "The World Needs More Organizers"

**Why it should become the official company mission.**
A company's mission is the apex test every decision answers to. ActivLife Hub already operates as an
*Organizer Career Platform* (Master §10.2) and already filters features through "Does this help people
become better organizers?" (§11.3). That filter only makes sense if there is a mission above it. "The
World Needs More Organizers" *is* that apex: it states **what we are trying to change in the world**,
not merely what we sell.

**How it influences product decisions.**
- It sets the **direction of the Core Product Filter** (§11.3): "better organizers" is shorthand for
  "more, and more capable, organizers."
- It **ranks audiences** (§10.1): the aspiring organizer is primary because growing the *supply* of
  organizers is the mission.
- It **guards scope** (§9): anything that doesn't grow or strengthen organizers is suspect.

**How it connects the four parts.**
| Part | Role in the mission |
|---|---|
| **Activity Planner** | Lets everyday people organize one activity — the on-ramp where future organizers discover the calling. |
| **Organizer Academy** | **Makes** organizers — turns enthusiasm into certified capability. |
| **Organizer Platform** | **Strengthens** organizers — efficiency, OPE, clients, scale. |
| **Marketplace** | **Sustains** organizers — connects their supply with real demand so the work pays. |

Each part exists to put *more capable organizers* into the world. The mission is the thread; the four
parts are how it is delivered.

---

## 2. Philosophy — "People create the best moments of real life. We help."

**Why the human is the hero.**
The moments that matter — the friendships, communities, and celebrations — are created by people, not
platforms. If we ever cast ourselves as the hero, we start optimizing for the platform (engagement,
time-on-site) instead of for what people achieve. Naming the human as the hero keeps our incentives
pointed at *their* outcomes.

**Why the platform is the enabler.**
Our job is to remove friction, fear, and guesswork so the person can do their work well. The platform
is the capable assistant standing just behind the organizer — never the main event.

**Implications for product design.**
- **Measure success by user outcomes** (events run, organizers who earned), not vanity metrics.
- **Prefer enabling tools over engagement mechanics** — this is the positive form of the §9 "no social
  overbuild" constraint.
- **Design humbly:** the product recedes; the person's achievement is foregrounded (e.g., OPE produces
  *the organizer's* proposal, not "ActivLife's" output).
- **The Core Product Filter (§11.3) is this philosophy in action.**

---

## 3. Organizer Philosophy — analysis

`ACTIVLIFEHUB_ORGANIZER_PHILOSOPHY_V1.md` defines 11 principles. They are not all the same *kind* of
thing: some are **enforceable standards**, some are **teachable craft**, some are **cultural/brand**.
Classification (a principle can serve more than one role; ✓ = primary home):

| # | Principle | Official Standard | Academy material | Public website |
|---|---|:---:|:---:|:---:|
| 1 | Why Organizers Matter | | ✓ | ✓ |
| 2 | Organizer Comes First (responsibility) | ✓ | ✓ | ✓ |
| 3 | People Before Activities | ✓ | ✓ | ✓ |
| 4 | Prevention Over Recovery | ✓ | ✓ (core skill) | ✓ |
| 5 | Promise Only What You Can Deliver | ✓ | ✓ | ✓ |
| 6 | Respect People's Time | ✓ | ✓ | |
| 7 | Safety Is Not Optional | ✓ **(non-negotiable)** | ✓ | ✓ |
| 8 | Organizers Create Trust | ✓ | ✓ | ✓ |
| 9 | Communities Over Events | | ✓ (aspiration) | ✓ |
| 10 | Continuous Improvement | | ✓ | |
| 11 | The ActivLife Hub Organizer (summary) | | ✓ | ✓ |

**Become official standards** (what a Certified Organizer is *held to*): **#2, #3, #4, #5, #6, #7, #8.**
These are enforceable expectations and already align with the Academy's detailed standards
(`ORGANIZER_ACADEMY_CURRICULUM_V1.md` §5). **#7 (Safety) is the non-negotiable anchor.**

**Remain Academy material** (taught and developmental, not pass/fail enforcement): **#1, #9, #10**
(orientation, aspiration, growth mindset) — plus #4 as a *taught skill* in addition to being a standard.

**Appear on the public website** (cultural foundation that also builds client trust): **#1, #2, #3, #7,
#8, #9, #11** — the inspirational, trust-building principles. (The full philosophy doc is itself
website- and onboarding-ready by design.)

> Recommendation: distill #2–#8 into a single, principle-level **Organizer Standard** at the
> foundational tier (below), with the Academy §5 list as its detailed, operational expression — one
> source of truth, two altitudes.

---

## 4. Proposed Master Decisions (exact additions)

Add a **new protected tier at the top of the decisions** — a *Foundational Company Principles* block
placed **before §1** (additive; no existing section is renumbered or rewritten). Proposed text:

```markdown
## Foundational Company Principles (change-controlled)

> **Status: FOUNDATIONAL.** These sit ABOVE the product decisions in §1–§11 and govern them. They
> change only by explicit, strongly-justified, versioned amendment — never in normal product
> iteration (see "Change control" below). §11.1 (Mission) and §11.2 (Philosophy) are hereby
> designated foundational and consolidated here.

### F1. Mission — "The World Needs More Organizers." ✅ Foundational
Our mission is to increase the number — and the capability — of organizers in the world, and, for
those who want it, to turn that ability into a profession. The mission is the apex test every product
decision answers to (it sets the direction of the Core Product Filter, §11.3).

### F2. Philosophy — "People create the best moments of real life. We help." ✅ Foundational
The human is the hero; ActivLife Hub is the enabler, never the protagonist. We measure success by what
people achieve with our help, and we prefer enabling tools over engagement mechanics.

### F3. The Organizer Standard ✅ Foundational
Every ActivLife Hub Organizer upholds, as a condition of the Certified credential:
responsibility first; people before activities; prevention over recovery; promise only what you can
deliver; respect people's time; **safety is never optional**; and trust is shared across all
organizers. (Cultural source: `ACTIVLIFEHUB_ORGANIZER_PHILOSOPHY_V1.md`; operational detail:
`ORGANIZER_ACADEMY_CURRICULUM_V1.md` §5.)

### Change control
Foundational principles (F1–F3) require an explicit, written, strongly-justified amendment and a
version bump to change. Product decisions (§1–§11) may evolve through normal iteration. When a product
decision conflicts with a foundational principle, the foundational principle wins.
```

> On apply, §11.1/§11.2 can either remain (cross-referenced as "see F1/F2") or be trimmed to a pointer
> — that is a formatting choice for the apply step, not a new decision.

---

## 5. Long-Term Protection — foundational vs temporary

The core value of this proposal is **separating two tiers** so the company stops re-litigating its
identity while still iterating freely on product.

**Foundational (do not change without strong justification + version bump):**
- **F1 Mission**, **F2 Philosophy**, **F3 Organizer Standard** — and within F3, **Safety (#7)** and
  **Trust (#8)** are the most protected.
- These define *who we are*. Changing them changes the company, not the roadmap.

**Temporary / product-level (iterate normally):**
- Pricing and the price reconciliation (§4 / §11.9 P11), subscription/gating boundary details (§11.8),
  feature priorities and OPE output schema (§10.3, P9/P10), Verified Organizer mechanics (§3/P12),
  the journey model (§10.2/P13), platform structure *details* (§11.4–§11.7 may refine; the mission they
  serve may not).
- These define *how we currently execute*. They are expected to change as we learn.

**Recommended governance rule:** mark every decision in Master with a tier — **[Foundational]** or
**[Product]** — so anyone reading knows what is settled-for-the-company versus settled-for-now. New
decisions declare their tier on entry.

---

_Proposal only. No file was modified; no code; no commits._
