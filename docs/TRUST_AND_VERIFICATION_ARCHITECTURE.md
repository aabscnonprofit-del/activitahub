# Trust & Verification — Architecture

> **Type:** cross-cutting architecture layer (concepts, signal categories, system behavior). **Not** UI,
> schema, API, moderation-team, or community-jury design.
> **Applies to:** Organizers, Workers, Vendors, Participants.
> **Role:** the **canonical home** of **verification credentials** and the **cross-party trust standing**.
> It **consumes** signals from the Learning Architecture and the markets and **exposes** trust standing
> back to them — it does **not** re-own signal capture, knowledge learning, participant models, or
> transactions (resolves audit D3; defines the "expert"/verification dependencies E1/E2).
> **Source of truth:** `MASTER_PRODUCT_DECISIONS.md` (§3 Verified vs Certified, P12), `OPE_V1_TECHNICAL_DESIGN.md`.
> **Reuses:** `OPE_LEARNING_ARCHITECTURE` (signal classes, safety asymmetry), `WORKER_NETWORK §9/§9A`,
> `VENDOR_NETWORK`, `RESOURCE_MARKET §9–10`, `ORGANIZER_OPERATING_SYSTEM_PRINCIPLE`.
> **Date:** 2026-06-11.

---

## Architectural principles (encoded)

1. **Complaint ≠ violation.** A complaint is a **signal**, not proof. A single complaint **never**
   auto-triggers a sanction.
2. **Patterns > individual events.** Isolated signals are weak; **repeated, corroborated** patterns are
   strong. The system evaluates **trends**, not isolated opinions.
3. **Objective > subjective signals.** No-show / confirmed cancellation / completed work / completed
   event / dispute frequency / attendance are **objective** and weighty; "boring / not funny /
   unfriendly / poor atmosphere" are **subjective** and must never, alone, move trust standing.
4. **Trust is earned.** Trust grows through **demonstrated behavior** — it is **not purchased and not
   auto-granted.** (Verification may be granted/paid; **verification is not trust** — see §1.)
5. **No community experts in V1.** No community judges, experts, or volunteer arbitration. The V1 model is
   **Trust Signals → Automated Evaluation → ALH Staff Review (rare).**
6. **The platform is not a judge of entertainment quality.** It does not decide whether a clown was funny
   or music was enjoyable — it evaluates **trust signals and patterns** (the operating-system stance,
   `ORGANIZER_OPERATING_SYSTEM_PRINCIPLE`).

---

## 1. Trust model — three distinct concepts

| Concept | Question it answers | Nature | How obtained |
|---|---|---|---|
| **Verification** | *who / what are they?* (identity, contact, business, credential) | a confirmed **fact**; gate-like | confirmed by the platform; **may be granted/paid** (e.g. the Verified-Organizer badge, `MASTER §3`) |
| **Reputation** | *how have they behaved?* (reliability, fulfillment, outcomes) | accumulated **history** | **earned** from signals over completed interactions |
| **Trust** | *how confident are we in them?* | a **synthesis** → action | derived from verification + reputation + **patterns**, expressed as a **trust level** (§6) |

**Verification ≠ trust.** A party can be **Verified** (identity confirmed) yet **Unproven** (no behavior
yet). Verification opens *eligibility*; trust is *earned standing* that drives visibility, matching, and
opportunity.

---

## 2. Trust signals

| Category | Examples | About |
|---|---|---|
| **Participation** | showed up, engaged | any party |
| **Fulfillment** | completed work / event / booking | worker, vendor, organizer |
| **Reliability** | kept commitments (inverse of no-show/cancellation) | worker, vendor, organizer |
| **Cancellations** | with **timing** (late vs early) | any party |
| **Complaints** | raised concerns — **signals, not verdicts** | any party |
| **Reviews** | ratings (objective + subjective components separated, §3) | any party |
| **Disputes** | frequency + outcomes (`RESOURCE_MARKET §9`) | any party |

Each signal carries: **source**, **objectivity** (objective/subjective), **strength**, **recency**, and
**who it is about**. Signals feed Automated Evaluation (§7). The Trust Layer **does not capture** signals
(the markets / Event Lifecycle / Learning Architecture do) — it **consumes** them.

---

## 3. Objective vs subjective signals (treatment rules)

- **Objective signals** (no-show, confirmed cancellation, completed work/event, dispute frequency,
  attendance records) → **high weight**; can move trust standing **when corroborated into a pattern**.
- **Subjective signals** ("not funny," "boring," "unfriendly," "disappointing") → **low weight**;
  **informational only**. They **never, alone, move trust standing** and never trigger a sanction
  (principles 3 & 6). They may surface to the party as **soft feedback**, not as a verdict.
