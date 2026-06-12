'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, RefreshCw, X } from 'lucide-react'
import { updatePlanInputs } from '@/lib/actions/opePlans'
import type { PlannerInput } from '@/lib/ope'
import type { SavedPlan } from '@/lib/types'

// WP5.1 — Event Inputs Editor. The first editable workspace capability: load a
// saved plan's current input, let the organizer edit the scoped set of fields,
// then Save & Recalculate via updatePlanInputs() (re-runs the engine, persists
// the new input + result, bumps the version). corrections/prep_state are left
// untouched by the backend. Out of scope here: budget corrections, prep-state
// editing, sourcing, marketplace. Non-edited input fields (category, recurrence,
// instructor, materials, state/postal) are preserved from the original input.

type Venue = 'backyard_home' | 'public_park' | ''

export default function EditPlanForm({
  plan,
  onSaved,
  onCancel,
}: {
  plan: SavedPlan
  onSaved: (updated: SavedPlan) => void
  onCancel: () => void
}) {
  const tf = useTranslations('planner.form')
  const tw = useTranslations('workspace')
  const input = plan.input

  const [title, setTitle] = useState(plan.title ?? '')
  const [total, setTotal] = useState(String(input.guestCount ?? ''))
  const [adults, setAdults] = useState(input.adults != null ? String(input.adults) : '')
  const [kids, setKids] = useState(input.kids != null ? String(input.kids) : '')
  const [budget, setBudget] = useState(input.budget != null ? String(input.budget) : '')
  const [venue, setVenue] = useState<Venue>((input.venueType as Venue) ?? '')
  const [city, setCity] = useState(input.location?.city ?? '')
  const [country, setCountry] = useState(input.location?.country ?? '')
  const [requirements, setRequirements] = useState((input.specialRequirements ?? []).join(', '))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Rebuild the full PlannerInput: preserve everything not exposed here, override
  // the edited fields. Empty optional fields collapse to undefined.
  function buildInput(): PlannerInput {
    return {
      ...input,
      guestCount: Number(total),
      adults: adults.trim() ? Number(adults) : undefined,
      kids: kids.trim() ? Number(kids) : undefined,
      budget: budget.trim() ? Number(budget) : undefined,
      venueType: venue || undefined,
      specialRequirements: requirements.trim()
        ? requirements.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      location: {
        ...input.location,
        city: city.trim(),
        country: country.trim(),
      },
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError(tw('errTitle')); return }
    setLoading(true)
    try {
      const res = await updatePlanInputs(plan.id, buildInput(), title.trim())
      if (res.success && res.data) {
        onSaved(res.data)
      } else {
        setError(tw('errRecompute'))
        setLoading(false)
      }
    } catch {
      setError(tw('errGeneric'))
      setLoading(false)
    }
  }

  const Section = ({ titleText, children }: { titleText: string; children: React.ReactNode }) => (
    <div className="card p-5">
      <h2 className="mb-3 font-bold text-slate-900">{titleText}</h2>
      {children}
    </div>
  )

  const venues: { key: Venue; label: string }[] = [
    { key: 'backyard_home', label: tf('backyard') },
    { key: 'public_park', label: tf('park') },
    { key: '', label: tf('none') },
  ]
  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition-colors ${active ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Section titleText={tw('planTitle')}>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input-base" placeholder={tw('planTitlePlaceholder')} />
      </Section>

      <Section titleText={tf('sectionGuests')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div><label className="label-base">{tf('totalGuests')} *</label><input type="number" min="1" required value={total} onChange={(e) => setTotal(e.target.value)} className="input-base" /></div>
          <div><label className="label-base">{tf('adults')}</label><input type="number" min="0" value={adults} onChange={(e) => setAdults(e.target.value)} className="input-base" /></div>
          <div><label className="label-base">{tf('kids')}</label><input type="number" min="0" value={kids} onChange={(e) => setKids(e.target.value)} className="input-base" /></div>
        </div>
      </Section>

      <Section titleText={tf('sectionVenue')}>
        <div className="flex flex-wrap gap-2">
          {venues.map((v) => (
            <button key={v.key || 'none'} type="button" onClick={() => setVenue(v.key)} className={chip(venue === v.key)}>{v.label}</button>
          ))}
        </div>
      </Section>

      <Section titleText={tf('sectionLocation')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="label-base">{tf('city')} *</label><input required value={city} onChange={(e) => setCity(e.target.value)} className="input-base" placeholder="Honolulu" /></div>
          <div><label className="label-base">{tf('country')} *</label><input required value={country} onChange={(e) => setCountry(e.target.value)} className="input-base" placeholder="USA" /></div>
        </div>
      </Section>

      <Section titleText={tf('sectionBudget')}>
        <label className="label-base">{tf('budget')}</label>
        <input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} className="input-base" placeholder="600" />
        <p className="mt-1 text-xs text-slate-400">{tf('budgetHint')}</p>
      </Section>

      <Section titleText={tf('sectionExtras')}>
        <label className="label-base">{tf('requirements')}</label>
        <input value={requirements} onChange={(e) => setRequirements(e.target.value)} className="input-base" placeholder="superhero theme, nut allergy" />
        <p className="mt-1 text-xs text-slate-400">{tf('requirementsHint')}</p>
      </Section>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={loading} className="btn-primary inline-flex items-center gap-2 px-7 py-3 text-base">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {loading ? tw('recalculating') : tw('saveRecalculate')}
        </button>
        <button type="button" onClick={onCancel} disabled={loading} className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50">
          <X className="h-4 w-4" /> {tw('cancel')}
        </button>
      </div>
    </form>
  )
}
