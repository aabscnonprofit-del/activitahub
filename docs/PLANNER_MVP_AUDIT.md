# Planner / OPE MVP Audit — After the First Full Production Journey

> **Purpose:** honestly assess the Planner/OPE MVP from the perspective of a real
> organizer who just completed registration → payment → certification → organizer
> access → plan creation → generation → planning stages → "Ready".
> **Status:** 🔎 Audit — findings only, no fixes, no redesign, no implementation plan.
> **Date:** 2026-06-13
> **One question:** Does the Planner feel like a *real organizer assistant*, or like a
> *template / checklist generator*?

---

## 1. Executive Summary

**Honest verdict: today the Planner reads as a strong deterministic *template +
budget calculator*, not yet a personalized *assistant*.**

It does real, valuable things — a credible low/likely/high **budget** with editable
line items, a sensible **phase timeline**, **checklists**, per-category **risks**,
and **draft messages** — produced instantly and reproducibly. That is more than a
blank template. But four things keep it on the "template/checklist" side of the line:

1. **All generated content is English-only**, regardless of UI language. A Russian
   (or ES/FR/DE/PT) organizer gets translated buttons wrapped around an English plan.
2. **Content is curated per *category*, not tailored to the *specific* event** — two
   different birthdays get essentially the same plan beyond guest count / venue /
   budget. It doesn't feel like "it understands *my* event."
3. **Readiness %** is an opaque score the organizer cannot explain.
4. **Resources** are relabeled budget lines — costs without quantities, owners, or
   procurement.

The budget engine is the standout that genuinely *feels* like an assistant; most
other surfaces feel like well-organized templates.

---

## 2. Localization Audit

**Boundary:** UI chrome is fully localized (6 locales via `messages/*.json`);
**100% of engine-generated content is hard-coded English** (`lib/ope/*` modules,
`data/ope/**`, `communication.ts`). The engine takes no content locale and does no
translation — `generatePlan` produces English regardless of `input.location` or UI
language.

**English content shown under a non-English UI (complete list):**
- **Timeline** — phase names + goals ("Promotion & Invites", "Day-of", "Follow-up").
- **Checklists** — prep / day-of / after tasks ("Set budget target", "Track & confirm registrations").
- **Risks** — risk names *and* mitigations (Risk lens + proposal).
- **Resources / "What's included"** — line labels are humanized English `item_key`s ("bbq food", "drinks", "fuel", "ice").
- **Budget** — line-item labels and key-cost-driver labels.
- **Ready messages** — invitation / reminder / thank-you bodies.
- **Plan summary & headline** (`section_b.summary/headline`).
- **Clarification questions** (`needs_clarification` text).
- **Upgrade-path text** (`section_f`).
- **Proposal document** — inherits all of the above in English (only the proposal's
  *Next Steps* and section *labels* are localized; the *content* is English).

**Localized correctly (chrome only):** nav, buttons, section headings, readiness tile
labels, lifecycle controls, phase names, proposal section headings, error/empty states.

**Net:** the single most visible defect. For the platform's stated audience
(career-changers, **immigrants**, non-English speakers), the plan itself is not in
their language.

---

## 3. User Understanding Audit

Can a normal organizer understand *what it means / why it exists / what to do next*?

| Block | Means? | Why it exists? | What to do next? | Verdict |
|---|---|---|---|---|
| **Readiness %** | partial | unclear | one "Next action" helps | ◐ number is opaque (§5) |
| **Risks** | yes (name+mitigation) | yes | "mark resolved" | ✅ clear, but generic + English |
| **Resources** | partial | partial | "mark secured" | ◐ no qty/owner/where (§6) |
| **Budget** | yes (low/likely/high) | yes | edit a line | ✅ clearest, most legible |
| **Messages** | yes | yes | copy | ◐ English-only limits use |
| **Planning stages** | partial | unclear | "advance phase" | ◐ Draft→…→Closed unexplained |
| **Project status / lifecycle** | partial | unclear | advance / freeze | ◐ "frozen at Ready" surprises |
| **Proposal** | yes | yes | view | ✅ legible; English content |

The organizer can mostly *operate* the UI, but several blocks don't explain *why*
(readiness math, why fields freeze at Ready, what a lifecycle phase changes).

---

## 4. Value Audit (brutally honest)

| Section | Real organizer value | Template / checklist value |
|---|---|---|
| **Plan generation** | — | ◆ Mostly template — curated per-category modules; minimal adaptation beyond count/venue/budget. |
| **Risks** | small | ◆ Per-category list; same risks for every event of a type. Useful reminders, not insight. |
| **Resources** | small | ◆ A cost checklist relabeled as resources (§6). |
| **Budget** | ◆ **Real value** — defensible low/likely/high, contingency, editable line items, recompute. The one section that feels like an assistant. | — |
| **Messages** | small | ◆ Token templates; helpful drafts, English-only. |
| **Readiness scoring** | small | ◆ A points heuristic; motivating but not insightful, and opaque. |

**Summary:** one section (Budget) delivers genuine, hard-to-DIY value. The rest are
competent templates/checklists — useful scaffolding, but not differentiated
"assistant" value.

---

## 5. Readiness Audit

**How it works (from `lib/workspace/readiness.ts`):** a fixed points blend, rounded
once — plan exists **25** · budget health **≤20** · risks **20 − 8×open-high-risk** ·
resources **15 × (secured ÷ required)** · tasks **15 × (done ÷ total)** · staffing **5**.

