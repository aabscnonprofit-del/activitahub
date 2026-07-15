'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Sparkles, Loader2, ArrowLeft, ArrowRight, Wand2 } from 'lucide-react'
import { analyzeIdeaAction, generateFromIdeaAction, type IdeaPrefill, type DiscoveryTurn } from '@/lib/actions/planner'
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
type Step = 'idea' | 'wsh'

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

// Active Planner session persistence — survives a component remount (e.g. the locale switcher navigating
// /en/plan-an-event → /ru/plan-an-event, which unmounts this client component). sessionStorage is per-tab
// and cleared when the tab closes, which matches an "active session". Best-effort; never throws.
const PLANNER_SESSION_KEY = 'alh.planner.session.v1'
type PlannerSnapshot = {
  step: Step; idea: string; whatShouldHappen: string
  category: Category; total: string; adults: string; kids: string; venue: Venue; budget: string
  requirements: string; city: string; stateRegion: string; country: string; postal: string
  repeats: Repeats; sessions: string; instructor: 'have' | 'need' | ''; materials: 'provided' | 'byo' | ''
  discovery: DiscoveryMsg[] | null; answer: string
  eventPlanV2: EventPlanV2 | null; projectId: string | undefined
}
function loadPlannerSession(): Partial<PlannerSnapshot> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(PLANNER_SESSION_KEY)
    return raw ? (JSON.parse(raw) as Partial<PlannerSnapshot>) : null
  } catch { return null }
}
function savePlannerSession(s: PlannerSnapshot): void {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.setItem(PLANNER_SESSION_KEY, JSON.stringify(s)) } catch { /* quota / disabled */ }
}
function clearPlannerSession(): void {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(PLANNER_SESSION_KEY) } catch { /* disabled */ }
}

