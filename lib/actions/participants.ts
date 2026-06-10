'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import { sendWebPush } from '@/lib/alerts/push'
import type { ParticipantStatus } from '@/lib/types'

type Result = { ok: boolean; error?: string }

async function authedOrganizer() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  if (!(await userHasOrganizerAccess(supabase, user.id))) return null
  return { supabase, userId: user.id }
}

/** Verify the activity belongs to the organizer. */
async function ownsActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  activityId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('activities')
    .select('id')
    .eq('id', activityId)
    .eq('organizer_id', userId)
    .maybeSingle()
  return !!data
}

export async function addParticipant(
  activityId: string,
  input: { full_name: string; email?: string; phone?: string; notes?: string },
): Promise<Result> {
  const ctx = await authedOrganizer()
  if (!ctx) return { ok: false, error: 'forbidden' }
  const name = (input.full_name || '').trim().slice(0, 160)
  if (!name) return { ok: false, error: 'name_required' }
  if (!(await ownsActivity(ctx.supabase, ctx.userId, activityId))) return { ok: false, error: 'forbidden' }
  try {
    const { error } = await ctx.supabase.from('participants').insert({
      activity_id: activityId,
      organizer_id: ctx.userId,
      full_name: name,
      email: (input.email || '').trim().slice(0, 200) || null,
      phone: (input.phone || '').trim().slice(0, 60) || null,
      notes: (input.notes || '').trim().slice(0, 2000) || null,
      source: 'manual',
    })
    if (error) return { ok: false, error: 'db' }
  } catch {
    return { ok: false, error: 'db' }
  }
  revalidatePath(`/dashboard/activities/${activityId}/participants`)
  return { ok: true }
}

export async function setParticipantStatus(id: string, status: ParticipantStatus): Promise<Result> {
  const ctx = await authedOrganizer()
  if (!ctx) return { ok: false, error: 'forbidden' }
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'checked_in') patch.checked_in_at = new Date().toISOString()
  try {
    const { error } = await ctx.supabase
      .from('participants')
      .update(patch)
      .eq('id', id)
      .eq('organizer_id', ctx.userId)
    if (error) return { ok: false, error: 'db' }
  } catch {
    return { ok: false, error: 'db' }
  }
  return { ok: true }
}

export async function deleteParticipant(id: string): Promise<Result> {
  const ctx = await authedOrganizer()
  if (!ctx) return { ok: false, error: 'forbidden' }
  try {
    await ctx.supabase.from('participants').delete().eq('id', id).eq('organizer_id', ctx.userId)
  } catch {
    return { ok: false, error: 'db' }
  }
  return { ok: true }
}

