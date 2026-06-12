# Website Improvement Plan v1 — ActivLife Hub

> **Reviewer role:** product strategist + UX auditor.
> **Site reviewed:** https://www.activlifehub.com/en (homepage), cross-checked against the deployed
> source in this repo (homepage `app/[locale]/page.tsx`, `messages/en.json`, `PublicHeader`).
> **Source of truth:** `MASTER_PRODUCT_DECISIONS.md`, `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md`,
> `ORGANIZER_CAREER_PATH_V1.md`, `ACTIVITY_PLANNER_AND_OPE_RELATIONSHIP.md`.
> **Date:** 2026-06-06
> **Method note:** homepage content, navigation, and Academy gating were verified directly. Pricing
> and Academy page *internals* were not deep-read; recommendations touching them are flagged as such.

---

## 1. Executive Summary

The current website is a **well-built, visually polished marketplace/community site**. It is *not yet*
a faithful expression of the **current** ActivLife Hub vision — an **Organizer Career Platform** whose
mission is *"The World Needs More Organizers,"* built around three paid loops (Activity Planner,
Organizer Academy, Organizer Platform) and powered by OPE.

**Strengths**
- Strong visual craft: cinematic hero, clear sections, good responsive layout.
- Dual-audience structure already exists ("Two ways to be part of ActivLife Hub": Join vs Organize).
- A progression narrative is present (Discover → Participate → Learn → Organize → Certify).
- Trust scaffolding exists (verified organizers, secure Stripe, community standards, multilingual).
- Certification and the marketplace are already named concepts.

**Weaknesses**
- **No mission and no philosophy** anywhere — the "why" of the brand is absent.
- **Direct monetization contradiction:** hero says *"Free to start · No credit card required,"* which
  conflicts with the decided principle *"Every meaningful value layer has a pricing model"* (Master §11.8).
- **Organizer value proposition is thin and operational** ("manage activities, venues, bookings"),
  not the income/profession promise (Master §10.1/§10.4) and **not OPE** (the differentiator).
- **Activity Planner does not exist on the site at all** — there is no user-facing planning product
  (Master §11.5).
- **Academy is not publicly reachable** — it is auth-gated and absent from the public navigation.
- Trust is generic; **no reviews/social proof**, and the **Verified vs Certified** distinction
  (Master §3) is not explained.

**Launch readiness score: 5 / 10.**
Visually and technically ready; **strategically misaligned** with the current vision and carrying one
hard contradiction (free-to-start vs all-paid). It can attract curious visitors but does **not yet
sell the organizer career** or explain what an organizer pays for and earns — the exact things first
organizers need to see.

---

## 2. Homepage Review

**Current message (verbatim):**
- Badge: *"A community for shared experiences."*
- Headline: *"Discover experiences, or create your own."* · Tagline: *"Activate Life Together."*
- Subtitle: *"Join activities near you and meet people who share your interests — or share your own
  passion and start hosting experiences for your community."*
- Primary CTA: **"Start organizing"** · Secondary CTA: **"Discover experiences."**
- Reassurance: *"Free to start · No credit card required · 4 languages."*

**What the message currently is:** a friendly **community/marketplace** for discovering and hosting
experiences. The framing is *casual hosting* ("share your passion"), not *a profession or an income.*