- **Weighting principles:** objective **>** subjective; corroborated **>** single; recent **>** stale;
  **pattern > isolated event**. The platform measures **operational reliability**, not taste.

---

## 4. Verification types

| Type | Purpose | Effect |
|---|---|---|
| **Identity** | the person is who they claim | reduces fraud; unlocks higher-stakes eligibility |
| **Contact** | reachable (accountable) | baseline; enables notifications + accountability |
| **Business** | the vendor business is legitimate (+ licenses/insurance for regulated) | unlocks **regulated services** (V2) and business bookings |
| **Certification** | a held credential — organizer certification, or a worker's lifeguard/first-aid cert | unlocks **safety-critical / regulated** roles; ties to the Certification subsystem + `MASTER §3` (Certified = skill, Verified = identity) |

Verification is a **gate + a displayed credential** — it confers **eligibility**, not earned trust.
*(The Verified-Organizer fee model, `MASTER P12`, is an open decision and is not resolved here.)*

---

## 5. Reputation

- **Accumulation** — built from signals over **completed interactions**; newcomers start at a **neutral
  baseline**, not last place (`WORKER §9A`). Ideally **per-capability** for workers/vendors with a global
  reliability component (`WORKER`-review M9).
- **Decay** — **recency weighting**: stale signals fade; **inactivity → dormancy (re-activatable)**, not a
  penalty (consistent with `WORKER §9A` no-permanent-exclusion).
- **Visibility** — reputation surfaces as a **trust level / standing** (§6) and summarized **objective
  outcomes**, **not** raw complaint logs or subjective sentiment-as-verdict. The platform shows *how
  reliable*, not *what one person felt*.

---

## 6. Trust ladder

A cross-party **trust standing** that rolls up verification + reputation + patterns. **T1 is
verification; T2–T4 are earned** (principle 4).

| Level | Meaning | Basis |
|---|---|---|
| **T0 — Unknown** | new, unverified, no history — **neutral, not bad** | none yet → low-stakes, supervised opportunities |
| **T1 — Verified** | identity/contact (and business, for vendors) confirmed; little history | **verification** (granted/paid) |
| **T2 — Proven** | a track record of completed interactions with good objective signals | **earned** |
| **T3 — Trusted** | sustained, corroborated reliability across many interactions | **earned** |
| **T4 — Highly Trusted** | exceptional long-term record **+** relevant verification | **earned + verified** |

- **Up** = earned via corroborated **objective** signals over time. **Down** = a corroborated **objective
  negative pattern** (never a single complaint) or rare staff action (§11).
- **Canonical home:** this ladder is the single cross-party trust standing. The Worker **W2/Verified**,
  Vendor **V2/Verified**, and market reputation concepts **roll up into it** — they are not separate trust
  systems (resolves audit D3). The W/V ladders remain the *participant* tiers; the Trust Ladder is the
  *standing* that synthesizes them.

---

## 7. Automated trust evaluation

The V1 pipeline (principle 5): **Trust Signals → Automated Evaluation → ALH Staff Review (rare).**

- **Signal aggregation** — collect a party's signals, tagged objective/subjective, weighted by strength,
  recency, and corroboration (§3).
- **Pattern detection** — look for **repeated, corroborated objective patterns** (e.g. multiple
  independent no-shows; rising dispute frequency), not isolated events (principles 1–2).
- **Threshold concepts** — trust-level transitions occur at **evidence thresholds** (enough corroborated
  objective signals), **never on a single signal**; sanctions require a **pattern** (principle 1).
- **Discipline reuse** — applies the Learning Architecture's signal classes (auto / organizer-confirmed /
  expert) and **safety asymmetry** (safety standing moves only via expert/staff, only toward caution).

No algorithms or thresholds specified here — concepts only.

---

## 8. Worker trust

- **Objective signals:** **no-show history** (strong negative when patterned), **completion history**
  (positive), **reliability** (commitments kept).
- **Effect:** trust + verification **gate role eligibility** — low-stakes at T0/T1; **safety-critical
  roles require verification (T1) AND proven reliability (T2+)** (`WORKER §12`).
- A **single no-show** = a signal + reliability ding; a **pattern** of no-shows = trust-level drop /
  cooldown / suspension (suspension → staff review, §11). Subjective remarks ("unfriendly") are **soft
  feedback**, never a trust mover (principle 3).

---

## 9. Vendor trust

- **Objective signals:** **business verification** (V2), **fulfillment history** (delivered as quoted),
  **reliability** (on-time delivery, cancellations, **actual-vs-quote** accuracy), **dispute frequency**.
