# Organizer Marketing Automation — v1

> **Product design + technical specification.** No code in this document.
> **Status:** proposal, ready to implement after the homepage + organizer-page work.
> **Date:** 2026-06-09.

## Purpose

Automate the **marketing and communication workflow** of an activity organizer.

We are **not** building a social network, messenger, email provider, or CRM. Organizers keep
using Facebook, Instagram, X, LinkedIn, Telegram, WhatsApp and Email. ActivLife Hub automates
the **work between those tools**: generating the content, deciding who to reach, and pushing it
out — so the organizer stops copy-pasting between ten apps.

### Core principle

> **Generate once → distribute everywhere → notify the right people automatically.**

### Non-goals (explicit)

- ❌ A new social network or feed
- ❌ A new messenger or chat product
- ❌ A new email-sending provider (we orchestrate; a provider delivers)
- ❌ A new CRM (we use the existing `clients` / `bookings` data)
- ❌ Replacing any external platform — we publish **into** them via their official APIs

### What already exists in the codebase (foundation we build on)

| Primitive | Where | Reused for |
|---|---|---|
| `notifications` (typed, JSONB `data`, in-app) | `008_requests.sql` | Part 4 activity alerts |
| `email_notifications` queue + `enqueue_email_for_notification()` trigger | `013_analytics_email.sql` | Parts 4–5 email delivery |
| `customer_requests` + `request_matches` matching engine | `008_requests.sql` | Part 4 matching (inverted) |
| OPE AI Layer + **frozen-field guard** | `scripts/ai-layer-ope.mjs`, `docs/OPE_AI_LAYER_MVP_V1.md` | Part 3 generator |
| `clients` (name/email/phone) + `bookings` (participants) | `006_organizer_core.sql`, `009_bookings.sql` | Part 5 audience |
| 20-category interest taxonomy (3 groups) | `lib/categories.ts`, `016_marketplace_categories.sql` | Parts 3–4 targeting |
| 6 locales (en/es/fr/ru/de/pt) | `i18n/routing.ts` | Parts 3–5 language |
| Activities (title/description/status) + venue `city`/`country` | `006`, `007` | Part 3 inputs |

> **Dependency flag:** the email **queue** exists, but no SMTP/provider sender is wired yet
> (it is a known production blocker). Email-dependent parts (4 partial, 5) require that sender.

---

## Part 1 — Organizer Workflow Audit

The full lifecycle, with **every manual step** marked. "M" = manual today, "A" = already
automated by the platform, "◐" = partially automated.

| # | Step | State | What the organizer does today |
|---|---|---|---|
| 1 | **Create activity** | A | Fill the activity form in the dashboard (title, description, category, venue, capacity). |
| 2 | **Publish activity** | A | Set status → published; it appears in the marketplace. |
| 3 | **Promote activity** | **M** | Manually write a Facebook post, an Instagram caption, a Telegram message, a WhatsApp blast, an email — re-typing the same facts 5–7 times, per language. |
| 4 | **Collect registrations** | ◐ | Marketplace requests/bookings are automated; but registrations coming from Instagram DMs, WhatsApp, Google Forms are **manually copied** into a spreadsheet. |
| 5 | **Send reminders** | **M** | Manually message each participant ("event is tomorrow") across WhatsApp/Telegram/email. |
| 6 | **Run activity** | A | Off-platform (the real-world event). |
| 7 | **Collect reviews** | ◐ | Review system exists (`reviews`), but the organizer manually nudges people to leave one. |
| 8 | **Invite to future activities** | **M** | Manually digs up past participants and re-contacts them about the next event. |

### The manual-work hotspots (where v1 must focus)

1. **Step 3 — Promotion** (writing the same content N channels × M languages). *Highest, most repetitive.*
2. **Step 5 — Reminders** (per-participant manual messaging).
3. **Step 8 — Re-engagement** (no automated "next event" path to past participants).
4. **Discovery gap** — participants don't learn about a *new* matching activity unless the
   organizer manually pushes it. (Solved by Part 4 — a platform-side automation.)

---

## Part 2 — Automation Opportunities

For each workflow step: the manual process, the automation, and **estimated time saved per activity**
(assumes a typical organizer promoting on 5 channels in 2 languages).

