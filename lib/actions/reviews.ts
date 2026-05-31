'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Customer leaves a review. The DB function create_review() enforces that the
 * booking is the caller's and is 'completed', and that no review exists yet
 * (anti-duplicate). Returns nothing; errors surface to the form boundary.
 */
export async function createReview(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const bookingId = formData.get('booking_id') as string
  const rating = parseInt((formData.get('rating') as string) || '0', 10)
  const comment = (formData.get('comment') as string)?.trim() || null
  if (!bookingId || !rating) return

  await supabase.rpc('create_review', {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment,
  })
  revalidatePath('/bookings')
}
