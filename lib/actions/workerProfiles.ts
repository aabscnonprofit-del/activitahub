'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import type { WorkerProfile } from '@/lib/types'

// ── Worker Profiles actions (migration 031) ─────────────────────────────────
// Workers own their profile (self-registered = claimed). Self-service CRUD is
// owner-scoped via RLS. Organizers may add UNCLAIMED profiles through the dedupe
// RPC (add_worker) — they reference, never own. No staffing / search / invites here.

const str = (v: FormDataEntryValue | null): string | null => {
  const s = (v as string)?.trim()
  return s || null
}
const list = (raw: FormDataEntryValue | null): string[] =>
  ((raw as string) ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const cents = (raw: FormDataEntryValue | null): number | null => {
  const v = (raw as string)?.trim()
  if (!v) return null
  const n = Math.round(parseFloat(v) * 100)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Load the current user's worker profile (RLS owner-scoped), or null. */
export async function getMyWorkerProfile(): Promise<WorkerProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('worker_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return (data as WorkerProfile) ?? null
}

/**
 * Create or update the caller's own worker profile (self-registration = claimed).
 * Before creating, claims any unclaimed profile matching the account email (dedupe),
 * so an organizer-added unclaimed record is taken over rather than duplicated. The
 * account email is the identity/dedupe anchor; it is not a form field.
 */
export async function upsertMyWorkerProfile(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const displayName = str(formData.get('display_name'))
  if (!displayName) return

  const patch = {
    display_name: displayName,
    roles: formData.getAll('roles').map(String).filter(Boolean),
    city: str(formData.get('city')),
    country: str(formData.get('country')),
    languages: list(formData.get('languages')),
    pay_rate_cents: cents(formData.get('pay_rate')),
    bio: str(formData.get('bio')),
    available: formData.get('available') === 'on',
    published: formData.get('published') === 'on',
  }

  // Claim any unclaimed profile matching my email (no-op if I already own one).
  await supabase.rpc('claim_worker_by_email')

  const existing = await getMyWorkerProfile()
  if (existing) {
    await supabase.from('worker_profiles').update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', existing.id).eq('user_id', user.id)
  } else {
    const emailNorm = (user.email ?? '').trim().toLowerCase()
    if (!emailNorm) return // no account email → cannot anchor identity/dedupe
    await supabase.from('worker_profiles').insert({
      user_id: user.id,
      status: 'claimed',
      email_normalized: emailNorm,
      email: user.email ?? null,
      ...patch,
    })
  }

  revalidatePath('/dashboard/worker-profile')
}

/** Toggle whether the caller's profile is listed for organizers (publish). */
export async function setMyWorkerPublished(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('worker_profiles')
    .update({ published: formData.get('published') === 'true', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  revalidatePath('/dashboard/worker-profile')
}

/** Toggle the caller's availability for work. */
export async function setMyWorkerAvailability(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('worker_profiles')
    .update({ available: formData.get('available') === 'true', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  revalidatePath('/dashboard/worker-profile')
}

/**
 * Organizer adds a worker (dedupe by normalized email → reuse or create UNCLAIMED).
 * The organizer references the profile; they do not own it. Returns the profile id,
 * or null on failure. Entitlement-gated. (No dedicated UI in this slice.)
 */
export async function addWorkerFromOrganizer(formData: FormData): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (!(await userHasOrganizerAccess(supabase, user.id))) return null

  const { data, error } = await supabase.rpc('add_worker', {
    p_name: str(formData.get('name')) ?? '',
    p_email: str(formData.get('email')) ?? '',
    p_phone: str(formData.get('phone')) ?? '',
    p_role: str(formData.get('role')) ?? '',
  })
  if (error) return null
  return (data as string) ?? null
}
