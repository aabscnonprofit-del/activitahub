# Website Implementation Checklist v1 — ActivLife Hub

> **Purpose:** a concrete, page-by-page developer checklist to bring the current website in line with
> `WEBSITE_CONTENT_RESTRUCTURE_V1.md` and `HOMEPAGE_CONTENT_V2.md`. Concrete work only.
> **Scope:** public-facing pages + navigation. No strategy, no theory.
> **Effort:** **S** = copy/i18n edit · **M** = new section/component (+ 4-lang i18n) · **L** = new page
> or blocked on a product capability.
> **i18n note:** every copy change ships in `messages/{en,es,fr,ru}.json`.
> **Date:** 2026-06-06

---

## 1. Homepage  `app/[locale]/page.tsx` + `messages/*.home`

**Current page:** hero ("A community for shared experiences" / "Discover experiences, or create your
own") · trust strip · ProgressionPath (Discover→Participate→Learn→Organize→Certify) · audience cards
(Join vs Organize) · discover-by-category · trust band · community · final CTA.

**Remove**
- [ ] `home.hero.reassure` line **"Free to start · No credit card required · 4 languages"** — **S**
- [ ] Hero badge/title/subtitle current copy (replace, see below) — **S**

**Add / Change**
- [ ] Replace hero copy with `HOMEPAGE_CONTENT_V2.md` §1 (badge, headline, subheadline) — **S**
- [ ] Replace reassurance with **"Certified organizers · Secure payments · Available in 4 languages"** — **S**
- [ ] **Swap hero CTAs:** Primary → **"Explore activities"** (link to `/marketplace`); Secondary →
  **"Become an organizer"** (link to new `/become-an-organizer`) — **S**
- [ ] Confirm **stats block is not rendered** (pillars/stats/how copy is unused) — no empty stats — **S**

**New sections (in this order on the page)**
- [ ] **Mission band** — V2 §2 ("The World Needs More Organizers" / philosophy) — **M**
- [ ] **Become an Organizer block** — V2 §3 + path beats (Learn→Certify→First Client→First Event→First
  Income), CTA → `/become-an-organizer` — **M**
- [ ] **OPE differentiator block** — "professional client proposals in minutes" — **M**
- [ ] **Academy teaser** — short block, CTA → `/academy` (public) — **M**
- [ ] Keep ProgressionPath, discover-by-category, trust band, community, final CTA (final CTA copy →
  mission-led, link to `/become-an-organizer`) — **S**

**New navigation items:** none here (handled in §2).
**Page effort: M.**

---

## 2. Public Header / Navigation  `components/layout/PublicHeader.tsx` + `messages/*.nav`

**Current page:** logo · Marketplace · Pricing · language · Sign In · Sign Up.

**Remove**
- [ ] Nothing removed.

**Add / Change**
- [ ] Add nav item **"Become an Organizer"** → `/become-an-organizer` — **S**
- [ ] Add nav item **"Academy"** → `/academy` (public) — **S**
- [ ] (Later) Add **"Plan an Event"** → Activity Planner front door / waitlist — **M** *(dependency)*
- [ ] Mobile menu mirrors the same items — **S**

**New navigation items:** Become an Organizer, Academy (+ later Plan an Event).
**Page effort: S** (M with Plan an Event).

---

## 3. Public Footer  `components/layout/PublicFooter.tsx`

**Current page:** existing footer links.

**Add / Change**
- [ ] Add footer links: **About / Mission**, **Organizer Philosophy**, **Academy**, **Trust & Safety**,
  **Pricing** — **S**
- [ ] Keep language selector — **S**

**Page effort: S.**

---

## 4. Marketplace  `app/[locale]/marketplace/*`

**Current page:** activity discovery + filters (functioning).

**Remove**
- [ ] Nothing.

**Add / Change**
- [ ] Verify any "free"/pricing wording aligns with all-paid (copy audit) — **S**
- [ ] Ensure it is the destination of the hero "Explore activities" primary CTA — **S**

**Page effort: S.**

---

## 5. Pricing  `app/[locale]/pricing/page.tsx` + `messages/*`

**Current page:** existing pricing tiers (incl. a $29/mo tier; conflicts with $9.99 billing).

**Remove**
- [ ] Any "free" framing implying a free core product — **S**
- [ ] Do **not** publish a final monthly price until reconciled (P11) — placeholder/value framing — **S**

**Add / Change**
- [ ] Present the **three paid products**: Activity Planner · Academy/Certification · Organizer
  subscription — with what each unlocks — **M**
- [ ] Value-first copy (no numbers that may change); hide undecided items (Verified fee, OPE quotas) — **S**

**Page effort: M.** *(Blocked on price decision P11 for final figures.)*

---

## 6. Academy  `app/[locale]/academy/page.tsx`  → **make a PUBLIC landing**

**Current page:** Academy is **auth-gated**, not reachable by visitors; no public landing.

**Remove**
- [ ] Remove the public-visitor gate for a **marketing landing** view (keep the actual course/exam
  gated) — **M**

**Add / Change (sections per `WEBSITE_CONTENT_RESTRUCTURE_V1.md` Academy page)**
- [ ] Hero "Learn the craft. Earn the credential." (V2 §4) — **S**
- [ ] Who it's for — **S**
- [ ] Two paths (Course vs Fast-Track) — **S**
- [ ] **Curriculum overview** — 8 module titles + one-line purpose — **M**
- [ ] **Certification explanation** (knowledge + practical; what it unlocks) — **M**
- [ ] **Verified vs Certified** explainer — **S**
- [ ] **Examination philosophy** (mastery-based, retakes encouraged, safety mandatory) — **S**
- [ ] Organizer Philosophy link — **S**
- [ ] Pricing model line (paid; link to Pricing) — **S**
- [ ] CTA "Explore the Academy" / "Get certified" — **S**

**New navigation items:** Academy (added in §2).
**Page effort: M–L** (gating change + several new sections).

---

## 7. Organizer Public Profile  `app/[locale]/organizers/[id]` · `/o/[slug]`

**Current page:** organizer profile with certified badge + activities.

**Add / Change**
- [ ] Surface **Certified** badge clearly; add placeholder for **Verified** badge (display only) — **S**
- [ ] Ensure profiles are linkable as social proof from Become-an-Organizer / homepage trust — **S**

**Page effort: S.**

---

## 8. Sign Up / Sign In  `app/[locale]/sign-up` · `sign-in`

**Remove**
- [ ] Any "free to start" wording — **S**

**Add / Change**
- [ ] Keep the `?next=/onboarding` organizer entry working from the new CTAs — **S**

**Page effort: S.**

---

## 9. NEW PAGE — Become an Organizer  `app/[locale]/become-an-organizer/page.tsx`

**Current page:** does not exist.

**Add (sections, in order — from `WEBSITE_CONTENT_RESTRUCTURE_V1.md`)**
- [ ] Hero (V2 §3) — **M**
- [ ] Why become an organizer (audiences) — **M**
- [ ] The path (Learn→Certify→First Client→First Event→First Income) — **M**
- [ ] OPE — look professional from day one — **M**
- [ ] Academy positioning (CTA → `/academy`) — **S**
- [ ] Certification positioning — **S**
- [ ] Income positioning (honest) — **S**
- [ ] Trust elements (Certified/Verified, secure payments, standards, safety) — **S**
- [ ] FAQ (cost → Pricing) — **S**
- [ ] Final CTA "Start your organizer path" (→ `/sign-up?next=/onboarding`) — **S**
- [ ] Add route + metadata + 4-lang copy — **M**

**New navigation items:** linked from header (§2), homepage (§1), footer (§3).
**Page effort: L.**

---

## 10. NEW PAGE — Organizer Philosophy  `app/[locale]/organizer-philosophy/page.tsx`

**Current page:** does not exist.

**Add**
- [ ] Manifesto layout of the principles (headlines + short copy) — **M**
- [ ] Lead with trust/safety principles; close with "People create the best moments… We help." — **S**
- [ ] Route + metadata + 4-lang copy — **M**
- [ ] Link from Become-an-Organizer, Academy, footer — **S**

**Page effort: M.**

---

## 11. NEW PAGE — About / Mission  `app/[locale]/about/page.tsx`  *(Important)*

**Add**
- [ ] Mission + philosophy statement page — **M**
- [ ] Route + metadata + 4-lang copy; link from footer/header — **S**

**Page effort: M.**

---

## 12. NEW PAGE — Trust & Safety  `app/[locale]/trust-safety/page.tsx`  *(Important)*

**Add**
- [ ] Community standards + organizer standards + safety messaging (content from standards docs) — **M**
- [ ] Route + metadata + 4-lang copy; link from footer — **S**

**Page effort: M.**

---

## 13. NEW PAGE — Activity Planner front door  `app/[locale]/plan-an-event/page.tsx`  *(Important — dependency)*

**Add**
- [ ] "Plan an Event" landing or **waitlist/coming-soon** if the product isn't built — **M**
- [ ] Add "Plan an Event" nav item only once this exists (§2) — **S**
- [ ] Route + metadata + 4-lang copy — **M**

**Page effort: M–L** *(blocked on Activity Planner product).*

---

## Summary checklist (by priority)

**Critical — before first organizers**
- [ ] Homepage hero rewrite + remove "Free to start" + swap CTAs (§1) — M
- [ ] Homepage Mission band, Become-an-Organizer block, OPE block, Academy teaser (§1) — M
- [ ] Header nav: Become an Organizer + Academy (§2) — S
- [ ] Public Academy landing with curriculum + certification + Verified/Certified + exam philosophy (§6) — M–L
- [ ] NEW Become an Organizer page (§9) — L
- [ ] NEW Organizer Philosophy page (§10) — M
- [ ] Organizer profile: surface Certified badge / Verified placeholder (§7) — S
- [ ] Remove "free" wording on sign-up/marketplace (§4, §8) — S

**Important — before public launch**
- [ ] Pricing page: three paid products, value-first, resolve price P11 (§5) — M
- [ ] Footer links: About/Mission, Philosophy, Academy, Trust & Safety, Pricing (§3) — S
- [ ] NEW About/Mission page (§11) — M
- [ ] NEW Trust & Safety page (§12) — M
- [ ] Activity Planner front door + "Plan an Event" nav (§13, §2) — M–L
- [ ] Organizer social proof surfaced (§7) — S

**Later**
- [ ] Reviews/testimonials section (homepage + organizer pages) — M
- [ ] Copy hygiene: remove/repurpose unused `home.pillars/stats/how` — S
- [ ] Live stats once meaningful — S
- [ ] OPE deep-marketing page once OPE ships — M

---

_Developer checklist only — concrete website work. No strategy, no theory, no code written, no commits._
