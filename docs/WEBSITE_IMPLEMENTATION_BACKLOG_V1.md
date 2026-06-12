# Website Implementation Backlog v1 — ActivLife Hub

> **Purpose:** turn the audit into an actionable, prioritized website backlog.
> **Sources:** `WEBSITE_IMPROVEMENT_PLAN_V1.md`, `MASTER_PRODUCT_DECISIONS.md`,
> `BRAND_FOUNDATION_AND_PLATFORM_STRUCTURE.md`.
> **Type:** product backlog. No code, no design mockups.
> **Date:** 2026-06-06

**Priority:** Critical · Important · Nice to Have.
**Effort:** **Small** (copy / single-section edit) · **Medium** (new page or major section + 4-language
i18n + linking) · **Large** (new product surface, or blocked on building a product capability).

**Phases:**
- **Phase 1 — before inviting the first organizers** (what they must see to trust & understand the offer).
- **Phase 2 — before public launch** (breadth, consistency, both audiences).
- **Phase 3 — future improvements** (polish, ongoing).

> **Cross-cutting (applies to every new page/section):** all copy ships in **4 languages**
> (en/es/fr/ru) — factor i18n into every "Medium" item. New pages also need nav/footer links and
> metadata.

---

## Phase 1 — Before first organizers

| ID | Page | Priority | Effort |
|---|---|---|---|
| BL-01 | Homepage — hero | Critical | Medium |
| BL-02 | Homepage — mission band | Critical | Small |
| BL-03 | Become an Organizer (new) | Critical | Medium |
| BL-04 | Academy landing (new, public) | Critical | Medium |
| BL-05 | Homepage / Organizer — OPE value | Critical | Medium |
| BL-06 | Certification & badges explainer | Critical | Small |
| BL-07 | Navigation — organizer front door | Critical | Small |
| BL-08 | Sitewide — monetization messaging | Critical | Small |
| BL-09 | Homepage — empty stats handling | Important | Small |

**BL-01 — Homepage hero realignment**
- **Problem:** hero leads with "A community for shared experiences / Discover experiences"; mission
  absent; framing is casual hosting, not the organizer career.
- **Solution:** mission-led hero conveying *"The World Needs More Organizers / turn bringing people
  together into a profession"*; keep "Activate Life Together" tagline; keep a user-first welcome but
  make the organizer opportunity unmistakable (Master §11.1, §11.7).

**BL-02 — Mission & philosophy band**
- **Problem:** *"People create the best moments of real life. We help."* appears nowhere.
- **Solution:** a short mission/philosophy band (human-as-hero) after the hero or before the final CTA
  (Brand §1–§2; Master §11.1–§11.2).

**BL-03 — "Become an Organizer" journey page (new)**
- **Problem:** no public page explaining how to become an organizer, the path, or the income/profession.
- **Solution:** public page: Learn → Certify → First Client → First Event → First Income, mission-framed,
  selling profession + income (Master §10.1/§10.4; Career Path).

**BL-04 — Public Academy landing page (new)**
- **Problem:** Academy is auth-gated and not in nav — prospects can't explore before signing up.
- **Solution:** ungated Academy landing: who it's for, beginner course vs fast-track test, **curriculum
  overview**, **certification explanation**, paid pricing model, CTA into onboarding (Plan §5).

**BL-05 — OPE value section**
- **Problem:** OPE — the organizer differentiator — is invisible; organizer help is framed as an
  operational dashboard.
- **Solution:** a section presenting OPE as "create professional client proposals in minutes"
  (Master §11.6, §10.3). **Dependency:** match messaging to OPE build status — present as the platform's
  planning capability; avoid overpromising features not yet built.

**BL-06 — Certification & badges explainer**
- **Problem:** certification is named but not explained; Verified vs Certified not distinguished.
- **Solution:** plain-language public explanation of certification value + the **Verified vs Certified**
  distinction (Master §3); show badges prominently.

**BL-07 — Navigation: organizer front door**
- **Problem:** no public entry to Academy / "Become an Organizer."
- **Solution:** add an **"Academy" / "Become an Organizer"** link to the public header (and footer)
  pointing at BL-03/BL-04.

**BL-08 — Sitewide monetization messaging**
- **Problem:** hero shows *"Free to start · No credit card required,"* contradicting *"every meaningful
  value layer has a pricing model"* (Master §11.8).
- **Solution:** remove/replace the free-to-start line; ensure all CTAs and copy reflect the all-paid
  model (no implied free core).

**BL-09 — Empty stats handling**
- **Problem:** stats copy (Certified Organizers / Activities / Countries) would render near-zero
  pre-launch and undermine trust.
