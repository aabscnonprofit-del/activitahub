'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import { generatePlanAction } from '@/lib/actions/planner'
import type { PlanGenerationResult, PlannerInput, RecurrenceFrequency } from '@/lib/ope'
import PlanResult from './PlanResult'
import PlanHandoff from './PlanHandoff'
import PlanClarify from './PlanClarify'

type Category =
  | 'birthday' | 'adult_birthday' | 'anniversary' | 'graduation' | 'family_reunion' | 'bbq' | 'networking'
  | 'fitness_class' | 'art_class' | 'language_class' | 'workshop'
type Venue = 'backyard_home' | 'public_park' | ''
type Repeats = 'one_time' | RecurrenceFrequency

// Class categories (M3) — show instructor/materials inputs and the Repeats control.
const CLASS_CATEGORIES = new Set<Category>(['fitness_class', 'art_class', 'language_class', 'workshop'])

// Activities that can be planned as a recurring series. Mirrors
// ACTIVITIES[*].recurringCapable: Meetup (networking) + all Class categories.
const RECURRING_CAPABLE = new Set<Category>(['networking', ...CLASS_CATEGORIES])

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
  const [repeats, setRepeats] = useState<Repeats>('one_time')
  const [sessions, setSessions] = useState('')
  const [instructor, setInstructor] = useState<'have' | 'need' | ''>('')
  const [materials, setMaterials] = useState<'provided' | 'byo' | ''>('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [result, setResult] = useState<PlanGenerationResult | null>(null)
  const [lastInput, setLastInput] = useState<PlannerInput | null>(null)

  async function runPlan(input: PlannerInput) {
    setLoading(true)
    setError(false)
    setLastInput(input)
    try {
      const res = await generatePlanAction(input)
      if (res.ok) {
        setResult(res.result)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else setError(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function buildInput(): PlannerInput {
    return {
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
      recurrence:
        RECURRING_CAPABLE.has(category) && repeats !== 'one_time'
          ? { frequency: repeats, sessions: sessions ? Number(sessions) : null }
          : undefined,
      instructor: CLASS_CATEGORIES.has(category) && instructor ? instructor : undefined,
      materials: CLASS_CATEGORIES.has(category) && materials ? materials : undefined,
    }
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault()
    await runPlan(buildInput())
  }

  // Merge clarification answers into the original input and re-run (UNKNOWN → ASK).
  function onClarify(answers: Record<string, string>) {
    if (!lastInput) return
    const merged: PlannerInput = { ...lastInput }
    if (answers.venueType) merged.venueType = answers.venueType as PlannerInput['venueType']
    if (answers.budget) merged.budget = Number(answers.budget)
    if (answers.kids) merged.kids = Number(answers.kids)
    void runPlan(merged)
  }

  if (result) {
    return (
      <div>
        <button onClick={() => { setResult(null); setLastInput(null) }} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          {t('result.newPlan')}
        </button>
        {result.status === 'plan_ready' && result.plan ? (
          <PlanResult plan={result.plan} />
        ) : result.status === 'needs_clarification' ? (
          <PlanClarify questions={result.questions ?? []} loading={loading} onSubmit={onClarify} />
        ) : (
          <PlanHandoff coverage={result.coverage} />
        )}
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
    { key: 'adult_birthday', label: tf('adultBirthday') },
    { key: 'anniversary', label: tf('anniversary') },
    { key: 'graduation', label: tf('graduation') },
    { key: 'family_reunion', label: tf('familyReunion') },
    { key: 'bbq', label: tf('bbq') },
    { key: 'networking', label: tf('networking') },
    { key: 'fitness_class', label: tf('fitnessClass') },
    { key: 'art_class', label: tf('artClass') },
    { key: 'language_class', label: tf('languageClass') },
    { key: 'workshop', label: tf('workshop') },
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

      {CLASS_CATEGORIES.has(category) && (
        <Section title={tf('classDetails')}>
          <label className="label-base">{tf('instructorQ')}</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {([
              { key: 'have', label: tf('instructorHave') },
              { key: 'need', label: tf('instructorNeed') },
            ] as { key: 'have' | 'need'; label: string }[]).map((o) => (
              <button key={o.key} type="button" onClick={() => setInstructor(o.key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${instructor === o.key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <label className="label-base">{tf('materialsQ')}</label>
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'provided', label: tf('materialsProvided') },
              { key: 'byo', label: tf('materialsByo') },
            ] as { key: 'provided' | 'byo'; label: string }[]).map((o) => (
              <button key={o.key} type="button" onClick={() => setMaterials(o.key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${materials === o.key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {RECURRING_CAPABLE.has(category) && (
        <Section title={tf('repeats')}>
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'one_time', label: tf('oneTime') },
              { key: 'weekly', label: tf('weekly') },
              { key: 'biweekly', label: tf('biweekly') },
              { key: 'monthly', label: tf('monthly') },
            ] as { key: Repeats; label: string }[]).map((r) => (
              <button key={r.key} type="button" onClick={() => setRepeats(r.key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${repeats === r.key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                {r.label}
              </button>
            ))}
          </div>
          {repeats !== 'one_time' && (
            <div className="mt-3">
              <label className="label-base">{tf('sessions')}</label>
              <input type="number" min="1" value={sessions} onChange={(e) => setSessions(e.target.value)} className="input-base" placeholder="10" />
            </div>
          )}
        </Section>
      )}

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
