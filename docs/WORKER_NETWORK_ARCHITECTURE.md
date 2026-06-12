# Worker Network — Architecture

> **Type:** business architecture (concepts, workflows, system behavior). **Not** a database schema,
> API, UI, or implementation design.
> **Role:** the subsystem that converts **staffing needs into filled event roles**. It is the worker-side
> **CandidateProvider** for the Sourcing Engine.
> **Connects:** `OPE_MASTER_SPEC.md` (§9 Staffing), `OPE_SOURCING_ENGINE.md`, `OPE_EVENT_LIFECYCLE.md`,
> `OPE_LEARNING_ARCHITECTURE.md`, `MASTER_PRODUCT_DECISIONS.md` (§11.4 three loops, career path),
> Academy & Certification.
> **Status:** forward-looking. Not built in M1–M3; the **W0/W1 levels are the near-term realizable
> slice** (mirrors the Sourcing Engine's L0/L1 ladder).
> **Date:** 2026-06-10.

## 0. Where it sits — the flow

```
OPE ─▶ Plan ─▶ Staffing Needs ─▶ Sourcing Engine ─▶ WORKER NETWORK ─▶ Worker Responses
                                                          │
                                          Organizer Selection ─▶ Filled Roles
```

OPE's Staffing Engine produces **capability needs** (roles + counts + windows + safety flags). The
Sourcing Engine turns each into a **worker request**. The **Worker Network** resolves that request into
**filled roles** by matching capabilities, inviting workers in waves, tracking fulfillment, and handing
the organizer a selection. It sits **between the Sourcing Engine and the future Marketplace**.

---

## 1. Core principles — what it is, and is not

**Worker Network is a staffing-fulfillment system.** Its single job: turn an unfilled role into a
confirmed worker, reliably and with minimal friction for everyone.

It is **NOT**:
- **LinkedIn** — not a professional social graph.
- **a job board** — workers do not browse and apply; **needs pull workers** (demand-driven, push-based).
- **a resume database** — workers are indexed by **capabilities and availability**, not searchable CVs.

Consequences of being demand-driven, not supply-browsed:
- The system **invites** the right workers for a specific need; it does not host listings to scroll.
- Workers are matched by **what they can do now**, not by reputation-as-portfolio.
- Value is **fulfillment** (the role got filled), not engagement.

---

## 2. Worker Model — capabilities, not professions

**A worker is a bundle of capabilities, not a single profession.** The system matches **capabilities**.

```
Worker
  capabilities: [ Waiter, Bartender, Setup Crew, Cleaner ]
```

- A **capability** is a thing the worker can do for an event (waiter, bartender, host, setup crew,
  cleaner, photographer, DJ, security, lifeguard, first-aider, translator…).
- One worker holds **many** capabilities; the same person is matched as a waiter for one event and setup
  crew for another.
- Each capability may carry: **proficiency** (earned, not declared-and-trusted), **verification status**
  (required for safety-critical capabilities), and **availability**.
- **Never model a worker as one profession.** "John the waiter" is wrong; "John, who can do
  {waiter, bartender, setup}" is right. This is what lets a small worker base fill a wide range of needs.

---

## 3. Onboarding (v1) — low barrier, earned trust

Worker Network v1 has **no payment, no certification, no mandatory training, no mandatory exam.
Anyone can join.** Trust is **earned through completed work**, not granted at the gate.

Why deliberately open:
- **Supply liquidity** — staffing fails if the pool is thin; a low barrier builds the pool.
- **A real on-ramp** — a participant can become a worker in minutes (feeding the career path, §11).
- **Trust where it belongs** — reputation accrues from *doing the work* (§10 learning), and **safety-
  critical roles are gated by verification** (W2, §12), not by gatekeeping everyone up front.

This is the **opposite** of Organizer Certification (a gated profession). Worker = the **low-barrier**
rung; Organizer = the **credentialed** one. The two barriers are intentionally different.

---

## 4. Capability-based matching

OPE requests **capabilities + counts**; the Network searches workers who hold that capability **and** are
matchable now.

```
Need: 10 × Waiter (Sat 18:00–23:00, Honolulu)
→ search: capability = Waiter, available in window, within radius, reliability rank
→ candidate pool (to be invited in waves)
```

Hard filters: **capability, availability (window), location (radius)**, and — for safety-critical roles —
**verification**. Soft ranking: **reliability** (earned), **proximity**, **fit**. Matching produces a
**pool**, not invitations — invitations are metered by **waves** (§5).

---

## 5. Outreach waves — minimize unnecessary invitations

**Do not invite everyone at once.** Inviting 100 workers for 10 slots spams the base, risks chaotic
over-acceptance, and erodes trust.

```
Need: 10 Waiters    Pool: 100 Waiters
Wave 1 → 20 invites     (need × oversubscription factor)
Wave 2 → top-up         (as declines / timeouts accrue)
Wave 3 → top-up / expand (deadline pressure → see §8 capability expansion)
```

**Wave sizing governance** — `wave_size = f(target_confirmations, expected_acceptance_rate, time_to_deadline)`:
- Start from the **target confirmations** set by the organizer's staffing policy (§5A) ÷ expected
  acceptance rate (e.g. target 11 ÷ 50% ≈ 22 invites).
- **Top up only as responses settle** (decline / accept / timeout), never pre-emptively.
- **Stop a wave early** once acceptances reach the policy target — do not keep inviting into an over-fill.
- **Tighter deadline → larger waves**; ample time → smaller, politer waves.
- The **acceptance-rate estimate is learned** per capability × region (§10 / Learning Architecture), so
  waves get sharper over time.

Goal: **reach the policy target with the fewest invitations**, respecting workers' attention and avoiding
uncontrolled over-fill.

---

## 5A. Organizer staffing policy

Wave sourcing can over-deliver (need 10 → invite 20 → 14 accept). This is governed by an **organizer
staffing policy**, not by one universal platform rule: the right buffer depends on the event's risk and
how replaceable the role is. The platform **offers** policies; the **organizer chooses**.

| Policy | Target confirmations | Standby | Purpose |
|---|---|---|---|
| **Exact Fill** | `required` (10 → confirm 10) | none | low-risk, easy-to-replace roles |
| **Safety Buffer** | `required + N` (10 → confirm 11) | none | over-confirm to absorb normal attrition |
| **Standby Pool** | `required` (10 → confirm 10) | reserve 1–N | confirm exactly, keep warm replacements |

How the policy drives behaviour:
- It sets **`target_confirmations`** and **standby reserve**, which drive wave sizing (§5) and the
  fulfillment metrics (§6).
- It integrates with **replacement sourcing** (§7A): *Safety Buffer* lowers the chance of under-fill;
  *Standby Pool* gives an instant replacement on a drop; *Exact Fill* triggers fresh sourcing on a drop.
- A sensible **default** (Safety Buffer or Standby for safety-critical roles; Exact Fill for low-risk
  ones) applies, but the organizer can **override per role**.

So over-acceptance is a **policy outcome**, not a defect: under *Safety Buffer* the extra acceptances are
the point; under *Exact Fill* the wave stops early at target; under *Standby Pool* surplus willing
workers become the reserve.

---

## 6. Fulfillment tracking

The Network tracks each need to closure:

| Metric | Meaning |
|---|---|
| `required_slots` | how many workers the role needs |
| `target_confirmations` | `required` + buffer, per the organizer's staffing policy (§5A) |
| `invited_workers` | total invited so far (across waves) |
| `accepted_workers` | said yes |
| `confirmed_workers` | organizer-selected (Assigned) for the slot |
| `standby_workers` | matched/willing, held in reserve (Standby policy, §5A) |
| `declined_workers` | said no |
| `no_response_workers` | invited, timed out |
| `dropped_workers` | confirmed then **cancelled or no-showed** (§7A) |
| `remaining_slots` | `required − (confirmed − dropped)` — **can rise again after confirmation** |

**Sourcing loop:** while `remaining_slots > 0` **and** not stopped **and** deadline not passed → release
the next wave. **Stop conditions:**
1. **Filled** (`remaining_slots = 0` against the policy target),
2. **Organizer stops** sourcing,
3. **Deadline expires.**

**Fulfillment is not final at confirmation.** Because `dropped_workers` can rise after confirmation
(§7A), `remaining_slots` can **reopen** and the loop **re-enters sourcing even for a role that was
previously filled**. On deadline-with-unfilled — or on an unrecoverable late drop — the Network
**escalates to the organizer** with options: promote a standby (§5A/§7A), expand capability (§8), invite
more, source externally (W0), or reduce the requirement — never silently leave a role "filled" when it
isn't (honesty, consistent with ADR-002's no-silent-fallback ethos).

