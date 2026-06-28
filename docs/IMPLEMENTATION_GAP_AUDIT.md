> **STATUS: HISTORICAL** — point-in-time audit. For current state see `PROJECT_STATUS.md` / `FEATURE_MATRIX.md`.

# Implementation Gap Audit — Launch-Critical Functionality

> **Type:** audit only (code vs. docs). **No** new architecture, concepts, or file changes.
> **Method:** inspected `app/[locale]/*`, `lib/actions/*`, `lib/ope/*`, `lib/billing/*`,
> `lib/marketing/*`, `supabase/migrations/*` against the governing docs
> (`MASTER_PRODUCT_DECISIONS`, `OPE_MASTER_SPEC`, `OPE_DISCOVERY_ENGINE_PRINCIPLES_V1`,
> `OPE_EVENT_LIFECYCLE`, `OPE_V1_TECHNICAL_DESIGN`).
> **Legend:** ✅ Implemented · 🟡 Partial · ❌ Not implemented.

---

## Findings by launch-critical area

### 1. Organizer account / dashboard — ✅ Implemented
- **Evidence:** `app/[locale]/dashboard/*` (15+ pages: activities, participants, plans, bookings,
  proposals, requests, clients, venues, vendors, workers, calendar, analytics, settings,
  profile, worker-profile). `lib/actions/auth.ts` (signUp/signIn). Organizer access gated by
  cert + subscription (`lib/auth/organizer-access.ts`, migration 017, enforced in middleware).
- **Blocking:** **No.** **Note:** dashboard reachable only after the paid cert/subscription gate.

### 2. Event creation — ✅ Implemented
- **Evidence:** `lib/actions/activities.ts` (`createActivity`/`updateActivity`/`setActivityStatus`/
  `deleteActivity`), `app/[locale]/dashboard/activities`, migration 006 (`activities`),
  025 (cover image). Draft → published states.
- **Blocking:** **No.**

### 3. Event page — ✅ Implemented
- **Evidence:** `app/[locale]/marketplace/[id]/page.tsx` (public event detail, reviews, booking
  CTA), `app/[locale]/o/[slug]` (public organizer page), `organizers/[id]`. Shareable public URLs.
- **Blocking:** **No.**

### 4. Participant registration — 🟡 Partial
- **Evidence:** marketplace detail uses a **request-based lead flow**: `requestHref =
  /requests/new?activityId=…`, copy *"request-based, no upfront charge"* (`marketplace/[id]/page.tsx:37,136`).
  Path: `createRequest → sendProposal → acceptProposal → booking` (`lib/actions/requests.ts`).
  Other entry points: `addParticipant` (organizer manual), `importBookingsAsParticipants`,
  `rsvp/[token]` RSVP (`lib/actions/participants.ts`, migration 020).
- **Blocking:** **Yes (for self-serve events).** **Note:** there is **no public "register/enrol/join
  this event" button that seats an attendee** — registration is either an organizer-mediated
  request→proposal, a manual add, or an RSVP token. Adequate for low-volume/manual; not for
  self-serve class enrolment or conference sign-up.

### 5. Ticket / payment flow — 🟡 Partial
- **Evidence:** participant **self-serve booking checkout is RETIRED** — `createBookingCheckout`
  now just `redirect(/bookings?pay=via_invoice)` (`lib/actions/bookingPayments.ts:9-18`). The
  live money path is the **organizer-issued invoice over Stripe Connect**: `createInvoice`
  (`lib/actions/invoices.ts`, migration 036) → public `invoice/[token]` page →
  `createInvoiceCheckout` → `lib/billing/connect-checkout.ts` (destination charge, settles to
  the organizer, 100% to organizer). Platform Stripe checkout for **subscription + certification**
  works (`lib/actions/billing.ts`). Refunds implemented (`processRefund`).
- **Blocking:** **Yes (for paid events).** **Note:** an attendee **cannot buy a ticket from the
  event page**; they can only pay an **invoice the organizer manually creates**, and only once the
  organizer has completed **Stripe Connect onboarding** (a known prior production friction point).

### 6. Participant list — ✅ Implemented
- **Evidence:** `app/[locale]/dashboard/participants`, `dashboard/activities/[id]/participants`,
  `lib/actions/participants.ts` (add / setStatus / delete / import / check-in / counts /
  `sendEventUpdate` / `saveReminderOffsets`), migration 020.
- **Blocking:** **No.**

### 7. Organizer messaging / notifications — 🟡 Partial
- **Evidence:** **In-app messaging** ✅ — `lib/actions/messages.ts` (conversations/sendMessage),
  migration 028. **Notifications** ✅ — `notifications` table + `app/[locale]/notifications` +
  `notifications/preferences`, `markNotificationRead`. **Updates/reminders** ✅ — `sendEventUpdate`,
  participant-reminder cron, `activity_alerts` (019). **Email delivery** ❌ — **no transactional
  email provider** (no resend/sendgrid/nodemailer/postmark/smtp in code); `email_notifications`
  is **enqueue-only** (`enqueue_email_for_notification`, migration 013) with **no sender**. Auth
  emails (password reset) go via Supabase auth, not the app.
- **Blocking:** **No (in-app suffices for MVP).** **Note:** app-generated **emails are not actually
  sent** — only enqueued. Participants relying on email won't receive it.

### 8. Basic OPE flow: Request → WSH → Planning → Plan — ✅ Implemented (deterministic)
- **Evidence:** idea-first action chain in `lib/actions/planner.ts`: `analyzeIdeaAction` →
  `composeWhatShouldHappen` (WSH draft) → user approves → `generateFromIdeaAction` **gated on
  `approvedWhatShouldHappen`** (`error: 'what_should_happen_required'`) → `generatePlan`
  (`lib/ope/*` deterministic engine). Plan → proposal wired
  (`dashboard/plans/[id]/proposal`, `sendProposal`/`acceptProposal`). WSH gate committed
  (`b02f5bc`).
