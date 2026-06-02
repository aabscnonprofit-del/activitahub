import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrganizerBySlug, getOrganizerReviews } from '@/lib/marketplace/queries'
import { OrganizerProfileView } from '@/components/organizer/OrganizerProfileView'
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