| Step | Manual today | Automation opportunity | Time saved / activity |
|---|---|---|---|
| 3. Promote | Write & format 5–7 posts × 2 langs by hand (~45–90 min) | **Generate Promotion Package** (Part 3): one click → all channels, all languages | **40–80 min** |
| 3. Distribute | Log into each network, paste, attach image, post | **Social/Telegram publishing** (Parts 6–7): push from ActivLife Hub | **15–30 min** |
| 4. Collect regs | Copy DMs/Forms responses into a sheet | Funnel registrations through the marketplace booking flow (already automated) + import note | **10–20 min** |
| 4. Reach demand | Hope the right people see the post | **Activity Alerts** (Part 4): auto-notify interested, nearby participants | *new reach*, ~**∞** vs manual |
| 5. Reminders | Message each participant individually | **Scheduled reminder campaign** (Part 5) from booking list | **20–40 min** |
| 7. Reviews | Manually ask each attendee | **Auto post-event "leave a review" notification** (Parts 4–5) | **10–15 min** |
| 8. Re-invite | Find past participants, re-contact | **"Next event" campaign** (Part 5) to prior attendees | **20–30 min** |

**Net:** roughly **2–3.5 hours saved per activity**, plus reach the organizer cannot achieve by
hand. This is the headline value proposition for the organizer page and pricing.

---

## Part 3 — Marketing Generator: "Generate Promotion Package"

The flagship, lowest-risk automation. **No external API, no approval, no compliance surface** —
it produces copy the organizer can use anywhere immediately.

### Input

Drawn from the activity the organizer already created (no re-entry):

| Input | Source |
|---|---|
| `activity` (title, description, category) | `activities` + `016` category |
| `location` (city, country, venue) | `venues.city/country` |
| `audience` | derived from category + an optional "who is this for" field *(small schema add)* |
| `date` / time | activity schedule *(see schema gap below)* |
| `language` | one or many of the 6 supported locales |

### Output — one package, every channel

| Asset | Constraints baked into generation |
|---|---|
| **Facebook post** | conversational, 1–2 short paragraphs, 2–4 hashtags, CTA + marketplace link |
| **Instagram post** | hook first line, line breaks, 8–15 hashtags, emoji-light, link-in-bio note |
| **Telegram post** | Markdown, compact, bold title, bullet details, inline CTA link |
| **WhatsApp message** | short, personal, 1 emoji, opt-in-friendly, no hashtags |
| **Email newsletter** | subject + preheader + HTML-friendly body + button CTA |
| **Short ad copy** | ≤125 chars headline + ≤30 char CTA (paid-ad sized) |
| **Event description** | clean canonical blurb (reusable as the marketplace description) |

Each asset is generated **per requested language** (6 locales available).

### Architecture (reuses the OPE AI Layer)

```
Activity facts ──► FREEZE factual fields ──► AI generation (per channel × locale)
   (title, date,        (immutable)              │
    price, location,                             ▼
    organizer name)                        Channel formatter
        │                                  (length, hashtags, CTA)
        └────────────► COMPARE after gen ◄───────┘
                       (frozen-field guard)
                              │
                   pass → store as promotion_package
                   fail → reject & regenerate
```

- **Frozen-field guard (mandatory, reused from `ai-layer-ope.mjs`):** the model may rewrite *tone
  and structure* but must never alter facts — date, time, price, venue, organizer name,
  marketplace URL. We `freeze()` those fields, generate, then compare; any drift → regenerate or
  fall back to a deterministic template. This prevents the #1 failure mode (an AI post advertising
  the wrong date/price).
- **Deterministic fallback:** if AI is unavailable, fill channel templates with the raw facts so
  the feature never hard-fails.
- **Human-in-the-loop:** every asset is **editable before use**. The organizer reviews, tweaks,
  then copies or (later) auto-publishes.

### Data model (new)

```
promotion_packages
  id, organizer_id, activity_id, locale, status (draft|ready|published),
  created_at
promotion_assets
  id, package_id, channel (facebook|instagram|telegram|whatsapp|email|ad|description),
  title, body, hashtags[], cta_url, edited_by_user (bool), created_at
```

### UX

Dashboard → Activity → **"Generate promotion"** → pick channels + languages → review the grid of
assets → **Copy** each (v1.0) or **Publish** (v1.1+, Parts 6–7). One screen, one click to draft.

---

## Part 4 — Push Notification System: "Activity Alerts"

Platform-side automation that connects a **newly published activity** to **participants who want
exactly that**. This is reach the organizer cannot create manually.

