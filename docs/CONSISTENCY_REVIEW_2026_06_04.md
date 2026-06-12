# Cross-Document Consistency Review — 2026-06-04

> **Scope:** `MASTER_PRODUCT_DECISIONS.md`, `OPE_V1_TECHNICAL_DESIGN.md`,
> `WEDDING_KNOWLEDGE_BASE_V1.md`, `WEDDING_PRICING_REFERENCE_V1.md`, `ORGANIZER_CAREER_PATH_V1.md`.
> **Method:** read-only cross-check for contradictions, duplication, conflicting decisions,
> entity-naming drift, already-resolved open questions, and decisions that belong in Master.
> **Output:** findings + recommendations only. **No document was modified.**
> **Severity:** 🔴 high (will cause build/data errors or real product confusion) · 🟠 medium
> (naming/duplication — fix before build) · 🟡 low (cosmetic).

## Summary table

| ID | Severity | Type | One-line |
|---|---|---|---|
| C1 | 🔴 | Contradiction | `CD031` maps to two different item_keys (`invitation_suite` vs `signage_decor`) |
| C2 | 🟠 | Contradiction | OPE §1/§8.1 still lead with "Convert to activity" after it was demoted to priority 4 |
| C3 | 🟠 | Contradiction | OPE output fields differ: §9.2 assessment vs Master §10.3 proposal |
| C4 | 🟠 | Conflict | Subscription gate vs "earn-first" career journey — when must an aspiring organizer subscribe? |
| C5 | 🟡 | Contradiction | Subscription price $9.99 vs $29 (already flagged in Master, still unresolved) |
| C6 | 🟡 | Contradiction | Wedding KB §5 uses `$ / $$ / $$$` while the logic layer is "no money" |
| D1 | 🟠 | Duplication | Event Request Marketplace defined in OPE §9 **and** Master §6 |
| D2 | 🟡 | Duplication | "Two models" defined in Master §2 and OPE §9.1 |
| D3 | 🟡 | Duplication | Success definition in Master §10.4 and Career Path §5 |
| N1 | 🔴 | Naming | "Proposal" overloaded: marketplace `proposals` row vs OPE-generated proposal document |
| N2 | 🟠 | Naming | Three names for related artifacts: `plan` / "preliminary assessment" / "client proposal" |
| N3 | 🟠 | Naming | "Resource Plan" vs "Equipment/Vendor/Logistics estimates" vs "Resources" |
| N4 | 🟡 | Naming | Tier `mid` (schema) vs `likely` (prose) |
| N5 | 🟡 | Naming | `R###` (resource) vs `CD###` (cost driver) ID spaces conflated (root cause of C1) |
| N6 | 🟡 | Naming | "OPE" vs "OPE™" used inconsistently |
| Q1 | — | Resolved-already | OPE §13 Q3 (currency/no-FX) effectively decided in OPE §7.2 + Pricing Ref |
| Q2 | — | Resolved-already | OPE §13 Q5 (KB breadth) partially answered — wedding confirmed as a launch category |
| M1–M6 | — | Raise to Master | See §6 |

---

## 1. Contradictions

### C1 🔴 `CD031` collision — `invitation_suite` vs `signage_decor`
- **Where:** `WEDDING_KNOWLEDGE_BASE_V1.md` §5 defines **`CD031 = invitation_suite`** (per_unit).
  `WEDDING_PRICING_REFERENCE_V1.md` §4 (Decor) defines **`CD031 = signage_decor`** ("No standalone
  CD number assigned in KB v1") and then re-labels invitations as **`CD031s = invitation_suite`** in
  §4 (Stationery). Its own §5 Formula Map uses `Stationery = CD031 + CD032`, where `CD031` again
  means `invitation_suite` — contradicting its §4 Decor block.
- **Root cause (N5):** the Pricing Reference conflated **resource** `R031 = signage_decor` with
  **cost driver** `CD031`. They are different ID spaces; `R031 ≠ CD031`.
- **Impact:** breaks the Pricing Reference's own §7 rule ("`item_key`/IDs must match KB §5 exactly").
  Would corrupt any import/seed keyed on CD IDs.
- **Recommendation:** in the Pricing Reference, **restore `CD031 = invitation_suite`**, delete the
  `CD031s` label, and treat `signage_decor` (R031) as an unnumbered conditional add-on (as KB does).
  No KB change needed — KB §5 is correct.

### C2 🟠 "Convert to activity" still framed as primary in OPE §1/§8.1
- **Where:** Master §10.3 + OPE §13 Q4 (RESOLVED) set **Primary Outcome = Client Proposal Generator**
  and demote "Convert to activity" to **priority 4**. But OPE **§1 (Summary)** still reads "converts
  it into a marketplace **activity**, a **client** engagement, or a shareable proposal" (activity
  first, proposal last), and **§8.1 Actions** lists **"Convert to activity" first**.