/** Import the activity's marketplace bookings as confirmed participants (deduped). */
export async function importBookingsAsParticipants(activityId: string): Promise<Result & { added?: number }> {
  const ctx = await authedOrganizer()
  if (!ctx) return { ok: false, error: 'forbidden' }
  if (!(await ownsActivity(ctx.supabase, ctx.userId, activityId))) return { ok: false, error: 'forbidden' }
  try {
    const { data: bookings } = await ctx.supabase
      .from('bookings')
      .select('customer_id')
      .eq('activity_id', activityId)
      .eq('organizer_id', ctx.userId)
    const customerIds = [...new Set(((bookings ?? []) as { customer_id: string }[]).map((b) => b.customer_id))]
    if (!customerIds.length) return { ok: true, added: 0 }

    const { data: existing } = await ctx.supabase
      .from('participants')
      .select('profile_id')
      .eq('activity_id', activityId)
      .not('profile_id', 'is', null)
    const have = new Set(((existing ?? []) as { profile_id: string }[]).map((p) => p.profile_id))
    const toAdd = customerIds.filter((id) => !have.has(id))
    if (!toAdd.length) return { ok: true, added: 0 }

    const { data: profiles } = await ctx.supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', toAdd)
    const profMap = new Map(((profiles ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => [p.id, p]))

    const rows = toAdd.map((id) => ({
      activity_id: activityId,
      organizer_id: ctx.userId,
      profile_id: id,
      full_name: profMap.get(id)?.full_name || 'Guest',
      email: profMap.get(id)?.email || null,
      status: 'confirmed' as const,
      source: 'booking' as const,
    }))
    const { error } = await ctx.supabase.from('participants').insert(rows)
    if (error) return { ok: false, error: 'db' }
    revalidatePath(`/dashboard/activities/${activityId}/participants`)
    return { ok: true, added: rows.length }
  } catch {
    return { ok: false, error: 'db' }
  }
}

export async function saveReminderOffsets(activityId: string, offsetsHours: number[]): Promise<Result> {
  const ctx = await authedOrganizer()
  if (!ctx) return { ok: false, error: 'forbidden' }
  const clean = [...new Set(offsetsHours.filter((n) => Number.isFinite(n) && n > 0 && n <= 8760))].sort((a, b) => b - a).slice(0, 6)
  try {
    await ctx.supabase
      .from('activities')
      .update({ reminder_offsets_hours: clean })
      .eq('id', activityId)
      .eq('organizer_id', ctx.userId)
  } catch {
    return { ok: false, error: 'db' }
  }
  return { ok: true }
}

/** Send an event update to every linked participant (in-app + best-effort push). */
export async function sendEventUpdate(activityId: string, message: string): Promise<Result & { notified?: number }> {
  const ctx = await authedOrganizer()
  if (!ctx) return { ok: false, error: 'forbidden' }
  const msg = (message || '').trim().slice(0, 2000)
  if (!msg) return { ok: false, error: 'empty' }
  if (!(await ownsActivity(ctx.supabase, ctx.userId, activityId))) return { ok: false, error: 'forbidden' }

  // Record the update (organizer-scoped).
  try {
    await ctx.supabase.from('activity_updates').insert({ activity_id: activityId, organizer_id: ctx.userId, message: msg })
  } catch {
    /* table missing — still attempt to notify */
  }

  // Fan out to linked participants via the existing notification system.
  let notified = 0
  try {
    const admin = createServiceClient()
    const { data: act } = await admin.from('activities').select('title').eq('id', activityId).single()
    const title = (act as { title?: string } | null)?.title || 'Activity update'
    const { data: parts } = await admin
      .from('participants')
      .select('profile_id')
      .eq('activity_id', activityId)
      .not('profile_id', 'is', null)
      .in('status', ['invited', 'confirmed', 'maybe'])
    const ids = [...new Set(((parts ?? []) as { profile_id: string }[]).map((p) => p.profile_id))]
    for (const pid of ids) {
      await admin.from('notifications').insert({
        profile_id: pid,
        type: 'event_update',
        title,
        body: msg,
        data: { activity_id: activityId, update: true },
      })
      notified++
    }
    // Best-effort web push.
    if (ids.length) {
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .in('profile_id', ids)
      for (const s of (subs ?? []) as { endpoint: string; p256dh: string; auth: string }[]) {
        await sendWebPush([s], { title, body: msg, url: `/en/marketplace/${activityId}` })
      }
    }
  } catch {
    /* alerts/notifications unavailable — update was still recorded if possible */
  }

  revalidatePath(`/dashboard/activities/${activityId}/participants`)
  return { ok: true, notified }
}

/** Public RSVP response (token-based). No auth required. */
export async function respondToRsvp(
  token: string,
  response: 'confirmed' | 'maybe' | 'declined',
): Promise<{ ok: boolean; status?: string; activity_title?: string; error?: string }> {
  if (!token) return { ok: false, error: 'invalid' }
  const supabase = await createClient()
  try {
    const { data, error } = await supabase.rpc('rsvp_respond', { p_token: token, p_response: response })
    if (error) return { ok: false, error: 'db' }
    return (data as { ok: boolean; status?: string; activity_title?: string }) ?? { ok: false }
  } catch {
    return { ok: false, error: 'db' }
  }
}
