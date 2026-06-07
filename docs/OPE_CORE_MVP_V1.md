# OPE Core — MVP v1

> **Purpose:** define the **smallest possible OPE Core** that can support **Activity Planner v1**.
> **Goal:** not a perfect planner — just enough to serve the **first paying customer** with credible,
> safe, useful plans.
> **Type:** scope definition. No code, database, or API.
> **Sources:** `OPE_V1_TECHNICAL_DESIGN.md` (the full design — this is its minimal slice),
> `ACTIVITY_PLANNER_MVP_V1.md`, `ACTIVITY_PLANNER_OUTPUTS_V1.md`,
> `ACTIVITY_PLANNER_IMPLEMENTATION_ROADMAP_V1.md`.
> **Date:** 2026-06-06

**Core MVP bet:** the smallest useful OPE Core is **curated knowledge templates + a deterministic cost
engine, with a thin AI layer for personalization** — *not* a full LLM that invents the whole plan. The
structure comes from seeded knowledge (reliable, safe, instant); the money comes from deterministic
math; AI only makes it feel personal. This de-risks v1 (no hallucinated or unsafe plans), cuts cost and
latency, and is more than enough to be worth paying for.

---

## 1. What exactly is OPE Core?

OPE Core is the engine that turns an **event scenario** into a **structured plan + cost estimate.** For
MVP it is four small parts:
1. **Scenario intake** — the typed inputs from the Activity Planner questionnaire.
2. **Knowledge templates (KB)** — curated, per-category plan skeletons (phases, tasks, resources,
   risks) + cost-driver definitions.
3. **Deterministic cost engine** — computes the low/likely/high budget from KB + scenario + seeded
   regional prices.
4. **Plan assembly + a thin AI personalization layer** — combines the above into the consumer plan and
   lightly tailors copy to the user's specifics.

It is the **same engine** the Organizer Platform will later extend (Single Engine Strategy) — but v1
builds only the consumer slice.

---

## 2. Inputs

The consumer **scenario** from the questionnaire:
- **activity type** (one of the launch categories)
- **guest count**
- **date** (optional)
- **location / venue type** (home · outdoors · venue · not sure)
- **region** (city/area — for pricing + local notes)
- **budget** (optional target)
- **vibe / must-haves** (chips + short text)
- **special requirements** (free text — allergies, kids, accessibility)

That's it. No organizer-grade fields.

---

## 3. Outputs

The consumer **plan** (exactly what `ACTIVITY_PLANNER_OUTPUTS_V1.md` shows):
- **Summary** (1 short paragraph)
- **Timeline / checklist** (phased: before · day-of · after)
- **What you'll need** (resources, sized to guest count)
- **Budget estimate** — **low / likely / high** + key cost drivers (raw, no margin/fee)
- **Key risk reminders** (top few, incl. safety)
- **Communication templates** (invitation, reminder, thank-you, feedback)

Plus the structured **milestones/risks** the Execution layer consumes (derived from the same plan).

---

## 4. Knowledge base required for launch

For **each launch category**, one curated template containing:
- **Phases + tasks** — the consumer checklist (before / day-of / after).
- **Resources** — what's needed (food, supplies, equipment), with how they scale (per-guest / flat).
- **Top risks/reminders** — the few that matter (weather, children, food/allergies, attendance,
  accessibility — as applicable).
- **Cost drivers** — item keys + basis (per-guest / per-unit / flat) + which scenario value drives the
  quantity.
- **Regional pricing values** — low/mid/high per cost driver for **at least the launch region(s)**.
- **Communication template stubs** — the message skeletons to be personalized.

**Minimal but real.** Curated by hand (or adapted from the Wedding KB structure, consumer-simplified).
Depth over breadth: a few categories done well beats many done thinly.

---

## 5. Activity categories for MVP

- **Recommended launch (seed deeply): 3 categories** — **Birthday party**, **BBQ / picnic**,
  **Community meetup**. These cover the three sample outputs and span indoor/outdoor, kids/adults,
  personal/community.
