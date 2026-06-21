# Discovery Feed & Scale Readiness — Specification (V1)

> **Type:** implementation-ready product/technical requirements. **No product redesign, no code.**
> Two problems only: (1) the activity feed/search, (2) success/scale readiness toward 166,000
> organizers.
> **Baseline (current code):** the public feed runs through `search_marketplace(p_filters jsonb)`
> (`supabase/migrations/011_reviews.sql`) called by `searchMarketplace()`
> (`lib/marketplace/queries.ts:20`). It returns **every matching published activity as a single
> `jsonb_agg`, with no LIMIT, no pagination, no radius, and ordering only by title.** Filters today:
> `city, country, category, indoor_outdoor, language, max_price, child_age, q (title/desc), date`
> (all substring/equality; `city`/`q` use `ILIKE '%…%'`). This spec defines the requirements to make
> that feed bounded and scalable without changing the product.

---

# Part 1 — Activity Feed / Search

## 1.0 Governing rule

**No query path may return an unbounded or whole-table result.** Every feed/search response is bounded
by **(a) a result limit AND (b) at least one narrowing scope** (location/city/radius or an explicit
filter). The default feed is **location-scoped and paginated**, never a global dump.

## 1.1 Default radius

- **Requirement:** when the request carries a location (user coordinates or a selected city center),
  the default search radius is **25 km (~15 mi)**, adjustable by the user to a fixed set
  **{5, 10, 25, 50, 100 km}**. Radius applies only to in-person activities; online/virtual activities
  are returned regardless of radius (flagged separately).
- **Data dependency (gap to close):** activities currently store only **`city`/`country` text** — there
  is **no coordinate (lat/lng) column**. True radius requires a geo point per activity (and per search
  center). Until coordinates exist, **`city` text match is the location scope** (§1.4) and radius is
  presented as "near {city}". *Geocoding/coordinate storage is a prerequisite for true radius — flagged,
  not designed here.*
- **Acceptance:** with a location present and no other filter, results are confined to the radius (or
  the city scope) and the limit (§1.2); never the global catalogue.

## 1.2 Default result limit

- **Requirement:** **page size = 24** activities per response (grid-friendly). **Hard server maximum =
  50** per request — the server clamps any larger requested size. The feed loads one page at a time.
- **Acceptance:** the RPC/endpoint **applies `LIMIT` in SQL**; a response never contains more than the
  hard maximum; a request for "all" is rejected/clamped, not honored.

## 1.3 Category / search filters

- **Requirement:** preserve the existing filter set and keep it server-side and composable:
  `category`, `q` (free-text over title + description), `indoor_outdoor`, `language`, `max_price`,
  `child_age`, `date`. No new filter taxonomy is introduced.
- **Requirement:** free-text `q` must be backed by an index (trigram/GIN — see §2.5) and remain a
  bounded, paginated query.
- **Acceptance:** any combination of filters returns a bounded, paginated result; an empty filter set
  still yields a location-scoped, limited page (never a global dump).

## 1.4 City search

- **Requirement:** keep city search (`city ILIKE '%…%'`) as the **primary location scope** until
  coordinates exist; a city (or "near me") is **required to define the default feed scope**. A search
  with neither a city nor coordinates defaults to the user's last/selected city, or prompts for one —
  it must not silently return everything.
- **Requirement:** `city` lookups must be index-supported (trigram, §2.5); exact-city equality should be
  preferred where the UI provides a city picker.
- **Acceptance:** a city scope is always present (explicit, inferred, or prompted) before results render.

## 1.5 Pagination

- **Requirement:** **keyset (cursor) pagination**, not offset — the response returns an opaque
  `next_cursor` derived from the sort key + tiebreaker (activity id). Offset pagination is disallowed at
  scale (deep offsets scan and slow down).
- **Requirement:** the current single-`jsonb_agg`-of-everything shape (`search_marketplace`) is replaced
  by a **bounded, ordered, cursored** result. Page size per §1.2.
- **Acceptance:** sequential pages are stable and O(page size); there is no `OFFSET N` on large N; the
  client cannot request beyond the hard max page size.

## 1.6 Sorting

- **Requirement:** supported sort options — **`relevance`** (text/score match when `q` present),
  **`soonest`** (next upcoming session date), **`nearest`** (distance, when coordinates exist),
  **`price_asc`/`price_desc`**, **`rating`**, **`newest`** (published date).
