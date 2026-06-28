# ADR 008 — Publish Flow

> **Status: ACCEPTED & IMPLEMENTED.** Architecture Decision Record. Documents the shipped Publish Flow
> (commit `04b65f3`) that was previously specified only in working sessions.

## Purpose

Define how an organizer makes a Project public — the transition from a private engagement to a Project
visible in Public Space.

## Decision

**Publishing sets `projects.is_published = true` and nothing else.** The operation is:

- **Owner-only** — only the Project's owner may publish (enforced by owner RLS + an explicit ownership
  check in the action).
- **Idempotent** — publishing an already-published Project is a no-op success.
- **Through the Project Service** — `publishProject(supabase, id)` and `getProjectPublishState(...)` live in
  `lib/projects/store.ts`; the server action `publishProjectAction` is a thin caller (`ADR_007`).

On success the organizer sees a **Published screen** (Copy Public Link, Open Public Page) with disabled
placeholders for the not-yet-built toolkit (poster, QR, social). Public Space then renders the published
Project at `/[locale]/p/[projectId]` via public-read RLS (`PROJECT_PUBLIC_SPACE_SPEC.md`).

In lifecycle terms (`ADR_005`), Publish is the act that exposes a Project to the world; per the canonical
pipeline it sits at **Occurrence → Publish → Public Space**.

## Reasoning

A publish action must be a single, guarded, idempotent operation (so repeated taps and concurrent calls are
safe) and owner-gated (so only the owner exposes their event). Defaulting `is_published = false` keeps every
existing Project private until deliberately published — the safe default.

## Alternatives considered

- **Auto-publish on creation** — *rejected:* exposes drafts; publishing must be a deliberate owner decision.
- **A separate "published" table / status overload** — *rejected:* a single boolean column is the minimal
  sufficient gate (see `ADR_INDEX` / Proposal 046 partial approval).
- **Service-role public reads** — *rejected* in favor of public-read RLS on `is_published` rows.

## Consequences

- Public Space is reachable **only** for published Projects; unpublished/missing → not found.
- Registration/Payment/poster/QR/social are explicitly **out of scope** here (later roadmap phases).
- Requires migration `046` (`is_published` + public-read RLS) applied in production (`MIGRATION_STATUS.md`).

## Dependencies

Migration `046`; `ADR_007_BUSINESS_OPERATIONS.md`; `PROJECT_PUBLIC_SPACE_SPEC.md`.

## Related documents

`PROJECT_PUBLIC_SPACE_SPEC.md`, `OCCURRENCE_SPEC.md`, `CURRENT_ARCHITECTURE.md §6`, `MIGRATION_STATUS.md`.
