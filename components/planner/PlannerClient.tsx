'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import { generatePlanAction } from '@/lib/actions/planner'
import type { PlannerOutput } from '@/lib/ope/types'
import PlanResult from './PlanResult'

type Category = 'birthday' | 'bbq' | 'networking'
type Venue = 'backyard_home' | 'public_park' | ''

export default function PlannerClient() {
  const t = useTranslations('planner')
  const tf = useTranslations('planner.form')

  const [category, setCategory] = useState<Category>('birthday')
  const [total, setTotal] = useState('')
  const [adults, setAdults] = useState('')
  const [kids, setKids] = useState('')
  const [venue, setVenue] = useState<Venue>('')
  const [budget, setBudget] = useState('')
  const [requirements, setRequirements] = useState('')
  const [city, setCity] = useState('')
  const [stateRegion, setStateRegion] = useState('')
  const [country, setCountry] = useState('')
  const [postal, setPostal] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [plan, setPlan] = useState<PlannerOutput | null>(null)

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    try {
      const input = {
        category,
        guestCount: Number(total),
        adults: adults ? Number(adults) : undefined,
        kids: kids ? Number(kids) : undefined,
        venueType: venue || undefined,
        budget: budget ? Number(budget) : undefined,
        specialRequirements: requirements
          ? requirements.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        location: { city: city.trim(), state: stateRegion.trim() || undefined, country: country.trim(), postalCode: postal.trim() || undefined },
      }
      const res = await generatePlanAction(input)
      if (res.ok) {
        setPlan(res.plan)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else setError(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (plan) {
    return (
      <div>
        <button onClick={() => setPlan(null)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          {t('result.newPlan')}
        </button>
        <PlanResult plan={plan} />
      </div>
    )
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="card p-5">
      <h2 className="mb-3 font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  )

  const cats: { key: Category; label: string }[] = [
    { key: 'birthday', label: tf('birthday') },
    { key: 'bbq', label: tf('bbq') },
    { key: 'networking', label: tf('networking') },
  ]
  const venues: { key: Venue; label: string }[] = [
    { key: 'backyard_home', label: tf('backyard') },
    { key: 'public_park', label: tf('park') },
    { key: '', label: tf('none') },
  ]

  return (
    <form onSubmit={onGenerate} className="space-y-4">
      <Section title={tf('sectionActivity')}>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c.key} type="button" onClick={() => setCategory(c.key)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${category === c.key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={tf('sectionGuests')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label-base">{tf('totalGuests')} *</label>
            <input type="number" min="1" required value={total} onChange={(e) => setTotal(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">{tf('adults')}</label>
            <input type="number" min="0" value={adults} onChange={(e) => setAdults(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">{tf('kids')}</label>
            <input type="number" min="0" value={kids} onChange={(e) => setKids(e.target.value)} className="input-base" />
          </div>
        </div>
      </Section>

      <Section title={tf('sectionVenue')}>
        <div className="flex flex-wrap gap-2">
          {venues.map((v) => (
            <button key={v.key || 'none'} type="button" onClick={() => setVenue(v.key)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${venue === v.key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={tf('sectionLocation')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label-base">{tf('city')} *</label>
            <input required value={city} onChange={(e) => setCity(e.target.value)} className="input-base" placeholder="Honolulu" />
          </div>
          <div>
            <label className="label-base">{tf('country')} *</label>
            <input required value={country} onChange={(e) => setCountry(e.target.value)} className="input-base" placeholder="USA" />
          </div>
          <div>
            <label className="label-base">{tf('state')}</label>
            <input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">{tf('postalCode')}</label>
            <input value={postal} onChange={(e) => setPostal(e.target.value)} className="input-base" />
          </div>
        </div>
      </Section>

      <Section title={tf('sectionBudget')}>
        <label className="label-base">{tf('budget')}</label>
        <input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} className="input-base" placeholder="600" />
        <p className="mt-1 text-xs text-slate-400">{tf('budgetHint')}</p>
      </Section>

      <Section title={tf('sectionExtras')}>
        <label className="label-base">{tf('requirements')}</label>
        <input value={requirements} onChange={(e) => setRequirements(e.target.value)} className="input-base" placeholder="superhero theme, nut allergy" />
        <p className="mt-1 text-xs text-slate-400">{tf('requirementsHint')}</p>
      </Section>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{tf('error')}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? tf('generating') : tf('generate')}
      </button>
    </form>
  )
}
