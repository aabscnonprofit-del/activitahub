'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Sparkles, Loader2, ArrowLeft, ArrowRight, Wand2 } from 'lucide-react'
import { analyzeIdeaAction, generateFromIdeaAction, type IdeaPrefill, type DiscoveryTurn } from '@/lib/actions/planner'
import { discoverAction } from '@/lib/actions/discovery'
import { buildFutureEventDescription, type EventDetails, type RecurrenceFrequency } from '@/lib/domain/future-event-description'
import EventPlanV2Review from './EventPlanV2Review'
import EventPlanV2Handoff from './EventPlanV2Handoff'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'
import { BuyEventLicenseButton } from './BuyEventLicenseButton'

type Category =
  | 'birthday' | 'adult_birthday' | 'anniversary' | 'graduation' | 'family_reunion' | 'bbq' | 'networking'
  | 'fitness_class' | 'art_class' | 'language_class' | 'workshop'
type Venue = 'backyard_home' | 'public_park' | ''
type Repeats = 'one_time' | RecurrenceFrequency
type Step = 'idea' | 'wsh' | 'details'

// Discovery conversation: an append-only chat between the Organizer and the user.
type OrganizerMsg = { role: 'organizer'; interpretation: string | null; directions: string[]; questions: string[] }
type DiscoveryMsg = OrganizerMsg | { role: 'user'; text: string }

const CLASS_CATEGORIES = new Set<Category>(['fitness_class', 'art_class', 'language_class', 'workshop'])
const RECURRING_CAPABLE = new Set<Category>(['networking', ...CLASS_CATEGORIES])

// The idea-first entry: the user writes a free-text dream. Examples shown to set the tone.
const IDEA_EXAMPLES = [
  'I want an Antarctica-themed birthday party for my children.',
  'I want a romantic marriage proposal.',
  'I want a yoga retreat for wealthy professionals.',
  'I want a networking night for startup founders.',
]

