# Occurrence — Architecture Spec

**Status:** model specification (no implementation commitment beyond the model). **Scope:** defines
**Occurrence** as the concrete execution unit of a Project in time. Does not change code, add
migrations, rename Event/OPE/Project, or reopen the Ownership Migration. **Project remains the Root
Entity**; the **Project Service** remains the only owner of Project creation/search policy. Occurrence
is a Project-owned child layer; everything attached to an Occurrence is transitively owned by its
Project.

---

## 1. Definition

An **Occurrence** is one concrete, time-bound, attendable instance of a Project — a specific happening
at a specific date/time (and place) that participants register for and attend. The Project is the
durable *intent*; an Occurrence is a single *realization* of that intent in time.

## 2. Relationship — Project 1 → many Occurrences

A Project owns **zero or more** Occurrences. An Occurrence belongs to **exactly one** Project (FK to
the Root Entity; same ownership/RLS path as every other Project child). The Project never moves between
Occurrences; Occurrences never exist without a Project.

```
Project (Root) ──1───many──► Occurrence ──1───many──► Registration ──1───1──► Payment
   │
   └─ (optional) Schedule Rule ──generates──► Occurrences
```

## 3. Project vs Schedule Rule vs Occurrence

| Concept | Is | Owns | Cardinality |
|---|---|---|---|
| **Project** | the durable engagement/intent (Root) | plan, budget, vendors, identity, history | 1 |
| **Schedule Rule** | a recurrence/timing *definition* (e.g. "every Sat 08:00") | the pattern + defaults that seed Occurrences | 0..n per Project |
| **Occurrence** | one concrete instance *in time* | date/time, capacity, price, registrations, attendance | 0..n per Project |

A Schedule Rule is a **generator**, not an instance. It produces Occurrences; it is never registered
for, priced, or attended. Occurrences may also be created ad-hoc (no rule).

## 4. Recurring activity = one Project, many Occurrences

A repeating activity is **one Project with many Occurrences**, never many Projects. The Project holds the
stable identity (concept, plan, reputation, public page); each happening is an Occurrence. This keeps
identity, history, and analytics unified across the series and avoids duplicate Roots.

## 5. Registration belongs to Occurrence

A participant registers for a **specific Occurrence** (a specific happening), not for the Project. A
Registration references exactly one Occurrence. (A series/course is the exception by being modeled as a
single enrollable Occurrence — see §13.)

## 6. Payment belongs to Registration

A Payment is made **against a Registration** (one Registration → its Payment record(s)). Payment never
attaches directly to the Project or the Occurrence; it follows the registration that incurred it.
Financial records remain immutable per the platform's Source-of-Truth rules.

## 7. Capacity belongs to Occurrence

Each Occurrence has its **own capacity**. Filling one Occurrence (e.g., one Saturday session) does not
affect any other Occurrence of the same Project. A Schedule Rule may supply a *default* capacity that
seeds new Occurrences, but the Occurrence is the source of truth for its own capacity.

## 8. Price belongs to Occurrence

Each Occurrence carries its **own effective price**. The Project/Schedule Rule may provide a default that
seeds new Occurrences; the Occurrence is authoritative for what a participant pays to attend it.

## 9. Cancellation applies to Occurrence

Cancelling an Occurrence calls off **that happening only** (e.g., one rained-out session) and triggers
its registration/refund handling — **without cancelling the Project**. The Project and all other
Occurrences remain intact. Cancelling the Project is a separate, Root-level action.

## 10. Occurrence lifecycle / statuses

| Status | Meaning | Typical transition |
|---|---|---|
| `scheduled` | created; not yet open for registration | → `open` |
| `open` | accepting registrations | → `full` / `closed` / `cancelled` |
| `full` | capacity reached (registration closed by capacity) | → `closed` / `in_progress` |
| `closed` | registration closed (deadline/manual); not yet happened | → `in_progress` / `cancelled` |
| `in_progress` | happening now | → `completed` |
| `completed` | has happened | (terminal) |
| `cancelled` | called off (Project unaffected) | (terminal) |

Statuses are **per Occurrence** and independent of the Project lifecycle. Rescheduling is modelled as
cancelling/closing one Occurrence and creating another at the new time (the snapshot is preserved).

## 11. What belongs to Occurrence

- Date/time (start, end) and the specific location for that instance.
- Capacity and the effective price (§7, §8).
- Registrations and their attendance/check-in records (§5).
- Occurrence status (§10) and instance-specific notes.
- The realized attendee roster for that happening.

## 12. What does NOT belong to Occurrence

- The **concept, plan, and scope** → Project (and its Plan).
- The **budget and vendor commitments** → Project.
- The **Project identity, public page, reputation, and history** → Project.
- The **Schedule Rule** (the generator) → its own definition, not the instance.
- **Payment** → belongs to the Registration, not the Occurrence directly (§6).
- Anything **durable/engagement-level**: an Occurrence holds only what is true of *one happening in
  time*.

## 13. Examples

| Scenario | Project | Schedule Rule | Occurrences |
|---|---|---|---|
| **One-time birthday** | the party | none | **1** Occurrence (the single date) |
| **Recurring yoga (drop-in)** | "Beach Yoga" | "every Sat 08:00" | **many** — one per session; register/pay per session; cancel one rainy Saturday → that Occurrence only |
| **Course / series (enroll once)** | "8-week Pottery Course" | weekly meeting pattern (informational) | **1** enrollable Occurrence (the series); register/pay once; weekly meetings are session slots *within* the Occurrence, not separate Occurrences |
| **Festival** | "Summer Festival" | none / annual | **1** Occurrence per edition (multi-day/multi-stage live *inside* the one Occurrence); annual repeat → one Occurrence per year |
| **Conference** | "DevConf" | none / annual | **1** Occurrence per edition; tickets/registration attach to it; recurring annual → many Occurrences over years |

**Canonical rule:** an Occurrence is *one enrollable/attendable instance in time*. Drop-in recurring →
many Occurrences (register per instance). Series/course → one Occurrence (enroll once for the series).
Festival/conference → one Occurrence per edition.

---

*Model spec only. Project stays the Root Entity; the Project Service stays the sole owner of Project
creation/search policy; Occurrence is a Project-owned, time-bound execution child. No code, schema, or
naming changes are implied by this document.*
