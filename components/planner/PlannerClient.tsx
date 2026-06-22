'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Sparkles, Loader2, ArrowLeft, Wand2 } from 'lucide-react'
import { analyzeIdeaAction, generateFromIdeaAction, type IdeaPrefill, type IdeaDetails } from '@/lib/actions/planner'
import type { PlanGenerationResult, RecurrenceFrequency } from '@/lib/ope'
import PlanResult from './PlanResult'
import PlanHandoff from './PlanHandoff'
import PlanClarify from './PlanClarify'
import { BuyEventLicenseButton } from './BuyEventLicenseButton'

type Category =
  | 'birthday' | 'adult_birthday' | 'anniversary' | 'graduation' | 'family_reunion' | 'bbq' | 'networking'
  | 'fitness_class' | 'art_class' | 'language_class' | 'workshop'
type Venue = 'backyard_home' | 'public_park' | ''
type Repeats = 'one_time' | RecurrenceFrequency
type Step = 'idea' | 'wsh' | 'details'

const CLASS_CATEGORIES = new Set<Category>(['fitness_class', 'art_class', 'language_class', 'workshop'])
const RECURRING_CAPABLE = new Set<Category>(['networking', ...CLASS_CATEGORIES])

// The idea-first entry: the user writes a free-text dream. Examples shown to set the tone.
const IDEA_EXAMPLES = [
  'I want an Antarctica-themed birthday party for my children.',
  'I want a romantic marriage proposal.',
  'I want a yoga retreat for wealthy professionals.',
  'I want a networking night for startup founders.',
]