- **Requirement:** **default sort = `soonest` upcoming session** (falls back to `newest` when no dated
  sessions). This replaces the current **alphabetical-by-title** default, which is not useful at scale.
- **Requirement:** every sort has a deterministic tiebreaker (activity id) so keyset pagination is
  stable.
- **Acceptance:** changing sort re-scopes within the same bounded/paginated contract; default is never
  alphabetical-by-title.

## 1.7 "No infinite unfiltered activity dump" (hard requirement)

- The feed/search **must not** expose any path that returns the full `activities` table or an
  unbounded aggregate. Concretely:
  - SQL **always** carries `LIMIT` (≤ hard max) and an `ORDER BY` with a tiebreaker.
  - A location/city scope is **always** applied (or prompted).
  - The per-card correlated subqueries currently inside `search_marketplace` (rating, review_count,
    cover_path via subselects) must not run over an unbounded row set (they execute per returned row —
    fine for a 24-row page, pathological for the whole table).
- **Acceptance:** a load test issuing a no-filter request returns ≤ 24 rows scoped to a location, in a
  bounded payload, in < the §2.6 latency budget.

---

# Part 2 — Success / Scale Readiness

## 2.1 Target scale scenario

- **Ceiling:** up to **166,000 organizers** (supply side) on the platform.
- **Supply derived:** assuming **3–10 published activities/organizer**, the public catalogue is
  **~0.5M–1.6M activities**, with recurring activities adding **calendar_events (sessions)** at a
  multiple of that. The feed/search read path is the scaling-critical surface (largest row set, highest
  traffic, currently unbounded).

## 2.2 Expected daily active organizers (planning model, with assumptions)

*Stated as a planning range, not a measured figure. Assumptions explicit so they can be revised.*

| Assumption | Conservative | Expected | Peak-planning |
|---|---|---|---|
| Monthly active organizers (MAO = % of 166k) | 20% → 33,200 | 30% → 49,800 | 40% → 66,400 |
| Daily active organizers (DAO = % of MAO) | 15% → ~5,000 | 30% → ~15,000 | 40% → ~26,000 |
| Organizer requests/day (DAO × ~45 req/session × ~1.5 sessions) | ~0.3M | ~1.0M | ~1.8M |
| Organizer-side avg RPS / **business-hours peak (×6)** | ~4 / ~24 | ~12 / ~70 | ~21 / ~125 |

**Plan to the "Expected" column; provision headroom to "Peak."**

## 2.3 Visitor / search traffic (planning model)

Consumers (visitors) generate the heavy **read** load on the feed/search — typically a multiple of
organizer traffic.

| Assumption | Conservative | Expected | Peak-planning |
|---|---|---|---|
| Visitor sessions/day (≈ 3–10× DAO) | ~150k | ~500k | ~1.5M |
| Feed/search queries/day (≈ 1–3 per session) | ~250k | ~1.0M | ~3.0M |
| Search avg RPS / **peak (×6)** | ~3 / ~18 | ~12 / ~70 | ~35 / ~210 |
| Activity-detail reads/day | ~0.5M | ~2.0M | ~6.0M |

**The feed/search + activity-detail read paths are the dominant load and must be the load-test and
caching focus.**

## 2.4 Infrastructure risks

- **R1 — Unbounded feed query (highest).** `search_marketplace` returns all matches with no LIMIT/
  pagination → response size and DB work grow with the catalogue; at ~1M activities a no-filter call is
  a full scan + multi-MB payload. *(Fixed by Part 1.)*
- **R2 — Serverless DB connection exhaustion.** Next.js server actions/RSC under peak RPS can exceed
  Postgres/pooler connection limits. Requires a connection pooler (pgbouncer/Supavisor) and bounded
  per-request DB work.
- **R3 — Cold starts / function concurrency** on the hosting platform during traffic spikes.
- **R4 — Image/storage bandwidth.** Cover images served via Supabase Storage public URLs at millions of
  detail/feed views/day → CDN egress and origin pressure (§2.5 R9).
- **R5 — No rate limiting** on public search → scraping/abuse can amplify the unbounded-query cost.
- **R6 — Cache absence.** Hot feed/search/detail responses are recomputed per request (RLS + correlated
  subqueries) with no CDN/edge cache layer.

## 2.5 Database / storage risks

