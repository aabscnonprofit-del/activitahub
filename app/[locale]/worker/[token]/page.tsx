import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadWorkerView } from '@/lib/worker-access/view'
import { WorkerConfirm } from '@/components/projects/WorkerConfirm'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { formatDate } from '@/lib/utils'
import { CalendarDays, MapPin } from 'lucide-react'
import type { Locale } from '@/lib/types'

// Worker View (ADR_011 / ADR_012) — a Worker opens their project-scoped invitation link and sees ONLY the
// worker-permitted projection of the Project: their role + responsibilities, the schedule (arrival time +
// location), and a work confirmation. Access is by token (no login required); a revoked/unknown token → 404.
// This page renders nothing organizer-only (no budget / delivery panels / team / capacity / lead / execution).

interface Props {
  params: Promise<{ locale: string; token: string }>
}

export default async function WorkerViewPage({ params }: Props) {
  const { locale, token } = (await params) as { locale: Locale; token: string }

  const view = await loadWorkerView(token)
  if (!view) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your assignment</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
          {view.role ? view.role.label : 'Your work on this event'}
        </h1>
        {view.role?.responsibilities && (
          <section className="mt-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Responsibilities</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{view.role.responsibilities}</p>
          </section>
        )}

        {view.occurrences.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">When &amp; where</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {view.occurrences.map((o, i) => (
                <li key={i} className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />{formatDate(o.startsAt)}</span>
                  {o.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" aria-hidden />{o.location}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <WorkerConfirm token={token} locale={locale} confirmed={view.confirmed} />

        <p className="mt-8 text-xs text-slate-400">You are viewing this event as an assigned worker. This link is private to you.</p>
      </main>
    </div>
  )
}
