# Start Here

The authoritative product definition is:

docs/ACTIVLIFE_HUB_PRODUCT_CANON.md

Everyone working on ActivLife Hub must read this document first.

If any product document contradicts the Product Canon,
the Product Canon is authoritative.

Architecture documents explain HOW.

The Product Canon explains WHAT and WHY.

---

# ActivitaHub — Phase 1

Organizer platform: manage activities, venues, clients, and calendar.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Supabase · next-intl  
**Languages:** English · Español · Français · Русский

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key
```

### 3. Run the database migration

In Supabase SQL Editor, run the full contents of:

```
supabase/migration.sql
```

### 4. Set up Google OAuth

In Supabase Dashboard:
1. **Authentication → Providers → Google** → Enable
2. Add your Google OAuth credentials (from Google Cloud Console)
3. Set **Redirect URL** to:
   - Dev: `http://localhost:3000/auth/callback`
   - Prod: `https://yourdomain.com/auth/callback`

In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` (or your domain)
- **Redirect URLs**: add `http://localhost:3000/auth/callback`

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` → redirects to `/en`

### 6. Build

```bash
npm run build
```

---

## Deploy to Vercel

```bash
npx vercel
```

Set environment variables in Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` = your Vercel URL

Update Supabase Auth settings with your production URL.

---

## Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/en` | Public | Homepage |
| `/en/pricing` | Public | Pricing page |
| `/en/auth/sign-in` | Public | Google sign-in |
| `/en/privacy-policy` | Public | Privacy policy |
| `/en/terms-of-service` | Public | Terms of service |
| `/en/dashboard` | Auth required | Overview with stats |
| `/en/dashboard/profile` | Auth required | Organizer profile edit |
| `/en/dashboard/activities` | Auth required | Full activities CRUD |
| `/en/dashboard/calendar` | Auth required | Full calendar CRUD |
| `/en/dashboard/venues` | Auth required | Full venues CRUD |
| `/en/dashboard/clients` | Auth required | Full clients CRUD |
| `/en/dashboard/settings` | Auth required | Account & settings |

All routes work with `/es`, `/fr`, `/ru` prefixes.

---

## Database Tables

| Table | Description |
|-------|-------------|
| `profiles` | User accounts (auto-created on sign-up) |
| `organizer_profiles` | Extended organizer info |
| `activities` | Activity offerings |
| `venues` | Activity locations |
| `clients` | Client contacts |
| `calendar_events` | Scheduled events |

All tables have Row Level Security — users can only access their own data.
