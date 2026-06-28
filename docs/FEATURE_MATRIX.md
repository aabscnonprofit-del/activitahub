# ActivLife Hub — Feature Matrix

> **Status: Canonical feature × status map.** One row per major feature. **Status:** ✅ Live · 🟡 Partial ·
> ⚪ Not built · 🟣 Dormant (built, uncommitted/unwired) · ⚫ Legacy/divergent. **Priority** is for *current*
> direction (P0 highest). Cross-check `PROJECT_STATUS.md`; specs in `DOCUMENTATION_INDEX.md`.

| Feature | Primary document | Status | Priority | Dependencies |
|---|---|---|---|---|
| **Constitution / philosophy** | `ALH_PRODUCT_PHILOSOPHY.md` | ✅ | P0 | — |
| **OPE V1 planning engine** | `OPE_V1_TECHNICAL_DESIGN.md` | ✅ | P0 | — |
| **Discovery (concept funnel + agent)** | `OPE_CONCEPT_FUNNEL_V1.md`, `CREATIVE_ENGINE_AXIOMS.md` | ✅ | P0 | OPE V1 |
| **Idea-first planner** | `ACTIVITY_PLANNER_MVP_V1.md` | ✅ | P0 | OPE V1, Discovery |
| **Structured planner / PlanStore** | `WP1_PLANSTORE_IMPLEMENTATION_TASKS.md` | ✅ | P1 | OPE V1, `ope_plans` |
| **Project (Root Entity)** | `CURRENT_ARCHITECTURE.md` (041) | ✅ | P0 | — |
| **Project Service (creation/resolution)** | `CURRENT_ARCHITECTURE.md` (044/045) | ✅ | P0 | Project, OPE |
| **Budget Workspace** | `BUDGET_WORKSPACE_V1_DESIGN.md` (042) | ✅ | P1 | Project |
| **Budget ↔ Plan mirroring (delivery components)** | `BUDGET_INPUT_CONTRACT.md` (043) | 🟣 | P1 | Budget, Plan, Project |
| **Public Space (public Project page)** | `PROJECT_PUBLIC_SPACE_SPEC.md` (046) | ✅ | P0 | Project, publish |
| **Publish Flow** | `PROJECT_PUBLIC_SPACE_SPEC.md` | ✅ | P0 | Project, Public Space |
| **Occurrence (dated instances)** | `OCCURRENCE_SPEC.md` (046) | 🟡 (table only) | P0 | Project |
| **Occurrence authoring (create dates)** | `OCCURRENCE_SPEC.md`, `CONVERSATION_FIRST_PRINCIPLE.md` | ⚪ | **P0** | Occurrence |
| **Registration (per Occurrence)** | `PROJECT_PUBLIC_SPACE_SPEC.md` | ⚪ | P1 | Occurrence, Public Space |
| **Payment on pipeline (Registration→Payment)** | Budget/finance cluster, `STRIPE_CHECKOUT_QA.md` | ⚪ | P1 | Registration, Stripe |
| **Stripe payments (subscriptions/Connect/invoices/refunds)** | `STRIPE_CHECKOUT_QA.md` | ✅ | P0 | — |
| **One Event License (consumer planner)** | `ONE_TIME_PLANNER_PAYMENT_AUDIT.md` (038/040) | ✅ | P1 | Stripe, planner |
| **Academy + certification** | `CERTIFIED_ORGANIZER_STANDARD_V1.md` | ✅ | P1 | — |
| **Certification-gated organizer access** | `MASTER_PRODUCT_DECISIONS.md` (017) | ✅ | P1 | Academy, Stripe |
| **Marketplace — Ready Activities** | `EVENT_REQUEST_MARKET_ARCHITECTURE.md` (007) | ✅ ⚫ | P2 | activities |
| **Marketplace — Event Requests / Proposals** | `EVENT_REQUEST_MARKET_ARCHITECTURE.md` (008) | ✅ ⚫ | P2 | requests |
| **Bookings** | `MARKETPLACE_TRUST_MVP.md` (009) | ✅ ⚫ | P2 | activities, Stripe |
| **Vendor sourcing (token quotes)** | `VENDOR_NETWORK_ARCHITECTURE.md` (030) | ✅ ⚫ | P2 | Plan (should be Project) |
| **Worker profiles** | `WORKER_NETWORK_ARCHITECTURE.md` (031) | ✅ ⚫ | P2 | — |
| **Invoices** | `BUDGET_*`/`STRIPE_CHECKOUT_QA.md` (036) | ✅ ⚫ | P2 | Plan (should be Project) |
| **Messaging** | (028) | ✅ | P2 | requests |
| **Participants / RSVP** | (020) | ✅ ⚫ | P2 | activities |
| **OPE V2 (8-module engine)** | `OPE_V2_IMPLEMENTATION_SPEC.md` | 🟣 | P3 | — (superseded direction) |
| **OPE V2 Modules 4–8** | `OPE_V2_MODULE_STATUS.md` | ⚪ | P3 | OPE V2 |
| **Knowledge / learning loop** | `OPE_LEARNING_ARCHITECTURE.md` | ⚪ | P3 | — |
| **Organizer marketing automation** | `ORGANIZER_MARKETING_AUTOMATION_V1.md` | ⚪ | P3 | Public Space |
| **Landing page** | `HOMEPAGE_CONTENT_V2.md` | ✅ | P2 | — |

**Legend recap:** ✅ Live · 🟡 Partial · ⚪ Not built · 🟣 Dormant · ⚫ Legacy/divergent (works, but on the
pre-Project architecture — reconciliation tracked in `PROJECT_STATUS.md §5`).

**P0 focus (current):** close the Project pipeline — **Occurrence authoring**, then Registration, then
pipeline Payment — and commit the dormant Budget↔Plan mirroring. See `ROADMAP_V2.md`.