export default function PlannerClient({ locale }: { locale: string }) {
  const t = useTranslations('planner')
  const tf = useTranslations('planner.form')
  const tL = useTranslations('eventLicense')

  // Idea-first flow state.
  const [step, setStep] = useState<Step>('idea')
  const [idea, setIdea] = useState('')
  const [whatShouldHappen, setWhatShouldHappen] = useState('')

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

  // Whether the stored session has been restored yet. Gates the save effect below so the initial
  // (empty) render never overwrites a stored session before it is restored.
  const [hydrated, setHydrated] = useState(false)

  // When a gate (sign-in / license) or error appears after Generate, scroll it into view so it
  // can never be silently off-screen at the bottom of the long details form.
  const gateRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (gate || error) gateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [gate, error])

  // Restore an active session after a remount (client-only, post-mount → no SSR hydration mismatch).
  useEffect(() => {
    const s = loadPlannerSession()
    if (s) {
      if (s.step !== undefined) setStep(s.step)
      if (s.idea !== undefined) setIdea(s.idea)
      if (s.whatShouldHappen !== undefined) setWhatShouldHappen(s.whatShouldHappen)
      if (s.category !== undefined) setCategory(s.category)
      if (s.total !== undefined) setTotal(s.total)
      if (s.adults !== undefined) setAdults(s.adults)
      if (s.kids !== undefined) setKids(s.kids)
      if (s.venue !== undefined) setVenue(s.venue)
      if (s.budget !== undefined) setBudget(s.budget)
      if (s.requirements !== undefined) setRequirements(s.requirements)
      if (s.city !== undefined) setCity(s.city)
      if (s.stateRegion !== undefined) setStateRegion(s.stateRegion)
      if (s.country !== undefined) setCountry(s.country)
      if (s.postal !== undefined) setPostal(s.postal)
      if (s.repeats !== undefined) setRepeats(s.repeats)
      if (s.sessions !== undefined) setSessions(s.sessions)
      if (s.instructor !== undefined) setInstructor(s.instructor)
      if (s.materials !== undefined) setMaterials(s.materials)
      if (s.discovery !== undefined) setDiscovery(s.discovery)
      if (s.answer !== undefined) setAnswer(s.answer)
      if (s.eventPlanV2 !== undefined) setEventPlanV2(s.eventPlanV2)
      if (s.projectId !== undefined) setProjectId(s.projectId)
    }
    setHydrated(true)
  }, [])

  // Persist the active session on every change (after hydration) so it survives navigation/remount.
  useEffect(() => {
    if (!hydrated) return
    savePlannerSession({
      step, idea, whatShouldHappen,
      category, total, adults, kids, venue, budget,
      requirements, city, stateRegion, country, postal,
      repeats, sessions, instructor, materials,
      discovery, answer, eventPlanV2, projectId,
    })
  }, [
    hydrated, step, idea, whatShouldHappen,
    category, total, adults, kids, venue, budget,
    requirements, city, stateRegion, country, postal,
    repeats, sessions, instructor, materials,
    discovery, answer, eventPlanV2, projectId,
  ])

  function resetAll() {
    setStep('idea'); setIdea(''); setWhatShouldHappen('')
    setCategory('birthday'); setTotal(''); setAdults(''); setKids(''); setVenue(''); setBudget('')
    setRequirements(''); setCity(''); setStateRegion(''); setCountry(''); setPostal('')
    setRepeats('one_time'); setSessions(''); setInstructor(''); setMaterials('')
    setEventPlanV2(null); setError(false); setGate(null); setDiscovery(null); setAnswer('')
    setProjectId(undefined)
    clearPlannerSession()
  }

  function applyPrefill(p: IdeaPrefill) {
    if (p.category) setCategory(p.category as Category)
    if (p.guestCount != null) setTotal(String(p.guestCount))
    if (p.adults != null) setAdults(String(p.adults))
    if (p.kids != null) setKids(String(p.kids))
    if (p.venueType) setVenue(p.venueType)
    if (p.budget != null) setBudget(String(p.budget))
    // Instructor (class-type activities) — captured by Discovery, carried into the FED so the plan's
    // Instructor staffing reasoning keeps working without the removed Details form.
    if (p.instructor) setInstructor(p.instructor)
  }

  // An organizer turn from a discovery scenario (interpretation + directions + questions). When the
  // scenario is holding for a required operational fact (guestCount / instructor), append the
  // localized follow-up question so Discovery keeps flowing in one continuous, in-language conversation.
  function organizerTurn(s: {
    interpretation?: string | null
    directions?: string[]
    discoveryQuestions?: string[]
    missingFact?: 'guests' | 'instructor' | null
  }): OrganizerMsg {
    const questions = [...(s.discoveryQuestions ?? [])]
    if (s.missingFact === 'guests') questions.push(tf('facts.askGuests'))
    else if (s.missingFact === 'instructor') questions.push(tf('facts.askInstructor'))
    const interpretation = s.interpretation ?? (s.missingFact ? tf('facts.ack') : null)
    return { role: 'organizer', interpretation, directions: s.directions ?? [], questions }
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
    setLoading(true); setError(false); setDiscovery(null); setAnswer('')
    try {
      const res = await analyzeIdeaAction(idea, undefined, locale)
      if (!res.ok) { setError(true); return }
      applyPrefill(res.prefill)

      // Discovery: the AI Organizer judged the idea too vague to plan (no WSH). Open the discovery
      // conversation with the Organizer's first turn — do NOT advance and do NOT show an error.
      if (res.scenario.status === 'scenario_needed' && res.scenario.whatShouldHappen === null) {
        setDiscovery([organizerTurn(res.scenario)])
        return
      }

      // "What should happen": the recognised story, or a request-specific draft to approve/edit.
      // Both paths go to the WSH step — the visitor always reviews and approves what will be
      // planned before any planning runs. Approval leads straight into Planning (no legacy form).
      setWhatShouldHappen(res.scenario.whatShouldHappen ?? '')
      setStep('wsh')
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
      const res = await analyzeIdeaAction(idea, toConversation(nextMsgs), locale)
      if (!res.ok) { setError(true); return }
      applyPrefill(res.prefill)

      if (res.scenario.status === 'scenario_needed' && res.scenario.whatShouldHappen === null) {
        // Still in discovery — append the Organizer's refined turn (keeps all prior content).
        setDiscovery([...nextMsgs, organizerTurn(res.scenario)])
        return
      }

      // Discovery ended — the Organizer has enough to draft a WSH (or recognised a scenario).
      // Always go to the WSH step for approval; approval leads straight into Planning.
      setWhatShouldHappen(res.scenario.whatShouldHappen ?? '')
      setStep('wsh')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  function buildDetails(): EventDetails {
    // guestCount now comes from the idea (extracted prefill), not a required form field. Guard the
    // empty/non-numeric case so the FED never carries NaN; the engine treats 0 as "unspecified".
    const guests = Number(total)
    return {
      category,
      guestCount: Number.isFinite(guests) && guests > 0 ? guests : 0,
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
      // Planning is created from the single understanding step — the approved "what should happen" description.
      const res = await generateFromIdeaAction(
        buildFutureEventDescription({ clientRequest: idea, description: whatShouldHappen.trim() || '', details, location }),
        projectId,
      )
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
            <p className="mb-2 text-sm text-slate-600">
              Your Planning is ready. Continue to the Project Workspace to begin organizing your event.
            </p>
            <Link
              href={`/${locale}/dashboard/projects/${projectId}?created=1`}
              className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto"
            >
              Continue to Project Workspace
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
        {/* Approve leads STRAIGHT into Planning (Planning Engine V2) — no legacy category form.
            The plan is generated from the approved "what should happen" plus the details already
            extracted from the idea. */}
        <button type="button" disabled={loading || !whatShouldHappen.trim()} onClick={() => void submitDetails()} className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? tf('generating') : 'Approve & continue'}
        </button>

        {/* Gates/errors after Approve — sign-in / One Event License. Kept a SIBLING of the button
            (never nesting BuyEventLicenseButton's own <form>) so the license CTA submits to Stripe. */}
        {(error || gate) && (
          <div ref={gateRef} className="space-y-4">
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

  return null
}