### Participant preferences (opt-in)

```
participant_alert_prefs
  profile_id (PK),
  interests   text[]   -- from the 20-category taxonomy (lib/categories.ts)
  language    text     -- one of the 6 locales
  city        text
  lat, lng    numeric  -- for radius matching (geocoded from city in v1)
  radius_km   int      -- default 25
  channels    jsonb    -- { in_app: true, email: true, push: false }
  frequency   text     -- instant | daily_digest | weekly_digest
  paused      bool
```

### Matching engine (reuses the `request_matches` pattern, inverted)

Today `request_matches` fans a **customer request** out to matching **organizers**. We invert it:
a **new published activity** fans out to matching **participants**.

```
Activity published (status → published)
        │
        ▼
  Match job (DB function / queued worker):
    candidates = participant_alert_prefs WHERE
        category(activity) = ANY(interests)
        AND distance(participant, activity.venue) ≤ radius_km
        AND language compatible
        AND NOT paused
        │
        ▼
  For each candidate, per their `channels` + `frequency`:
    • instant  → INSERT notifications(type='new_activity_match', data={activity_id,…})
    • digest   → enqueue into a digest bucket (daily/weekly rollup)
```

### Delivery — already wired

`notifications` (in-app bell) → existing trigger mirrors into `email_notifications` → provider
sends. So **in-app + email alerts work the moment the match job exists.** Web/mobile **push** is a
later channel (needs `web_push_subscriptions` + a service worker + VAPID) — additive, not required
for v1.

### Notification copy (localized, templated — not AI, for trust)

```
🥾 New Hiking Activity near you — "Sunrise Ridge Hike", Sat 14 Jun · Honolulu
👨‍👩‍👧 New Family Event — "Beach Field Day", Sun 15 Jun · 8 km away
🎈 New Kids Activity — "Superhero Birthday Workshop", next Sat
```

### Complete flow

```
1. Participant sets interests + city + radius + language + channels (one settings screen)
2. Organizer publishes a matching activity
3. Match job selects opted-in, in-range, interested participants
4. Instant → in-app + email now; Digest → batched daily/weekly
5. Participant taps → marketplace activity page → books
6. Frequency caps + "pause alerts" + unsubscribe link prevent fatigue
```

**Guardrails:** opt-in only; per-participant frequency cap; global daily cap; quiet hours; one-tap
mute per category; full unsubscribe. (Consent is the product, not an afterthought.)

---

## Part 5 — Email Campaigns

Let an organizer email **their own participants** using data already in the platform — built on
the existing `email_notifications` queue. **Not** a new email provider; an orchestration layer.

### Campaign types (v1)

| Type | Trigger | Audience |
|---|---|---|
| **Announcement** | manual send | all/selected participants & clients |
| **Reminder** | scheduled (e.g. T-24h, T-2h before event) | bookers of one activity |
| **Thank-you** | post-event (auto or manual) | attendees of one activity |
| **Next-event invitation** | manual | past attendees (re-engagement; solves Step 8) |

### Audience — from the existing database (no CRM)

- **Bookings** → participants of a given activity (`bookings` → `profiles`).
- **Clients** → the organizer's saved contacts (`clients.email`).
- **Filters:** by activity, by category attended, by city, by date range.

### Data model (new)

```
campaigns
  id, organizer_id, type, locale, subject, preheader, body_html,
  audience_filter jsonb, scheduled_at, status (draft|scheduled|sending|sent|cancelled)
campaign_recipients
  id, campaign_id, profile_id?, client_id?, to_email,
  status (queued|sent|failed|skipped_no_consent|unsubscribed), sent_at
```

### Sending pipeline (reuses the queue)

```
Campaign "send" → expand audience → de-dupe → consent check
   → INSERT campaign_recipients → enqueue into email_notifications
   → existing worker delivers via provider → mark sent
```

### Compliance (hard requirements)

- **Consent:** only email participants who transacted with the organizer or opted in.
- **Unsubscribe:** one-click, per-organizer, in every email (CAN-SPAM / GDPR).
- **Identity:** organizer is the sender-of-record; ActivLife Hub is the processor.
- **Throttling & quality:** rate-limit per organizer; suppression list for bounces/complaints.
- **Content generation:** the Part 3 generator can draft the email body (same frozen-field guard).

### Dependency

Requires the **SMTP/email provider** (e.g., Resend/Postmark/SES) to be wired — the queue exists,
the sender does not. This is on the production blocker list and **gates Part 5 launch**.

