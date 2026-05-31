# Phase 5 — Local QA Guide

The app already contains the full Phase 5 functionality, but most of it is hidden
behind **authentication, the certified-organizer + active-subscription gate, and an
empty database**. The public homepage is unchanged from Phase 1 by design — the new
surface is the marketplace and the authenticated request/proposal/booking flows.

To see it all locally you must load the demo data **once**.

## 1. One-time setup (Supabase SQL editor)

Run, in order, if not already applied:

1. Migrations `001` … `010` (`supabase/migrations/*.sql`) — **`010` fixes the profiles
   RLS recursion and is required.**
2. Course content (optional, for the academy): `supabase/seed/academy_content.sql`,
   `supabase/seed/certification_exams.sql`.
3. **Demo data: `supabase/seed/phase5_demo.sql`** ← makes the marketplace non-empty.

> The demo seed creates real `auth.users` rows (so activities/profiles can exist),
> real organizer profiles, venues, **published** activities with marketplace fields,
> a customer with a request + proposal + booking, and notifications. It is idempotent.

## 2. Demo accounts (email / password)

| Email | Password | State |
|---|---|---|
| `maria.demo@activita.test` | `ActivitaDemo123!` | Certified organizer, **subscribed** (full dashboard), Barcelona, has a confirmed booking |
| `dmitri.demo@activita.test` | `ActivitaDemo123!` | Certified organizer, **subscribed**, Berlin, has a matched request + sent proposal |
| `customer.demo@activita.test` | `ActivitaDemo123!` | Customer with an open request (proposal to compare) + a booking |

Sign in at **`/en/sign-in`** with email/password (these accounts are pre-confirmed).

## 3. URLs to open — what each shows and the account state needed

### Public (no login)
- **`/en`** — homepage (nav: Marketplace · Pricing · Sign In/Sign Up).
- **`/en/marketplace`** — real published activities; try filters, e.g.
  `/en/marketplace?category=arts`, `?city=Berlin`, `?indoor_outdoor=indoor`, `?max_price=40`.
- **`/en/marketplace/d3000000-0000-4000-8000-000000000001`** — activity detail
  (Sunrise Hike & Mindfulness): organizer, venue, upcoming session, request CTA.
- **`/en/marketplace/d3000000-0000-4000-8000-000000000005`** — Watercolor Workshop (Berlin).
- **`/en/organizers/d1d1d1d1-0000-4000-8000-000000000001`** — Maria's public profile
  (certified badge + activities).
- **`/en/organizers/d1d1d1d1-0000-4000-8000-000000000002`** — Dmitri's public profile.

### Customer (sign in as `customer.demo@activita.test`)
- **`/en/requests`** — the customer's requests (one `matched`, one `booked`).
- **`/en/requests/new`** — create a new request (also reachable from any activity's
  "Request this activity" CTA, which prefills category + city).
- **`/en/requests/<id>`** — open the matched request to **compare proposals** and
  Accept (→ creates a booking) / Decline.
- **`/en/bookings`** — the customer's bookings (one confirmed) + cancel.
- **`/en/notifications`** — in-app notifications (unread/read, mark read).

### Organizer (sign in as `maria.demo@…` or `dmitri.demo@…`)
- **`/en/dashboard`** — real metrics (activities / venues / clients / upcoming events).
- **`/en/dashboard/activities`** — full CRUD incl. marketplace fields + publish/unpublish.
- **`/en/dashboard/venues`** — venues + photo upload.
- **`/en/dashboard/calendar`** — month/week/day calendar (Maria/Dmitri have a seeded session).
- **`/en/dashboard/requests`** — matched customer requests + **send a proposal**
  (Dmitri has the seeded `arts` match).
- **`/en/dashboard/proposals`** — proposals the organizer has sent.
- **`/en/dashboard/bookings`** — the organizer's bookings + complete/cancel/refund.

### Onboarding (any signed-in non-organizer)
- **`/en/onboarding`** — path selection (the previous `state.error` crash is fixed).

## Notes
- Activities show a placeholder image because no photos are uploaded in the seed
  (upload real photos via **Dashboard → Venues**; they then appear on cards/detail).
- No mock logic: every page reads real Supabase rows; matching/proposal/booking
  transitions run through the real `SECURITY DEFINER` functions in the live app.
