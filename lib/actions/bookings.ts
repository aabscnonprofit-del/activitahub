'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function transition(formData: FormData, fn: 'cancel_booking' | 'complete_booking' | 'refund_booking') {
  const supabase = await createClient()
  const id = formData.get('booking_id') as string
  if (!id) return
  await supabase.rpc(fn, { p_booking_id: id })
  revalidatePath('/bookings')
  revalidatePath('/dashboard/bookings')
  revalidatePath('/dashboard')
}

export async function cancelBooking(formData: FormData): Promise<void> {
  await transition(formData, 'cancel_booking')
}
export async function completeBooking(formData: FormData): Promise<void> {
  await transition(formData, 'complete_booking')
}
export async function refundBooking(formData: FormData): Promise<void> {
  await transition(formData, 'refund_booking')
}
