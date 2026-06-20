# Implementation Gap Audit V2 — Launch-Critical Functionality

> **Type:** audit only (code vs. launch requirements). No architecture, no redesign, no code
> changes, nothing committed. Current-state reality.
> **Refreshed after:** G1 (organizer-dashboard WSH gate), G2 (WSH-input audit), P-B (WSH → typed
> planning signals), and P-B final coverage (last live `generatePlan` bypass closed).
> **Supersedes:** `IMPLEMENTATION_GAP_AUDIT.md`.
> **Legend:** ✅ Implemented · 🟡 Partial · ❌ Not implemented.

---

## Findings by launch-critical area

### 1. Organizer account / dashboard — ✅ Implemented
- **Evidence:** `app/[locale]/dashboard/*` (activities, participants, bookings, proposals, requests,
  clients, vendors, workers, plans, calendar, analytics, settings, profile). Access **triple-gated**:
  middleware (`middleware.ts:160-196` — `certified_organizer`/`admin` + active/trialing subscription
  or live 30-day cert window, else → `/billing`), server actions (`lib/auth/organizer-access.server.ts:16-37`),
  and DB RLS. Helper `hasOrganizerAccess()` (`lib/auth/organizer-access.ts:32-40`).
- **Blocking:** **No.**

### 2. Event creation — ✅ Implemented
- **Evidence:** `lib/actions/activities.ts` — `createActivity` (`:148`), `updateActivity` (`:177`),
  `setActivityStatus` (`:202`), `deleteActivity` (`:226`); status set `['draft','published','archived']`,
  default `draft`; publish triggers `maybeDispatchAlerts()` (`:61-75`). `app/[locale]/dashboard/activities`.
- **Blocking:** **No.**

### 3. Event page — ✅ Implemented
- **Evidence:** public event detail `app/[locale]/marketplace/[id]/page.tsx` (no auth); public
  organizer pages `app/[locale]/o/[slug]/page.tsx` (canonical slug URL) + fallback
  `app/[locale]/organizers/[id]/page.tsx`; shareable URL via `organizerHref()` (`lib/utils.ts:60-67`).
- **Blocking:** **No.**

### 4. Participant registration — 🟡 Partial *(unchanged since V1)*
- **Evidence:** the public event page routes to a **request-based lead flow**, not a seat:
  `requestHref = /requests/new?activityId=…` and copy *"You won't be charged until you accept a
  proposal"* (`marketplace/[id]/page.tsx:37`, `messages/en.json` `howBooking.*`). Path:
  `createRequest → match_request → sendProposal → acceptProposal → booking`
  (`lib/actions/requests.ts:39,74,94,122`; booking created only in `accept_proposal()`,
  migration 009). Other entry points are organizer-mediated: `addParticipant` (`participants.ts:37`),
  `importBookingsAsParticipants` (`:94`), token RSVP `respondToRsvp` (`:213`).
- **Blocking:** **Yes (for self-serve events).** **No public "register / enrol / join" button that
  seats an attendee** — registration is organizer-mediated request→proposal, manual add, or RSVP
  token. Fine for organizer-driven/manual; not for self-serve class enrolment or conference sign-up.

### 5. Ticket / payment flow — 🟡 Partial *(unchanged since V1)*
- **Evidence:** participant **self-serve booking checkout is RETIRED** —
  `createBookingCheckout` now just `redirect(/bookings?pay=via_invoice)`
  (`lib/actions/bookingPayments.ts:8-19`). Live money path = **organizer-issued invoice over Stripe
  Connect**: `createInvoice` with a payment-readiness gate (`lib/actions/invoices.ts:42-131`, gate
  `:56-64`) → public token-gated `invoice/[token]` page → `createInvoiceCheckout` (`:185-230`) →
  `lib/billing/connect-checkout.ts` (destination charge, `transfer_data.destination` +
  `on_behalf_of`, settles to organizer; readiness enforced `:67-87`). Platform Stripe checkout for
  subscription + certification works (`lib/actions/billing.ts`). Refunds implemented
  (`bookingPayments.ts:22-57`, migration 012).
- **Blocking:** **Yes (for paid self-serve events).** An attendee **cannot buy a ticket from the
  event page**; they can only pay an **invoice the organizer creates**, and only after the organizer
  completes **Stripe Connect onboarding**.