// Stable card-section wrapper. MUST stay at module scope: when this was defined
// inside PlannerClient, each render gave it a new function identity, so React
// remounted its subtree on every keystroke and the nested <input> lost focus
// (City/Country/Budget/Requirements/guest counts). Module scope keeps it stable.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  )
}

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
  // Discovery (AI Organizer): non-null once the request needs clarification (WSH null). An
  // append-only conversation — organizer turns (interpretation + directions + questions) and the
  // user's replies. Multi-turn; never cleared mid-conversation. No plan during discovery.
  const [discovery, setDiscovery] = useState<DiscoveryMsg[] | null>(null)
  const [answer, setAnswer] = useState('')
  // Entitlement gate (One Event License): 'license' = needs purchase, 'signin' = needs sign-in.
  const [gate, setGate] = useState<'license' | 'signin' | null>(null)
  // EventPlanV2 (Planning Engine V2) is the authoritative result the planner renders.
  const [eventPlanV2, setEventPlanV2] = useState<EventPlanV2 | null>(null)
  // The Project (aggregate root) this planner is working inside. Set once OPE creates/returns
  // it, then reused on subsequent generations (e.g. clarification) so the user stays in the
  // same Project. The Project row persists server-side (RLS owner-only).
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  // Non-blocking preview of the AUTHORITATIVE Discovery seam (additive; never gates the existing flow).
  const [seamDiscovery, setSeamDiscovery] = useState<Awaited<ReturnType<typeof discoverAction>> | null>(null)

  // When a gate (sign-in / license) or error appears after Generate, scroll it into view so it
  // can never be silently off-screen at the bottom of the long details form.
  const gateRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (gate || error) gateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [gate, error])

  function resetAll() {
    setStep('idea'); setIdea(''); setWhatShouldHappen(''); setNeedsWsh(false)
    setCategory('birthday'); setTotal(''); setAdults(''); setKids(''); setVenue(''); setBudget('')
    setRequirements(''); setCity(''); setStateRegion(''); setCountry(''); setPostal('')
    setRepeats('one_time'); setSessions(''); setInstructor(''); setMaterials('')
    setEventPlanV2(null); setError(false); setGate(null); setDiscovery(null); setAnswer('')
    setProjectId(undefined); setSeamDiscovery(null)
  }

  function applyPrefill(p: IdeaPrefill) {
    if (p.category) setCategory(p.category as Category)
    if (p.guestCount != null) setTotal(String(p.guestCount))
    if (p.adults != null) setAdults(String(p.adults))
    if (p.kids != null) setKids(String(p.kids))
    if (p.venueType) setVenue(p.venueType)
    if (p.budget != null) setBudget(String(p.budget))
  }

  // An organizer turn from a discovery scenario (interpretation + directions + questions).
  function organizerTurn(s: { interpretation?: string | null; directions?: string[]; discoveryQuestions?: string[] }): OrganizerMsg {
    return { role: 'organizer', interpretation: s.interpretation ?? null, directions: s.directions ?? [], questions: s.discoveryQuestions ?? [] }
  }

  // Serialise the visible conversation for the Organizer (it must receive the FULL history).
  function toConversation(msgs: DiscoveryMsg[]): DiscoveryTurn[] {
    return msgs.map((m) =>
      m.role === 'user'
        ? { role: 'user', content: m.text }
        : { role: 'organizer', content: [m.interpretation, m.directions.join('; '), m.questions.join('; ')].filter(Boolean).join('\n') },
    )
  }

  // Step 1 — understand the dream: run the Concept Funnel (AI-first, deterministic fallback).
  async function submitIdea(e: React.FormEvent) {
    e.preventDefault()
    if (!idea.trim()) return
    setLoading(true); setError(false); setDiscovery(null); setAnswer(''); setSeamDiscovery(null)
    // Non-blocking: also call the AUTHORITATIVE Discovery seam for a small preview. It runs in parallel,
    // never blocks or alters the existing planner flow below, and never gates planning.
    void discoverAction(idea).then(setSeamDiscovery).catch(() => setSeamDiscovery(null))
    try {
      const res = await analyzeIdeaAction(idea)
      if (!res.ok) { setError(true); return }
      applyPrefill(res.prefill)

      // Discovery: the AI Organizer judged the idea too vague to plan (no WSH). Open the discovery
      // conversation with the Organizer's first turn — do NOT advance and do NOT show an error.
      if (res.scenario.status === 'scenario_needed' && res.scenario.whatShouldHappen === null) {
        setDiscovery([organizerTurn(res.scenario)])
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

  // Discovery turn — the user answers; we append their reply, send the FULL history to the
  // Organizer, and either continue discovery (append a refined organizer turn) or, once the
  // Organizer has enough, leave discovery for the WSH/details step. History is never cleared.
  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault()
    if (!answer.trim() || !discovery) return
    const nextMsgs: DiscoveryMsg[] = [...discovery, { role: 'user', text: answer.trim() }]
    setDiscovery(nextMsgs)
    setAnswer('')
    setLoading(true); setError(false)
    try {
      const res = await analyzeIdeaAction(idea, toConversation(nextMsgs))
      if (!res.ok) { setError(true); return }
      applyPrefill(res.prefill)

      if (res.scenario.status === 'scenario_needed' && res.scenario.whatShouldHappen === null) {
        // Still in discovery — append the Organizer's refined turn (keeps all prior content).
        setDiscovery([...nextMsgs, organizerTurn(res.scenario)])
        return
      }

      // Discovery ended — the Organizer has enough to draft a WSH (or recognised a scenario).
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

  function buildDetails(): EventDetails {
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
    }
  }

  // Step 2 — plan from the idea: AI understanding + chosen concept + confirmed details → engine.
  async function submitDetails() {
    setLoading(true); setError(false); setGate(null)
    const details = buildDetails()
    const location = {
      city: city.trim(),
      state: stateRegion.trim() || undefined,
      country: country.trim(),
      postalCode: postal.trim() || undefined,
    }
    try {
      // Planning is gated on the user-approved/edited "what should happen" (recorded above).
      // Discovery produces the Future Event Description (the Discovery → Planning hand-off).
      const approvedWhatShouldHappen = whatShouldHappen.trim() || null
      const fed = buildFutureEventDescription({ clientRequest: idea, description: approvedWhatShouldHappen ?? '', details, location })
      const res = await generateFromIdeaAction(fed, projectId)
      // Stay inside the same Project across re-generations.
      if (res.projectId) setProjectId(res.projectId)
      if (res.ok) {
        setEventPlanV2(res.eventPlanV2)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (res.error === 'event_license_required') {
        // Clear any plan so we leave the result view and the license gate (rendered in the
        // details form) is actually visible; it's scrolled into view by the gate/error effect.
        setEventPlanV2(null)
        setGate('license')
      } else if (res.error === 'sign_in_required') {
        setEventPlanV2(null)
        setGate('signin')
      } else {
        setEventPlanV2(null)
        setError(true)
      }
    } catch {
      setEventPlanV2(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function onGenerate(e: React.FormEvent) {
    e.preventDefault()
    void submitDetails()
  }

  // ── Result ────────────────────────────────────────────────────────────────────────
  // EventPlanV2 is authoritative: a 'planned' verdict renders the prepared event; any other
  // verdict renders the V2 feasibility handoff (what's confident, what's left to decide).
  if (eventPlanV2) {
    return (
      <div>
        <button onClick={resetAll} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          {t('result.newPlan')}
        </button>
        {eventPlanV2.feasibility.verdict === 'planned' ? (
          <EventPlanV2Review plan={eventPlanV2} />
        ) : (
          <EventPlanV2Handoff plan={eventPlanV2} />
        )}
        {/* Handoff to the Project pipeline — connects plan generation to the Project hub (Budget / Publish). */}
        {/* Stage 5f: gated on V2 feasibility (the Project-world authority), consistent with the plan render. */}
        {projectId && eventPlanV2 && eventPlanV2.feasibility.verdict === 'planned' && (
          <div className="mt-6">
            <Link
              href={`/${locale}/dashboard/projects/${projectId}`}
              className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto"
            >
              Continue to Project
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
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
    // Discovery conversation — an append-only chat. The plan is never offered here, and the
    // One Event License CTA never appears during discovery. The user refines until the
    // Organizer has enough to draft a "what should happen".
    if (discovery) {
      return (
        <div className="space-y-3">
          {/* Opening message — the user's original idea. */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">{idea}</div>
          </div>

          {discovery.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">{m.text}</div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  {m.interpretation && (
                    <p>
                      <span className="font-medium text-slate-900">{tf('discovery.youMean')}</span> {m.interpretation}
                    </p>
                  )}
                  {m.directions.length > 0 && (
                    <>
                      <p className="mt-2 font-medium text-slate-900">{tf('discovery.directionsLabel')}</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {m.directions.map((d, j) => (
                          <li key={j}>{d}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {m.questions.length > 0 && (
                    <>
                      <p className="mt-2 font-medium text-slate-900">{tf('discovery.questionsLabel')}</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {m.questions.map((q, j) => (
                          <li key={j}>{q}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            ),
          )}

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{tf('error')}</p>}

          <form onSubmit={submitAnswer} className="space-y-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              className="input-base w-full"
              placeholder={tf('discovery.answerPlaceholder')}
            />
            <div className="flex items-center gap-4">
              <button type="submit" disabled={loading || !answer.trim()} className="btn-primary px-7 py-3.5 text-base">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? tf('discovery.thinking') : tf('discovery.send')}
              </button>
              <button type="button" onClick={resetAll} className="text-sm font-medium text-slate-500 hover:text-slate-800">
                {tf('discovery.startOver')}
              </button>
            </div>
          </form>
        </div>
      )
    }

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
            onChange={(e) => setIdea(e.target.value)}
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

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{tf('error')}</p>}

        <button type="submit" disabled={loading || !idea.trim()} className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Understanding your idea…' : 'Understand my idea'}
        </button>
      </form>
    )
  }

  // ── Step: detail completion (secondary — prefilled, completed by the user) ───────────
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
    <>
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

      {/* Non-blocking preview of the AUTHORITATIVE Discovery seam. Informational only — it does not
          drive the flow, replace anything above, or gate planning. */}
      {seamDiscovery && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Discovery (preview)</p>
          {seamDiscovery.status === 'understood' ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{seamDiscovery.statementOfUnderstanding}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-600">{seamDiscovery.question}</p>
          )}
        </div>
      )}

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

      <button type="submit" disabled={loading} className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? tf('generating') : tf('generate')}
      </button>
    </form>

      {/* Gates/errors render OUTSIDE the Details <form>. BuyEventLicenseButton renders its
          OWN <form action={createOneEventLicenseCheckout}>; nesting forms is invalid HTML, so
          the browser drops the inner form and the license CTA never reaches Stripe. Keeping
          this block a SIBLING of the Details form (not a child) makes the CTA submit correctly. */}
      {(error || gate) && (
        <div ref={gateRef} className="mt-4 space-y-4">
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
        </div>
      )}
    </>
  )
}
