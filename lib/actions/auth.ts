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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: absoluteUrl(
        `/api/auth/callback?next=/${locale}/onboarding`
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

  if (!profile) {
    // Profile not yet created (trigger may still be running) — go to onboarding
    redirect(`/${locale}/onboarding`)
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

  redirect(`/${locale}/onboarding`)
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
export async function signInWithGoogle(locale: string): Promise<void> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: absoluteUrl(`/api/auth/callback?next=/${locale}/onboarding`),
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