- **Blocking:** **No.** **Note:** deterministic engine; pricing seeded for Honolulu only;
  supported categories = birthday / bbq / networking / class. WSH is the planning input per the
  governing decisions.

### 9. Discovery only if request is not planning-ready — 🟡 Partial
- **Evidence:** **planning-readiness signal** exists — `recognizeScenario` (recognised → skip;
  not recognised → create WSH) + the WSH gate. **A single-shot WSH draft** is produced
  (`composeWhatShouldHappen`, AI-first w/ deterministic fallback) and **approved/edited** in the
  `'wsh'` step of `PlannerClient.tsx`. **The full Discovery engine is NOT implemented** — the
  doc (`OPE_DISCOVERY_ENGINE_PRINCIPLES_V1`) describes contrast/scale prompts, guided
  exploration, comparison, and **iterative** refinement to a confirmed preliminary proposal;
  the code does **one** draft + approve, not an iterative discovery conversation.
- **Blocking:** **No (for launch).** **Note:** the minimal draft+approve covers the gate; the
  iterative Discovery engine (Methods, States A–D, Initial Discovery Trigger) is doc-only.

### 10. Marketing support — ✅ Implemented (largely)
- **Evidence:** `lib/actions/marketing.ts::generatePromotionPackage` →
  `lib/marketing/promotion-generator` (multi-channel **text assets**), `lib/marketing/facts`,
  `lib/marketing/promo-image` (`PROMO_IMAGE_FORMATS` image **descriptors**), persisted to
  `promotion_packages` (migration 018); `getPromotionPackages`. Event **description** + **social
  post text** + promo image specs. **Shareable link** = public `marketplace/[id]` and `/o/[slug]`.
  OPE also emits plan `summary`/`headline`/messages (`lib/ope/communication.ts`).
- **Blocking:** **No.** **Note:** promo **images are descriptors/specs, not rendered files** — no
  image renderer ships; copy + shareable link + image specs are present.

---

## Summary table

| # | Area | Status | Blocking? |
|---|---|---|---|
| 1 | Organizer account / dashboard | ✅ | No |
| 2 | Event creation | ✅ | No |
| 3 | Event page | ✅ | No |
| 4 | Participant registration | 🟡 | Yes (self-serve) |
| 5 | Ticket / payment flow | 🟡 | Yes (paid events) |
| 6 | Participant list | ✅ | No |
| 7 | Messaging / notifications | 🟡 | No (email not sent) |
| 8 | OPE: Request → WSH → Plan | ✅ | No |
| 9 | Discovery (if not planning-ready) | 🟡 | No |
| 10 | Marketing support | ✅ | No |

**Code-only vs doc-only:** Areas 1–3, 6, 8, 10 are real, working code. Area 9's *Discovery engine*
is **largely doc-only** (only a minimal WSH draft+approve exists in code). Areas 4, 5, 7 are
**partially** built — the request/invoice/Connect plumbing exists, but **self-serve registration,
self-serve ticket purchase, and email delivery do not.**

---

## Final conclusion — can the current code support a first launch?

### A. Yoga instructor / recurring class — 🟡 PARTIALLY
Can: create a class, publish a public page, generate marketing, manage participants manually,
plan recurring sessions in OPE, and **invoice clients via Connect**. Cannot: let attendees
**self-enrol** in a class or **buy a ticket/pass** from the event page (registration is
request-based; participant checkout retired). **Workable only if** enrolment + payment are
handled manually (organizer adds participants and sends invoices).

### B. Small one-time conference — ❌ NO (as a paid/ticketed event); 🟡 PARTIALLY (free/manual)
A ticketed conference needs **self-serve registration + ticket payment for many attendees** —
neither exists self-serve. It **could** run as a **free or manually-registered** event (organizer
adds attendees / RSVP tokens, no payment), but not as a self-serve ticketed conference.

### C. Professional organizer using the platform as a workspace — ✅ YES (largely)
This is the **most launch-ready** persona. The organizer workspace is real: OPE
**Request → WSH → Plan**, plans + **proposals/PDF**, clients/venues/vendors/workers, participant
management, **Connect invoicing**, and marketing all exist. The self-serve gaps (registration,
ticketing) matter less because the organizer drives everything manually. **Caveats:** Connect
onboarding must work for invoicing; app emails are in-app-only (not sent).

---

## Minimum blocking items to implement first

To unblock personas **A** and **B** (C is largely launchable today):

1. **Self-serve participant registration on the event page** — a real "register / enrol / join"
   that seats an attendee (creates a participant/booking) without an organizer-mediated
   request→proposal. *(Blocks A and B.)*
2. **Self-serve ticket payment** — re-enable a participant payment path at registration (a Connect
   destination charge from the event page); today the booking checkout is retired and money flows
   only through **organizer-created invoices**. *(Blocks paid A and B.)*
3. **Stripe Connect onboarding reliability** — invoicing and any participant payment settle to the
   organizer via Connect; onboarding must succeed end-to-end (prior production friction). *(Blocks
   all paid flows, incl. C's invoicing.)*
4. **Email delivery integration** — wire a real transactional email provider so notifications and
   reminders are actually sent (currently enqueue-only). *(Needed for A and B at any scale; nice-to-
   have for C.)*

*(Audit only — no architecture, no new concepts, no files modified beyond creating this report.)*