export default function PlannerClient({ locale }: { locale: string }) {
  const t = useTranslations('planner')
  const tf = useTranslations('planner.form')
  const tL = useTranslations('eventLicense')

  // Idea-first flow state.
  const [step, setStep] = useState<Step>('idea')
  const [idea, setIdea] = useState('')
  const [whatShouldHappen, setWhatShouldHappen] = useState('')
  const [needsWsh, setNeedsWsh] = useState(false)

  // Detail-completion form (secondary — prefilled from the idea, completed by the user).
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
  // Discovery (AI Organizer): non-null when the request is too vague to plan yet (WSH null).
  // Holds the interpretation + concept directions (shown FIRST) and at most a few questions
  // (shown AFTER). The user refines the idea and resubmits. No plan.
  const [discovery, setDiscovery] = useState<{ interpretation: string | null; directions: string[]; questions: string[] } | null>(null)
  // Entitlement gate (One Event License): 'license' = needs purchase, 'signin' = needs sign-in.
  const [gate, setGate] = useState<'license' | 'signin' | null>(null)
  const [result, setResult] = useState<PlanGenerationResult | null>(null)

  function resetAll() {
    setStep('idea'); setIdea(''); setWhatShouldHappen(''); setNeedsWsh(false)
    setCategory('birthday'); setTotal(''); setAdults(''); setKids(''); setVenue(''); setBudget('')
    setRequirements(''); setCity(''); setStateRegion(''); setCountry(''); setPostal('')
    setRepeats('one_time'); setSessions(''); setInstructor(''); setMaterials('')
    setResult(null); setError(false); setGate(null); setDiscovery(null)
  }

  function applyPrefill(p: IdeaPrefill) {
    if (p.category) setCategory(p.category as Category)
    if (p.guestCount != null) setTotal(String(p.guestCount))
    if (p.adults != null) setAdults(String(p.adults))
    if (p.kids != null) setKids(String(p.kids))
    if (p.venueType) setVenue(p.venueType)
    if (p.budget != null) setBudget(String(p.budget))
  }

  // Step 1 — understand the dream: run the Concept Funnel (AI-first, deterministic fallback).
  async function submitIdea(e: React.FormEvent) {
    e.preventDefault()
    if (!idea.trim()) return
    setLoading(true); setError(false); setDiscovery(null)
    try {
      const res = await analyzeIdeaAction(idea)
      if (!res.ok) { setError(true); return }
      applyPrefill(res.prefill)

      // Discovery: the AI Organizer judged the idea too vague to plan (no WSH). Do NOT advance and
      // do NOT show a generic error — keep the user here with clarifying questions to add detail.
      if (res.scenario.status === 'scenario_needed' && res.scenario.whatShouldHappen === null) {
        setDiscovery({
          interpretation: res.scenario.interpretation ?? null,
          directions: res.scenario.directions ?? [],
          questions: res.scenario.discoveryQuestions ?? [],
        })
        return
      }

      // "What should happen": the recognised story, or a request-specific draft to approve/edit.
      setWhatShouldHappen(res.scenario.whatShouldHappen ?? '')
      const needs = res.scenario.status === 'scenario_needed'
      setNeedsWsh(needs)
      setStep(needs ? 'wsh' : 'details')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function buildDetails(override?: Partial<IdeaDetails>): IdeaDetails {
    return {
      category,
      guestCount: Number(total),
      adults: adults ? Number(adults) : undefined,
      kids: kids ? Number(kids) : undefined,
      venueType: venue || undefined,
      budget: budget ? Number(budget) : undefined,
      requirements: requirements ? requirements.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      instructor: CLASS_CATEGORIES.has(category) && instructor ? instructor : undefined,
      materials: CLASS_CATEGORIES.has(category) && materials ? materials : undefined,
      recurrence:
        RECURRING_CAPABLE.has(category) && repeats !== 'one_time'
          ? { frequency: repeats, sessions: sessions ? Number(sessions) : null }
          : undefined,
      ...override,
    }
  }

  // Step 2 — plan from the idea: AI understanding + chosen concept + confirmed details → engine.
  async function submitDetails(override?: Partial<IdeaDetails>) {
    setLoading(true); setError(false); setGate(null)
    const details = buildDetails(override)
    const location = {
      city: city.trim(),
      state: stateRegion.trim() || undefined,
      country: country.trim(),
      postalCode: postal.trim() || undefined,
    }
    try {
      // Planning is gated on the user-approved/edited "what should happen" (recorded above).
      const approvedWhatShouldHappen = whatShouldHappen.trim() || null
      const res = await generateFromIdeaAction({ idea, selectedConcept: null, approvedWhatShouldHappen, details, location })
      if (res.ok) {
        setResult(res.result)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (res.error === 'event_license_required') {
        setGate('license')
      } else if (res.error === 'sign_in_required') {
        setGate('signin')
      } else setError(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function onGenerate(e: React.FormEvent) {
    e.preventDefault()
    void submitDetails()
  }

  // Operational clarification (UNKNOWN → ASK) — runs only after a concept direction is set.
  function onClarify(answers: Record<string, string>) {
    const override: Partial<IdeaDetails> = {}
    if (answers.venueType) { setVenue(answers.venueType as Venue); override.venueType = answers.venueType as IdeaDetails['venueType'] }
    if (answers.budget) { setBudget(answers.budget); override.budget = Number(answers.budget) }
    if (answers.kids) { setKids(answers.kids); override.kids = Number(answers.kids) }
    void submitDetails(override)
  }

  // ── Result ────────────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div>
        <button onClick={resetAll} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
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

  // ── Step: "what should happen" — draft to approve/edit BEFORE any planning ───────────
  if (step === 'wsh') {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setStep('idea')} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="card p-5">
          <div className="mb-3 flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">What should happen</h2>
              <p className="mt-0.5 text-sm text-slate-500">Here&apos;s a draft of what happens, what people experience, and the result we&apos;ll aim for. Edit it until it&apos;s right, then approve — we plan only after this.</p>
            </div>
          </div>
          <textarea
            value={whatShouldHappen}
            onChange={(e) => setWhatShouldHappen(e.target.value)}
            rows={6}
            className="input-base w-full"
          />
        </div>
        <button type="button" disabled={!whatShouldHappen.trim()} onClick={() => setStep('details')} className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
          <Sparkles className="h-4 w-4" />
          Approve &amp; continue
        </button>
      </div>
    )
  }

  // ── Step: raw idea (primary entry) ──────────────────────────────────────────────────
  if (step === 'idea') {
    return (
      <form onSubmit={submitIdea} className="space-y-4">
        <div className="card p-5">
          <div className="mb-3 flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
              <Wand2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Tell us what you want to create.</h2>
              <p className="mt-0.5 text-sm text-slate-500">Describe your event in your own words — we&apos;ll understand the idea first, then sort out the details.</p>
            </div>
          </div>
          <textarea
            value={idea}
            onChange={(e) => { setIdea(e.target.value); if (discovery) setDiscovery(null) }}
            rows={4}
            required
            className="input-base w-full"
            placeholder="I want an Antarctica-themed birthday party for my children."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {IDEA_EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setIdea(ex)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Discovery / clarification — the request is meaningful but too vague to plan yet.
            Always leads with interpretation + concept directions, THEN a few questions. */}
        {discovery && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">{tf('discovery.title')}</p>
            {discovery.interpretation && (
              <p className="mt-1 text-sm text-amber-800">
                <span className="font-medium">{tf('discovery.youMean')}</span> {discovery.interpretation}
              </p>
            )}
            {discovery.directions.length > 0 && (
              <>
                <p className="mt-2 text-sm font-medium text-amber-900">{tf('discovery.directionsLabel')}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-800">
                  {discovery.directions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </>
            )}
            {discovery.questions.length > 0 && (
              <>
                <p className="mt-2 text-sm font-medium text-amber-900">{tf('discovery.questionsLabel')}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-800">
                  {discovery.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{tf('error')}</p>}

        <button type="submit" disabled={loading || !idea.trim()} className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Understanding your idea…' : discovery ? 'Add detail and try again' : 'Understand my idea'}
        </button>
      </form>
    )
  }

  // ── Step: detail completion (secondary — prefilled, completed by the user) ───────────
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
      <button type="button" onClick={() => setStep(needsWsh ? 'wsh' : 'idea')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
        <p className="text-xs uppercase tracking-wide text-brand-500">Your idea</p>
        <p className="mt-0.5 text-sm text-slate-700">&ldquo;{idea}&rdquo;</p>
        {whatShouldHappen.trim() && (
          <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
            <span className="font-semibold text-brand-700">What should happen: </span>{whatShouldHappen}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">Just a few details left so we can plan it.</p>
      </div>

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

      {gate === 'signin' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <p className="font-semibold text-slate-900">{tL('gate.signinTitle')}</p>
          <p className="mt-1 text-sm text-slate-600">{tL('gate.signinBody')}</p>
          <Link
            href={`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/plan-an-event`)}`}
            className="btn-primary mt-4 inline-flex w-full justify-center sm:w-auto"
          >
            {tL('gate.signinCta')}
          </Link>
        </div>
      )}

      {gate === 'license' && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-center">
          <p className="font-semibold text-slate-900">{tL('gate.licenseTitle')}</p>
          <p className="mt-1 text-sm text-slate-600">{tL('gate.licenseBody')}</p>
          <div className="mx-auto mt-4 max-w-xs">
            <BuyEventLicenseButton locale={locale} buttonClassName="btn-primary w-full justify-center" />
          </div>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? tf('generating') : tf('generate')}
      </button>
    </form>
  )
}
