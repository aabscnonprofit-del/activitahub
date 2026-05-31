import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientsClient from '@/components/dashboard/ClientsClient'
import type { Client } from '@/lib/types'

type Props = { params: Promise<{ locale: string }> }

export default async function ClientsPage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('organizer_id', user.id)
    .order('full_name', { ascending: true })

  return <ClientsClient initialClients={(data ?? []) as Client[]} locale={locale} />
}
