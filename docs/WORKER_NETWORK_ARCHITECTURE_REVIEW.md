# Worker Network Architecture — Review

> Review of `WORKER_NETWORK_ARCHITECTURE.md` against `MASTER_PRODUCT_DECISIONS.md`,
> `OPE_MASTER_SPEC.md`, and `OPE_SOURCING_ENGINE.md`, plus checks for hidden barriers, W0-breaking
> dependencies, and gaps in fulfillment / waves / expansion / edge cases. **Findings only — the document
> is not rewritten.** Date: 2026-06-10.

**Checks performed (all 10 requested):** contradictions vs Master Decisions (§1) / Master Spec (§2) /
Sourcing Engine (§3); hidden worker barriers (§4); W0-breaking marketplace deps (§5); fulfillment gaps
(§6); wave-logic gaps (§7); expansion gaps (§8); edge cases (§9); sections to revise (§10). Mapped into
Critical / Medium / Minor below.

---

## Critical Issues (must resolve before approval)

### C1. No flow for a confirmed worker who cancels or no-shows (post-`Assigned` attrition)
- **Where:** §6 Fulfillment tracking, §7 Lifecycle.
- **Problem:** the lifecycle ends `Assigned → Completed`, and the metrics track `confirmed_workers`, but
  there is **no state or loop for a confirmed worker who cancels late or fails to appear**. This is the
  single most operationally critical staffing failure mode.
- **Why it matters:** without it, a role can read "filled" then fail on event day — directly violating
  the doc's own *no-silent-under-fill* stance (§6) and the freeze-before-execution rule
  (`OPE_EVENT_LIFECYCLE`: roles locked at Registration Closed). The system would freeze on a worker who
  then vanishes, with no replacement path.
- **Needs:** a post-`Assigned` cancellation/no-show state, `remaining_slots` reopening, an
  **emergency/standby re-source** loop under deadline pressure, and a reliability penalty (already hinted
  in §9 but not wired to a flow).