**Missing message:**
- The **mission** ("The World Needs More Organizers") and **philosophy** ("People create the best
  moments of real life. We help.").
- The **organizer career & income** promise ("Turn your ability to bring people together into a
  profession"; First Client → First Event → First Income).
- **OPE** — the planning/proposal engine that makes a beginner look professional.
- **Activity Planner** as a product for users who want to plan one event.
- A **monetization-consistent** value line (the current "Free to start" is off-strategy).

**What should be added:**
- A mission-led hero (see §3) with a clear organizer-opportunity second level.
- An **"Earn as an organizer"** value block: profession, income, the Academy path, OPE leverage.
- An **Activity Planner** entry point ("Plan your event" for users).
- **Social proof** (real organizer stories/reviews) once available.

**What should be removed / changed:**
- **"Free to start · No credit card required"** — remove or replace; it contradicts Master §11.8.
- Soften the pure "community of experiences" framing so it doesn't bury the organizer-career core.
- Unused copy exists in `messages` (`home.pillars`, `home.stats`, `home.how`) but is **not rendered**
  on the homepage — either surface a cleaned-up version or remove the dead copy.

**How well the homepage communicates (today):**

| Theme | Rating | Note |
|---|---|---|
| **Mission** | ❌ absent | No mission/philosophy at all. |
| **Organizer opportunity** | 🟠 weak | "Start organizing" CTA exists, but framed as casual hosting, not income/profession; no OPE. |
| **Activity discovery** | ✅ good | Category groups + marketplace discovery are clear and attractive. |
| **Trust** | 🟠 partial | Trust strips present; no reviews/social proof; Verified vs Certified unexplained. |

---

## 3. Mission Integration

Neither **"The World Needs More Organizers"** nor **"People create the best moments of real life. We
help."** appears anywhere on the site. This is the single biggest gap: the brand's reason to exist is
invisible (Brand §1–§2; Master §11.1–§11.2).

**Recommended placement:**
- **Hero headline / sub:** lead the page with the mission energy — e.g. headline expresses *the world
  needs more organizers / turn bringing people together into a profession*; keep "Activate Life
  Together" as the tagline.
- **A dedicated "Our mission" band** (short, after the hero or before the final CTA) carrying
  *"People create the best moments of real life. We help."* with the human-as-hero philosophy.
- **About / Mission page** linked from header and footer for the full statement.
- **Organizer-recruitment sections & Academy landing:** repeat the mission as the emotional anchor for
  "become an organizer."
- **Final CTA section:** close on the mission, not just "share something you love."

Per Master §11.7 (user-first / organizer-second), the *first screen* can still welcome users, but the
**mission and organizer opportunity must be unmistakable on the second level** — currently they're
essentially missing.

---

## 4. Organizer Journey Review

Can a visitor clearly understand…

| Question | Today | Gap |
|---|---|---|
| **How to become an organizer?** | 🟠 partial | "Start organizing" → sign-up/onboarding; the path (Academy → Certify → clients → income) is only hinted via the progression strip. |
| **How certification works?** | 🟠 partial | "Get certified" mentioned; **no public explanation** of course vs fast-track test, cost, or what the credential unlocks (Academy is gated). |
| **How the platform helps organizers?** | ❌ weak | Described as an operational dashboard ("manage activities, venues, bookings"); **OPE / proposal generation — the real leverage — is absent** (Master §11.6, §10.3). |
| **How organizers earn income?** | 🟠 weak | "Accept bookings and get paid" appears, but there is no **income/profession narrative** (First Client → First Event → First Income; new profession, side income) per Master §10.1/§10.4. |

**Gaps to close:**
- A clear, public **"Become an organizer"** journey page: Learn → Certify → First Client → First
  Income, with the mission framing.
- Make **OPE the centerpiece** of the organizer pitch ("create professional client proposals in
  minutes").
- Concrete **earning narrative** (what an organizer can realistically build), honest and motivating.

---

## 5. Organizer Academy Review

**Current visibility:** the Academy exists as a concept (progression "Learn/Certify"; an
`Academy & Certification` pillar exists in copy but is **not rendered** on the homepage). The Academy
**page is auth-gated** and **not in the public navigation** — a prospective organizer cannot explore
it before signing up. This is a major funnel gap for recruiting first organizers.

**Recommendations:**
- **Public Academy landing page** (ungated), linked from the primary nav and the organizer sections.
  Suggested structure:
  1. Mission hook ("The world needs more organizers — become one").
  2. Who it's for (career changers, side income, returning-to-work, community builders — Master §10.1).
  3. The two paths: **beginner course** vs **experienced fast-track test**.
  4. **Curriculum overview** — modules/skills taught (placement: mid-page, after the paths).
  5. **Certification explanation** — what the exam is, what the **Certified Organizer** credential
     unlocks, and how it builds trust with clients.
  6. Pricing model (consistent with §11.8 — paid), then a clear CTA into onboarding.
- **Curriculum overview placement:** prominent on the Academy landing and summarized on the
  "Become an organizer" journey page.
- **Certification explanation:** a dedicated, public, plain-language section (and ideally its own
  page) — today it's implied, not explained.

---

## 6. Trust & Credibility Review

| Element | Today | Recommendation |
|---|---|---|
| **Certification visibility** | 🟠 named, not explained | Explain what certification means and what it guarantees to a client; show the badge prominently. |
| **Organizer trust** | 🟠 generic | Show **real organizer profiles/examples**; surface the public `/o/<slug>` profiles with certified badges. |
| **Reviews / social proof** | ❌ absent on homepage | Add testimonials/reviews once available; even a few real ones materially lift conversion. |
| **Safety messaging** | ✅ present | "Community standards" + secure payments are good; expand into a short public Trust & Safety page. |
| **Platform standards** | 🟠 thin | Document standards (what's required of organizers), reinforcing the certification value. |
| **Verified vs Certified** | ❌ unexplained | Master §3 defines **two** badges (Verified = identity, Certified = skill). The site only says "verified certified organizers" — clarify the distinction. |

**Pre-launch caution:** `home.stats` copy (Certified Organizers / Published Activities / Countries)
exists. If surfaced before launch it will render **near-zero numbers** — avoid showing empty stats to
first visitors (hide until meaningful, or replace with qualitative trust).

---

## 7. Content Gaps

| # | Page | Issue | Recommendation | Priority |
|---|---|---|---|---|
| 1 | Homepage hero | No mission/philosophy; off-strategy "Free to start" | Mission-led hero; remove free-to-start; add organizer-income value | **Critical** |
| 2 | (missing) Become-an-Organizer | No public organizer journey/value page | Create Learn→Certify→Client→Income page with OPE + mission | **Critical** |
| 3 | (missing) Academy landing | Academy gated & not in nav | Public Academy landing + curriculum + certification explanation | **Critical** |
| 4 | Homepage / Organizer sections | OPE / proposal generation absent | Feature OPE as the organizer differentiator | **Critical** |
| 5 | Pricing page | Must reflect all-paid model + reconcile $9.99 vs $29 (Master §4/§11.8/§11.9 P11) | Audit & align pricing copy (page internals not yet reviewed) | **Important** |
| 6 | (missing) Activity Planner | No user-facing planning product on site | Add Activity Planner entry ("Plan your event") per Master §11.5 | **Important** |
| 7 | (missing) Mission/About | No mission statement page | Create About/Mission page (Brand §1–§2) | **Important** |
| 8 | Trust & Safety | No dedicated public page | Create Trust & Safety + standards page | **Important** |
| 9 | Homepage | No reviews/social proof | Add testimonials when available | Nice to Have |
| 10 | Copy hygiene | Unused `pillars/stats/how` copy not rendered | Surface cleaned version or remove dead copy | Nice to Have |

---

## 8. Navigation Review

**Current public navigation:** Home (logo) · **Marketplace** · **Pricing** · Sign In · Sign Up
(+ language). The three product loops (Master §11.4) are **not** reflected:

| Loop | In nav today? | Recommendation |
|---|---|---|
| **Activity Planner** (users) | ❌ no | Add a clear entry (e.g. "Plan an event") once the product exists. |
| **Organizer Academy** (aspiring) | ❌ no (gated) | Add **"Academy"** (or "Become an Organizer") to public nav → public landing (§5). |
| **Organizer Platform** (working) | 🟠 implied | A "For Organizers" entry pointing to the organizer value/journey page. |

**Recommended nav (public):** *Marketplace · Plan an Event (Activity Planner) · Become an Organizer
(Academy) · Pricing · Sign In · Sign Up.* This makes the three loops legible and gives aspiring
organizers a front-door — essential before inviting first organizers. (Keep "user-first" ordering per
§11.7: discovery/planning first, organizer recruitment clearly present but second.)

---

## 9. Launch Readiness

**Must be completed before inviting the first organizers (Critical):**
1. **Fix the monetization contradiction** — remove/replace "Free to start · No credit card required";
   make messaging consistent with the all-paid principle (Master §11.8).
2. **Organizer value proposition** — a public "Become an Organizer" journey + value page that sells
   **profession + income + OPE**, framed by the mission.
3. **Public Academy landing** — ungated, in nav, with curriculum overview + certification explanation
   (§5). First organizers must be able to understand the path *before* signing up.
4. **Mission integration** — put "The World Needs More Organizers" and the philosophy into the hero
   and a mission band (§3).
5. **Make OPE visible** — it is the core reason an organizer would choose this platform (Master §11.6).
6. **Credibility for the fee** — explain certification value and what an organizer gets for paying;
   clarify Verified vs Certified.

**Important (soon after, before broad scale):**
- Pricing page audit + reconcile $9.99 vs $29 (§7 #5).
- Activity Planner entry point and nav (§6, §8).
- Trust & Safety / standards page; About/Mission page.

**Nice to Have (later):**
- Reviews/testimonials and social proof.
- Copy hygiene (unused `pillars/stats/how`).
- Surfacing meaningful stats once numbers exist.

**Bottom line:** the site is *built*; it is not yet *aimed*. Before inviting organizers, re-point the
homepage and navigation at the **organizer career** (mission + income + Academy + OPE) and remove the
**free-to-start** contradiction. Those changes move launch readiness from **5/10** toward an
invite-ready **8/10**.

---

_Audit only. No product or site code was modified; no source-of-truth document was changed._
