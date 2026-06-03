# Stripe Checkout — Test Pass Checklist

End-to-end test pass for the four Stripe flows and the webhook that backs them.
Everything runs in **Stripe TEST mode**. The webhook is the single authoritative
writer of billing state, so each case verifies three layers: **app behavior**,
**webhook event received**, and **resulting DB state**.

> Status note (2026-06-01): rebuilt after the project moved to `~/Projects/activitahub`.
> No live test-pass state survived the move. This checklist is the plan of record;
> update the **Progress** table as cases pass.

---

## Progress

| Flow | Cases | Status |
|---|---|---|
| 0. Environment setup | 0.1–0.4 | ✅ done (test keys live; prices created via API) |
| 1. Certification checkout | 1.1–1.5 | ◐ 1.1 (beginner) ✅ verified end-to-end; 1.2–1.5 pending |
| 2. Subscription + billing portal | 2.1–2.6 | ◐ 2.1 ✅ (subscribe→active→dashboard); 2.3–2.6 (portal/cancel/past_due/invoice) pending |
| 3. Booking checkout | 3.1–3.5 | ☐ not started |
| 4. Refunds | 4.1–4.4 | ☐ not started |
| 5. Webhook robustness | 5.1–5.4 | ☐ not started |

Legend: ☐ not started · ◐ in progress · ✅ pass · ✗ fail (note the case id + observation)

---

## 0. Environment setup (prerequisite — currently NOT configured)

`.env.local` today holds only the three Supabase keys. Live Stripe testing is
blocked until these are added and the CLI is installed.

- [ ] **0.1 — Stripe env vars.** Add to `.env.local` (TEST mode values from the
  Stripe Dashboard). Names must match `lib/stripe/config.ts` exactly:
  ```
  STRIPE_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...            # from `stripe listen` output
  STRIPE_PRICE_BEGINNER_COURSE=price_...     # one-time
  STRIPE_PRICE_EXPERIENCED_TEST=price_...    # one-time
  STRIPE_PRICE_SUBSCRIPTION=price_...        # recurring
  ```
  Also confirm `NEXT_PUBLIC_APP_URL` (used by `absoluteUrl()` for success/cancel
  redirects) points at `http://localhost:3000`.
- [ ] **0.2 — Install Stripe CLI** (`brew install stripe/stripe-cli/stripe`) and
  `stripe login`.
