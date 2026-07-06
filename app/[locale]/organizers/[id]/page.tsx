import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrganizer } from '@/lib/marketplace/queries'
import { listOrganizerPublicActivities } from '@/lib/activity-marketplace/cards'
import { OrganizerPublicView } from '@/components/organizer/OrganizerPublicView'
import { absoluteUrl, organizerHref } from '@/lib/utils'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface OrganizerPageProps {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: OrganizerPageProps): Promise<Metadata> {
  const { locale, id } = (await params) as { locale: Locale; id: string }
  const supabase = await createClient()
  const org = await getPublicOrganizer(supabase, id)
  if (!org) return {}
  // Canonical prefers the shareable slug URL.
  return {
    title: org.display_name ?? 'Organizer',
    alternates: { canonical: absoluteUrl(organizerHref(locale, org)) },
  }
}

export default async function OrganizerProfilePage({ params }: OrganizerPageProps) {
  const { locale, id } = (await params) as { locale: Locale; id: string }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const org = await getPublicOrganizer(supabase, id)
  if (!org) notFound()

  // The organizer's CURRENT public activities = their published Projects with visibility = 'public' (the same
  // public-safe Local Activities rule, scoped to this organizer). Private / published-private / draft-public
  // Projects never appear.
  const activities = await listOrganizerPublicActivities(id, new Date().toISOString())

  return (
    <OrganizerPublicView
      locale={locale}
      org={org}
      activities={activities}
      isAuthenticated={!!user}
    />
  )
}