### C2. Cold-start & new-worker fairness contradicts "anyone joins / trust is earned"
- **Where:** §3 (open onboarding), §4–§5 (reliability-ranked matching/waves), §9 (reputation).
- **Problem:** matching and wave priority are ranked by **earned reliability** (§4, §9), but a new worker
  has **zero reputation** → low priority → may never be invited → can never complete work → can never
  earn trust. The doc promises "trust is earned through completed work" (§3) yet provides **no mechanism
  for a zero-reputation worker to get a first assignment**, and no answer to the **chicken-and-egg
  bootstrap** (no workers before events; events can't be staffed before workers).
- **Why it matters:** this is a **hidden barrier** (review check #4) that undermines the core value prop
  (low barrier, supply liquidity) and the career on-ramp (§10). It can silently make the Network a
  closed club of early workers.
- **Needs:** a new-worker exploration/cold-start allocation (reserve a wave slice for unproven workers),
  a neutral starting reputation, and an explicit bootstrap/liquidity strategy. Pairs with the missing
  **rotation/fairness** (M11).

---

## Medium Issues (reconcile before sign-off)

### M1. Over-acceptance is unhandled (waves can over-fill)
- **Where:** §5 waves, §6 metrics. Wave 1 invites `slots ÷ acceptance_rate` (e.g. 20 for 10), but there
  is **no in-wave early-stop** when enough accept, and **no model for surplus `accepted` workers** not
  confirmed (released? kept as standby?). With faster-than-expected acceptance, 10 slots could draw 18
  yeses. Define in-wave throttling + a standby/waitlist concept (which also feeds C1's replacement loop).

### M2. The "W0–W3 mirrors Sourcing L0–L3" claim is inaccurate (contradiction with Sourcing Engine)
- **Where:** §11 ("Mirrors the Sourcing Engine's L0–L3 ladder") + §0.
- **Problem:** Worker Network **is** Sourcing's **L2** ("Networks"). So **W1 and W2 both live inside
  L2**, and Sourcing's **L1 "seed directory" has no Worker analog**; W0 ≈ Sourcing L0, W3 ≈ L3. The
  ladders are related but **not 1:1**, so the "mirror" framing over-claims. Either soften the claim or
  map them explicitly (W0↔L0, W1+W2↔L2, W3↔L3; L1 = no worker tier).

### M3. Monetization silence vs Master §11.8 "no free core product"
- **Where:** §3 ("no payment requirement"), §11.
- **Problem:** Master Decisions §11.8 states **there is no free core product**; monetization is by
  access/credential. The Worker doc makes onboarding free (correct for supply) but is **silent on where
  the money is** (organizer pays for staffing fulfillment? W3 marketplace fees?). As written it can read
  as contradicting §11.8. State the monetized layer explicitly so the free worker side is clearly the
  *supply* side of a paid service.

### M4. "Verified" (W2) collides with the open "Verified Organizer" decision (P12)
- **Where:** §11 (W2 Verified Workers), §12 (verification).
- **Problem:** Master §3/§11.9 define **"Verified Organizer"** as an identity badge earned via a **paid**
  verification fee (P12, still **open**). Reusing **"Verified"** for workers risks terminology collision,
  and the doc is **silent on whether W2 worker verification costs money** — which could contradict its own
  "no payment" onboarding. Disambiguate the term (e.g., "capability-verified worker") and state the
  cost/none of W2.

### M5. A third career-path model atop the unresolved P13
- **Where:** §10 (`Participant → Worker → Organizer → Certified Organizer`).
- **Problem:** Master §11.9 **P13** already flags an **unresolved** conflict between the **6-step**
  (§10.2) and **9-stage** Career Path models. The Worker doc introduces a **third** 4-step representation
  and inserts a **new "Worker" stage** — extending an open decision rather than reconciling it. Align with
  (or explicitly feed) the P13 consolidation before approval.

### M6. Depends on a Staffing Engine capability that is `PARTIAL`
- **Where:** §0/§1/§13 ("OPE produces capability needs: roles, counts, windows, safety flags").
- **Problem:** `OPE_MASTER_SPEC` §9 Staffing Engine is **PARTIAL** — only `supervising_adults` is derived;
  **there is no role/capability model yet**. The Worker Network assumes a capability-typed need stream
  that OPE does not yet emit. Not a contradiction in intent, but a **sequencing dependency** that should
  be stated (Staffing must emit capability needs first).

### M7. Wave timing is undefined
- **Where:** §5. No **wave timeout** ("settle" is not quantified — when does `no_response` trigger the
  next wave?) and **no cold-start default `acceptance_rate`** before learning data exists. Define both;
  otherwise the loop is non-deterministic.

### M8. Double-booking / availability conflicts across concurrent needs
- **Where:** §4–§6. A worker `Available` in a window can be invited to **two overlapping events**;
  nothing prevents accepting both or detects the conflict at `Assigned`. Add availability-locking on
  acceptance/assignment.

### M9. Reputation scope is ambiguous (per-capability vs global)
- **Where:** §2 (capabilities carry proficiency) vs §9 (reputation reads global). A strong waiter may be a
  weak bartender; a single global score mis-ranks multi-capability workers and harms match quality.
  Specify per-capability reputation (with a global reliability component).

### M10. Capability-expansion governance gaps
- **Where:** §8. (a) **Who seeds the adjacency graph** before learned weights exist (expert? organizer?)
  is undefined. (b) **Pay-band / competence mismatch** on substitution is not governed beyond "organizer
  consent." (c) No **cap on the share of a role** fillable by substitutes (10 waiters mostly filled by
  setup crew = quality risk). Add seeding authority, pay/competence rules, and a substitution cap.

### M11. No rotation/fairness in matching (worsens C2)
- **Where:** §4–§5. Sourcing Engine §5 includes **diversity/rotation**; the Worker doc ranks by
  reliability + proximity only, so the **same top workers** are always invited — starving others and
  compounding the cold-start barrier (C2). Add rotation as a first-class matching factor.

---

## Minor Improvements

- **m1.** §11: **W0 is effectively a no-op** for the Network (matching/waves/fulfillment all need W1+);
  the "W0/W1 realizable slice" framing overstates W0 — clarify that the Network's real floor is **W1**.
- **m2.** §7: the lifecycle adds a **`Reviewed`** state not present in the Sourcing acceptance workflow
  (`Requested→…→Completed`); harmless, but note the mapping (Reviewed = Completed → learning).
- **m3.** §7: no **dormant/inactive** worker handling — `Available` appears to persist indefinitely; add
  decay/cleanup distinct from `Suspended`.
- **m4.** §2/§4: a multi-capability worker matched for **two roles in the same event** (waiter *or*
  bartender) — dedup/selection rule unspecified.
- **m5.** No mention of **worker consent/privacy** for outreach channels (push/email).
- **m6.** No **very-short-notice** behavior (need in ~2h vs ~2 weeks) — `time_to_deadline` is referenced
  but the extreme case isn't characterized.
- **m7.** §6/§8: **zero-pool-for-a-capability** (and no viable adjacency) should explicitly escalate to
  W0/organizer, not loop.

---

## Section-by-section: revise before approval

| Section | Revision |
|---|---|
| §3 Onboarding / §11 Ladder | state where monetization lives (M3); disambiguate "Verified" + W2 cost (M4) |
| §4–§5 Matching / Waves | add new-worker allocation + rotation (C2, M11); wave timeout + cold-start rate (M7); in-wave early-stop (M1) |
| §6 Fulfillment | add post-`Assigned` cancellation/replacement (C1), over-acceptance/standby (M1), double-booking (M8), partial-fill outcome |
| §7 Lifecycle | add cancellation/no-show + dormant states (C1, m3) |
| §8 Expansion | adjacency seeding authority, pay/competence rules, substitution cap (M10) |
| §9 Reputation | per-capability vs global (M9); neutral cold-start reputation (C2) |
| §10 Career path | reconcile with P13 (M5) |
| §11/§13 Ladder/Integration | fix L0–L3 mirror (M2); note Staffing `PARTIAL` dependency (M6) |
| **New** | add a **cold-start / liquidity** section and a **worker-attrition / replacement** flow |

---

## Approval Recommendation

### APPROVE WITH REVISIONS (conditional — not approved as-is)

The architecture's **shape is sound and well-integrated**: capability-based modeling, demand-driven
(not job-board) framing, the wave/fulfillment loop, the W-ladder, safety governance, and the
Sourcing/Lifecycle/Learning wiring are all correct in concept and consistent with the OPE doc set's
safety asymmetry and no-silent-fallback ethos.

It is **not approvable as written** because of **two critical gaps** that break the core promise in
operation:
1. **C1 — no replacement flow for a no-show/cancelled confirmed worker** (execution integrity), and
2. **C2 — no cold-start / new-worker fairness**, which contradicts "anyone joins, trust is earned" and
   risks a closed early-worker club.

**Condition for approval:** resolve **C1 and C2**, and reconcile the medium items that touch other
approved/locked decisions — **M2** (Sourcing ladder), **M3** (Master §11.8 monetization), **M4**
(Verified/P12), **M5** (career path/P13), and **M6** (Staffing `PARTIAL` dependency). The remaining
mediums and minors can follow as a v1.1 revision. With C1/C2 plus M2–M6 addressed, the document is ready
to approve.

_Review only. No document was rewritten; nothing committed._
