# Marketplace Trust MVP

> **Purpose:** define the **smallest human-trust layer** the marketplace needs at
> launch, so activities read as real human-organized events — not database records.
> **Status:** 📐 Design — MVP scope. Not the full Trust & Verification Architecture.
> **Date:** 2026-06-13
> **Scope:** reuse existing data + the existing public storage bucket. No new
> marketplace architecture, no reputation system, no verification.

> **Problem observed (first live review):** activities show no cover image, no
> organizer avatar, minimal organizer identity, no history, weak social proof, and a
> large empty placeholder header. The cards feel like rows in a table.

---

## 0. What already exists (foundation)

- `profiles.avatar_url` (TEXT) — populated from OAuth metadata on sign-up; **no in-app
  upload**, so email-signup organizers usually have no avatar.
- `organizer_profiles` — `display_name`, `bio`, `city`, `country`, `languages`,
  `website`, `status`, `created_at`, **`slug`** (public URL `/o/[slug]`).
- `role = certified_organizer` — the only trust signal that exists today.
- **Activities have NO own cover image.** The marketplace `cover_path` is the
  **venue's first `venue_photo`** — so an activity with no venue (or no venue photos)
  has no image → the large empty placeholder.
- **One public storage bucket** + `uploadVenuePhoto()` — the only image upload/storage
  path in the app (the reusable pattern).
- Routes: `/marketplace`, `/marketplace/[id]`, `/o/[slug]`.
- Counts (activities created, participants hosted) are **derivable** from `activities`
  / `bookings` but are **not surfaced** anywhere public.

**Implication:** most trust *data* exists or is derivable. The MVP is mostly
**surfacing existing data + two small uploads + tasteful fallbacks** — not new systems.

---

## 1. Activity Cover Images

- **Upload:** none today for an *activity*. MVP: let the organizer attach one cover
  image to an activity, reusing the existing `uploadVenuePhoto` pattern (same public
  bucket, owner-scoped write).
- **Storage:** the existing public bucket; the activity stores a `storage_path`/URL
  (one image, MVP — no gallery).
- **Display:** card thumbnail + a *modest* detail-page header. Cover resolution order:
  activity cover → else venue's first photo (current behavior) → else fallback.
- **Fallback (key fix):** a deterministic, compact **category illustration / gradient
  + activity title** — NOT a large empty placeholder. Fallbacks must look intentional
  and small, never a blank grey block consuming the viewport.

## 2. Organizer Avatars

- **Upload:** none in-app today (only OAuth-provided). MVP: simple avatar upload
  (reuse the bucket/upload pattern), writing `profiles.avatar_url`.
- **Storage:** existing public bucket.
- **Display locations:** marketplace **card** (organizer chip), **activity detail**
  (organizer section), **public profile** header, dashboard header.
- **Fallback:** generated **initials avatar** (from `display_name`/`full_name`) with a
  deterministic color — every organizer always has a human-looking mark.

## 3. Organizer Public Profile (`/o/[slug]`)

Minimum fields and where the data lives today:

| Field | Source | State |
|---|---|---|
| Avatar | `profiles.avatar_url` (+ initials fallback) | exists; needs upload + display |
| Display name | `organizer_profiles.display_name` | exists |
| Bio | `organizer_profiles.bio` | exists |
| Certified organizer status | `profiles.role = certified_organizer` | exists; surface as a simple badge |
| Member since | `profiles.created_at` / `organizer_profiles.created_at` | exists; not surfaced |
| Activities created | count of `activities` by organizer | derivable; not surfaced |
| Participants hosted | sum of confirmed `bookings`/participants | derivable; not surfaced |

**MVP = display these seven** on the public profile (avatar, name, bio, "Certified
Organizer", "Member since …", "N activities", "N participants hosted"). All data
exists or is derivable — no new tables required.

## 4. Marketplace Cards — missing trust signals

Today the card reads as a record (title · category · price · maybe a venue photo).
**Missing human signals (MVP to add, from existing data):**
- **Organizer chip** — avatar (or initials) + display name.
- **Certified badge** — small, from `role`.
- **A real/intentional cover** — activity cover or tasteful category fallback (§1).
- **One social-proof line** — e.g. "Hosted by … · N events" (derived count).

Goal: at a glance the card says *"a real, certified person is running this,"* not
*"row #482."*

## 5. Activity Detail Page — missing trust signals

- **Header:** replace the large empty placeholder with a modest cover (real or
  fallback) that doesn't dominate the screen.
- **Organizer block (the core gap):** avatar, display name, "Certified Organizer"
  badge, "Member since …", a bio snippet, and a **link to `/o/[slug]`**.
- **Light social proof:** "N activities created · N participants hosted" (derived).
- Everything here is existing/derivable data — the page just doesn't show the human yet.

## 6. MVP vs Future

**MVP trust features (smallest human layer — build now):**
- Activity **cover image** upload + compact category **fallback**.
- Organizer **avatar** upload + **initials** fallback.
- **Surface existing identity** everywhere a human should appear: avatar, display
  name, bio, **Certified Organizer** badge, **member since**, **activities created**,
  **participants hosted** — on card, detail, and `/o/[slug]`.
- Organizer chip + certified badge on marketplace cards.

**Future (explicitly NOT this MVP — the full Trust & Verification Architecture):**
- Identity / document verification; the **Verified Organizer** badge (MASTER §3).
- **Reviews & ratings** / reputation scores.
- Response time, repeat-booking %, completion/cancellation history.
- Endorsements, social links verification, dispute/safety history.
- Trust score, ranking by reputation, badges beyond "Certified".

The line: **MVP = make existing humans visible and credible.** Future = *measure and
verify* trust.

---

## 7. Conclusion

The marketplace already holds almost everything needed to feel human — a certified
role, organizer name/bio/slug, an avatar field, and derivable history. It simply
doesn't **show** them, and it lacks two small uploads (activity cover, avatar) plus
**non-empty fallbacks**. The smallest Trust MVP is therefore overwhelmingly a
**display + two-upload + fallback** effort over existing data and the existing public
bucket — no reputation engine, no verification, no new marketplace architecture. That
is the minimum required to turn "database records" into "real human-organized events"
at launch.

_Design document only. No code, migrations, implementation plan, or architecture
changes are introduced here._
