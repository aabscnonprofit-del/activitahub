# Migration Status

> **Status: AUTHORITATIVE (operational).** Tracks database migrations vs. deployed code. Migrations are SQL
> files in `supabase/migrations/`; they are **not** applied automatically by code deploys — they must be
> applied to the database separately. This document is the source of truth for *which migrations are live*.
> **Keep it updated whenever a migration is committed or applied.**

## 1. Committed migrations (in the repository)

`001`–`046` are committed. Key entries for the current architecture:

| Migration | Adds | Era |
|---|---|---|
| `001`–`040` | profiles, billing, academy, certification, organizer core, marketplace, requests, bookings, reviews, payments, analytics, admin, slugs, categories, organizer access, participants, OPE plans, messaging, vendors, vendor sourcing, worker profiles, Connect, invoices, event licenses | V1 product (live) |
| `041_projects` | the **Project** root entity (`ADR_003`) | Project-centric |
| `042_budget` | budgets, budget_lines, budget_vendor_quotes, commercial_proposals | Budget |
| `043_project_delivery_components` | delivery components (Plan-scope projection, `ADR_004`) | Budget↔Plan |
| `044_ope_plan_project_link` | `ope_plans.project_id` (Plan↔Project, `ADR_003`) | Project-centric |
| `045_backfill_ope_plan_projects` | backfill: a Project per existing plan | Project-centric (data) |
| `046_project_public_space` | `projects.is_published` + `occurrences` table + public-read RLS (`ADR_008`, `OCCURRENCE_SPEC`) | Public Space |

## 2. Applied migrations (production) — **UNKNOWN / UNVERIFIED**

The production application status is **not confirmed in the repository.** It must be verified directly
against the production database (§5). Treat anything beyond the last verified point as **pending** until checked.

## 3. Pending production migrations (must be applied before the pipeline works)

Apply **in order**:

1. **`043_project_delivery_components`** — required by the Budget↔Plan mirroring (commit `d733af1`): the
   planner persists, and the Budget reads, `project_delivery_components`. **If not applied, persisting
   delivery components / opening a budget from a plan fails in production.**
2. **`044_ope_plan_project_link`** — required by the already-deployed plan→project code
   (`opePlans.ts`/`resolveProjectForPlan` write/read `ope_plans.project_id`). **If not applied, plan
   creation fails in production.**
3. **`045_backfill_ope_plan_projects`** — backfills existing plans (idempotent, atomic; safe to re-run).
4. **`046_project_public_space`** — required by Public Space and the Publish Flow (`is_published`,
   `occurrences`, public-read RLS). Until applied, those features are non-functional in production.

## 4. Operational risks

- **Code-ahead-of-schema:** the Budget↔Plan mirroring (`043`), the plan→project code (`044`/`045`), and
  Public Space + Publish (`046`) are deployed on `origin/main`; if the migrations are not applied, those
  paths error at runtime.
- **`045` is a data migration:** it creates a Project per existing plan across all organizers (idempotent via
  `project_id IS NULL`; atomic single transaction). Organizers will see a backfilled Project per plan.
- **Ordering is strict:** `043 → 044 → 045 → 046` (`043` only needs `041`; `045` needs the `044` column;
  `046` is independent but listed last).

## 5. Verification procedure

1. Connect to the production database (Supabase).
2. Confirm columns/tables exist: `project_delivery_components` table (`043`), `ope_plans.project_id`
   (`044`), `projects.is_published` + `occurrences` table + `projects_public_read`/`occurrences_public_read`
   policies (`046`).
3. If missing, apply the pending migrations **in order** (§3).
4. Confirm `045` backfill ran: `SELECT count(*) FROM ope_plans WHERE project_id IS NULL;` returns `0`.
5. Smoke-test the pipeline: create a plan → confirm a Project exists → open the budget → publish → load
   `/[locale]/p/[projectId]` and confirm the public page renders.
6. **Update §2 of this document** with the verified applied state and date.

## Related documents

`PROJECT_STATUS.md §7`, `ROADMAP_V2.md` Phase A, `ADR_003`, `ADR_008`, `PROJECT_PUBLIC_SPACE_SPEC.md`.
