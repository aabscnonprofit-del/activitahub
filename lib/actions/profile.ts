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

  // Normalise the requested slug; the DB trigger re-normalises and the unique
  // index enforces uniqueness. Reserved/blank slugs are omitted so the existing
  // (or auto-generated) slug is preserved.
  const RESERVED_SLUGS = new Set([
    'admin', 'api', 'auth', 'dashboard', 'marketplace', 'pricing', 'onboarding',
    'account', 'academy', 'requests', 'bookings', 'notifications', 'o',
    'organizers', 'sign-in', 'sign-up', 'billing', 'reset-password', 'verify',
    'privacy-policy', 'terms-of-service', 'settings', 'profile', 'calendar',
    'clients', 'venues', 'proposals', 'analytics',
  ])
  const slug = ((formData.get('slug') as string) || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const cap = (v: FormDataEntryValue | null, n: number): string | null => {
    const s = typeof v === 'string' ? v.trim() : ''
    return s ? s.slice(0, n) : null
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    display_name: cap(formData.get('display_name'), 120),
    bio: cap(formData.get('bio'), 2000),
    city: cap(formData.get('city'), 120),
    country: cap(formData.get('country'), 120),
    languages: languages.slice(0, 12),
    phone: cap(formData.get('phone'), 40),
    website: cap(formData.get('website'), 300),
  }
  if (slug && !RESERVED_SLUGS.has(slug)) payload.slug = slug.slice(0, 80)

  // Saving the organizer profile makes the public Organizer Page live: the public-page RPCs require
  // organizer_profiles.status = 'published'. Without this, a profile stays at its 'draft' default forever
  // and the page 404s. Guard: never override an admin 'suspended' status (no self-unsuspend).
  const { data: existing } = await supabase
    .from('organizer_profiles')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  if ((existing as { status?: string } | null)?.status !== 'suspended') {
    payload.status = 'published'
  }

  const { error } = await supabase
    .from('organizer_profiles')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) {
    console.error('[upsertOrganizerProfile] failed:', error.message)
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/profile')
}

/**
 * Upload the organizer's public avatar photo (identity / trust element on the public Organizer Page).
 * Reuses the existing public `venue-photos` bucket under the owner's own folder (RLS: first path segment
 * must equal auth.uid()), then stores the public URL on profiles.avatar_url (owner-updatable). No new
 * persistence or bucket. Called from the profile editor.
 */
export async function uploadOrganizerAvatar(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) return
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Image is too large (max 5 MB).')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${user.id}/avatar-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('venue-photos')
    .upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (upErr) throw new Error(upErr.message)

  const { data: pub } = supabase.storage.from('venue-photos').getPublicUrl(path)
  const { error } = await supabase.from('profiles').update({ avatar_url: pub.publicUrl }).eq('id', user.id)
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
