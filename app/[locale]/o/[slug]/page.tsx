import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrganizerBySlug } from '@/lib/marketplace/queries'
import { getOrganizerPublicPageData } from '@/lib/organizer/public-presence'
import { OrganizerPublicView } from '@/components/organizer/OrganizerPublicView'
import { absoluteUrl } from '@/lib/utils'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface OrganizerSlugPageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: OrganizerSlugPageProps): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }
  const supabase = await createClient()
  const org = await getPublicOrganizerBySlug(supabase, slug)
  if (!org) return {}
  return {
    title: org.display_name ?? 'Organizer',
    alternates: { canonical: absoluteUrl(`/${locale}/o/${org.slug ?? slug}`) },
  }
}

export default async function OrganizerSlugPage({ params }: OrganizerSlugPageProps) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const org = await getPublicOrganizerBySlug(supabase, slug)
  if (!org) notFound()

  // Render the SAME consolidated public Organizer Page as /organizers/[id] — one consistent identity
  // regardless of which URL was followed (facts only: experience, current work, history, written feedback).
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
