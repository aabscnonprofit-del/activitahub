'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import { isFutureDate } from '@/lib/workers/age'
import type { WorkerProfile, AddWorkerOutcome } from '@/lib/types'

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
/** Normalize a <input type="date"> value to an ISO date string or null. */
const dateStr = (raw: FormDataEntryValue | null): string | null => {
  const s = (raw as string)?.trim()
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
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

  const locale = (formData.get('locale') as string) || 'en'
  const back = (err?: string) =>
    redirect(`/${locale}/dashboard/worker-profile${err ? `?error=${err}` : ''}`)

  const displayName = str(formData.get('display_name'))
  if (!displayName) return back('name_required')

  const roles = formData.getAll('roles').map(String).filter(Boolean)
  if (roles.length === 0) return back('roles_required') // roles required on the self profile

  const dob = dateStr(formData.get('date_of_birth'))
  if (isFutureDate(dob)) return back('dob_future') // DOB cannot be in the future

  const patch = {
    display_name: displayName,
    roles,
    gender: str(formData.get('gender')),
    date_of_birth: dob,
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
    if (!emailNorm) return back('no_account_email') // account has no email → cannot anchor identity/dedupe
    await supabase.from('worker_profiles').insert({
      user_id: user.id,
      status: 'claimed',
      email_normalized: emailNorm,
      email: user.email ?? null,
      ...patch,
    })
  }

  revalidatePath('/dashboard/worker-profile')
  back() // clean URL (clears any prior ?error) and reflects the save
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
 * List the UNCLAIMED workers this organizer added (the only worker rows RLS lets an
 * organizer read: created_by_organizer_id = self AND status='unclaimed'). Once a worker
 * claims their profile it leaves this list by design (trust patch 032) — claimed workers
 * are NOT exposed to the organizer. No search/directory; this is the organizer's own list.
 */
export async function getWorkersAddedByMe(): Promise<WorkerProfile[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('worker_profiles')
    .select('*')
    .eq('created_by_organizer_id', user.id)
    .eq('status', 'unclaimed')
    .order('created_at', { ascending: false })

  return (data ?? []) as WorkerProfile[]
}

/**
 * Organizer adds a worker (dedupe by normalized email → reuse or create UNCLAIMED).
 * The organizer references the profile; they do not own it. Returns { id, outcome }
 * (outcome ∈ created | reused_unclaimed | reused_claimed) — never the (possibly
 * claimed) worker's contact data — or null on failure. Entitlement-gated.
 */
export async function addWorkerFromOrganizer(formData: FormData): Promise<AddWorkerOutcome | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (!(await userHasOrganizerAccess(supabase, user.id))) return null

  const roles = formData.getAll('roles').map(String).filter(Boolean)
  if (roles.length === 0) return null // roles required when adding a worker
  const dob = dateStr(formData.get('date_of_birth'))
  if (isFutureDate(dob)) return null // DOB cannot be in the future (RPC also guards)

  const { data, error } = await supabase.rpc('add_worker', {
    p_name: str(formData.get('name')) ?? '',
    p_email: str(formData.get('email')) ?? '',
    p_phone: str(formData.get('phone')) ?? '',
    p_roles: roles,
    p_gender: str(formData.get('gender')),
    p_date_of_birth: dob,
  })
  if (error || !data) return null
  return data as AddWorkerOutcome
}

/**
 * Organizer correction: update an UNCLAIMED worker profile THEY created (mistake fix).
 * Only the allowed fields are touched — never email_normalized / status / user_id — and
 * the RPC no-ops on claimed rows or rows another organizer created. Returns true on
 * success. Entitlement-gated.
 */
export async function updateUnclaimedWorkerFromOrganizer(id: string, formData: FormData): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  if (!(await userHasOrganizerAccess(supabase, user.id))) return false

  const roles = formData.getAll('roles').map(String).filter(Boolean)
  if (roles.length === 0) return false // roles required
  const dob = dateStr(formData.get('date_of_birth'))
  if (isFutureDate(dob)) return false // DOB cannot be in the future (RPC also guards)

  const { data, error } = await supabase.rpc('update_unclaimed_worker', {
    p_id: id,
    p_display_name: str(formData.get('display_name')) ?? '',
    p_phone: str(formData.get('phone')),
    p_roles: roles,
    p_city: str(formData.get('city')),
    p_country: str(formData.get('country')),
    p_languages: list(formData.get('languages')),
    p_pay_rate_cents: cents(formData.get('pay_rate')),
    p_bio: str(formData.get('bio')),
    p_gender: str(formData.get('gender')),
    p_date_of_birth: dob,
  })
  if (error || !data) return false
  return (data as { ok?: boolean }).ok === true
}

/**
 * Organizer correction: delete an UNCLAIMED worker profile THEY created (typo cleanup).
 * No-ops on claimed rows or rows another organizer created. Entitlement-gated.
 */
export async function deleteUnclaimedWorkerFromOrganizer(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  if (!(await userHasOrganizerAccess(supabase, user.id))) return false

  const { data, error } = await supabase.rpc('delete_unclaimed_worker', { p_id: id })
  if (error || !data) return false
  return (data as { ok?: boolean }).ok === true
}
