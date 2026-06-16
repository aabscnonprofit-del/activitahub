'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Vendor } from '@/lib/types'

// Provider Profiles (Vendor Network foundation, migration 029). Organizer-owned,
// owner-scoped CRUD — mirrors lib/actions/clients.ts. RLS enforces ownership; the
// explicit .eq('organizer_id', user.id) is defence in depth. No sourcing/quoting here.

const str = (v: FormDataEntryValue | null): string | null => {
  const s = (v as string)?.trim()
  return s || null
}
const list = (raw: FormDataEntryValue | null): string[] =>
  ((raw as string) ?? '').split(',').map((s) => s.trim()).filter(Boolean)

export async function getVendors(): Promise<Vendor[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('vendors')
    .select('*')
    .eq('organizer_id', user.id)
    .order('created_at', { ascending: false })

  return (data ?? []) as Vendor[]
}

export async function createVendor(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const name = str(formData.get('name'))
  if (!name) return

  await supabase.from('vendors').insert({
    organizer_id: user.id,
    name,
    company_name: str(formData.get('company_name')),
    email: str(formData.get('email')),
    phone: str(formData.get('phone')),
    city: str(formData.get('city')),
    country: str(formData.get('country')),
    languages: list(formData.get('languages')),
    capabilities: formData.getAll('capabilities').map(String).filter(Boolean),
    description: str(formData.get('description')),
  })

  revalidatePath('/dashboard/vendors')
}

export async function updateVendor(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const name = str(formData.get('name'))
  if (!name) return

  await supabase
    .from('vendors')
    .update({
      name,
      company_name: str(formData.get('company_name')),
      email: str(formData.get('email')),
      phone: str(formData.get('phone')),
      city: str(formData.get('city')),
      country: str(formData.get('country')),
      languages: list(formData.get('languages')),
      capabilities: formData.getAll('capabilities').map(String).filter(Boolean),
      description: str(formData.get('description')),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organizer_id', user.id)

  revalidatePath('/dashboard/vendors')
}

export async function deleteVendor(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('vendors').delete().eq('id', id).eq('organizer_id', user.id)

  revalidatePath('/dashboard/vendors')
}
