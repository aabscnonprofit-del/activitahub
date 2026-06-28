# Public Space — Architecture Spec

**Status:** model specification (no implementation commitment beyond the model). **Scope:** defines
**Public Space** as the public projection of a Project to the outside world. Does not change code, add
migrations, rename entities, or reopen the Ownership Migration. **Project remains the Root Entity**; the
**Project Service** remains the only owner of Project creation/search policy. **Public Space is a
capability of Project, not a separate product.** It is presentation/projection only — it owns no data and
contains no business logic.

---

## 1. What Public Space is

Public Space is the **outward-facing projection of a Project** — the read-only public surface through
which participants discover the Project, browse its future Occurrences, and enter registration. It is one
of a Project's capabilities, rendered *from* Project data; it is never a second source of that data.

## 2. Purpose

- Make a Project **discoverable** to the public.
- Present the Project's identity, offering, and **future Occurrences**.
- Route a visitor into **registration for a selected Occurrence**.
- Carry the Project's public **identity, SEO, and shareable metadata**.

## 3. Relationship

```
Project (Root)
    │  projects (read-only)
    ▼
Public Space  ──displays──►  future Occurrences  ──select──►  Registration entry
```

Public Space is **downstream** of Project: Project owns the truth; Public Space projects it. The arrow is
one-directional — Public Space reads from Project, never writes to it.

## 4. Public Space responsibilities

- Project a Project's public identity and offering.
- List the Project's **future, publicly-visible Occurrences**.
- Provide the **entry point** into registration (always via a selected Occurrence — §11).
- Emit **SEO** and **Open Graph** metadata for the Project and its public URLs.
- Present the **organizer identity** and approved **media**.
- Expose **only public information** (§16).

Public Space does **not**: create/modify Projects or Occurrences, hold capacity/price/registration state,
process payments, or make any availability/eligibility decision. Those are Project/Project-Service/
Occurrence concerns it merely *reflects*.

## 5. What belongs to Project

The durable engagement and all business truth: identity, concept, plan, budget, vendors, reputation/
history, the set of Occurrences, and all creation/search policy (via the Project Service). Project is the
authoritative source Public Space reads from.

## 6. What belongs to Public Space

Projection and presentation concerns only: the public page composition, public navigation, SEO/Open Graph
metadata, public URL identity, and the selection/handoff into registration. **No Project data is owned
here** — Public Space holds derived/rendered views, not source records.

## 7. What belongs to Occurrence

Per the Occurrence spec: date/time, location, capacity, price, status, registrations, and attendance.
Public Space **displays** an Occurrence's public-safe fields (when, where, price, availability) and uses
the Occurrence as the unit of selection — it does not own or mutate any of them.

## 8. Public navigation model

```
Discovery (search / organizer page / shared link)
        ▼
Public Project page  ──►  future Occurrence list  ──►  selected Occurrence  ──►  Registration entry
```

Entry points: organizer page, direct Project URL, or a shared/deep link. Navigation always converges on a
**Project page**, then narrows to a **selected Occurrence** before registration.

## 9. Public Project page structure (canonical sections)

1. **Identity** — Project title, summary, organizer attribution.
2. **Offering** — what the Project is (public concept-level description).
3. **Future Occurrences** — the list of upcoming, publicly-visible Occurrences (§10).
4. **Media** — approved public photos/videos (§15).
5. **Registration entry** — reached through a selected Occurrence (§11).
6. **Shareable metadata** — SEO + Open Graph (§12, §13).

(Sections are an architectural composition, not a UI layout — no styling/markup implied.)

## 10. Public Occurrence selection

Public Space lists the Project's **future Occurrences** that are publicly visible (e.g., `scheduled`/
`open`), each showing public-safe fields (when, where, price, availability derived from capacity). The
visitor **selects one Occurrence** to proceed. Past, cancelled, or non-public Occurrences are not offered
for registration. For single-instance Projects the one Occurrence is pre-selected; for series/course
Projects the single enrollable Occurrence is the selection unit (see Occurrence spec §13).

