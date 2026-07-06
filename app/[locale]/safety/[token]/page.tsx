import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadSafetyView } from '@/lib/safety-access/view'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { formatDate } from '@/lib/utils'
import { CalendarDays, MapPin, ShieldAlert, Users } from 'lucide-react'
import type { Locale } from '@/lib/types'

// Safety View (ADR_013) — authorized public-safety personnel open a project-scoped Safety Link and see ONLY the
// safety-relevant projection of the Project: event basics, schedule + location, scale, the safety profile
// (risk/safeguard), and public organizer contacts. Access is by token via the shared Project Access layer (no
// login required); a revoked/expired/unknown token → 404. A legal notice is shown whenever a Safety Link is
// opened (ADR_013). This page renders nothing organizer-only (no budget / proposal / delivery / team / resources
// / worker assignments / participants / contracts / internal notes).

interface Props {
  params: Promise<{ locale: string; token: string }>
}

export default async function SafetyViewPage({ params }: Props) {
  const { locale, token } = (await params) as { locale: Locale; token: string }

  const view = await loadSafetyView(token)
  if (!view) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        {/* Legal notice — shown whenever a Safety Link is opened (ADR_013). */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
          This Safety Link is intended exclusively for authorized public-safety personnel and other individuals
          performing official duties related to this event. Unauthorized use may violate applicable law, the
          organizer&rsquo;s rights, or the event&rsquo;s privacy requirements.
        </div>

        <p className="mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <ShieldAlert className="h-4 w-4" aria-hidden />Safety information
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{view.title ?? 'Event safety information'}</h1>
        {view.description && <p className="mt-3 text-sm leading-relaxed text-slate-600">{view.description}</p>}

        {view.occurrences.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Schedule &amp; location</h2>
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

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Scale</h2>
          <p className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-700">
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-slate-400" aria-hidden />
              Expected attendance: {view.expectedAttendance ?? 'not specified'}</span>
            <span>Workers: {view.workerCount}</span>
          </p>
        </section>

        {view.safetyProfile.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Safety profile</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {view.safetyProfile.map((s, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-800">{s.risk}</p>
                  <p className="mt-0.5 text-slate-600">Safeguard: {s.safeguard}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(view.contacts.organizerName || view.contacts.leadOrganizerName || view.contacts.safetyCoordinatorName) && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Contacts</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {view.contacts.organizerName && <li>Organizer: {view.contacts.organizerName}</li>}
              {view.contacts.leadOrganizerName && <li>Lead Organizer: {view.contacts.leadOrganizerName}</li>}
              {view.contacts.safetyCoordinatorName && <li>Safety Coordinator: {view.contacts.safetyCoordinatorName}</li>}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
