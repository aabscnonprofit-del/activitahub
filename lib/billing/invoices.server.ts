import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Invoice } from '@/lib/types'

// Read-only invoice loaders (migration 036). RLS-scoped via the caller's client:
// the organizer owner and the named customer may read their own rows; nothing else
// is visible. No writes, no Stripe, no token/public access here (that is the
// invoice_lookup RPC, a later commit).

/** Invoices raised against a plan, newest first. Empty when unauthenticated. */
export async function getInvoicesForPlan(planId: string): Promise<Invoice[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })

  return (data ?? []) as Invoice[]
}

/** Invoices raised against a booking, newest first. Empty when unauthenticated. */
export async function getInvoicesForBooking(bookingId: string): Promise<Invoice[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })

  return (data ?? []) as Invoice[]
}

/** A single invoice by id (RLS owner/customer-scoped), or null. */
export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  return (data as Invoice) ?? null
}
