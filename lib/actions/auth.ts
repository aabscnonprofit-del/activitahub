'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/utils'
import type { AuthFormState } from '@/lib/types'

// ── Validation schemas ────────────────────────────────────────────────────────

const signUpSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  locale: z.string(),
})

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  locale: z.string(),
})

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  locale: z.string(),
})

/**
 * Validate a post-auth `next` destination. Only same-origin absolute paths are
 * allowed; anything else falls back to the participant home (`/account`).
 * This is how organizer *intent* is carried — organizer CTAs pass
 * `next=/<locale>/onboarding`; ordinary participants pass nothing.
 */
function safeNext(next: FormDataEntryValue | string | null, locale: string): string {
  const s = typeof next === 'string' ? next : ''
  if (s.startsWith('/') && !s.startsWith('//')) return s
  return `/${locale}/account`
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Creates a new user account via email/password.
 * On success, returns { success: true, email } — the UI shows a "check email" message.
 * The user must click the confirmation link before they can sign in.
 */
export async function signUp(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const raw = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    locale: formData.get('locale') ?? 'en',
  }

  const parsed = signUpSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return { error: firstError?.message ?? 'Invalid form data' }
  }

  const { fullName, email, password, locale } = parsed.data
  const supabase = await createClient()

  // Default new users are participants → land on /account after confirmation.
  // Organizer-intent sign-ups carry next=/<locale>/onboarding.
  const dest = safeNext(formData.get('next'), locale)

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: absoluteUrl(
        `/api/auth/callback?next=${encodeURIComponent(dest)}`
      ),
    },
  })

  if (error) {
    // Supabase returns a generic message for existing accounts (security best practice)
    // We surface a user-friendly message
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('already exists')
    ) {
      return { error: 'An account with this email already exists.' }
    }
    return { error: error.message }
  }

  return { success: true, email }
}

/**
 * Signs in with email/password.
 * On success, redirects to the appropriate page based on user state.
 * On failure, returns { error }.
 */
export async function signIn(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    locale: formData.get('locale') ?? 'en',
  }

  const parsed = signInSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return { error: firstError?.message ?? 'Invalid form data' }
  }

  const { email, password, locale } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Invalid email or password. Please try again.' }
  }

  // Determine where to redirect based on user profile state
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_status, suspended')
    .eq('id', data.user.id)
    .single()

  // Default destination = participant home, unless an organizer-intent `next`
  // was provided (e.g. signing in to reach /onboarding).
  const dest = safeNext(formData.get('next'), locale)

  if (!profile) {
    // Profile not yet created (trigger may still be running) — participant home.
    redirect(dest)
  }

  if (profile.suspended) {
    await supabase.auth.signOut()
    return { error: 'Your account has been suspended. Contact support.' }
  }

  if (profile.role === 'admin') {
    redirect(`/${locale}/admin`)
  }

  if (
    profile.role === 'certified_organizer' &&
    profile.onboarding_status === 'subscribed'
  ) {
    redirect(`/${locale}/dashboard`)
  }

  if (profile.onboarding_status === 'certified') {
    // Certified but not yet subscribed
    redirect(`/${locale}/billing`)
  }

  // Organizer path already in progress (a path was chosen) → resume onboarding.
  if (profile.onboarding_status && profile.onboarding_status !== 'not_started') {
    redirect(`/${locale}/onboarding`)
  }

  // Pure participant (or explicit organizer intent via `next`).
  redirect(dest)
}

/**
 * Signs the current user out and redirects to the sign-in page.
 * Accepts locale as a bound argument.
 */
export async function signOut(locale: string): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/${locale}/sign-in`)
}

/**
 * Initiates Google OAuth sign-in flow.
 */
export async function signInWithGoogle(locale: string, next?: string): Promise<void> {
  const supabase = await createClient()

  const dest = safeNext(next ?? null, locale)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: absoluteUrl(`/api/auth/callback?next=${encodeURIComponent(dest)}`),
    },
  })

  if (error) {
    redirect(`/${locale}/auth/sign-in?error=${encodeURIComponent(error.message)}`)
  }

  if (data.url) {
    redirect(data.url)
  }
}

/**
 * Sends a password reset email.
 */
export async function resetPassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const raw = {
    email: formData.get('email'),
    locale: formData.get('locale') ?? 'en',
  }

  const parsed = resetPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return { error: firstError?.message ?? 'Invalid email' }
  }

  const { email, locale } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: absoluteUrl(
      `/api/auth/callback?next=/${locale}/account/update-password`
    ),
  })

  if (error) {
    return { error: error.message }
  }

  // Always return success (don't reveal whether the email exists)
  return { success: true, email }
}