- **Impact:** the body of the OPE doc contradicts its own resolved §13 Q4 and Master §10.3.
- **Recommendation:** when OPE is next revised, reorder §1 summary and §8.1 actions to lead with
  proposal generation. (Per your instruction the OPE doc was only synced at §13; this residual is
  noted, not fixed.)

### C3 🟠 OPE output fields differ between assessment and proposal
- **Where:** OPE **§9.2** assessment estimates = *Preparation hours · Staffing · Equipment · Vendor ·
  Logistics · Budget · Operational risks*. Master **§10.3** proposal outputs = *Executive Summary ·
  Event Timeline · Staffing Plan · Resource Plan · Budget Estimate · Risk Assessment · Proposal-ready
  Document*.
- **Impact:** two overlapping-but-differently-named output schemas for the **same engine**. "Resource
  Plan" vs "Equipment + Vendor + Logistics"; "Operational risks" vs "Risk Assessment"; assessment has
  "Preparation hours" (absent from proposal); proposal has "Executive Summary / Event Timeline /
  Proposal-ready Document" (absent from assessment).
- **Recommendation:** define **one canonical OPE output schema** (see M1) and express both the
  pre-organizer *assessment* and the organizer-facing *proposal* as views of it.

### C4 🟠 Subscription gate vs "earn-first" career journey
- **Where:** OPE lives behind the dashboard gate **`certified_organizer` + active subscription**
  (OPE §1.3 "Who can use it"; Master §4). Career Path positions OPE at **S4 (First Proposal)** and
  earning at **S5–S7 (First Client/Event/Income)**, with subscription only implied at **S9
  (Professional)**.
- **Impact:** an aspiring organizer **cannot use OPE to make their first proposal without already
  subscribing** ($9.99/mo) — which contradicts the income-first promise ("reach First Income"). The
  journey never states when the monthly subscription begins.
- **Recommendation:** decide subscription timing for the aspiring path (e.g., free/trial first
  proposal, or subscribe at S3/S4) and record it (see M2). This is a real launch-blocking gap.

### C5 🟡 Subscription price $9.99 vs $29
- **Where:** Master §4 (billing flow $9.99/mo) vs public Pricing page tier ($29/mo) — already flagged
  inside Master §4.
- **Recommendation:** still unresolved; elevate to an explicit decision (see M5).

### C6 🟡 `$ / $$ / $$$` markers in the "no money" logic layer
- **Where:** `WEDDING_KNOWLEDGE_BASE_V1.md` §5 uses indicative `$ / $$ / $$$` magnitude markers, while
  `WEDDING_PRICING_REFERENCE_V1.md` §1/§7 and OPE §5/§7 mandate **no money** outside `knowledge_pricing`.
- **Impact:** borderline — the markers are qualitative, but read as price hints in a layer that is
  supposed to be price-free.
- **Recommendation:** drop the `$` markers from KB §5 (replace with "magnitude: small/medium/large")
  or explicitly label them non-monetary. Low priority.

---

## 2. Duplication

### D1 🟠 Event Request Marketplace — OPE §9 and Master §6
- Defined in full in OPE **§9** and summarized in Master **§6**. Acceptable (summary vs detail) **if**
  one is canonical. Risk: divergence over time (e.g., the `request_delivery_mode` enum naming lives
  only in OPE §9.3).
- **Recommendation:** declare **OPE §9 canonical**; Master §6 should remain a pointer (it largely is).

### D2 🟡 "Two models" — Master §2 and OPE §9.1
- Ready Activities vs Event Requests is described in both, with slightly different example wording.
- **Recommendation:** keep one canonical example set (Master §2) and reference it from OPE §9.1.

### D3 🟡 Success definition — Master §10.4 and Career Path §5
- Both define success as First Client → First Event → First Income. Consistent; mild duplication.
- **Recommendation:** Master §10.4 canonical; Career Path §5 already references it — fine to leave.

> Note: C3/D4-type duplication of the OPE **output list** (assessment vs proposal) is tracked as C3.

---

## 3. Conflicting decisions

- **Primary outcome:** now consistent after the §13 Q4 sync (Master §10.3 ↔ OPE §13 Q4) — **resolved**,
  except for the residual body text (C2).
- **Subscription-in-journey (C4)** is the one genuine **decision conflict**: the access model (gate on
  subscription) conflicts with the go-to-market promise (earn before committing). Needs a product call.
- No other hard decision-level conflicts found; remaining items are naming/duplication.

---

## 4. Entities with different names

### N1 🔴 "Proposal" overloaded
- **Marketplace proposal:** the `proposals` row created by `send_proposal` (OPE §9.3, migration 008) —
  an organizer's offer against a customer request.
- **Client proposal (document):** the OPE-generated artifact (Master §10.3, "Proposal-ready Document").
- **Impact:** the same word names a DB row and a generated document; "Attach Proposal to Client
  Request" (Master §10.3 priority 2) sits exactly on the seam.
