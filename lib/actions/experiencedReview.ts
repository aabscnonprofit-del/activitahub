'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Experienced Organizer Review Queue — intake/triage BEFORE payment (B1 decision).
// Public links are optional supporting info only. Activation timing is internal: these
// actions never read/expose `activate_after`. No certification/exam logic here.

/** Applicant submits (or re-submits) their experienced application with optional links. */
export async function submitExperiencedApplication(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const get = (k: string) => {
    const v = (formData.get(k) as string | null)?.trim()
    return v && v.length ? v : null
  }
  await supabase.rpc('submit_experienced_application', {
    p_instagram: get('instagram'),
    p_facebook: get('facebook'),
    p_meetup: get('meetup'),
    p_linkedin: get('linkedin'),
    p_website: get('website'),
    p_portfolio: get('portfolio'),
  })

  revalidatePath(`/${locale}/onboarding/experienced`)
  redirect(`/${locale}/onboarding/experienced`)
}

/** Rejected applicant chooses the standard Academy (beginner) path instead. */
export async function switchToAcademyPath(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  await supabase
    .from('profiles')
    .update({ selected_path: 'beginner', onboarding_status: 'path_selected' })
    .eq('id', user.id)

  revalidatePath(`/${locale}/onboarding`)
  redirect(`/${locale}/onboarding`)
}

/** Admin: approve / reject / redirect an application (RPC enforces admin). */
export async function reviewExperiencedApplication(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const profileId = formData.get('profile_id') as string
  const decision = formData.get('decision') as string // 'approve' | 'reject' | 'redirect'
  const note = (formData.get('note') as string | null)?.trim() || null
  if (!profileId || !decision) return

  const supabase = await createClient()
  await supabase.rpc('admin_review_experienced_application', {
    p_profile_id: profileId,
    p_decision: decision,
    p_note: note,
  })

  revalidatePath(`/${locale}/admin/experienced`)
}
