'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Sparkles, Loader2 } from 'lucide-react'
import { createPlan } from '@/lib/actions/opePlans'
import type { PlannerInput, RecurrenceFrequency } from '@/lib/ope'

// Organizer-side create → persist (M5 WP2). Reuses the localized planner.form
// labels and the same input fields as the public planner, but calls createPlan()
// (persists to ope_plans) and redirects to the saved plan detail. The public
// /plan-an-event flow + PlannerClient are NOT modified.

type Category =
  | 'birthday' | 'adult_birthday' | 'anniversary' | 'graduation' | 'family_reunion' | 'bbq' | 'networking'
  | 'fitness_class' | 'art_class' | 'language_class' | 'workshop'
type Venue = 'backyard_home' | 'public_park' | ''
type Repeats = 'one_time' | RecurrenceFrequency

const CLASS_CATEGORIES = new Set<Category>(['fitness_class', 'art_class', 'language_class', 'workshop'])
const RECURRING_CAPABLE = new Set<Category>(['networking', ...CLASS_CATEGORIES])

export default function NewPlanForm({ locale }: { locale: string }) {
  const router = useRouter()
  const tf = useTranslations('planner.form')
  const tw = useTranslations('workspace')

  const [title, setTitle] = useState('')
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
  const [error, setError] = useState('')

  function buildInput(): PlannerInput {
    return {
      category,
      guestCount: Number(total),
      adults: adults ? Number(adults) : undefined,
      kids: kids ? Number(kids) : undefined,
      venueType: venue || undefined,
      budget: budget ? Number(budget) : undefined,
      specialRequirements: requirements ? requirements.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      location: { city: city.trim(), state: stateRegion.trim() || undefined, country: country.trim(), postalCode: postal.trim() || undefined },
      recurrence:
        RECURRING_CAPABLE.has(category) && repeats !== 'one_time'
          ? { frequency: repeats, sessions: sessions ? Number(sessions) : null }
          : undefined,
      instructor: CLASS_CATEGORIES.has(category) && instructor ? instructor : undefined,
      materials: CLASS_CATEGORIES.has(category) && materials ? materials : undefined,
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError(tw('errTitle')); return }
    setLoading(true)
    try {
      const res = await createPlan(title.trim(), buildInput())
      if (res.success && res.data) {
        router.push(`/${locale}/dashboard/plans/${res.data.id}`)
      } else {
        setError(tw('errCreate'))
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
  const chip = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition-colors ${active ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Section titleText={tw('planTitle')}>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input-base" placeholder={tw('planTitlePlaceholder')} />
      </Section>

      <Section titleText={tf('sectionActivity')}>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c.key} type="button" onClick={() => setCategory(c.key)} className={chip(category === c.key)}>{c.label}</button>
          ))}
        </div>
      </Section>

      <Section titleText={tf('sectionGuests')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div><label className="label-base">{tf('totalGuests')} *</label><input type="number" min="1" required value={total} onChange={(e) => setTotal(e.target.value)} className="input-base" /></div>
          <div><label className="label-base">{tf('adults')}</label><input type="number" min="0" value={adults} onChange={(e) => setAdults(e.target.value)} className="input-base" /></div>
          <div><label className="label-base">{tf('kids')}</label><input type="number" min="0" value={kids} onChange={(e) => setKids(e.target.value)} className="input-base" /></div>
        </div>
      </Section>

      {CLASS_CATEGORIES.has(category) && (
        <Section titleText={tf('classDetails')}>
          <label className="label-base">{tf('instructorQ')}</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {([{ key: 'have', label: tf('instructorHave') }, { key: 'need', label: tf('instructorNeed') }] as { key: 'have' | 'need'; label: string }[]).map((o) => (
              <button key={o.key} type="button" onClick={() => setInstructor(o.key)} className={chip(instructor === o.key)}>{o.label}</button>
            ))}
          </div>
          <label className="label-base">{tf('materialsQ')}</label>
          <div className="flex flex-wrap gap-2">
            {([{ key: 'provided', label: tf('materialsProvided') }, { key: 'byo', label: tf('materialsByo') }] as { key: 'provided' | 'byo'; label: string }[]).map((o) => (
              <button key={o.key} type="button" onClick={() => setMaterials(o.key)} className={chip(materials === o.key)}>{o.label}</button>
            ))}
          </div>
        </Section>
      )}

      {RECURRING_CAPABLE.has(category) && (
        <Section titleText={tf('repeats')}>
          <div className="flex flex-wrap gap-2">
            {([{ key: 'one_time', label: tf('oneTime') }, { key: 'weekly', label: tf('weekly') }, { key: 'biweekly', label: tf('biweekly') }, { key: 'monthly', label: tf('monthly') }] as { key: Repeats; label: string }[]).map((r) => (
              <button key={r.key} type="button" onClick={() => setRepeats(r.key)} className={chip(repeats === r.key)}>{r.label}</button>
            ))}
          </div>
          {repeats !== 'one_time' && (
            <div className="mt-3"><label className="label-base">{tf('sessions')}</label><input type="number" min="1" value={sessions} onChange={(e) => setSessions(e.target.value)} className="input-base" placeholder="10" /></div>
          )}
        </Section>
      )}

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
          <div><label className="label-base">{tf('state')}</label><input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} className="input-base" /></div>
          <div><label className="label-base">{tf('postalCode')}</label><input value={postal} onChange={(e) => setPostal(e.target.value)} className="input-base" /></div>
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

      <button type="submit" disabled={loading} className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? tw('creating') : tw('create')}
      </button>
    </form>
  )
}
