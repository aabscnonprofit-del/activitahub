'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const BUCKET = 'venue-photos'

export type VenuePhotoResult =
  | { ok: true; id: string; storage_path: string; url: string }
  | { ok: false; error: string }

/**
 * Uploads a venue photo to Supabase Storage and records it in venue_photos.
 * Storage RLS confines writes to the owner's "<uid>/..." folder; the DB row is
 * RLS-scoped to organizer_id = auth.uid(). Returns the new photo for the UI.
 */
export async function uploadVenuePhoto(formData: FormData): Promise<VenuePhotoResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const venueId = formData.get('venueId') as string
  const file = formData.get('file') as File | null
  if (!venueId || !file || file.size === 0) return { ok: false, error: 'Missing file' }

  // Confirm the venue belongs to this organizer (defence in depth; RLS also enforces).
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', venueId)
    .eq('organizer_id', user.id)
    .maybeSingle()
  if (!venue) return { ok: false, error: 'Venue not found' }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${user.id}/${venueId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (uploadError) return { ok: false, error: uploadError.message }

  const { data: row, error: insertError } = await supabase
    .from('venue_photos')
    .insert({ venue_id: venueId, organizer_id: user.id, storage_path: path })
    .select('id, storage_path')
    .single()

  if (insertError || !row) {
    // Roll back the orphaned object.
    await supabase.storage.from(BUCKET).remove([path])
    return { ok: false, error: insertError?.message ?? 'Could not save photo' }
  }

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  revalidatePath('/dashboard/venues')
  return { ok: true, id: row.id, storage_path: row.storage_path, url }
}

/** Removes a venue photo (storage object + DB row), owner-scoped. */
export async function deleteVenuePhoto(photoId: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: photo } = await supabase
    .from('venue_photos')
    .select('id, storage_path')
    .eq('id', photoId)
    .eq('organizer_id', user.id)
    .maybeSingle()
  if (!photo) return

  await supabase.storage.from(BUCKET).remove([(photo as { storage_path: string }).storage_path])
  await supabase.from('venue_photos').delete().eq('id', photoId).eq('organizer_id', user.id)

  revalidatePath('/dashboard/venues')
}
