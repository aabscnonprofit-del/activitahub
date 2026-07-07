# Activity Memories — Architecture Backlog

> **Type: Architecture backlog (non-authoritative).** Future decision points to revisit **before** Activity
> Memories grows into photos, videos, documents, reviews, achievements, and statistics. These are **triggers,
> not current work** — nothing here is scheduled or implemented. The goal: when the time comes, implementation
> continues from the same architecture instead of spawning parallel models. **Do not overgeneralize early** —
> but do not let Activity Memories, Completed Activity, Reviews, and Media grow as disconnected systems either.
>
> Recording these does **not** change product behavior, schema, or UI, and moves no code.

Current shape this backlog builds on (as of writing):
- Completed-activity projection: `lib/activity-marketplace/completed-public-activities.ts` (pure rule reused by
  the Organizer Page archive, Review Eligibility, and Participant Memory Eligibility).
- Public Activity Space: the existing `/[locale]/p/[projectId]` route renders both the current activity and, once
  completed + public, the archive (`ActivityArchive` → Activity Memories).
- Activity Memories storage: `project_activity_memories` (Organizer Story) and
  `project_activity_participant_memories` (Participant Stories).
- Eligibility: Review Eligibility (`lib/reviews/reviews-eligibility.ts`) and Participant Memory Eligibility
  (`lib/activity-memories/participant-memory-eligibility.ts`) share one participation rule (the latter delegates
  to the former).

---

## 1. Completed Activity Projection Location

**Current state.** The completed-public-activities helper lives under `lib/activity-marketplace/completed-public-activities.ts`.

**Backlog note.** When the completed-activity projection starts being used by **Participant History, Reviews,
Achievements, Statistics, or other non-marketplace systems**, move it to a neutral location such as:
- `lib/public-projections/completed-activities.ts`, or
- `lib/projects/projections/completed-activities.ts`.

**Reason.** Completed Activity is no longer only marketplace logic — it is a shared public projection over
Project + Occurrences. The current path under `activity-marketplace/` understates that.

**Decision trigger.** A non-marketplace consumer of the projection appears. **Do not move it now unless required**
(it is already reused across the Organizer archive + both eligibility layers, but all reach it fine today).

---

## 2. Current / Completed Activity Page Split

**Current state.** The existing `/p/[projectId]` route supports both the current activity view and the completed
Public Activity Space, branching inline in `page.tsx`.

**Backlog note.** When the page grows significantly, split presentation into:
- `CurrentActivityView`
- `CompletedActivityView`

**Reason.** Keep `page.tsx` small and prevent archive / memories / reviews / media logic from bloating the route
file.

**Constraints.** This must remain **presentation-only** — **no new route, no new entity, no lifecycle change**.

**Decision trigger.** The route file grows unwieldy (e.g. media/reviews land in the archive branch).

---

## 3. Activity Memories Unified Content Layer

**Current state.** Activity Memories storage is two per-type tables: `project_activity_memories` (Organizer
Story) and `project_activity_participant_memories` (Participant Stories).

**Backlog note.** When Activity Memories gets a **third independent content type** — especially Photos, Videos,
Documents, Shared Links, or Reviews — reassess whether to move toward a **unified content layer**, e.g.
`project_activity_memory_items`:

```
id
project_id
author_type      -- organizer | participant | ...
author_id
memory_type      -- story | photo | video | document | link | review | ...
payload          -- type-specific content (text / storage ref / structured data)
created_at
updated_at
```

**Reason.** Avoid endless table growth (`project_activity_photos`, `project_activity_videos`,
`project_activity_documents`, `project_activity_links`, …). A single content-item table with a discriminator
keeps the memories layer coherent.

**Constraints.** **Do not generalize prematurely** — two tables today is fine.

**Decision trigger.** The **third independent Activity Memories content type**.

---

## 4. Media Storage Architecture

**Backlog note.** Before implementing **Photos or Videos**, design media storage **separately** — do not
implement media as simple Project fields.

**Questions to resolve first:**
- storage bucket structure
- public vs private media
- who can upload
- organizer uploads
- participant uploads
- consent / face privacy
- deletion rights
- moderation
- file size limits
- thumbnails
- association with Activity Memories

**Reason.** Photos and videos are not just content fields — they require storage, permissions, moderation, and
privacy rules. Organizer Story / Participant Stories (plain text) do not generalize to media.

**Decision trigger.** Any Photos or Videos work is proposed.

---

## 5. Review / Memory Relationship

**Current state.** Review Eligibility and Participant Memory Eligibility share the same participation-validation
rule (Participant Memory Eligibility delegates to Review Eligibility).

**Backlog note.** Before implementing **Reviews**, decide whether Reviews are:
- **A.** a separate trust / reputation layer displayed *inside* Activity Memories, or
- **B.** one `memory_type` inside a unified Activity Memories content layer (see item 3).

**Reason.** Reviews have a dual nature — a **personal memory** of the activity *and* a **reputation signal** for
organizer trust. This decision should be made **before** creating review storage, so reviews don't get modelled
twice.

**Decision trigger.** Any Reviews implementation is proposed (make this call before creating review storage).

---

## Principle

Record the future decision points now, so later implementation continues from the same architecture instead of
creating parallel models. Project remains the source of truth; Activity Memories is its evolving public content
layer. Each trigger above marks where a shared decision must precede the next feature.
