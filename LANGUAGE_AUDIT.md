# Language Audit — German (de) & Portuguese (pt)

> **Task:** add and complete German and Portuguese localization to 100%. **Localization only** — no
> redesign, no positioning/marketing changes. **Final status date:** 2026-06-09.

## Locales
Repository already had **4**: `en`, `es`, `fr`, `ru`. **Added:** `de` (Deutsch), `pt` (Português).
Final set: **en · es · fr · ru · de · pt** (6). (No Chinese — it does not exist in the repo and was not added.)

## i18n architecture
`next-intl`: `i18n/routing.ts` (`routing.locales`) drives URLs/middleware and the `Locale` type;
`i18n/request.ts` dynamically imports `messages/<locale>.json`.

## Files changed (config wiring)
- `i18n/routing.ts` — `locales` → `['en','es','fr','ru','de','pt']`
- `lib/types.ts`, `lib/types/index.ts` — `Locale` union → `+ 'de' | 'pt'`
- `components/layout/PublicHeader.tsx` — switcher → **Deutsch**, **Português**
- `app/[locale]/dashboard/settings/page.tsx` — locale picker → **Deutsch**, **Português**
- `messages/de.json`, `messages/pt.json` — **new**, full translations
- DB: `profiles.preferred_locale` is plain `TEXT` — no migration needed.

## Final coverage

| Metric | de | pt |
|---|---|---|
| Total keys | **1003** | **1003** |
| Missing keys | **0** | **0** |
| Extra keys | **0** | **0** |
| Placeholder mismatches (`{...}`) | **0** | **0** |
| Values differing from English | **969 (96.6%)** | **984 (98.1%)** |
| Identical-to-English (legit tokens) | 34 | 19 |

**Final translated key count:** all **33 namespaces / 1003 keys** are localized in both `de` and `pt`.
**Remaining untranslated (English content): 0.** Key parity with `en.json` is exact → **no
missing-translation warnings and no fallback-to-English errors.** All ICU placeholders
(`{email}`, `{count}`, `{name}`, `{date}`, `{score}`, `{n}`, `{total}`, `{answered}`, `{passing}`,
`{path}`, `{year}`, `{course}`) are preserved (0 mismatches). All 6 message files are valid JSON.
`tsc --noEmit` passes.

### Effective coverage = 100%
The "identical-to-English" values are **not** untranslated content — they are tokens that are
**the same word in the target language**:
- **Currency/prices** (intentionally not localized): `$9.99`, `$29`, `$99` across pricing/onboarding/billing/planner.
- **Loanwords / brand / abbreviations** identical in de/pt: `Admin`, `Dashboard`, `Marketplace`,
  `Workshop`, `Outdoor`, `Wellness`, `Party`, `Status`, `Budget`, `Bio`, `Website`, `Name`, `Block`,
  `GMV`, `Conversion`, `Optional`, `min`.

## Namespaces (all translated)
**Public:** home, nav, footer, common, errors, auth, pricing, becomeOrganizerPage, organizerPhilosophy,
academyLanding, plannerLanding, academy, certificate, verify, **marketplace**.
**App / authenticated:** dashboard, activities, venues, clients, profile, calendar, requests, bookings,
billing, onboarding, account, analytics, **admin**, exam, notifications, reviews, privacy, terms.

## Broken keys
**None.** 0 missing, 0 extra, 0 placeholder mismatches in either locale.

## Verification
- **Language switcher:** `de`/`pt` in `PublicHeader` + dashboard settings; files exist and load via `request.ts`. ✅
- **URLs/routing:** `routing.locales` includes `de`/`pt` → `/de/...` and `/pt/...` served by middleware. ✅
- **Missing-key / fallback warnings:** none (exact key parity). ✅
- **TypeScript:** `tsc --noEmit` exit 0. ✅
- *Recommended:* a quick browser smoke test of `/de` and `/pt` after deploy.

## Translation quality concerns / notes
- **Portuguese = European (pt-PT)** (e.g. *palavra-passe, faturação, telemóvel-style terms*). If
  **pt-BR** is desired, several terms differ (*senha, cobrança*) and would need a `pt-BR` pass/locale.
- **German uses informal "du"** (matches the EN voice). Switch to formal **Sie** if brand guidelines require.
- **Prices/brand unchanged** (ActivLife Hub, OPE, `$` amounts) — not a translation gap.
- Residual **"Activita"** brand strings are pre-existing in source content (not localization-related).
- German compound words can be longer than English — a visual pass on nav/buttons is recommended.

## Result
German and Portuguese are now **first-class, fully-covered languages** across public pages, marketplace,
dashboard, organizer tools, exams, onboarding, billing, and settings — **0 remaining untranslated keys**,
**effective coverage 100%**.