- **v1 target (fast-follow): the full six** from the Planner MVP (add family gathering, hobby/community
  get-together, casual celebration).

Start with 3 well-seeded categories for the first paying customers; expand once the pipeline is proven.

---

## 6. What can be hardcoded (curated, not AI)

- **Plan skeletons** per category (phases, tasks).
- **Resource lists** and how they scale.
- **Cost-driver definitions** (item keys, basis) and **derived-quantity rules** (e.g., portions per
  guest, tables per N).
- **Regional pricing tables** (seeded low/mid/high values).
- **Risk rules & thresholds** (e.g., outdoor ⇒ weather reminder; kids ⇒ supervision note).
- **Reminder cadence** (30/14/7/3/1/day-of) and **communication template structure**.

This curated data is the backbone — reliable and instant.

---

## 7. What must be AI-generated

A **thin, bounded** layer — never the math, never invented safety items:
- **Summary paragraph** — a friendly overview of *this* event.
- **Personalization** — tailoring the checklist/reminders to the free-text specifics (e.g., "nut
  allergy" surfaces the allergy line; "superhero theme" tweaks a couple of items).
- **Communication templates** — filling the stubs with the event's specifics in natural language.
- **Light adaptation** — sensible handling when inputs are unusual.

Guardrails: AI personalizes **on top of** the curated template; if AI is unavailable or output is
invalid, the plan still ships from the template (graceful fallback). The cost engine is **never** AI.

---

## 8. What can be deferred

- The **full LLM tool-use planner** that generates the entire structured plan (v1 uses templates + thin
  AI instead).
- **KB retrieval / embeddings (pgvector)** — unnecessary for a few categories.
- The **organizer/professional output layer** (proposals, quoting, margin).
- **Regenerate / "deep plan" / quotas** and prompt-caching sophistication.
- **Broad regional pricing** — start with 1–2 launch regions; expand later.
- The **assessment-vs-proposal duality** and multi-language KB depth (start in the launch language).

---

## 9. Smallest version that generates useful plans for paying customers

**Curated KB templates for 3 categories + deterministic cost engine (seeded regional pricing) + plan
assembly + a thin AI layer for summary/personalization/comms.**

This produces, in seconds: a tailored checklist/timeline, a credible budget range, the safety reminders
people forget, and ready-to-send messages — for birthday, BBQ/picnic, and community meetup. It is
**safe** (structure is curated, not hallucinated), **fast**, **cheap**, and **good enough to pay for.**
Notably, even **without the AI layer**, the deterministic template+cost plan is already shippable — AI
is enhancement, not a blocker.

---

## 10. Build order for OPE Core

1. **Contracts** — define the scenario input shape and the plan output shape (the two interfaces the
   Activity Planner depends on).
2. **KB authoring** — write the curated templates for the 3 launch categories (phases, tasks,
   resources, risks, cost drivers).
3. **Cost engine + pricing seed** — implement the deterministic budget logic; seed regional prices for
   the launch region(s).
4. **Deterministic plan assembly** — scenario + KB → structured plan + budget range. *(Working planner
   here, no AI yet.)*
5. **Thin AI layer** — summary, personalization, and communication templates, with validation +
   template fallback.
6. **Risk rules** — thresholds → reminders/milestones (consumed by the Execution layer).
7. **Wire to the Activity Planner surface** (questionnaire → Core → plan view).

Steps 1–4 deliver a **usable deterministic planner**; step 5 adds the personal polish. Ship when the 3
categories produce credible plans end-to-end.

---

## What this is NOT (MVP boundaries)

- Not the full OPE design — it's the minimal consumer slice; the rest is deferred (§8).
- Not an open AI planner — AI is a bounded personalization layer, not the plan author.
- Not organizer-grade — no proposals/quoting/margin; that's the future professional layer.

**Dependencies/risks:** KB + pricing must be **seeded** for the launch categories (the real content
work); the launch **region(s)** and **language** must be chosen; the planner **unlock price** is still
open. None require the deferred items in §8.

_Scope definition only. No code, database, or API._
