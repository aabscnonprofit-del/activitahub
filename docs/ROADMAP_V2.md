# ActivLife Hub — Implementation Roadmap (V2)

> **STATUS: PARTIALLY OBSOLETE (2026-06-29 Architecture Canon Cleanup).** Phases A/B here have been
> overtaken by the active **Planning Layer Migration** (`PLANNING_LAYER_MIGRATION_ROADMAP.md`), which this
> roadmap does not list. Treat the migration roadmap as the current implementation sequence; the two should
> be merged. See `architecture/ARCHITECTURE_CONSOLIDATION_AUDIT.md §G/§H`.

> **Status: Current implementation roadmap.** Supersedes the legacy roadmaps (`OPE_IMPLEMENTATION_ROADMAP`,
> `WORKSPACE_EVOLUTION_PLAN`, `BUDGET_WORKSPACE_IMPLEMENTATION_PLAN`, planner roadmaps — now HISTORICAL).
> **Implementation work only** — no documentation tasks. Ordered by the Constitution's *Architecture Gap
> Rule* (close the largest gap in the organizer journey first). State in `PROJECT_STATUS.md`; architecture
> in `CURRENT_ARCHITECTURE.md`.

---

## Phase A — Make the Project pipeline real in production

**Goal:** the already-built Project pipeline (plan→project, Public Space, Publish) functions end-to-end
against the live database, and the dormant Budget↔Plan mirroring is committed.

- **Documents:** `CURRENT_ARCHITECTURE.md`, `PROJECT_STATUS.md`, `BUDGET_INPUT_CONTRACT.md`.
- **Implementation:**
  - Apply migrations `043 → 044 → 045 → 046` to production (in order; `043` backs the Budget↔Plan mirroring).
  - Commit the dormant Budget↔Plan mirroring (`lib/budget/mirror.ts` + the `budget.ts`/`planner.ts`/
    `projects/store.ts` deltas) so a Project's budget auto-fills from the plan.
  - Verify the deployed flow: idea → plan → Project → budget populated → publish → Public Space.
- **Definition of Done:** a published Project renders in Public Space against the live DB; a real Project's
  budget shows lines sourced from the plan; no missing-column failures.

## Phase B — Occurrence authoring (the pipeline hole)

**Goal:** organizers can create the date(s) for a Project, so Public Space shows real future Occurrences
instead of "Dates coming soon."

- **Documents:** `OCCURRENCE_SPEC.md`, `CONVERSATION_FIRST_PRINCIPLE.md`, `CURRENT_ARCHITECTURE.md §5`.
- **Implementation:**
  - A conversation → single-screen flow that creates one or more Occurrences for a Project (date/time/place,
    capacity, price), through the Project Service.
  - Surface future Occurrences on the public page (one direct; many as a selector — already supported).
- **Definition of Done:** an organizer sets a first date in one decision + one review; the published page
  shows it; a recurring series shows multiple Occurrences.

## Phase C — Conversation-First Organizer Journey

**Goal:** unify the organizer-side building blocks (idea → plan → budget → date → publish) into the
**single-question → single-review** conversational experience the philosophy requires — replacing the
current multi-step planner front-end as the primary way an organizer creates an event.

- **Documents:** `CONVERSATION_FIRST_PRINCIPLE.md`, `ALH_PRODUCT_PHILOSOPHY.md`, `CURRENT_ARCHITECTURE.md`.
- **Implementation:**
  - A conversation that takes an organizer from "I have an idea" to a prepared event, asking only genuine
    human decisions and preparing everything else (the smallest natural journey).
  - One review/Decision Screen presenting OPE's prepared event (concept, plan, budget options, the date from
    Phase B) for approval/adjustment, then publish (Phase A / `ADR_008`).
  - Keep internal entities (Project, Occurrence, Budget, Public Space) invisible to the organizer.
- **Definition of Done:** an organizer goes from idea to a published event with a first date through one
  meaningful conversational decision and one review; no internal entity names are shown.

> *Position rationale:* this phase depends on the pipeline (A) and Occurrence authoring (B) existing, so it
> wraps them; it precedes the participant-side phases (Registration/Payment). It does **not** change their
> priority — only inserts the organizer-journey experience the validation audit found missing.

## Phase D — Registration (per Occurrence)

**Goal:** a participant can register for a selected Occurrence via Public Space.

- **Documents:** `PROJECT_PUBLIC_SPACE_SPEC.md`, `OCCURRENCE_SPEC.md`.
- **Implementation:**
  - Registration tied to an Occurrence; replace the "Registration coming soon" placeholder with a real
    sign-up entry from a selected Occurrence.
- **Definition of Done:** a guest registers for a specific Occurrence; the organizer sees the registrations.

## Phase E — Payment on the pipeline (Registration → Payment)

**Goal:** a registration can be paid through the canonical flow, reusing the existing Stripe stack.

- **Documents:** `STRIPE_CHECKOUT_QA.md`, budget/finance cluster.
- **Implementation:**
  - Wire payment to a Registration (free / donation / set price per Occurrence); reuse Stripe Connect/checkout.
- **Definition of Done:** a paid registration completes via Stripe and is recorded against the Registration;
  free/donation paths also work.

## Phase F — Legacy reconciliation

**Goal:** resolve the two-architecture divergence so there is one public surface and one ownership model.

- **Documents:** `CURRENT_ARCHITECTURE.md §8`, `PROJECT_STATUS.md §5`.
- **Implementation:**
  - Converge public discovery (marketplace `activities`) onto Public Space (published Projects).
  - Re-anchor `vendor_requests.plan_id` / `invoices.plan_id` to the Project.
  - Decide the fate of OPE V2 (wire or retire) and the legacy booking/proposal flows.
- **Definition of Done:** one public discovery surface; durable artifacts are Project-owned; no parallel
  competing architecture.

## Phase G — Organizer journey polish & OS expansion

**Goal:** strengthen the conversation-first organizer journey and connect more Project modules.

- **Documents:** `ALH_PRODUCT_PHILOSOPHY.md`, `CONVERSATION_FIRST_PRINCIPLE.md`, `FEATURE_MATRIX.md`.
- **Implementation:**
  - Replace data-entry surfaces (e.g., Budget Workspace) with AI-prepared, decision-only reviews.
  - Connect additional Project Workspace modules as they gain a real Project relation.
  - Verified professional history (completed Projects → organizer reputation), then knowledge/learning loop.
- **Definition of Done:** the smallest natural journey (one decision → one review) holds across the core
  flows; modules attach to the Project rather than standing alone.

---

*Each phase is gated by the prior one's Definition of Done. Priorities follow the Architecture Gap Rule —
re-order only if a larger gap appears. Every phase here is implementation; documentation upkeep lives in the
recovery docs, not in this roadmap.*
