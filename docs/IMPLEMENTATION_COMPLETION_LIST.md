# ActivLife Hub — Implementation Completion List

**Status:** Permanent · single source of truth for product completion before public launch.
**Type:** completion checklist — **not** a roadmap. It answers exactly one question:

> **What approved product decisions still need to become fully implemented?**

There is no ordering, no priority, no estimates, and no recommendations here. Every approved decision must eventually be implemented; this document only records *whether each one is complete and, if not, exactly what is missing*. As work lands in future branches, items move:

**⚪ Approved — Not Implemented → 🟡 Partially Implemented → ✅ Fully Implemented.**

Basis: repository at `main` (`86ee812`), cross-checked against 68 migrations / ~70 routes / 156 tests.

---

## Status of every approved product decision

### Discovery & OPE (Planning)
| Decision | Status | If incomplete — what is missing |
|---|---|---|
| Discovery (AI Organizer conversation) | ✅ | — |
| Intent Collection / Planning Readiness | ✅ | — |
| WSH (What Should Happen) | ✅ | — |
| FED (Future Event Description) | ✅ | — |
| Planning Engine (V2) | ✅ | — |
| Plan generation | ✅ | — |
| Reasoning (intention signals) | ✅ | — |
| Project Assembly | ✅ | — |

### Project Workspace
| Decision | Status | If incomplete — what is missing |
|---|---|---|
| Workspace | ✅ | — |
| Budget | ✅ | — |
| Commercial Proposal | ✅ | — |
| Timeline | 🟡 | Exists only as the execution timeline (occurrence-bound items); no standalone project timeline view. |
| Checklist | 🟡 | Execution + Delivery checklists exist; the pre-approval review checklist is static guidance — no dedicated readiness checklist. |
| Resources | 🟡 | Plan → delivery components + vendor **quote requests** exist; purchasing/procurement of resources is deferred (see Future Evolution). |
| Shopping | ⚪ | No procurement / shopping-list capability. |

### Public Activities
| Decision | Status | If incomplete — what is missing |
|---|---|---|
| Discovery / Local Activities | ✅ | — |
| Join Flow | ✅ | — |
| Participants | ✅ | — |
| Activity Space | ✅ | — |
| Activity Archive | ✅ | — |
| Tickets | 🟡 | Free tickets work; **paid and donation checkout are not implemented** (buttons are disabled, "coming soon"). |
| Activity Memories | 🟡 | Text memories (organizer_story / participant_story / activity_review) work; **photos, videos, results, achievements, shared links, documents are placeholders only**. |

### Organizer
| Decision | Status | If incomplete — what is missing |
|---|---|---|
| Organizer Public Page | ✅ | — |
| Organizer Profile (editor) | ✅ | — |
| Organizer Archive | ✅ | — |
| Experience (facts block) | ✅ | — |
| Reviews / Current Activities | ✅ | — |

### Participant
| Decision | Status | If incomplete — what is missing |
|---|---|---|
| Participant History | ✅ | — |
| Memories (participant stories / reviews) | ✅ | — |
| Arrival Coordination | ✅ | — |
| Ride Sharing MVP | ✅ | The approved light-coordination MVP **is** Arrival Coordination and is complete. (Full rideshare — matching/maps/payment — is Future Evolution, not part of the approved MVP.) |

### Trust
| Decision | Status | If incomplete — what is missing |
|---|---|---|
| Reviews (facts-only model) | ✅ | — |
| Review Eligibility | ✅ | — |
| Organizer Facts | ✅ | — |
| Participant Facts | ⚪ | Eligibility gate exists, but there is **no participant facts / trust surface** built. |

### Organizer Platform
| Decision | Status | If incomplete — what is missing |
|---|---|---|
| Activity Alerts | ✅ | — |
| Promotion Generator | ✅ | — |
| Organizer Dashboard | ✅ | — |
| Email Delivery | 🟡 | **Implementation complete, production runtime NOT yet verified.** Provider (Resend REST), delivery worker (`/api/cron/email-dispatch`, fail-closed) with idempotency/retry/permanent-failure recording, branded multilingual templates; migration 069 applied to prod; historical queue contained (39 stale rows → `failed`). **Blocked on operator activation:** set `RESEND_API_KEY` + a Resend-verified `EMAIL_FROM`, set `NEXT_PUBLIC_APP_URL` to the canonical domain, deploy. Becomes ✅ only after one real end-to-end delivery is observed. |
| Email Campaigns (builder UI) | 🟡 | Delivery is complete; a campaign-builder UI for organizer broadcasts is not implemented (separate module). |