- **Effect:** trust + business/certification verification **gate regulated services** and **visibility**
  in suggestions; higher trust → preferred recommendations (organizer still decides — OS principle).
- Subjective remarks ("food was bland") are **soft feedback**, never a verdict (principle 6).

---

## 10. Organizer trust

- **Objective signals:** **completed events**, **participant outcomes** measured as *records* (attendance,
  completion) — **not** "was it fun"; **recurring issues** (corroborated patterns: repeated late
  cancellation of workers/vendors, payment problems, repeated disputes).
- **Effect:** organizer trust shapes how readily workers/vendors **accept their offers** (`RESOURCE_MARKET
  §10` organizer reputation) and **visibility** in the Event Request Market.
- **Principle 6 applies strongly:** a low subjective review because an event was "boring" is **not** an
  organizer-trust hit; a **pattern** of non-payment, no-shows, or abusive conduct **is**.

---

## 11. Staff review

ALH staff review is the **rare exception**, not the workflow. It may occur for:
- **serious safety incidents** (the expert gate from `OPE_LEARNING_ARCHITECTURE`),
- **high-stakes disputes** automation cannot resolve (`RESOURCE_MARKET §9`),
- **suspected fraud/abuse**,
- **consequential trust demotions/suspensions**, and **appeals**.

**Principles:** staff act on **patterns and evidence**, never on a single complaint (principle 1); **no
community juries or experts** (principle 5); **no large moderation bureaucracy** — most trust movement is
automatic, and staff handle only the few cases that genuinely require judgment. (This is the concrete
identity of the "expert" role the other documents reference — audit E2.)

---

## 12. Trust impact

| Affects | How |
|---|---|
| **Visibility** | higher trust → more visible in discovery/suggestions (Resource Market, Event Request Market) |
| **Matching** | higher trust → higher match/wave priority — **but** cold-start fairness reserves opportunity for newcomers (`WORKER §9A`); trust never permanently excludes |
| **Recommendations** | OPE/Sourcing prefer higher-trust resources; the platform **recommends, the organizer decides** (OS principle) |
| **Opportunities** | higher-stakes/regulated/premium standing is gated by **trust + verification** |

Trust impact is **graduated and reversible** — no black-hole exclusion; dormancy, not death (`WORKER §9A`).

---

## Trust architecture summary

- **Three concepts:** **verification** (a confirmed fact, granted/paid), **reputation** (earned history),
  **trust** (the synthesized standing that drives action). **Verification ≠ trust.**
- **Signals → evaluation → rare staff review** (principle 5): the platform aggregates signals, detects
  **corroborated objective patterns**, and moves a party along a **cross-party Trust Ladder** (T0 Unknown
  → T1 Verified → T2 Proven → T3 Trusted → T4 Highly Trusted).
- **Objective over subjective; pattern over incident; complaint ≠ violation.** The platform measures
  **operational reliability**, never **entertainment quality** (principle 6).
- **Earned, fair, reversible:** newcomers start neutral, trust is earned not bought, and no one is
  permanently excluded; safety standing moves **only via staff/expert**, only toward caution.
- **Canonical owner** of verification credentials + the Trust Ladder; everything else consumes it.

## Relationship to existing architecture

```
Event Lifecycle / Markets ─▶ signals (no-show, completion, cancellation, dispute, reviews, attendance)
        │
Learning Architecture ─────▶ signal classes + safety asymmetry (auto / confirmed / expert)
        │
TRUST & VERIFICATION ──────▶ synthesizes → verification credentials + Trust Ladder standing
        │
        ├─▶ Worker Network / Vendor Network   (consume standing as reputation/eligibility)
        ├─▶ Resource Market                   (visibility, matching, disputes, ratings)
        └─▶ Event Request Market              (organizer visibility)
```

- **Learning Architecture** owns the signal classes and knowledge/pricing learning; the Trust Layer
  **reuses its discipline** and produces a **different output** — *party trust standing*, not knowledge.
- **Worker / Vendor Networks** own participant models and define reputation-as-reliability; the Trust
  Layer **adds verification + the unified Trust Ladder** they roll up into (no duplicate trust systems).
- **Resource Market / Event Request Market** own transactions, disputes, and ratings capture; the Trust
  Layer **consumes** those outcomes and **feeds back** standing that affects visibility/matching.

The Trust Layer **synthesizes and exposes** trust; it does **not** take ownership of the signals,
transactions, learning rules, or participant models already owned elsewhere.

_Architecture only. No UI, schema, API, moderation teams, or community juries. Consistent with the
Learning Architecture, Worker/Vendor Networks, Resource Market, Event Request Market, the monetization
model, and the Organizer-Operating-System principle._
