import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrganizer } from '@/lib/marketplace/queries'
import { partitionOrganizerActivities } from '@/lib/activity-marketplace/cards'
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

  // The organizer's public activities (published + visibility = 'public' + approved), partitioned into CURRENT
  // (upcoming/ongoing) and COMPLETED (every occurrence finished — a projection over occurrence timestamps). A
  // Project is in exactly one bucket. Private / published-private / draft-public Projects never appear.
  const { current, completed } = await partitionOrganizerActivities(id, new Date().toISOString())

  return (
    <OrganizerPublicView
      locale={locale}
      org={org}
      activities={current}
      completedActivities={completed}
      isAuthenticated={!!user}
    />
  )
}
