'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Profile, ProfileFormState, OnboardingPath } from '@/lib/types'

// ── Organizer profile upsert ──────────────────────────────────────────────────

export async function upsertOrganizerProfile(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) throw new Error('Not authenticated')

  const languagesRaw = (formData.get('languages') as string) ?? ''
  const languages = languagesRaw
    ? languagesRaw.split(',').map((l) => l.trim()).filter(Boolean)
    : []

  const { error } = await supabase
    .from('organizer_profiles')
    .upsert({
      user_id: user.id,
      display_name: (formData.get('display_name') as string) || null,
      bio: (formData.get('bio') as string) || null,
      city: (formData.get('city') as string) || null,
      country: (formData.get('country') as string) || null,
      languages,
      phone: (formData.get('phone') as string) || null,
      website: (formData.get('website') as string) || null,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/profile')
}

// ── Validation schemas ────────────────────────────────────────────────────────

const selectPathSchema = z.object({
  path: z.enum(['beginner', 'experienced']),
  locale: z.string().min(2).max(5),
})

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches the current user's profile.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) return null

  return data as Profile
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Records the user's chosen onboarding path (beginner or experienced).
 * Advances onboarding_status to 'path_selected'.
 * Called when the user clicks a path card on /onboarding.
 */
export async function selectOnboardingPath(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const raw = {
    path: formData.get('path'),
    locale: formData.get('locale') ?? 'en',
  }

  const parsed = selectPathSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Invalid path selection.' }
  }

  const { path } = parsed.data

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      selected_path: path as OnboardingPath,
      onboarding_status: 'path_selected',
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/onboarding')

  return {}
}