- **Solution:** hide stats until meaningful, or replace with qualitative trust signals for launch.

---

## Phase 2 — Before public launch

| ID | Page | Priority | Effort |
|---|---|---|---|
| BL-10 | Pricing page | Important | Medium |
| BL-11 | Activity Planner front door (new) | Important | Large |
| BL-12 | Navigation — three-loop IA | Important | Medium |
| BL-13 | About / Mission page (new) | Important | Small |
| BL-14 | Trust & Safety / standards page (new) | Important | Medium |
| BL-15 | Organizer social proof | Important | Small |

**BL-10 — Pricing page alignment**
- **Problem:** pricing must reflect the all-paid model, and the **$9.99 (billing) vs $29 (pricing page)**
  inconsistency is unresolved.
- **Solution:** audit and align the pricing page; reconcile the price. **Dependency:** open decision
  **P11** (Master §11.9). *(Page internals not yet reviewed — re-audit when editing.)*

**BL-11 — Activity Planner front door (new)**
- **Problem:** the Activity Planner loop (Master §11.4/§11.5) has no presence on the site.
- **Solution:** a "Plan your event" entry + landing for the user-facing planner. **Dependency:** the
  Activity Planner product (surface over OPE Core — `ACTIVITY_PLANNER_AND_OPE_RELATIONSHIP.md`); ship a
  "coming soon"/waitlist front door if the product isn't built yet. Effort **Large** because it tracks a
  product build, not just copy.

**BL-12 — Three-loop navigation IA**
- **Problem:** nav (Marketplace · Pricing) doesn't reflect the three loops.
- **Solution:** restructure to *Marketplace · Plan an Event · Become an Organizer · Pricing* (user-first
  per §11.7), folding in BL-07/BL-11 entries.

**BL-13 — About / Mission page (new)**
- **Problem:** no home for the full mission statement.
- **Solution:** an About/Mission page (Brand §1–§2) linked from header/footer.

**BL-14 — Trust & Safety / standards page (new)**
- **Problem:** safety is mentioned but thin; no public standards.
- **Solution:** a Trust & Safety page documenting community standards and organizer requirements,
  reinforcing certification value (Plan §6).

**BL-15 — Organizer social proof**
- **Problem:** trust is generic; no real organizer examples.
- **Solution:** surface real certified organizer profiles (`/o/<slug>`) with badges. **Dependency:**
  real organizers onboarded.

---

## Phase 3 — Future improvements

| ID | Page | Priority | Effort |
|---|---|---|---|
| BL-16 | Homepage — reviews/testimonials | Nice to Have | Small |
| BL-17 | Copy hygiene | Nice to Have | Small |
| BL-18 | Homepage — live stats | Nice to Have | Small |
| BL-19 | OPE deep marketing | Nice to Have | Medium |

**BL-16 — Reviews / testimonials**
- **Problem:** no social proof from real participants/clients.
- **Solution:** testimonial/review section on homepage and organizer pages. **Dependency:** real reviews.

**BL-17 — Copy hygiene**
- **Problem:** `home.pillars`, `home.stats`, `home.how` exist in copy but are not rendered.
- **Solution:** surface a cleaned-up version where useful, or delete the dead copy to avoid drift.

**BL-18 — Live stats**
- **Problem:** stats hidden at launch (BL-09).
- **Solution:** re-enable real, meaningful stats once numbers justify them.

**BL-19 — OPE deep marketing**
- **Problem:** once OPE ships, its value can be sold far more concretely than a single section.
- **Solution:** dedicated OPE feature page (sample proposal, before/after time savings). **Dependency:**
  OPE shipped.

---

## Summary

| Phase | Items | Critical | Important | Nice to Have |
|---|---|---|---|---|
| **Phase 1 — before first organizers** | BL-01…BL-09 | 8 | 1 | 0 |
| **Phase 2 — before public launch** | BL-10…BL-15 | 0 | 6 | 0 |
| **Phase 3 — future** | BL-16…BL-19 | 0 | 0 | 4 |

**Phase 1 is almost entirely content/marketing work** (no new product capability required) — it can be
executed quickly and is the gate to inviting first organizers. **Phase 2** introduces dependencies on
product (Activity Planner, BL-11) and an open pricing decision (P11, BL-10). **Phase 3** is polish and
depends on real data (reviews, stats) and shipped OPE.

**Key dependencies to flag:** BL-05/BL-19 (OPE build status), BL-10 (pricing decision P11),
BL-11 (Activity Planner product), BL-15/BL-16 (real organizers & reviews). Everything else in Phase 1
is unblocked.

_Backlog only. No code, no mockups, no commits._
