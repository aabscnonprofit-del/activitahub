'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Client } from '@/lib/types'

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  return (data ?? []) as Client[]
}

export async function createClientRecord(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const fullName = (formData.get('full_name') as string)?.trim()
  if (!fullName) return

  await supabase.from('clients').insert({
    organizer_id: user.id,
    full_name: fullName,
    email: (formData.get('email') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
  })

  revalidatePath('/dashboard/clients')
}

export async function updateClientRecord(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const fullName = (formData.get('full_name') as string)?.trim()
  if (!fullName) return

  await supabase
    .from('clients')
    .update({
      full_name: fullName,
      email: (formData.get('email') as string)?.trim() || null,
      phone: (formData.get('phone') as string)?.trim() || null,
      notes: (formData.get('notes') as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organizer_id', user.id)

  revalidatePath('/dashboard/clients')
}

export async function deleteClientRecord(id: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('clients').delete().eq('id', id).eq('organizer_id', user.id)

  revalidatePath('/dashboard/clients')
}
