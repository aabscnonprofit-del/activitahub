import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadParticipantView } from '@/lib/participant-access/view'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { formatDate } from '@/lib/utils'
import { CalendarDays, MapPin } from 'lucide-react'
import type { Locale } from '@/lib/types'

// Participant View (ADR_011 / ADR_012) — a Participant opens their project-scoped invitation link and sees ONLY
// the participant-permitted projection of the Project: the event (title / description / timeline), the schedule
// (arrival time + location), and the public organizer contacts. Access is by token via the shared Project
// Access layer (no login required); a revoked/expired/unknown token → 404. This page renders nothing
// organizer-only (no budget / proposal / planning internals / delivery / team / resource / safety / contracts /
// internal notes) and no participant contact information.

interface Props {
  params: Promise<{ locale: string; token: string }>
}

export default async function ParticipantViewPage({ params }: Props) {
  const { locale, token } = (await params) as { locale: Locale; token: string }

  const view = await loadParticipantView(token)
  if (!view) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader locale={locale} isAuthenticated={!!user} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your event</p>
        {view.event ? (
          <>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{view.event.intendedExperience}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{view.event.concept}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{view.event.experienceArc}</p>
            {view.event.itinerary.length > 0 && (
              <section className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Event timeline</h2>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {view.event.itinerary.map((m, i) => (
                    <li key={i}><span className="font-medium">{m.name}</span>{m.summary ? ` — ${m.summary}` : ''}</li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Your event is being prepared</h1>
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

        {(view.organizerName || view.leadOrganizerName) && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Contacts</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {view.organizerName && <li>Organizer: {view.organizerName}</li>}
              {view.leadOrganizerName && <li>Lead Organizer: {view.leadOrganizerName}</li>}
            </ul>
          </section>
        )}

        <p className="mt-8 text-xs text-slate-400">You are viewing this event as a participant. This link is private to you.</p>
      </main>
    </div>
  )
}