## 11. Registration entry point

**Registration always starts from a selected Occurrence** — never from the Project as a whole. Public
Space's role ends at the handoff: it identifies the chosen Occurrence and routes the visitor into
registration. Capacity checks, pricing, eligibility, and payment are owned downstream (Occurrence/
Registration/Project), not by Public Space.

## 12. SEO responsibilities

Public Space owns the **public discoverability metadata** projected from Project data: titles,
descriptions, canonical URLs, and structured public information for each Project page (and, where
applicable, Occurrence-dated views). SEO content is **derived** from Project/Occurrence truth, never
authored independently.

## 13. Open Graph responsibilities

Public Space emits **shareable preview metadata** (title, description, image, type, canonical URL) for
Project pages and shared Occurrence links, sourced from the Project's identity and approved media. This is
projection of existing data for link previews — no new truth is created.

## 14. Organizer identity within Public Space

Public Space presents the **organizer's public identity** as the attribution of the Project (name, public
profile, and — per platform reputation rules — completed-work standing). The organizer page is itself a
Public-Space surface that aggregates that organizer's public Projects. Organizer identity is **read** from
the Project owner; Public Space does not define or alter it.

## 15. Media (photos / videos)

Public Space displays **approved public media** associated with the Project (and, where relevant, an
Occurrence). Media truth/ownership lives with the Project; Public Space projects only the public-approved
subset. No private/internal media is exposed.

## 16. Public vs private information

| Public (projected) | Private (never projected) |
|---|---|
| Project identity, public description | plan internals, scope decomposition |
| Future public Occurrences (when/where/price/availability) | budget, vendor quotes, margins, fees |
| Organizer public identity + standing | client/customer data, internal notes |
| Approved public media, SEO/OG metadata | registrations of others, payment data |
| Registration entry (per Occurrence) | execution/operational records |

Public Space exposes the **public** column only; everything else stays inside Project/Project Service.

## 17. URL principles

- **Project is the primary public addressable unit** — a Project has a stable public URL (Public Space
  publishes Projects, not database entities or internal ids).
- **Occurrence is addressable in the context of its Project** (a dated/selected view under the Project's
  URL space) so a specific happening can be shared and entered.
- **Organizer is a public addressable surface** aggregating that organizer's public Projects.
- URLs are **stable, human-meaningful, and canonical** (one canonical URL per public resource for SEO).
- URLs reference **public identity**, never internal/private identifiers or private state.

## 18. Canonical architectural diagrams

**Projection (truth → projection, one-directional):**
```
Project Service ──owns──► Project (Root, truth)
                              │ read-only projection
                              ▼
                         Public Space ──► public Project page
                                              ├─ identity / offering / media
                                              ├─ future Occurrences (public)
                                              └─ Registration entry (per selected Occurrence)
```

**Selection → registration handoff:**
```
Public Project page ──► future Occurrence list ──► selected Occurrence ──► Registration (downstream)
                                                                           │
                                              capacity / price / payment ──┘ (Occurrence / Registration / Project)
```

## 19. Examples

| Scenario | Public Project page shows | Public Occurrences | Registration entry |
|---|---|---|---|
| **One-time birthday** | the party identity (if public at all) | the single dated Occurrence (pre-selected) | the one Occurrence |
| **Recurring yoga** | "Beach Yoga" identity + offering | the list of upcoming sessions | a selected session (Occurrence) |
| **Festival** | festival identity, media, lineup summary | the edition's Occurrence (dated) | the festival Occurrence |
| **Conference** | conference identity, summary | the edition's Occurrence (dated) | the conference Occurrence |

In every case Public Space **publishes the Project**, **lists future Occurrences**, and **starts
registration from a selected Occurrence** — projecting Project/Occurrence truth without owning it.

---

*Model spec only. Public Space is a read-only projection capability of the Root Project: it publishes
Projects (not database entities), displays future Occurrences, always starts registration from a selected
Occurrence, owns no Project data, and contains no business logic — that remains inside Project and the
Project Service. No code, schema, URL routing, or UI is implied by this document.*
