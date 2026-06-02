import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrganizer, getOrganizerReviews } from '@/lib/marketplace/queries'
import { OrganizerProfileView } from '@/components/organizer/OrganizerProfileView'
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
  const reviews = await getOrganizerReviews(supabase, org.id)

  return (
    <OrganizerProfileView
      locale={locale}
      org={org}
      reviews={reviews}
      isAuthenticated={!!user}
    />
  )
}