- [ ] **0.3 — Forward webhooks:** `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
  Paste the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart dev.
- [ ] **0.4 — Run app:** `npm run dev`. Confirm `isStripeConfigured()` is true
  (no "Stripe is not configured" error on a checkout action).

**Test cards** (any future expiry, any CVC/ZIP):
- `4242 4242 4242 4242` — success
- `4000 0000 0000 9995` — declined (insufficient funds)
- `4000 0025 0000 3155` — requires 3DS authentication

**Demo accounts** (from `PHASE5_QA.md`, password `ActivitaDemo123!`):
`customer.demo@activita.test` (booking flows), and an onboarding non-organizer
account for certification. Subscription/portal: any signed-in organizer-path user.

---

## 1. Certification checkout — `createCertificationCheckout` (`lib/actions/billing.ts`)

One-time payment (`mode: 'payment'`), metadata `{ profile_id, kind: 'certification', path }`.

- [ ] **1.1 — Beginner path happy path.** Sign in as an onboarding user with
  `selected_path = 'beginner'`. Trigger checkout from `/en/onboarding`.
  - App: redirects to Stripe Checkout; `profiles.onboarding_status` → `payment_pending`.
  - Pay with `4242…`. Redirects to `/en/onboarding?checkout=success`.
  - Webhook: `checkout.session.completed`.
  - DB: `payments` row upserted (`kind='beginner_course'`, `status='completed'`,
    `amount`, `currency`, `stripe_checkout_session_id`, `stripe_payment_intent_id`);
    `profiles.onboarding_status` → `payment_complete`; `stripe_customer_id` persisted.
- [ ] **1.2 — Experienced path.** Same as 1.1 with `selected_path='experienced'`.
  Expect `payments.kind='experienced_test'`, price = `STRIPE_PRICE_EXPERIENCED_TEST`.
- [ ] **1.3 — Cancel.** Start checkout, click back/cancel.
  - App: lands on `/en/onboarding?checkout=cancelled`. `onboarding_status` stays
    `payment_pending` (no payments row, no webhook completion event). Verify the user
    can re-initiate checkout cleanly.
- [ ] **1.4 — No selected_path guard.** User with `selected_path = null` triggers
  the action → redirected back to `/en/onboarding`, no Checkout session created.
- [ ] **1.5 — Idempotent replay.** Re-send the same `checkout.session.completed`
  (`stripe trigger` or resend from CLI). `payments` upsert on
  `stripe_checkout_session_id` must NOT create a duplicate row.

---

## 2. Subscription + billing portal — `createSubscriptionCheckout` / `createBillingPortalSession`

Recurring (`mode: 'subscription'`), metadata `{ profile_id, kind: 'subscription' }`.

- [ ] **2.1 — Subscribe happy path.** From `/en/billing`, start subscription
  checkout, pay with `4242…`.
  - App: redirect to `/en/billing?checkout=success`.
  - Webhook: `checkout.session.completed` (kind=subscription) → handler retrieves
    the subscription and calls `syncSubscription`; plus `customer.subscription.created`.
  - DB: `subscriptions` row upserted on `profile_id` (`status='active'`,
    `stripe_subscription_id`, `stripe_price_id`, `current_period_end`,
    `cancel_at_period_end=false`); `profiles.role` → `certified_organizer`,
    `onboarding_status` → `subscribed`.
- [ ] **2.2 — Dashboard gate opens.** After 2.1, the subscribed user can reach
  `/en/dashboard` (middleware gate passes). Before subscribing it should be gated.
- [ ] **2.3 — Cancel at period end (portal).** `createBillingPortalSession` →
  cancel in portal. Webhook `customer.subscription.updated` →
  `subscriptions.cancel_at_period_end=true`, status still `active`. Role NOT
  downgraded (by design — gate is access-time, not revocation).
- [ ] **2.4 — Subscription deleted.** Let it cancel / trigger
  `customer.subscription.deleted`. `subscriptions.status` → `cancelled` (note the
  spelling map: Stripe `canceled` → DB `cancelled`, see `mapStripeStatus`).
- [ ] **2.5 — Invoice renewal.** Trigger `invoice.payment_succeeded` /
  `invoice.paid` → `handleInvoice` re-syncs subscription; `current_period_end`
  advances; status stays `active`.
- [ ] **2.6 — Payment failed.** Trigger `invoice.payment_failed` → re-sync →
  `subscriptions.status` reflects `past_due`.
- [ ] **2.7 — Portal guard.** User with no `stripe_customer_id` calling the portal
  action → redirected to `/en/billing`, no portal session created.

---

## 3. Booking checkout — `createBookingCheckout` (`lib/actions/bookingPayments.ts`)

Dynamic `price_data` (not a fixed price id), `mode: 'payment'`,
metadata `{ booking_id, kind: 'booking' }`.

- [ ] **3.1 — Pay for a confirmed booking.** As `customer.demo`, open `/en/bookings`,
  pay an unpaid booking with `amount_cents > 0`.
  - App: `start_booking_payment` RPC sets `bookings.payment_status='processing'`,
    stores `stripe_checkout_session_id`; redirect to Checkout. Pay `4242…` →
    `/en/bookings?payment=success`.
  - Webhook: `checkout.session.completed` (kind=booking).
  - DB: `bookings.payment_status='paid'`, `status='confirmed'`,
    `stripe_payment_intent_id` set.
- [ ] **3.2 — Line item name.** Checkout shows the activity title (falls back to
  "Activity booking" when `activity_id`/title is missing).
- [ ] **3.3 — Already-paid guard.** Paying a `payment_status='paid'` booking →
  redirect to `/en/bookings` with no new session.
- [ ] **3.4 — Zero/missing amount guard.** Booking with `amount_cents <= 0` →
  redirect `/en/bookings?payment=noamount`, no session.
- [ ] **3.5 — Ownership guard.** Attempt to pay a booking where
  `customer_id !== user.id` → redirect `/en/bookings`. (`start_booking_payment`
  also raises "Not your booking".)
- [ ] **3.6 — Cancel.** Cancel on Checkout → `/en/bookings?payment=cancelled`.
  Booking stays `processing` (no completed webhook). Re-initiating should work.

---

## 4. Refunds — `requestRefund` / `processRefund` / `rejectRefund`

- [ ] **4.1 — Request refund.** On a `paid` booking, customer or organizer requests
  refund. `refund_requests` row inserted (`status='requested'`); counterparty gets a
  `booking_cancelled` notification ("Refund requested").
- [ ] **4.2 — Process refund (organizer/admin).** `processRefund` calls real
  `stripe.refunds.create` on `stripe_payment_intent_id`, then `finalize_refund`:
  `refund_requests.status='refunded'` + `stripe_refund_id`;
  `bookings.payment_status='refunded'`, `status='refunded'`; linked
  `calendar_event` deleted; customer notified ("Refund processed").
  - Verify the refund appears in the Stripe Dashboard.
- [ ] **4.3 — Reject refund.** `rejectRefund` → `refund_requests.status='rejected'`;
  requester notified ("Refund declined"). No Stripe refund created.
- [ ] **4.4 — Guards.** Refund on a non-paid booking raises "Only paid bookings can
  be refunded"; duplicate in-flight refund raises "A refund is already in progress";
  non-organizer/non-admin processing raises "Only the organizer or an admin can refund".

---

## 5. Webhook robustness — `app/api/stripe/webhook/route.ts`

- [ ] **5.1 — Missing secret → 500.** Unset `STRIPE_WEBHOOK_SECRET`, POST → 500
  "STRIPE_WEBHOOK_SECRET is not configured".
- [ ] **5.2 — Bad/missing signature → 400.** POST without `stripe-signature`, or a
  forged body, → 400. (Use a raw `curl`; `stripe listen` always signs correctly.)
- [ ] **5.3 — Unhandled event acked.** Send an event type not in the switch (e.g.
  `payment_intent.created`) → 200 `{received:true}`, no DB change, Stripe stops retrying.
- [ ] **5.4 — Handler error retries.** Force a handler throw (transient DB error) →
  500 so Stripe retries; confirm idempotent handlers converge on retry (no dupes).

---

## Observations log

Record failures / surprises here as `[case-id] note` so the next session has context.

- **[setup] Live vs test price IDs.** Vercel's prod env carried **live-mode** price IDs while the
  local secret key is **test mode** → `createCertificationCheckout` 500'd with
  `No such price … exists in live mode, but a test mode key was used`. Fix: created 3 **test-mode**
  prices via the Stripe API ($49 / $29 / $19) and wrote them to `.env.local`. Don't `vercel env pull`
  price IDs for local test mode.
- **[setup] Local env tooling.** `stripe login` config didn't persist to a shell-visible location;
  run `stripe listen` with `STRIPE_API_KEY` (the test secret) instead. `supabase-js` needs a WS
  polyfill on Node 20 → `scripts/qa-stripe.mjs` uses plain REST.
- **[1.1] PASS (2026-06-02).** Beginner certification checkout end-to-end: webhook
  `checkout.session.completed`→200; `profiles.onboarding_status=payment_complete`,
  `stripe_customer_id` set; `payments` row (beginner_course/completed/4900/usd, real `cs_test_`+`pi_`).
- **[RISK — task 2/5] Stripe API version mismatch.** Account default is `2026-02-25.clover`; SDK pins
  `2025-02-24.acacia` (`lib/stripe/config.ts`). `syncSubscription` reads `subscription.current_period_end`
  (top-level) — in clover that field moved to `items.data[].current_period_end`. Sub events that hit
  `syncSubscription` on the raw webhook payload (customer.subscription.*) may produce `Invalid Date`/500.
  The checkout.session.completed path is safe (it `retrieve`s via the acacia-pinned SDK). Verify when
  running task 2.
- **[2.1] PASS (2026-06-02).** Subscription checkout end-to-end after fixing `syncSubscription`'s
  `current_period_end` read (now reads `items.data[].current_period_end` first, falls back to the
  legacy top-level field, null-safe). All webhooks (`checkout.session.completed`,
  `customer.subscription.created`, `invoice.*`) → 200; `subscriptions` row `active` with non-null
  `current_period_end=2026-07-03`; profile upgraded to `certified_organizer`/`subscribed`. Dashboard
  gate (role + active sub) satisfied. Fix verified — clover payload no longer 500s.
- **[infra] Stale `.next` after `npm run build` while dev server running** → `/billing` threw
  `Cannot find module './vendor-chunks/@supabase.js'`. Fix: stop dev, `rm -rf .next`, restart. Don't
  run a production build against a live dev server.