---

## 7. Worker lifecycle

```
Joined ─▶ Available ─▶ Invited ─▶ Accepted ─▶ Assigned ─▶ Completed ─▶ Reviewed
                          │                       │
                          │                       └─▶ Cancelled / No-show ─▶ (slot reopens → §7A)
                          └────▶ Declined / No-response ──▶ (back to Available)
```

| State | Meaning | Maps to Sourcing (`OPE_SOURCING_ENGINE` §7) |
|---|---|---|
| **Joined** | signed up, declared capabilities | — |
| **Available** | opted in for a window/area — the matchable state | — |
| **Invited** | received a wave invitation for a specific need | Matched |
| **Accepted** | confirmed availability for that need | Accepted |
| **Assigned** | organizer selected/confirmed them for the slot | Confirmed |
| **Cancelled** | withdrew **after** being Assigned (day-before / hours-before) | (drop → §7A) |
| **No-show** | Assigned but never arrived | (drop → §7A) |
| **Completed** | performed the work | Completed (event Completed) |
| **Reviewed** | organizer rated them → reputation updates | (event Closed → learning) |

**Lifecycle linkage (`OPE_EVENT_LIFECYCLE`):** invitations go out after **Ready**; **Assigned must
happen before Registration Closed / In Progress** (the execution freeze — roles must be locked before the
event); **Completed/Reviewed** at the event's Completed → Closed. Declines / no-responses return the
worker to **Available**. **Cancelled / No-show** after Assignment **reopen the slot** (§7A). Reliability
or safety failures can move a worker to **suspended** (off-pool).