- **R7 — Missing/again-unusable indexes.** `city ILIKE '%…%'` and `q ILIKE '%…%'` cannot use btree
  indexes → sequential scans. Requires **`pg_trgm` GIN indexes** on `activities.city`, `title`,
  `description`; btree on `(status, category)`, published date, and price; supporting index for the
  `calendar_events(activity_id, event_type, date)` `date` filter.
- **R8 — Correlated per-row subqueries** in `search_marketplace` (rating avg, review_count, cover_path,
  certified EXISTS) execute per returned row and over the whole match set when unbounded → N×subquery
  cost. Mitigate by **bounding to a page first** (Part 1) and **precomputing rating/review_count**
  (denormalized columns or a materialized aggregate refreshed on review change).
- **R9 — Storage growth & egress.** ~0.5–1.6M activities × images → storage volume + high CDN egress on
  feed/detail. Requires a CDN in front of storage, resized/thumbnail variants for cards, and lazy
  loading.
- **R10 — Write/read contention & replicas.** Heavy public reads vs organizer writes on the same primary
  → plan **read replicas** for the public feed/detail path once read RPS sustains the Expected column.
- **R11 — `calendar_events` growth** from recurring activities (sessions per activity) → the `soonest`
  sort and `date` filter must be indexed and bounded.
- **R12 — RLS evaluation cost** on every public read; keep public-path policies simple and index-aligned.

## 2.6 Load testing requirements

- **Tooling:** k6 or Artillery; seed a **representative dataset** — **166k organizer profiles**,
  **~1M published activities**, **~3–5M calendar_events**, **reviews at realistic density**.
- **Scenarios (weighted to §2.3):** (1) feed browse no-filter (location-scoped), (2) filtered search
  (`category`+`city`+`q`), (3) sort changes (`soonest`/`nearest`/`price`), (4) deep pagination
  (cursored), (5) activity-detail reads, (6) organizer dashboard mix, (7) academy/exam + certification
  read paths, (8) checkout/invoice path smoke.
- **Targets (initial budgets):** feed/search **p95 < 400 ms**, **p99 < 800 ms**; activity-detail
  **p95 < 300 ms**; sustained at the **Expected peak RPS** (§2.2–2.3) with **error rate < 0.1%** and
  **no connection-pool saturation**.
- **Stress:** ramp to the **Peak-planning** column to find the breakpoint; confirm graceful degradation
  (rate limiting, bounded payloads), not collapse.
- **Pass criteria:** all latency/error budgets met at Expected peak; no unbounded query observed (every
  feed/search SQL shows `LIMIT` + index usage in `EXPLAIN`); storage/CDN egress within budget.

## 2.7 Scaling checklist

**Must hold before claiming readiness at the Expected column:**
- [ ] Feed/search is **bounded** (LIMIT ≤ 50, keyset pagination, location scope) — Part 1 implemented.
- [ ] **Trigram (GIN) + btree indexes** added per R7; `EXPLAIN` shows index usage on city/q/category/date.
- [ ] **rating/review_count precomputed** (denormalized or materialized) — R8.
- [ ] **Connection pooler** (pgbouncer/Supavisor) in front of Postgres; bounded per-request DB work — R2.
- [ ] **CDN/edge caching** for feed/search/detail; **image CDN + thumbnails** for cards — R4/R6/R9.
- [ ] **Rate limiting** on public search/detail endpoints — R5.
- [ ] **Read replica(s)** for the public read path once read RPS sustains Expected — R10.
- [ ] **Observability:** query latency (p95/p99), slow-query log, DB connections, cache hit rate, CDN
      egress, error rate dashboards + alerts.
- [ ] **Load test passed** at Expected peak with budgets in §2.6; breakpoint known from stress test.
- [ ] **Storage growth & egress** projected and within plan; lifecycle for orphaned images.

---

## Open dependencies (flagged, not designed here)

- **Geo coordinates per activity** (lat/lng) are a prerequisite for true radius/`nearest` (§1.1/§1.6);
  today only `city`/`country` text exists.
- **Denormalized rating/review_count** (§R8) and **read replicas** (§R10) are infrastructure changes
  outside this spec's "no code" scope — listed as prerequisites, not specified in detail.

*(Specification of record — implementation-ready requirements only. No product redesign, no code, no
schema written here. Nothing committed.)*
