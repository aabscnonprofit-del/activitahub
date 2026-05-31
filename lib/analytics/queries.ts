import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import type { OrganizerAnalytics, PlatformAnalytics, CustomerStats } from '@/lib/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function getOrganizerAnalytics(
  sb: SupabaseServerClient,
  organizerId: string
): Promise<OrganizerAnalytics | null> {
  const { data } = await sb.rpc('organizer_analytics', { p_organizer_id: organizerId })
  return (data as OrganizerAnalytics | null) ?? null
}

export async function getPlatformAnalytics(
  sb: SupabaseServerClient
): Promise<PlatformAnalytics | null> {
  const { data } = await sb.rpc('platform_analytics')
  return (data as PlatformAnalytics | null) ?? null
}

export async function getCustomerStats(
  sb: SupabaseServerClient
): Promise<CustomerStats | null> {
  const { data } = await sb.rpc('customer_stats')
  return (data as CustomerStats | null) ?? null
}
