'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProject, publishProject } from '@/lib/projects/store'

// Project actions — thin server-action surface over the Project Service (lib/projects/store).
// Business logic / ownership stays in the service + RLS; actions only authenticate, delegate, revalidate.

export interface PublishResult {
  ok: boolean
  error?: 'not_authenticated' | 'not_authorized' | 'publish_failed'
}

/**
 * Publish a Project (Publish Flow). Owner-only and idempotent:
 *  - the caller must be authenticated and own the Project (getProject is RLS owner-scoped);
 *  - publishing sets `projects.is_published = true` via the Project Service and nothing else;
 *  - re-publishing an already-published Project is a no-op success.
 */
export async function publishProjectAction(projectId: string, locale: string): Promise<PublishResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not_authenticated' }

  // Ownership: getProject returns null unless the caller owns the Project (owner RLS).
  const project = await getProject(supabase, projectId)
  if (!project) return { ok: false, error: 'not_authorized' }

  const ok = await publishProject(supabase, projectId)
  if (!ok) return { ok: false, error: 'publish_failed' }

  revalidatePath(`/${locale}/dashboard/projects/${projectId}`)
  revalidatePath(`/${locale}/p/${projectId}`)
  return { ok: true }
}