- **Recommendation:** adopt distinct terms, e.g. **"marketplace proposal"** (the row) vs **"proposal
  document"** (OPE output); state that priority-2 = attaching the *document* to a *marketplace proposal*.

### N2 🟠 Three names for related artifacts: `plan` / "preliminary assessment" / "client proposal"
- OPE produces a **`plan`** (OPE §3). For an Event Request it surfaces as a **"preliminary assessment"**
  (OPE §9.2); for the organizer it becomes a **"client proposal"** (Master §10.3).
- **Impact:** relationship undefined — is the assessment the seed the organizer turns into the proposal?
- **Recommendation:** define the lineage explicitly: `plan` (internal) → *assessment view* (pre-organizer)
  → *proposal document* (organizer output). (See M4.)

### N3 🟠 "Resource Plan" vs "Equipment/Vendor/Logistics" vs "Resources"
- Master §10.3 "Resource Plan"; OPE §9.2 "Equipment estimate / Vendor estimate / Logistics estimate";
  Wedding KB §3 "Resources" (typed vendor/equipment/staffing/logistics).
- **Recommendation:** pick one grouping vocabulary; map KB resource `type` onto it (see M1).

### N4 🟡 Tier `mid` vs `likely`
- OPE §3.2 schema uses `est_mid` / `knowledge_pricing.low/mid/high`; OPE §7.3 prose and the Pricing
  Reference use tiers **low / likely / high**.
- **Recommendation:** state once that **`mid` (data) ≡ `likely` (tier)**.

### N5 🟡 `R###` vs `CD###` ID spaces (root cause of C1)
- Resource IDs (`R001…`) and Cost-Driver IDs (`CD001…`) are independent, but the Pricing Reference
  conflated `R031` with `CD031`.
- **Recommendation:** add a one-line note in the Pricing Reference that R-IDs and CD-IDs are separate
  spaces; fix C1.

### N6 🟡 "OPE" vs "OPE™"
- Master, Wedding KB, Pricing Ref, Career Path use **OPE™**; OPE design doc title/body use **OPE**.
- **Recommendation:** pick one (™ on first mention per doc) for brand consistency.

---

## 5. Open questions already (effectively) resolved

- **OPE §13 Q3 (currency / single-currency, no FX) → effectively RESOLVED.** OPE §7.2 ("currency
  conversion out of scope v1") and the Pricing Reference (single scenario currency) already decide it.
  Recommend marking Q3 resolved.
- **OPE §13 Q5 (KB breadth) → partially answered.** `WEDDING_KNOWLEDGE_BASE_V1.md` exists, so **wedding
  is confirmed as a v1 launch category.** The full category list is still open.
- **OPE §13 Q4 → already RESOLVED (2026-06-04).** Confirmed consistent with Master §10.3 (no action;
  only the body residual C2 remains).
- Still genuinely open: **Q1 (pricing data curation)**, **Q2 (quota & model policy)**.

---

## 6. Decisions to raise to Master Decisions

| ID | Proposed decision to record in Master |
|---|---|
| **M1** | **Canonical OPE output schema** — one named set of sections/estimates, with the §9.2 *assessment* and §10.3 *proposal* as views of it (resolves C3/N3). |
| **M2** | **Subscription timing for the aspiring path** — when does the $X/mo subscription begin relative to First Proposal / First Income? (resolves C4 — launch-blocking). |
| **M3** | **`risk` as a knowledge_kind** — promote risks to a first-class kind, or keep `kind='tip' + tag 'risk'` (currently flagged in KB §7; OPE §3.1 enum has no `risk`). |
| **M4** | **OPE artifact naming standard** — `plan` / assessment / proposal lineage, and "marketplace proposal" vs "proposal document" disambiguation (resolves N1/N2). |
| **M5** | **Subscription price** — reconcile $9.99 (billing) vs $29 (pricing page) (resolves C5). |
| **M6** | **Verified Organizer** — data model + **verification fee** amount (already open in Master §3/§7; elevate to a decision). |

---

## 7. Recommended action order (no edits made here)

1. **C1 / N5** — fix the `CD031` collision in the Pricing Reference (data-integrity blocker).
2. **C4 / M2** — decide subscription timing in the aspiring-organizer journey (launch blocker).
3. **C3 / M1 / N3** — lock the canonical OPE output schema; reconcile assessment vs proposal.
4. **N1 / N2 / M4** — fix "proposal" overloading and artifact naming.
5. **C2** — reorder OPE §1/§8.1 to match the resolved primary outcome.
6. **Q3 / Q5** — mark OPE §13 Q3 resolved; note wedding as a confirmed launch category.
7. **C5/M5, C6, N4, N6, M3, M6** — lower-priority cleanups and decisions.

_End of review. Documents were read only; none were modified._
