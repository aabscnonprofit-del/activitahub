import type { SavedPlan } from '@/lib/types'
import { applyBudgetCorrections } from './budget-overlay'

// ── Proposal Generator V1 — deterministic mapping layer (C1) ─────────────────
// Transforms a persisted SavedPlan into a client-facing ProposalViewModel. PURE
// and deterministic: no LLM, no I/O, no new data — it only re-shapes existing OPE
// output (result.plan) and applies the WP6 budget corrections so an organizer's
// price edits flow into the proposal. Lives in lib/workspace (not lib/ope) because
// it consumes a SavedPlan + the workspace budget overlay, keeping the engine layer
// free of a workspace dependency.

export interface ProposalBudget {
  priced: boolean
  currency: string
  low: number
  likely: number
  high: number
  /** Top cost drivers (label + likely amount), already humanized. */
  drivers: { label: string; amount: number }[]
  contingencyPct: number | null
  perSession: boolean
  seriesTotalLikely: number | null
  /** Fallback / disclaimer note from the engine, if any. */
  note: string | null
}

export interface ProposalRisk {
  name: string
  severity: string
  mitigation: string
}

export interface ProposalFacts {
  guests: number | null
  guestBreakdown: { kids: number; adults: number } | null
  location: string
  budgetTarget: number | null
  cadence: string | null
}

export interface ProposalViewModel {
  /** False when the plan isn't plan_ready — the page shows a "not available" note. */
  ready: boolean
  notReadyReason: 'needs_clarification' | 'unsupported' | 'handoff' | null
  eventTitle: string
  activityType: string
  summary: string | null
  facts: ProposalFacts
  timeline: { phase: string; name: string; when: string; goal: string }[]
  budget: ProposalBudget | null
  risks: ProposalRisk[]
  /** Included services/resources = the required (non-optional) priced budget lines. */
  included: { label: string; note: string | null }[]
}

const humanize = (key: string) => key.replace(/_/g, ' ')

const severityRank = (s: string) => (/high|critical/i.test(s) ? 0 : /medium/i.test(s) ? 1 : 2)

/** Build a deterministic client proposal view model from a saved plan. */
export function buildProposal(plan: SavedPlan): ProposalViewModel {
  const result = plan.result
  const out = result.plan

  if (!out || result.status !== 'plan_ready') {
    const notReadyReason: ProposalViewModel['notReadyReason'] =
      result.status === 'needs_clarification'
        ? 'needs_clarification'
        : result.status === 'unsupported' || result.status === 'unsupported_modifier'
          ? 'unsupported'
          : 'handoff'
    return {
      ready: false,
      notReadyReason,
      eventTitle: plan.title || '',
      activityType: '',
      summary: null,
      facts: { guests: null, guestBreakdown: null, location: '', budgetTarget: null, cadence: null },
      timeline: [],
      budget: null,
      risks: [],
      included: [],
    }
  }

  const a = out.section_a_what_you_told_us
  const b = out.section_b_your_plan
  // Honor WP6 organizer corrections in the proposed budget.
  const c = applyBudgetCorrections(out.section_c_budget, plan.corrections)

  const location = [a.location.city, a.location.state, a.location.country].filter(Boolean).join(', ')

  const budget: ProposalBudget =
    c.is_priced && c.estimate
      ? {
          priced: true,
          currency: c.currency ?? 'usd',
          low: c.estimate.low,
          likely: c.estimate.likely,
          high: c.estimate.high,
          drivers: (c.key_cost_drivers ?? []).map((d) => ({ label: humanize(d.item_key), amount: d.likely })),
          contingencyPct: c.contingency?.rate_pct?.likely ?? null,
          perSession: c.per_session === true,
          seriesTotalLikely: c.series_total?.likely ?? null,
          note: c.fallback_note ?? c.meta?.disclaimer ?? null,
        }
      : {
          priced: false,
          currency: c.currency ?? 'usd',
          low: 0,
          likely: 0,
          high: 0,
          drivers: [],
          contingencyPct: null,
          perSession: false,
          seriesTotalLikely: null,
          note: c.fallback_note ?? null,
        }

  const risks = (out.section_d_key_risks?.risks ?? [])
    .slice()
    .sort((x, y) => severityRank(x.severity) - severityRank(y.severity))
    .map((r) => ({ name: r.name, severity: r.severity, mitigation: r.mitigation }))

  // Included = required (non-optional) priced lines, deduped by item_key, biggest first.
  const seen = new Set<string>()
  const included = (c.is_priced ? c.breakdown ?? [] : [])
    .filter((l) => !l.optional && !seen.has(l.item_key) && seen.add(l.item_key))
    .sort((x, y) => y.line.likely - x.line.likely)
    .map((l) => ({ label: humanize(l.item_key), note: null as string | null }))

  return {
    ready: true,
    notReadyReason: null,
    eventTitle: plan.title || b.headline || a.activity_type,
    activityType: a.activity_type,
    summary: b.summary,
    facts: {
      guests: a.guest_count,
      guestBreakdown: a.guest_breakdown,
      location,
      budgetTarget: a.budget,
      cadence: b.recurrence?.cadence_label ?? null,
    },
    timeline: b.timeline ?? [],
    budget,
    risks,
    included,
  }
}
