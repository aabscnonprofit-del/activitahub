'use client'

// EventPlanV2Review — Plan Review UI (Stage 5b of the Planning Layer Migration).
//
// Presentation ONLY. Renders the native Planning Engine V2 result (EventPlanV2) directly. It performs
// NO planning, derives NO PlannerInput, reconstructs NO information, and reads NO legacy six-section
// output — it only displays fields that already exist on the EventPlanV2 it is given.

import {
  Sparkles, CalendarClock, Wrench, Boxes, Users, HeartHandshake, ShieldAlert, LifeBuoy, Wallet, Info,
} from 'lucide-react'
import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'

const money = (n: number, cur = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function EventPlanV2Review({ plan }: { plan: EventPlanV2 }) {
  const cost = plan.costEstimate

  return (
    <div className="space-y-6">
      {/* Experience design — the intended feeling + arc */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
        <p className="text-sm font-semibold text-amber-300">Your prepared event</p>
        <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{plan.experienceDesign.intendedFeeling}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-brand-100">{plan.experienceDesign.arc}</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-100">{plan.structure.concept}</p>
      </div>

      {/* Itinerary — the sequence of moments */}
      {plan.itinerary.length > 0 && (
        <Section icon={<CalendarClock className="h-4 w-4 text-brand-500" />} title="The plan">
          <ol className="space-y-2">
            {plan.itinerary.map((m, i) => (
              <li key={`${m.name}-${i}`} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                {m.timing && <span className="shrink-0 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">{m.timing}</span>}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.purpose}</p>
                  {m.pacing && <p className="mt-0.5 text-xs text-slate-400">{m.pacing}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Logistics + resources + staffing */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plan.logistics.length > 0 && (
          <Section icon={<Wrench className="h-4 w-4 text-brand-500" />} title="Logistics">
            <ul className="space-y-1.5 text-sm text-slate-700">
              {plan.logistics.map((l, i) => <li key={i}>{l.description}{l.forMoment ? ` — ${l.forMoment}` : ''}</li>)}
            </ul>
          </Section>
        )}
        {plan.resources.length > 0 && (
          <Section icon={<Boxes className="h-4 w-4 text-brand-500" />} title="Resources">
            <ul className="space-y-1.5 text-sm text-slate-700">
              {plan.resources.map((r, i) => <li key={i}>{r.label}</li>)}
            </ul>
          </Section>
        )}
        {plan.staffing.length > 0 && (
          <Section icon={<Users className="h-4 w-4 text-brand-500" />} title="People">
            <ul className="space-y-1.5 text-sm text-slate-700">
              {plan.staffing.map((r, i) => <li key={i}><span className="font-medium text-slate-900">{r.role}</span> — {r.reason}</li>)}
            </ul>
          </Section>
        )}
      </div>

      {/* Cost estimate — derived from the real needs (range; priced later in Budget) */}
      <Section icon={<Wallet className="h-4 w-4 text-brand-500" />} title="Estimated cost">
        <div className="grid grid-cols-3 gap-3">
          {(['low', 'likely', 'high'] as const).map((band) => (
            <div key={band} className={`rounded-xl p-3 text-center ${band === 'likely' ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-slate-50'}`}>
              <p className="text-xs font-medium uppercase text-slate-500">{band}</p>
              <p className="mt-0.5 text-xl font-extrabold text-slate-900">{money(cost[band], cost.currency)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">{cost.basis}</p>
      </Section>

      {/* Participant suitability */}
      {plan.suitability.length > 0 && (
        <Section icon={<HeartHandshake className="h-4 w-4 text-brand-500" />} title="For your guests">
          <ul className="space-y-2 text-sm text-slate-700">
            {plan.suitability.map((s, i) => <li key={i}><span className="font-medium text-slate-900">{s.consideration}:</span> {s.accommodation}</li>)}
          </ul>
        </Section>
      )}

      {/* Safety */}
      {plan.safety.length > 0 && (
        <Section icon={<ShieldAlert className="h-4 w-4 text-rose-500" />} title="Safety">
          <ul className="space-y-2 text-sm text-slate-700">
            {plan.safety.map((s, i) => <li key={i}><span className="font-medium text-slate-900">{s.risk}:</span> {s.safeguard}</li>)}
          </ul>
        </Section>
      )}

      {/* Contingencies */}
      {plan.contingencies.length > 0 && (
        <Section icon={<LifeBuoy className="h-4 w-4 text-brand-500" />} title="If something changes">
          <ul className="space-y-2 text-sm text-slate-700">
            {plan.contingencies.map((c, i) => <li key={i}><span className="font-medium text-slate-900">{c.ifThisFails}:</span> {c.fallback}</li>)}
          </ul>
        </Section>
      )}

      {/* Feasibility + assumptions */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <p className="font-bold text-slate-900">Readiness</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{plan.feasibility.notes}</p>
            {plan.assumptions.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {plan.assumptions.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span><span className="font-medium text-slate-600">Assumption:</span> {a.statement} ({a.reason})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
