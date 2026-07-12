import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrganizer } from '@/lib/marketplace/queries'
import { getOrganizerPublicPageData } from '@/lib/organizer/public-presence'
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

  // One shared projection powers BOTH public organizer routes (/organizers/[id] and /o/[slug]) so the page is
  // identical however it was reached: current + completed public activities, participants hosted, written
  // participant feedback, avatar, and categories — facts only, no ratings/scores/reputation.
  const data = await getOrganizerPublicPageData(org)

  return (
    <OrganizerPublicView
      locale={locale}
      org={org}
      activities={data.activities}
      completedActivities={data.completedActivities}
      reviewFacts={data.reviewFacts}
      participantsHosted={data.participantsHosted}
      avatarUrl={data.avatarUrl}
      categories={data.categories}
      isAuthenticated={!!user}
    />
  )
}