- **Why ~54%?** A freshly-ready plan with a healthy budget and no high-severity risks
  sits around the mid-50s–70s with **nothing secured or ticked** (resources 0, tasks 0).
- **Why it rose to ~77%?** The organizer **marked resources secured / risks resolved /
  tasks done** (`prep_state`), which raises the resources/tasks/risk terms.
- **What caused the increase?** Only the preparation toggles — not the plan content.
- **Can a normal organizer understand it without reading code?** **No.** The UI shows
  the % + four tiles (Open Risks, Missing Resources, Budget, Staffing) + one Next
  Action, but never the formula or *why* 54→77. Worse: a single tick among many tasks
  can round to **no visible change**, so the score feels arbitrary ("I did something
  and nothing moved" / "it jumped and I don't know why").

**Verdict:** motivating as a progress bar, opaque as a metric.

---

## 6. Resource Audit

Resources shown ("bbq food", "drinks", "fuel", "ice") are the **non-optional priced
budget line items** (humanized `item_key`) with the **likely cost** and a "mark
secured" toggle.

| Question | Present? |
|---|---|
| Useful to an organizer? | ◐ As a "things that cost money / to secure" checklist, yes; as a *resource plan*, no. |
| Quantity clear? | ❌ Quantity exists in the budget data (`line.quantity`) but is **not shown** in the resource lens. |
| Responsibility clear? | ❌ No owner/assignee. |
| Procurement clear? | ❌ No source, vendor, where-to-buy, or how. |
| Cost clear? | ✅ Likely amount shown (and reflects budget corrections). |

**Net:** it's a costed checklist, not a procurement/needs plan. The data to do more
(quantities) partly exists but isn't surfaced; ownership/procurement don't exist
(the M4 needs-emission is only partially built).

---

## 7. Risk Audit

- **Organizer-facing or internal objects?** **Organizer-facing.** The UI shows only
  `name`, `severity`, `mitigation` (+ a resolve toggle). Internal fields (`id`,
  `never_drop`, `source_module`, `excluded_conditional`) are **not** leaked to the UI.
- **Usefulness:** real but **generic** — risks come from curated per-category modules,
  so every event of a category sees the same list with the same mitigations. They read
  as sensible reminders ("plan refreshments", "confirm attendance"), not event-specific
  insight. English-only (§2).

**Verdict:** correctly scoped (not internal leakage), modestly useful, undifferentiated.

---

## 8. Messages Audit

Invitation / reminder / thank-you are **token templates** (`communication.ts`), e.g.
*"Hi {guest_name}, just a reminder about {host}'s event {when}{where}. Hope to see you
there!"*, copy-to-clipboard.

| Question | Answer |
|---|---|
| Usable? | ◐ As editable **drafts**, yes. |
| Localized? | ❌ English only. |
| Production-ready? | ◐ Fine as a starting draft; not a finished, on-brand message. |
| Real value? | small — saves a blank page, but any organizer could write these. |

**Verdict:** helpful drafts, but English-only makes them unusable as-is for the
non-English audience, and they're generic enough to feel templated.

---

## 9. Planner Experience Assessment

**Closer to B, with real A-moments.**

A first-time organizer finishes with: a credible **budget range they'd struggle to
produce alone** (A), a sensible **timeline + checklist** (A-ish), a list of **risks**
and **draft messages** (B), and a **readiness bar** that's motivating but opaque (B).

Why it lands at B overall:
- For a non-English organizer, the **plan is in the wrong language** — instantly reads
  as unfinished/templated.
- The content is **per-category, not per-event** — it doesn't feel like the tool
  "understands my specific event."
- **Readiness** and **lifecycle/freeze** behave without explanation.
- **Resources** are costs without quantities/owners — a checklist, not a plan.

The honest one-liner an organizer would say: *"I got a useful budget and a decent
checklist — but it feels like a generic template, and half of it is in English."*

---

## 10. Top MVP Gaps (ranked by user impact)

1. **Generated content is not localized** — English plan under a non-English UI.
   Highest impact; directly undermines the core (immigrant/non-English) audience.
2. **Per-category, not per-event content** — low perceived intelligence; the plan
   doesn't feel tailored, which is what separates "assistant" from "template."
3. **Readiness % is opaque** (and single actions may not visibly move it) — erodes
   trust in the headline metric.
4. **Resources lack quantity, owner, and procurement** — reads as a cost checklist,
   not a resource plan.
5. **Messages are English-only and generic** — not sendable for the target audience.
6. **Lifecycle / freeze behavior is unexplained** — phases advance and fields lock at
   "Ready" without telling the organizer why.
7. **Clarification loop dead-ends in the organizer create flow** — `needs_clarification`
   is shown read-only with no inline answer→regenerate.
8. **Staffing is effectively absent** — only supervising-adults / instructor; no roster.

---

## 11. Conclusion

The MVP has a **genuinely strong, reproducible budget engine** and a clean,
operable workspace — a solid foundation. But after a full real journey it currently
**feels like a high-quality template + budget calculator, not a personal organizer
assistant**, primarily because the generated plan is **English-only**, **generic per
category**, and surrounded by metrics (readiness) and systems (lifecycle, resources)
that the organizer can't fully understand or act on.

Closing the gap is less about more sections and more about making the *existing*
output feel **localized, specific, and explained**. The biggest single lever is
localization of generated content; the biggest "feel" lever is event-specific
adaptation.

_Audit only. No code, architecture, or plans were changed by this document._
