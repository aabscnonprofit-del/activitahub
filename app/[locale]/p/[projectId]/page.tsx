import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPublicProject, listPublicFutureOccurrences } from '@/lib/projects/store'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { formatDate } from '@/lib/utils'
import { CalendarDays, MapPin } from 'lucide-react'
import type { Locale } from '@/lib/types'

// Public Space — the read-only public projection of a Project (docs/PROJECT_PUBLIC_SPACE_SPEC.md).
// Loads a PUBLISHED Project through the Project Service, shows existing public-safe data + future
// Occurrences (one directly, many as a selector), and a non-functional "Registration coming soon" CTA.
// No registration/payment/SEO/OG. Public Space owns no Project data; it projects it. (Approved subset
// of Proposal 046 — no title/subtitle/description/cover/location columns on Project.)
interface Props {
  params: Promise<{ locale: string; projectId: string }>
}

export default async function PublicProjectPage({ params }: Props) {
  const { locale, projectId } = (await params) as { locale: Locale; projectId: string }

  const supabase = await createClient()

  // Project Service owns the load. Unpublished/missing → null → not accessible.
  const project = await getPublicProject(supabase, projectId)
  if (!project) notFound()

  const occurrences = await listPublicFutureOccurrences(supabase, projectId, new Date().toISOString())

  // Header auth state only (does not gate the page).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Public event</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Project</h1>
        <p className="mt-1 font-mono text-sm text-slate-500">{project.id}</p>

        <dl className="mt-6 rounded-lg border border-slate-200 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Published</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">{formatDate(project.created_at)}</dd>
        </dl>

        {/* Future Occurrences */}
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            {occurrences.length > 1 ? 'Choose a date' : 'When'}
          </h2>

          {occurrences.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-400">
              Dates coming soon.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {occurrences.map((o) => (
                <li key={o.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
                  <CalendarDays className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {o.title?.trim() || formatDate(o.starts_at)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(o.starts_at)}
                      {o.location ? (
                        <span className="ml-1 inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {o.location}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* CTA — not functional yet */}
        <div className="mt-8">
          <span
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-7 py-3.5 font-bold text-slate-500"
            aria-disabled="true"
          >
            Registration coming soon
          </span>
        </div>
      </main>
    </div>
  )
}