---

## Part 6 — Social Publishing (research)

Goal: push the Part 3 assets directly into the organizer's **own** pages/accounts via official
APIs. We connect the organizer's account once (OAuth), store tokens, and publish on their behalf.

> All four require an **OAuth "connect account"** flow and a `channel_connections` table
> (organizer_id, channel, encrypted tokens, external_account_id, status, expires_at).

| Platform | API availability | Approval requirements | Technical complexity | Key restrictions |
|---|---|---|---|---|
| **Facebook Pages** | ✅ Graph API `POST /{page-id}/feed` (text/link/photo) | Meta App Review for `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` + **Business Verification** + Advanced Access | **Medium-High** — OAuth, page-token exchange, token refresh, app review (weeks) | Pages only (not personal profiles); link-post reach is throttled; token expiry management; review can reject vague use-cases |
| **Instagram Business** | ✅ Content Publishing API (create container → publish) | Same Meta app + `instagram_basic`, `instagram_content_publish`; IG **Business/Creator** account linked to a FB Page | **High** — depends on FB Page linkage + IG business account + app review | Business/Creator only; media must be a **public URL**; ~25–50 posts/24h; carousels/reels have extra rules; no pure-text posts |
| **X (Twitter)** | ✅ API v2 `POST /2/tweets` | Developer account + app; OAuth 2.0 PKCE (user context) | **Medium** technically; **cost is the blocker** | Tiered pricing (Free very limited write caps; Basic ~$100/mo; Pro ~$5000/mo); rate limits; ToS volatility |
| **LinkedIn** | ✅ Member share (`w_member_social`); Org/Page posting via **Community Management API** | Member share: Sign In with LinkedIn — light. **Company-page posting: Marketing Developer Platform partner approval** (restrictive) | **Medium** (member) / **High** (org pages) | Strict review; limited scopes; throttling; org posting often gated behind partnership |

### Takeaway

Meta (FB + IG) is the **highest organizer value** but carries the **heaviest approval cost**
(business verification + app review). X and LinkedIn are **lower value / higher friction** (cost,
partner gating) — defer. Because all of these need OAuth + token management + review, **none is a
"fast" win**; the fast win is generation (Part 3) and Telegram (Part 7).

---

## Part 7 — Telegram (research)

| Option | Mechanism | Fit |
|---|---|---|
| **Channel** (broadcast) | Bot added as **admin** → `sendMessage(chat_id=@channel)` | ✅ **Best** — one-to-many broadcast, exactly the promotion use-case |
| **Group** (community) | Bot in group → post messages | ◐ good for community discussion, noisier |
| **Bot DM** | Bot messages users | ⚠️ only users who `/start`-ed the bot first (no cold DMs) |

### Best integration path

1. Organizer creates a Telegram **channel** (their audience) and adds the **ActivLife Hub bot**
   (one bot, via BotFather) as **admin**.
2. Organizer links the channel in ActivLife Hub (paste channel @handle / bot confirms admin).
3. On publish, ActivLife Hub bot calls `sendMessage` with the Part 3 Telegram asset (Markdown +
   CTA link), optionally with the activity image.

**Why Telegram is the #2 priority:** **free, no approval, no per-message cost, simple Bot API**, and
it delivers real end-to-end automation (generate → publish). Lowest complexity of all external
channels.

`channel_connections` row: `channel='telegram'`, `external_account_id=@handle`, no expiring token.

---

## Part 8 — WhatsApp (research)

| Aspect | Reality |
|---|---|
| **API** | WhatsApp **Cloud API** (hosted by Meta) — official, no self-hosting cost to start |
| **Broadcast** | **Not** free-form mass send. Business-initiated messages need **pre-approved templates**; recipients must have **opted in**. "Broadcast" = template message to each opted-in number (each opens a conversation) |
| **24-hour window** | Free-form replies allowed only inside a 24h window after the user messages you; outside it → template only |
| **Limits** | Tiered messaging limits per 24h (1K → 10K → 100K → unlimited) based on phone-number **quality rating**; number registration + **Business Verification** required |
| **Cost** | **Per-conversation / per-message pricing**, varies by country and category; **marketing** messages are the most expensive (Meta shifted to per-message marketing/utility pricing in 2025). Real, recurring cost |
| **Complexity** | **High** — Cloud API or BSP setup, template submission/approval, opt-in capture & storage, quality monitoring, billing |

