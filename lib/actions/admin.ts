'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** Admin: approve/reject a review (DB function enforces is_admin). */
export async function moderateReview(formData: FormData): Promise<void> {
  const reviewId = formData.get('review_id') as string
  const status = formData.get('status') as string
  if (!reviewId || !status) return
  const supabase = await createClient()
  await supabase.rpc('moderate_review', { p_review_id: reviewId, p_status: status })
  revalidatePath('/admin/reviews')
}

/** Admin: suspend / unsuspend an organizer. */
export async function setSuspended(formData: FormData): Promise<void> {
  const userId = formData.get('user_id') as string
  const suspended = formData.get('suspended') === 'true'
  if (!userId) return
  const supabase = await createClient()
  await supabase.rpc('admin_set_suspended', { p_user_id: userId, p_suspended: suspended })
  revalidatePath('/admin/organizers')
}
