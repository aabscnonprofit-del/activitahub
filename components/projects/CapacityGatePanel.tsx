// Organizer Capacity Gate panel — shown to a draft project's owner when the EFFECTIVE lead organizer's
// capacity is below the project's participant count. It explains the block (the restriction is on the
// organizer, not the event — the project stays valid) and offers the two supported resolution paths: upgrade
// qualification, or assign a qualified Lead Organizer (interactive). Shows the current lead + eligibility.

import { CAPACITY_MAX } from '@/lib/capacity/model'
import type { ProjectCapacityGate } from '@/lib/capacity/gate'
import { LeadOrganizerAssign } from './LeadOrganizerAssign'

export function CapacityGatePanel({ gate, projectId, locale }: { gate: ProjectCapacityGate; projectId: string; locale: string }) {
  const requiredMax = gate.requiredLevel ? CAPACITY_MAX[gate.requiredLevel] : null
  const leadLabel = gate.leadOrganizerId ? 'the assigned Lead Organizer' : 'you'
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <h2 className="text-base font-bold text-amber-800">Organizer capacity check</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-700">
        This project has <strong>{gate.participantCount}</strong> participants, which is above the capacity of{' '}
        {leadLabel} (Level {gate.organizerLevel}, up to {gate.organizerMax} participants). It cannot be led
        independently at this level yet. The project itself remains fully valid — this limit applies to the
        organizer, not the event.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Current Lead Organizer: {gate.leadOrganizerId ? gate.leadOrganizerId : 'you (owner)'} — not eligible for this size.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-white/60 p-3">
          <h3 className="text-sm font-semibold text-slate-700">Upgrade your qualification</h3>
          <p className="mt-1 text-xs text-slate-600">
            Reach{' '}
            {gate.requiredLevel != null && (
              <>Level {gate.requiredLevel}{requiredMax != null ? ` (up to ${requiredMax})` : ' (unlimited)'}</>
            )}{' '}
            to lead a project of this size independently.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-white/60 p-3">
          <h3 className="text-sm font-semibold text-slate-700">Assign a qualified Lead Organizer</h3>
          <p className="mt-1 text-xs text-slate-600">
            Keep the project and assign a Lead Organizer with enough capacity so it can proceed to approval.
          </p>
          <LeadOrganizerAssign projectId={projectId} locale={locale} currentLeadId={gate.leadOrganizerId} />
        </div>
      </div>
    </section>
  )
}
