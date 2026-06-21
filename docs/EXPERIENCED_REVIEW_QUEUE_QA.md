# Experienced Organizer Review Queue — Manual QA

DB/auth-bound (SQL RPCs + server actions), so this is verified manually, not by the
OPE-style unit suites. Run after migration `037` is applied. Replace `<uid>` / `<admin_uid>`
with real `profiles.id` values.

## 0. Bootstrap (V1: manual admin by SQL — accepted)
```sql
UPDATE profiles SET role = 'admin' WHERE id = '<admin_uid>';
```

## 1. Submit → under_review
- As an `experienced`-path user, open `/onboarding/experienced`, submit the form (links optional).
- Expect the **Under Review** screen.
```sql
SELECT status, activate_after, activated_at FROM experienced_applications WHERE profile_id = '<uid>';
-- status = under_review, activate_after = ~now()+1h, activated_at = NULL
```

## 2. Lazy activation after the window (V1: accepted, on-read)
```sql
UPDATE experienced_applications SET activate_after = NOW() - INTERVAL '1 minute' WHERE profile_id = '<uid>';
```
- Reload `/onboarding/experienced`. Expect **Activated** + the certification checkout (`path="experienced"`).
- `get_experienced_application` never returns `activate_after` (internal).

## 3. B1 payment gate
- Pre-activation: `createCertificationCheckout(path='experienced')` must NOT open checkout — it
  redirects back to `/onboarding/experienced`. Only an `activated` status allows checkout.

## 4. Admin decisions
```sql
SELECT admin_review_experienced_application('<uid>', 'approve');   -- → approved, activate_after = now() → next get flips to activated
SELECT admin_review_experienced_application('<uid>', 'reject');    -- → rejected
SELECT admin_review_experienced_application('<uid>', 'redirect');  -- → redirected AND profiles.selected_path = 'beginner'
```
- Non-admin caller → `not_admin`. Unknown decision → `invalid_decision`. Missing row → `application_not_found`.
- After `redirect`, visiting `/onboarding/experienced` bounces to `/onboarding` (guard; no `redirected` screen — by design).

## 5. Rejection durability (the closure rule)
- After a `reject` (step 4), re-submit the form as the same user.
```sql
SELECT status, activate_after FROM experienced_applications WHERE profile_id = '<uid>';
-- status = under_review, activate_after = NULL  (does NOT auto-activate)
```
- Reload after any time passes → stays **Under Review** (no lazy activation, `activate_after IS NULL`).
- Only `admin ... 'approve'` sets `activate_after = now()`, after which the next read activates.
- Contrast: a re-submit from a non-rejected prior state keeps the normal `now()+1h` window.

## 6. Path guard
- A non-`experienced` user hitting `/onboarding/experienced` → redirected to `/onboarding`.
- `not_experienced_path` is raised if `submit_experienced_application` is called off-path.