### Business
| Decision | Status | If incomplete — what is missing |
|---|---|---|
| Academy | ✅ | — |
| Certification | ✅ | — |
| Organizer License (One Event License) | ✅ | — |
| Payments / Stripe / Billing | ✅ | Feature-complete in code. (Production configuration — app URL, cron secret, Stripe live-mode/webhook — is operator setup tracked in Deployment Readiness, not a product-implementation gap.) |
| Skills Test | 🟡 | Payment + exam framework exist, but the "experienced" path **reuses the generic Academy final exam** — no skill-specific exam / blueprint / rubric. |

### Marketplace (current-product scope)
| Decision | Status | If incomplete — what is missing |
|---|---|---|
| Worker Network (profiles + team assignment) | 🟡 | Worker profiles + add-worker UI + `project_workers` schema exist; **no UI to assign workers to a project team**. (An open worker marketplace/directory is Future Evolution.) |
| Supplier / Vendor sourcing | 🟡 | Vendor quote-request sourcing works (request → quote-by-token). Supplier **discovery** infrastructure exists but is wired to no route/UI and is disabled by default. (A supplier marketplace is Future Evolution.) |

---

## Product Completion List

The remaining incomplete approved decisions, grouped by area. **No ordering, no priority.** This is the working checklist — an item leaves the list only when it reaches ✅.

**Project Workspace**
- 🟡 Timeline — add a standalone project timeline view (currently execution-only).
- 🟡 Checklist — add a dedicated project readiness checklist.
- ⚪ Shopping — implement the procurement / shopping-list capability.

**Public Activities**
- 🟡 Tickets — implement paid and donation checkout.
- 🟡 Activity Memories — implement the remaining media types (photos, videos, results, achievements, shared links, documents).

**Trust**
- ⚪ Participant Facts — build the participant facts / trust surface.

**Organizer Platform**
- 🟡 Email Campaigns (builder UI) — the organizer-broadcast campaign builder (email **delivery** itself is now ✅).

**Business**
- 🟡 Skills Test — implement the skill-specific exam / blueprint distinct from the generic final exam.

**Marketplace (current scope)**
- 🟡 Worker Network — add the UI to assign workers to a project team.
- 🟡 Supplier / Vendor sourcing — wire the supplier-discovery infrastructure to a route/UI (or confirm it remains deferred; if so, move to Future Evolution).

*(Cross-cutting completion note, recorded as an implementation fact, not a new concept: **email delivery** is the single largest silent gap — several notification flows assume email, but only in-app + web push are delivered. It appears above under Email Campaigns; transactional email is part of the same missing provider wiring.)*

---

## Future Evolution

These were **intentionally deferred** — approved future expansions, **not** incomplete launch work. They do **not** appear on the Product Completion List and are **not** launch blockers.

- **Full Worker Marketplace** — an open worker directory / search / matching / availability-scheduling / pay-negotiation network (beyond the current profiles + manual team assignment).
- **Full Supplier Marketplace** — supplier onboarding/accounts, discovery UI, and a two-sided supplier network (beyond the current 1-to-1 vendor quote-request sourcing).
- **Full Resource Marketplace** — a shared, N-to-many resource catalogue with listings/pricing/discovery (beyond resource-need → vendor quotes).
- **Enterprise-scale marketplace concepts** — any larger marketplace/network expansions.

---

## Strategic Initiatives

Kept as independent sections. These are strategic initiatives, separated from ordinary product features. Status and remaining work only — **no priority assigned**.

### BIG (Business Idea Generator)
**Status: ⚪ Approved — Not Implemented.**
No route, page, component, service, prompt, or migration exists; the only references are two code comments that nickname the existing planner "BIG/OPE". The existing AI plans *activities*, it does not discover *earning opportunities*.
**What remains:** the entire initiative — opportunity discovery ("activities people near you are paying for"), a recommendation engine keyed to location/skills, market/earnings signals, and any product surface for it.

### Activities First (growth strategy)
**Status: 🟡 Partially reflected.**
The on-ramps exist (a participant *can* become an organizer via the "Become an Organizer" CTAs, the One Event License pay-per-event path, and onboarding).
**What remains:** the deliberate **participant → organizer conversion flow** — nothing in the participation experience (post-activity, history, join) guides a participant toward creating their own activity; the growth loop's mechanism exists but the funnel does not.

### SEO / AI Factory
**Status: 🟡 Basic SEO + deterministic promotion; the AI factory is conceptual.**
Present: `robots.ts`, canonical URLs, `generateMetadata` across public routes, 6 statically-translated locales, and a deterministic (non-AI) multi-channel promotion generator.
**What remains:** a sitemap, structured data (JSON-LD), AI-generated content (activity descriptions, city/topic pages, SEO copy), AI multilingual content, and campaign/discount generation.

---

## Guiding principle

ActivLife Hub is no longer in product discovery or expansion — it is being **completed**. This document is therefore not a plan of what to build next; it is the master record of **what approved work remains**. Items move ⚪ → 🟡 → ✅ as future branches complete them, until every approved product decision is fully implemented.
