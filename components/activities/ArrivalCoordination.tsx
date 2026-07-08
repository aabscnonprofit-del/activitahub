'use client'

// Arrival Coordination ("Getting there") — a lightweight social layer for approved participants to coordinate
// how they get to an activity. An approved participant sets their OWN preference (need a ride / offer a ride +
// optional ZIP/area, seats, short note); the organizer and approved participants see a SAFE summary (aggregate
// counts + ZIP/seats/note only). NOT transportation: no maps, no exact address, no phone, no payment, no
// automatic matching. Public visitors never see this section (the page gates rendering).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setArrivalPreferenceAction } from '@/lib/actions/arrival-preference'
import { ARRIVAL_NOTE_MAX, ARRIVAL_ZIP_MAX, ARRIVAL_SEATS_MAX } from '@/lib/arrival/limits'
import type { ArrivalPreference, ArrivalSummary } from '@/lib/arrival/store'

const DISCLAIMER = 'This is participant coordination only. ActivLife Hub does not provide transportation, drivers, insurance, or payment handling.'

export function ArrivalCoordination({
  projectId,
  locale,
  myPreference,
  summary,
  canSubmit,
}: {
  projectId: string
  locale: string
  myPreference: ArrivalPreference | null
  summary: ArrivalSummary
  canSubmit: boolean
}) {
  const router = useRouter()
  const [needsRide, setNeedsRide] = useState(myPreference?.needsRide ?? false)
  const [canOfferRide, setCanOfferRide] = useState(myPreference?.canOfferRide ?? false)
  const [pickupZip, setPickupZip] = useState(myPreference?.pickupZip ?? '')
  const [seats, setSeats] = useState(myPreference?.seatsAvailable != null ? String(myPreference.seatsAvailable) : '')
  const [note, setNote] = useState(myPreference?.note ?? '')
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function save() {
    setMsg(null)
    startTransition(async () => {
      const res = await setArrivalPreferenceAction(
        projectId,
        { needsRide, canOfferRide, pickupZip, seatsAvailable: seats.trim() === '' ? null : Number(seats), note },
        locale,
      )
      if (res.ok) { setMsg('Saved.'); router.refresh() }
      else setMsg(res.error === 'not_approved' ? 'Only approved participants can coordinate arrival.' : res.error === 'invalid' ? 'Please check the fields.' : 'Could not save. Please try again.')
    })
  }

  return (
    <section className="mt-8 rounded-lg border border-slate-200 p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Getting there</h2>
      <p className="mt-1 text-xs text-slate-400">{DISCLAIMER}</p>

      {/* Aggregate summary (organizer + approved participants) — safe fields only, no identity. */}
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
        <span>Needs a ride: <span className="font-semibold">{summary.needsRideCount}</span></span>
        <span>Can offer a ride: <span className="font-semibold">{summary.canOfferRideCount}</span></span>
      </div>
      {summary.entries.length > 0 && (
        <ul className="mt-3 space-y-2">
          {summary.entries.map((e, i) => (
            <li key={i} className="rounded border border-slate-100 p-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">{e.canOfferRide ? 'Offering a ride' : ''}{e.canOfferRide && e.needsRide ? ' · ' : ''}{e.needsRide ? 'Needs a ride' : ''}</span>
              {e.canOfferRide && e.seatsAvailable != null && <span className="ml-2">Seats: {e.seatsAvailable}</span>}
              {e.pickupZip && <span className="ml-2">Area: {e.pickupZip}</span>}
              {e.note && <p className="mt-0.5 whitespace-pre-wrap text-slate-500">{e.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {/* Own preference editor — approved participants only. */}
      {canSubmit && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your arrival</p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={needsRide} onChange={(e) => setNeedsRide(e.target.checked)} /> I need a ride
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={canOfferRide} onChange={(e) => setCanOfferRide(e.target.checked)} /> I can offer a ride
            </label>

            {(needsRide || canOfferRide) && (
              <div className="space-y-2 pt-1">
                {canOfferRide && (
                  <input type="number" min={0} max={ARRIVAL_SEATS_MAX} value={seats} onChange={(e) => setSeats(e.target.value)}
                    placeholder="Seats available" className="w-full rounded border border-slate-300 p-2 text-sm sm:w-48" />
                )}
                <input type="text" maxLength={ARRIVAL_ZIP_MAX} value={pickupZip} onChange={(e) => setPickupZip(e.target.value)}
                  placeholder="ZIP / area (no exact address)" className="w-full rounded border border-slate-300 p-2 text-sm sm:w-64" />
                <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, ARRIVAL_NOTE_MAX))} maxLength={ARRIVAL_NOTE_MAX} rows={2}
                  placeholder="Optional note (no phone / address)" className="w-full rounded border border-slate-300 p-2 text-sm" />
              </div>
            )}

            <div className="flex items-center gap-3">
              <button type="button" disabled={pending} onClick={save}
                className="rounded bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-60">
                {pending ? 'Saving…' : 'Save'}
              </button>
              {msg && <span className="text-xs text-slate-500">{msg}</span>}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