### Takeaway

High value for reminders/re-engagement, but **highest friction**: template approval, mandatory
opt-in, quality-rating limits, and **real per-message cost**. **Defer to v2.** In the meantime, the
Part 3 generator produces a **WhatsApp message** the organizer can paste manually (zero cost, zero
approval) — captures 80% of the value with 0% of the complexity.

---

## Part 9 — Prioritization

Scoring: **Value** (organizer impact, 1–5, higher better) · **Complexity** (build+approval+cost,
1–5, higher harder) · **Priority = Value − Complexity** (higher = do first).

| Capability | Value | Complexity | Priority | Notes |
|---|---:|---:|---:|---|
| **3 — Promotion Package generator** | 5 | 1 | **+4** | Reuses OPE AI layer; no API/approval/cost; instant value |
| **7 — Telegram publishing** | 4 | 1 | **+3** | Free Bot API, no approval, true generate→publish |
| **4 — Activity Alerts (in-app + email)** | 5 | 2 | **+3** | Reuses `notifications`+queue+matching; drives marketplace demand |
| **5 — Email campaigns** | 4 | 2 | **+2** | Reuses email queue; **gated on SMTP provider** + consent |
| **6 — Facebook Pages publishing** | 4 | 4 | **0** | Meta app review + business verification |
| **6 — Instagram publishing** | 4 | 5 | **−1** | Depends on FB linkage + IG business + review |
| **8 — WhatsApp broadcast** | 4 | 5 | **−1** | Template approval + opt-in + per-message cost |
| **6 — LinkedIn (org pages)** | 2 | 4 | **−2** | Partner approval; low organizer overlap |
| **6 — X publishing** | 2 | 4 | **−2** | Paid tiers; volatile ToS |
| **4 — Web/mobile push** | 3 | 3 | **0** | Additive channel after in-app+email proven |

### Implementation order (the roadmap)

**v1.0 — "Generate" (no external dependencies, ship first)**
1. Promotion Package generator (Part 3) with frozen-field guard + deterministic fallback.
2. Copy-to-clipboard for every channel asset, all 6 languages.
   → *Immediate organizer value; nothing to approve; matches the organizer-page "automation" promise.*

**v1.1 — "Owned channels + demand"**
3. Telegram channel publishing (Part 7) — first true auto-publish.
4. Activity Alerts (Part 4) — in-app + email, opt-in prefs, matching job, frequency caps.
5. Post-event "leave a review" + "thank-you" auto-notifications (closes Steps 5/7).

**v1.2 — "Email at scale" (after SMTP provider is wired)**
6. Email campaigns (Part 5): announcement, reminder, thank-you, next-event invite + consent/unsubscribe.
7. Web push as an added alert channel.

**v2 — "Approval-gated social + paid messaging"**
8. Facebook Pages + Instagram publishing (Meta app review + business verification).
9. WhatsApp Cloud API (templates, opt-in, per-message cost).
10. X / LinkedIn — optional, demand-driven.

### New data model summary (introduced across parts)

`promotion_packages`, `promotion_assets`, `participant_alert_prefs`, `channel_connections`,
`campaigns`, `campaign_recipients`, (`web_push_subscriptions` later). Small additive fields on
`activities` for explicit **audience / event_date / language** if not already present.

### Cross-cutting requirements

- **Consent & compliance** everywhere (opt-in, one-click unsubscribe, GDPR/CAN-SPAM, platform ToS).
- **Frozen-field guard** on every AI-generated asset (never alter date/price/venue/name/URL).
- **Token security** for `channel_connections` (encrypted at rest, refresh handling).
- **Localized** to all 6 locales; templated (not AI) copy for trust-critical notifications.
- **Entitlement:** marketing automation is organizer-tier — gate behind active organizer access
  (the existing `hasOrganizerAccess` entitlement).

---

## Why this is the right v1

It automates the **single most repetitive manual step** (promotion across channels and languages)
with the **lowest-risk** capability first (generation — no APIs, no approvals, no cost), then layers
on the **free owned channel** (Telegram) and the **demand engine** (Activity Alerts) that already
have their plumbing in the database. Paid/approval-gated channels (Meta, WhatsApp) come last, when
the value is proven and the per-message economics justify the integration cost. Every step maps to
a concrete time saving in Part 2 and to primitives that already exist in the codebase.
