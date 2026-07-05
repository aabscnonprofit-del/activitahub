// Organizer Capacity Gate panel — shown to a draft project's owner when the project's participant count
// exceeds their organizer capacity level. It explains the block (the restriction is on the organizer, not the
// event — the project stays valid) and offers the two supported resolution paths. Presentational only.

import { CAPACITY_MAX, type CapacityGateResult } from '@/lib/capacity/model'

export function CapacityGatePanel({ gate }: { gate: CapacityGateResult }) {
  const requiredMax = gate.requiredLevel ? CAPACITY_MAX[gate.requiredLevel] : null
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <h2 className="text-base font-bold text-amber-800">Organizer capacity check</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-700">
        This project has <strong>{gate.participantCount}</strong> participants, which is above your current
        organizer capacity (Level {gate.organizerLevel}, up to {gate.organizerMax} participants). You cannot
        independently lead a project this size yet. The project itself remains fully valid — this limit applies
        to the organizer, not the event.
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
            Keep the project and have a qualified Lead Organizer take it on so it can proceed to delivery.
          </p>
        </div>
      </div>
    </section>
  )
}