---

## 7A. Worker replacement & no-show handling

A confirmed role is **not permanently filled**. Real events lose workers after confirmation — a day
before, two hours before, or simply by not arriving. The architecture treats an Assigned slot as
**reopenable**.

```
Confirmed (Assigned)
   ├─▶ Cancelled   (worker withdraws — day-before / hours-before)
   └─▶ No-show     (worker never arrives)
            ↓
       Slot reopens  ─▶  Replacement Sourcing  ─▶  Role Refilled
```

**Concepts and behaviour:**
- **Drop event** — a Cancelled or No-show on an Assigned worker. It increments `dropped_workers` and
  **reopens the slot** (`remaining_slots`++ in §6); the need is no longer "filled."
- **Replacement sourcing** — the Worker Network **re-enters sourcing for the reopened slot**, under the
  event's *remaining* lead time, in order of preference:
  1. **Standby pool** (if the organizer's policy reserved one, §5A) — instant promotion of a warm
     standby worker to Assigned.
  2. **Fresh, deadline-compressed wave** (§5) — may **expand into adjacent capabilities** (§8) under
     time pressure.
  3. **Escalate to organizer / W0** — if no in-time replacement exists, the organizer is told and may
     source externally or adjust the requirement.
- **Lead-time awareness** — the closer to the event, the more the system favours **standby and
  adjacent-capability** fill over fresh waves. A No-show **during In Progress** may be unrecoverable, but
  is still **surfaced, never hidden**.
- **Reliability signal** — a drop attaches a reliability penalty (§9), and a No-show may trigger
  cooldown/suspension; a worker who steps in as a replacement earns positive signal.
- **Organizer always informed** — every drop and every replacement attempt/outcome is communicated
  (push/email, §6 channels). Fulfillment status stays truthful: a reopened role reads as **partially
  filled / re-sourcing**, never "filled."

This keeps the lifecycle honest end to end: confirmation is a **strong commitment, not an immutable
fact**, and the Network keeps every role **truthfully tracked and actively re-sourced** until the event —
consistent with the no-silent-under-fill principle (§6) and the freeze rules of `OPE_EVENT_LIFECYCLE`.

---

## 8. Capability expansion (adjacency)

When exact-capability supply is insufficient, search may expand into **adjacent capabilities**:

```
Waiter → Bartender → Event Assistant → Setup Crew
```

A worker with an adjacent capability can acceptably cover the role. **Governance rules:**
- **Exhaustion first** — expand only when exact-capability supply is insufficient **and** there is
  deadline pressure (after waves of the exact capability).
- **Organizer awareness/consent** — expansion is surfaced to the organizer; the system never silently
  sends a cleaner to bartend.
- **Bounded hops** — adjacency is directional and limited (1–2 hops), not an arbitrary graph walk.
- **Safety hard rule** — **safety-critical capabilities never expand** to non-matching or unverified
  workers (a lifeguard role is not fillable by "swimmer"; security is not "setup crew"). This is
  absolute and ties to the safety asymmetry in `OPE_LEARNING_ARCHITECTURE`.
- **Learned adjacency weights** — how well a substitute performed (reviews) tunes the adjacency graph
  over time; poor substitutions weaken an edge.

Expansion is the staffing analog of the Sourcing Engine's graceful degradation: better an
organizer-approved adjacent worker than an unfilled role — but never at the cost of safety.

---

## 9. Trust & reputation — earned, not declared

Because onboarding is open (§3), trust must be **earned through completed work** and fed by the Learning
Architecture's signal classes:

| Signal | Effect | Learning class |
|---|---|---|
| Completed assignments | reliability ↑, eligibility for bigger roles | auto (statistical) |
| Acceptance / response rate | match priority, wave estimates | auto |
| Organizer review (quality) | reputation rank | **organizer-confirmed** |
| No-show / late cancel | reliability ↓, cooldown | organizer-confirmed |
| Safety / verification lapse | **suspension / disqualification** | **expert** (never auto) |

Reputation is **reliability for fulfillment**, not a public portfolio. It raises a worker's wave priority
and unlocks higher-trust roles — and safety lapses are removed **only by expert review**, never softened
by good statistics.

---

## 9A. New-worker fairness & network liquidity

Reputation-ranked matching (§4, §5, §9) rewards proven workers — but if priority is *only* reliability,
new workers are never invited, never complete work, and never earn the trust the system promises ("anyone
can join; trust is earned"). That would turn the Network into a **closed incumbent club** and starve
supply. **The goal is not equal outcomes — it is preventing permanent exclusion and keeping the pool
liquid.**

**Principles and system behaviour:**
- **Neutral starting trust** — a new worker joins at a **neutral baseline**, not last place. Unproven ≠
  untrusted-bad.
- **First-job opportunity** — every outreach reserves a **share of each wave for new / under-exposed
  workers** (an exploration slice), so a zero-history worker has a real path to a first assignment. This
  is the opportunity to be *invited*, not a guarantee of being *selected* — the organizer still chooses.
- **Rotation / anti-saturation** — among comparably-qualified workers, invitations **rotate** rather than
  always surfacing the same top few, spreading opportunity and avoiding incumbent burnout.
- **Graduated trust by stakes** — new workers are matched first to **lower-stakes, easy-to-replace** roles
  (non-safety-critical, ideally with standby coverage), earning reputation safely. Safety-critical roles
  still require **W2 verification** (§12) regardless of fairness.
- **Liquidity over incumbency** — the platform optimises for a **healthy, growing pool** (enough workers
  per capability × region), not for maximising any one worker's bookings. Thin pools trigger active
  onboarding, not just harder squeezing of incumbents.
- **No permanent exclusion** — a quiet or new worker is never de-ranked into invisibility; inactivity
  leads to **dormancy (re-activatable)**, not a black hole. Only **safety/verification failures**
  (expert-reviewed, §12) remove a worker.

**Net effect:** proven workers still rank higher and receive more invitations (quality is preserved), but
**new workers always have a real, recurring chance at a first job**, and opportunity rotates — so trust
can actually be *earned*, and the supply side stays open and liquid. This is the fairness counterpart to
the open onboarding in §3.

---

## 10. Worker growth — the career path

Worker Network is a rung in the mission ladder ("more organizers", `MASTER_PRODUCT_DECISIONS` §11):

```
Participant ─▶ Worker ─▶ Organizer ─▶ Certified Organizer
```

- **Participant** attends activities → **Worker** helps run them (low barrier, this network) → learns
  the craft on the job → **Organizer** runs their own (gated by Certification) → **Certified Organizer**.
- The Worker tier is a **new, lower on-ramp** that feeds the organizer funnel: a reliable, multi-capable
  worker who has completed many events is a **prime candidate** to be nudged toward **Academy /
  Certification** and become an organizer.
- Worker Network must **support and surface** this path (e.g., "you've worked 20 events — become an
  organizer"), without forcing it. Working is valuable in itself; growth is optional.

---

## 11. Capability ladder (maturity levels)

Mirrors the Sourcing Engine's L0–L3 ladder — the **Network is designed once; the worker tier matures**.

| Level | Who | Behavior & eligibility |
|---|---|---|
| **W0 — External** | the organizer's own contacts, off-platform | represented only as a name the organizer enters (Sourcing L0 brief); no platform matching/notification |
| **W1 — Registered** | joined, declared capabilities, available | **matchable + invitable in waves**; reputation accrues; **no verification** → non-safety roles only |
| **W2 — Verified** | identity and/or capability verified | eligible for **safety-critical, verification-gated roles** (lifeguard, security, first-aider, certified instructor); higher trust weight |
| **W3 — Marketplace** | transactable | **bookable with rates, contracts, payments** via the future Marketplace |

Rules across levels: matching eligibility and **which roles a worker may fill** rise with the level;
**safety-critical roles require W2+**; **payments exist only at W3**. The bulk of v1 lives at **W1**, with
**W0** covering anyone off-platform and **W2** added for risky roles.

---

## 12. Safety & governance (cross-cutting)

- **Safety-critical capabilities** (lifeguard, security, first-aider, certified instructor) require
  **W2 verification** and **never** accept capability expansion or unverified fill. This is the same hard
  line as the Sourcing Engine and the Coverage Gate.
- **Verification ≠ Organizer Certification** — worker verification is a lighter credential check for a
  specific capability; becoming an *organizer* still goes through the full **Certification** subsystem.
- **No silent under-fill** — unfilled roles escalate to the organizer (§6), never masked.
- **Reputation integrity** — safety/verification status moves only by **expert** review
  (`OPE_LEARNING_ARCHITECTURE` asymmetry); good ratings cannot override a safety lapse.

---

## 13. Integration

| System | Relationship |
|---|---|
| **OPE** (Staffing Engine §9) | source of **capability needs** (roles, counts, windows, safety flags) the Network fulfills |
| **Sourcing Engine** | Worker Network **is the worker-side CandidateProvider**; sourcing requests drive outreach; the acceptance workflow is shared (§7) |
| **Academy** | workers learn skills → **add capabilities**; the learning path that turns a worker into an organizer; (future) capability micro-training to expand supply |
| **Certification** | gates **Organizer** (the Worker→Organizer transition); provides the heavier credential model that **W2 verification** is a lighter cousin of |
| **Future Marketplace** | **W3** — transactions, rates, payments; the Network's reputation + acceptance workflow are its precursor (the states a marketplace transacts on) |

These plug in **without changing the Network's contracts**: needs → capability matching → waves →
fulfillment → lifecycle → learning are identical whether the worker tier is W0 (briefs) or W3
(marketplace) — exactly why the Worker Network **works before the Marketplace exists** and scales into it.

---

## Closing

The Worker Network exists to **fill staffing needs** — nothing more, nothing less. It models workers as
**bundles of capabilities**, opens the door wide (**anyone joins; trust is earned**), and fills roles by
**capability matching + metered outreach waves + fulfillment tracking**, expanding into **adjacent
capabilities** under strict governance and **never crossing the safety line**. Its **W0→W3 ladder**
lets it deliver value with off-platform contacts today and grow into a verified, then transactable,
worker tier — while its **Participant→Worker→Organizer→Certified Organizer** path turns reliable workers
into the organizers the platform's mission is built to create.

_Architecture only. No schema, API, UI, or implementation. Consistent with the OPE Master Spec, Sourcing
Engine, Event Lifecycle, Learning Architecture, Academy/Certification, and the platform career path._
