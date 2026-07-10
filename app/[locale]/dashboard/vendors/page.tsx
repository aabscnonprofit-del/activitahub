import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VendorsClient from '@/components/dashboard/VendorsClient'
import type { Vendor } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function VendorsPage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const { data } = await supabase
    .from('vendors')
    .select('*')
    .eq('organizer_id', user.id)
    .order('name', { ascending: true })

  return <VendorsClient initialVendors={(data ?? []) as Vendor[]} locale={locale} />
}