### 6. Participant list — ✅ Implemented
- **Evidence:** `app/[locale]/dashboard/participants` + per-activity
  `dashboard/activities/[id]/participants`; `lib/actions/participants.ts` —
  add/setStatus/delete/import/check-in, `saveReminderOffsets` (`:140`), `sendEventUpdate` (`:157`).
  Statuses: invited/confirmed/maybe/declined/checked_in/no_show.
- **Blocking:** **No.**

### 7. Organizer messaging / notifications — 🟡 Partial *(unchanged since V1)*
- **Evidence:** **in-app messaging** ✅ (`lib/actions/messages.ts`); **notifications** ✅
  (`notifications` table, `app/[locale]/notifications`, `markNotificationRead`); **updates/reminders**
  ✅ (`sendEventUpdate` `participants.ts:157`, hourly cron `app/api/cron/participant-reminders/route.ts`,
  web-push via `push_subscriptions`). **Email delivery** ❌ — **no transactional provider**: no
  resend/sendgrid/nodemailer/postmark/smtp in `package.json`; `enqueue_email_for_notification()`
  trigger (migration 013) fills `email_notifications` with `status='queued'` but **nothing sends**
  (activity alerts aren't even enqueued, migration 019). `.env.local.example` lists an unused
  commented `RESEND_API_KEY`.
- **Blocking:** **No (in-app + web-push suffice for MVP).** **Note:** app emails are **queued, not
  sent** — participants relying on email get nothing.

### 8. OPE: Request → WSH → Planning → Plan — ✅ Implemented (deterministic) — *materially strengthened since V1*
- **Evidence:** the idea-first chain in `lib/actions/planner.ts` is intact (`analyzeIdeaAction` →
  `composeWhatShouldHappen` draft → approve → `generateFromIdeaAction` **gated** on
  `approvedWhatShouldHappen`, error `what_should_happen_required`). **Since V1:**
  - **G1** — the **organizer-dashboard** paths are now WSH-gated too: `createPlan`,
    `updatePlanInputs` require `whatShouldHappen` before `generatePlan` (`lib/actions/opePlans.ts`).
  - **G2/P-B** — WSH is now a **real planning input**, not just a gate. `lib/ope/wsh-signals.ts`
    (`extractPlanningSignals` + `enrichInputWithWsh`) maps WSH/request narrative to typed signals
    (venue, budget, guestCount, and feature requirements: photography, entertainment, transport,
    foam, alcohol±suppression, lodging, dining, child-friendly, indoor), enriching `PlannerInput`
    before the engine — **structured fields always win; WSH only fills blanks / adds signals**.
  - **P-B final coverage** — **every live `generatePlan` path** runs through the P-B chain:
    `createPlan` (`opePlans.ts:75`), `updatePlanInputs` (`:628`), `generateFromIdeaAction`
    (`planner.ts:200`), and `generateApproachesFromRequest` (`:329/:334`, enriched from the customer
    request narrative). Engine unchanged — `test:ope` snapshot still **31 cases byte-for-byte**.
- **Blocking:** **No.** **Note:** deterministic engine; pricing seeded **Honolulu only**; supported
  categories = birthday / bbq / networking / class (others → safe handoff). These scope limits are
  unchanged from V1.

### 9. Discovery only if request is not planning-ready — 🟡 Partial *(unchanged since V1)*
- **Evidence:** the **planning-readiness signal** exists (`recognizeScenario` + the WSH gate) and a
  **single-shot WSH draft+approve** is produced (`composeWhatShouldHappen`, AI-first w/ deterministic
  fallback) and edited in the `'wsh'` step of `PlannerClient.tsx`. The **iterative Discovery engine**
  described in `OPE_DISCOVERY_ENGINE_PRINCIPLES_V1` (contrast/scale prompts, States A–D, guided
  refinement) remains **doc-only** — the code does one draft + approve, not an iterative conversation.
  *(P-B did not touch this; it strengthened how WSH feeds Planning, not how WSH is discovered.)*
- **Blocking:** **No (for launch).**

### 10. Marketing support — ✅ Implemented (largely) *(unchanged since V1)*
- **Evidence:** `lib/actions/marketing.ts::generatePromotionPackage` (`:42`) →
  `lib/marketing/promotion-generator.ts` (7-channel **text assets**, deterministic, fact-frozen
  via `assertFactsPreserved` `:268`), `lib/marketing/promo-image.ts` (`PROMO_IMAGE_FORMATS` +
  `buildPromoImageSVG` — SVG specs rasterized **client-side**, no stored files), persisted to
  `promotion_packages` (migration 018); `getPromotionPackages`. Shareable link = public
  `marketplace/[id]` / `/o/[slug]`.
- **Blocking:** **No.** **Note:** promo **images are client-rendered SVG→PNG, not server files**;
  package retrieval is organizer-private (no public share CTA).

---

## Summary table

| # | Area | V1 | V2 | Blocking? |
|---|---|---|---|---|
| 1 | Organizer dashboard | ✅ | ✅ | No |
| 2 | Event creation | ✅ | ✅ | No |
| 3 | Event page | ✅ | ✅ | No |
| 4 | Participant registration | 🟡 | 🟡 | **Yes (self-serve)** |
| 5 | Ticket / payment flow | 🟡 | 🟡 | **Yes (paid self-serve)** |
| 6 | Participant list | ✅ | ✅ | No |
| 7 | Messaging / notifications | 🟡 | 🟡 | No (email not sent) |
| 8 | OPE: Request → WSH → Plan | ✅ | ✅ **(G1+G2+P-B)** | No |
| 9 | Discovery (if not ready) | 🟡 | 🟡 | No |
| 10 | Marketing support | ✅ | ✅ | No |

**What changed since V1:** only **Area 8** moved materially — WSH is now gated on every live planning
surface *and* is a real typed planning input across all live `generatePlan` paths. Areas 4, 5, 7, 9
are unchanged. No area regressed.

---

## Launch personas — current state

### A. Yoga instructor / recurring class — 🟡 PARTIALLY
Can: create + publish a class, generate marketing, manage participants manually, plan recurring
sessions in OPE (now WSH-driven), and **invoice clients via Connect**. Cannot: let attendees
**self-enrol** or **buy a pass** from the event page (registration is request-based; participant
checkout retired). **Workable only if** enrolment + payment are handled manually (organizer adds
participants and sends invoices).

### B. Small one-time conference organizer — ❌ NO (paid/ticketed); 🟡 PARTIALLY (free/manual)
A ticketed conference needs **self-serve registration + ticket payment for many attendees** — neither
exists self-serve. Could run as a **free or manually-registered** event (organizer adds attendees /
RSVP tokens, no payment), but not as a self-serve ticketed conference.

### C. Professional organizer (platform as workspace) — ✅ YES (largely) — strongest persona
The workspace is real and now **WSH-coherent end to end**: OPE Request → WSH → (typed-signal) Plan,
plans + proposals/PDF, request→approaches (WSH-enriched), clients/venues/vendors/workers, participant
management, **Connect invoicing**, and marketing. Self-serve gaps matter less because the organizer
drives everything manually. **Caveats:** Connect onboarding must work for invoicing; app emails are
in-app/web-push only (not sent).

---

## Remaining launch blockers

### BLOCKING BEFORE FIRST LAUNCH
*(Only what blocks a self-serve / paid-attendee launch — personas A paid & B.)*

1. **Self-serve participant registration** (Area 4) — no public "register / enrol / join" that seats
   an attendee without an organizer-mediated request→proposal. *Blocks A (self-serve) and B.*
2. **Self-serve ticket payment** (Area 5) — participant checkout is retired; money flows only through
   organizer-created invoices. No buy-from-event-page path. *Blocks paid A and B.*
3. **Stripe Connect onboarding reliability** (Area 5) — all customer money (invoices and any future
   participant payment) settles to the organizer via Connect; onboarding must succeed end-to-end.
   *Blocks all paid flows, including persona C's invoicing.* *(Connect itself is explicitly out of
   the current OPE work scope — flagged here only as the standing launch dependency.)*

> **If launching organizer-workspace-only (persona C, manual enrolment + Connect invoicing):** only
> blocker **#3** applies. Blockers **#1–#2** are not required for that launch shape.

### CAN WAIT UNTIL AFTER LAUNCH

1. **Transactional email delivery** (Area 7) — `email_notifications` is enqueue-only; no provider
   sends. In-app + web-push cover MVP; wire a sender post-launch.
2. **Iterative Discovery engine** (Area 9) — single-shot WSH draft+approve ships; the iterative
   engine (States A–D, contrast/scale prompts) is doc-only.
3. **OPE scope breadth** (Area 8) — pricing seeded Honolulu-only; supported categories =
   birthday/bbq/networking/class (others get a safe handoff, not a wrong plan). Expand post-launch.
4. **Marketing polish** (Area 10) — promo images are client-rendered SVG→PNG (no server files); no
   public share CTA for promotion packages.

*(Audit only — current-state reality. No architecture proposals, no redesign, no code changes,
nothing committed.)*
