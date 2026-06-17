// OPE Output Contract V1 — pure assembler + validator (implements
// docs/OPE_OUTPUT_CONTRACT_V1.md). Reshapes the existing deterministic
// PlannerOutput into the 8-section contract shape. It is a PURE MAPPER:
//
//   • No AI, no I/O, no randomness.
//   • No pricing / budget recomputation — money is mirrored verbatim from
//     section_c_budget; numbers are never recalculated here.
//   • Missing data degrades to safe empties or explicit "organizer decision"
//     items; it never throws.
//
// Source of truth: docs/OPE_OUTPUT_CONTRACT_V1.md, docs/OPE_V1_TECHNICAL_DESIGN.md.

import type { PlannerOutput, BudgetResult, PricingSource } from './types'

// ── Contract types (8 sections) ─────────────────────────────────────────────

export interface OpeEventSummary {
  title: string
  event_type: string
  headcount: { total: number; breakdown: { adults: number; kids: number } | null }
  desired_outcome: string
  summary: string
  headline: string | null
  date_or_window: string | null
  location: { city: string | null; region: string | null; country: string | null }
  duration: string | null
  recurrence: { frequency: string; cadence_label: string } | null
}

export interface OpeTimelinePhase {
  id: string
  name: string
  when: string
  goal: string
}

export type OpeResourceType = 'staff' | 'vendor' | 'equipment' | 'material' | 'space' | 'other'
export interface OpeResource {
  id: string
  label: string
  type: OpeResourceType
  quantity: number | null
  required: boolean
  unit: string | null
  linked_budget_item_key: string | null
  lever: string | null
}

export interface OpeStaffRole {
  role: string
  headcount: number | null
  source: 'organizer' | 'vendor' | 'worker' | 'unknown'
  required: boolean
}
export interface OpeStaffing {
  roles: OpeStaffRole[]
  staffing_status: 'self_serviceable' | 'needs_hiring' | 'unknown'
}

export interface OpeVenueRequirements {
  venue_type: string | null
  indoor_outdoor: 'indoor' | 'outdoor' | 'either' | null
  capacity_needed: number | null
  must_haves: string[]
}

export interface OpeBudgetLineOut {
  item_key: string
  basis: string
  quantity: number
  line: { low: number; likely: number; high: number }
  optional: boolean
  lever: string | null
}
export interface OpeBudget {
  is_priced: boolean
  currency: string | null
  estimate: { low: number; likely: number; high: number } | null
  breakdown: OpeBudgetLineOut[]
  contingency: BudgetResult['contingency'] | null
  pricing_source: PricingSource
  is_fallback: boolean
  notes: string[]
}

export interface OpeRisk {
  id: string
  name: string
  severity: string
  mitigation: string
  never_drop: boolean
  source_module: string | null
}

export interface OpeDecision {
  id: string
  prompt: string
  type: 'choice' | 'confirm' | 'input' | 'lever'
  impacts: string
  required_before: 'send' | 'execute' | 'none'
  options?: string[]
  linked_section?: 'venue' | 'staffing' | 'budget' | 'resources' | 'timeline'
}

export interface OpeOutputV1 {
  status: 'plan_ready'
  event_summary: OpeEventSummary
  timeline: OpeTimelinePhase[]
  resources: OpeResource[]
  staffing: OpeStaffing
  venue_requirements: OpeVenueRequirements
  budget: OpeBudget
  risks: OpeRisk[]
  organizer_decisions_required: OpeDecision[]
  _meta: { contract_version: 'v1'; deterministic: true; modules_used: string[] }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const humanize = (k: string): string => k.replace(/[_-]+/g, ' ').trim()
const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Heuristic resource typing from the budget item key + basis (mapping only). */
function classifyResource(itemKey: string, basis: string): OpeResourceType {
  const k = `${itemKey} ${basis}`.toLowerCase()
  if (/(staff|instructor|coordinator|server|waiter|host|labou?r|crew|facilitator|guide|bartender|security)/.test(k)) return 'staff'
  if (/(photographer|videographer|\bdj\b|entertainer|magician|vendor|performer)/.test(k)) return 'vendor'
  if (/(venue|space|hall|\broom\b|site|location_rental)/.test(k)) return 'space'
  if (/(equipment|rental|\bav\b|sound|tent|table|chair|decor|lighting|furniture|stage)/.test(k)) return 'equipment'
  if (/(food|catering|cake|drink|beverage|material|supplies|favou?r|consumable|cutlery|tableware)/.test(k)) return 'material'
  return 'other'
}

function venueIndoorOutdoor(venueType: string | null): 'indoor' | 'outdoor' | 'either' | null {
  if (!venueType) return null
  if (venueType === 'public_park' || venueType === 'backyard_home') return 'outdoor'
  return null
}

// ── Assembler ───────────────────────────────────────────────────────────────

/**
 * Map a deterministic PlannerOutput into the OPE Output Contract V1 shape. Always
 * returns all 8 sections; missing source data becomes safe empties or explicit
 * organizer-decision items. Never recomputes money and never throws.
 */
export function assembleOpeOutput(plan: PlannerOutput): OpeOutputV1 {
  const a = plan.section_a_what_you_told_us
  const b = plan.section_b_your_plan
  const budgetSrc = plan.section_c_budget
  const risksSrc = plan.section_d_key_risks

  // ── §1 Event Summary ──
  const total = a.guest_count ?? 0
  const outcomeReq = (a.special_requirements ?? []).find((r) => /^outcome:/i.test(r))
  const desired_outcome =
    (outcomeReq ? outcomeReq.replace(/^outcome:\s*/i, '').trim() : '') ||
    b.headline ||
    `A successful ${humanize(a.activity_type)}`
  const summary =
    b.summary || `Plan for ${humanize(a.activity_type)}${total ? ` for ${total} guests` : ''}.`
  const event_summary: OpeEventSummary = {
    title: b.headline || `${cap(humanize(a.activity_type))}${total ? ` for ${total}` : ''}`,
    event_type: a.activity_type,
    headcount: {
      total,
      breakdown: a.guest_breakdown ? { adults: a.guest_breakdown.adults, kids: a.guest_breakdown.kids } : null,
    },
    desired_outcome,
    summary,
    headline: b.headline ?? null,
    date_or_window: null, // not carried in PlannerOutput today
    location: {
      city: a.location?.city || null,
      region: a.region || null,
      country: a.location?.country || null,
    },
    duration: null,
    recurrence: b.recurrence
      ? { frequency: b.recurrence.frequency, cadence_label: b.recurrence.cadence_label }
      : null,
  }

  // ── §2 Timeline ──
  const timeline: OpeTimelinePhase[] = (b.timeline ?? []).map((p) => ({
    id: p.phase,
    name: p.name,
    when: p.when,
    goal: p.goal,
  }))

  // ── §3 Resources (from priced budget lines) ──
  const lines = budgetSrc.breakdown ?? []
  const resources: OpeResource[] = lines.map((l) => ({
    id: l.item_key,
    label: cap(humanize(l.item_key)),
    type: classifyResource(l.item_key, l.basis),
    quantity: typeof l.quantity === 'number' ? l.quantity : null,
    required: !l.optional,
    unit: l.ucd || null,
    linked_budget_item_key: l.item_key,
    lever: l.lever ?? null,
  }))

  // ── §4 Staffing (staff-typed subset of resources) ──
  const staffResources = resources.filter((r) => r.type === 'staff')
  const staffing: OpeStaffing = {
    roles: staffResources.map((r) => ({
      role: r.label,
      headcount: r.quantity,
      source: 'unknown',
      required: r.required,
    })),
    staffing_status: staffResources.length === 0 ? 'self_serviceable' : 'unknown',
  }

  // ── §5 Venue Requirements ──
  const venueType = a.venue_type ?? null
  const io = venueIndoorOutdoor(venueType)
  const capacity_needed = total > 0 ? Math.ceil(total * 1.1) : null
  const must_haves: string[] = ['restroom access']
  if (capacity_needed) must_haves.push(`space for ~${capacity_needed} people`)
  if (io === 'outdoor') must_haves.push('weather contingency / cover')
  if (total > 50) must_haves.push('parking')
  const venue_requirements: OpeVenueRequirements = {
    venue_type: venueType,
    indoor_outdoor: io,
    capacity_needed,
    must_haves,
  }

  // ── §6 Budget (verbatim mirror; never recomputed) ──
  const notes: string[] = [...(budgetSrc.notes ?? [])]
  if (!budgetSrc.is_priced) notes.push('Automatic pricing unavailable — organizer must confirm a budget.')
  if (budgetSrc.is_fallback && budgetSrc.fallback_note) notes.push(budgetSrc.fallback_note)
  const budget: OpeBudget = {
    is_priced: budgetSrc.is_priced,
    currency: budgetSrc.currency ?? null,
    estimate: budgetSrc.estimate ?? null,
    breakdown: lines.map((l) => ({
      item_key: l.item_key,
      basis: l.basis,
      quantity: l.quantity,
      line: l.line,
      optional: l.optional,
      lever: l.lever ?? null,
    })),
    contingency: budgetSrc.contingency ?? null,
    pricing_source: budgetSrc.pricing_source,
    is_fallback: budgetSrc.is_fallback,
    notes,
  }

  // ── §7 Risks ──
  const risks: OpeRisk[] = (risksSrc.risks ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    severity: r.severity,
    mitigation: r.mitigation,
    never_drop: !!r.never_drop,
    source_module: r.source_module ?? null,
  }))

  // ── §8 Organizer Decisions Required ──
  const organizer_decisions_required: OpeDecision[] = []
  if (staffing.roles.length > 0 && staffing.staffing_status !== 'self_serviceable') {
    organizer_decisions_required.push({
      id: 'staffing_source',
      prompt: `Decide how you will staff: ${staffing.roles.map((r) => r.role).join(', ')}.`,
      type: 'choice',
      impacts: 'staffing',
      required_before: 'execute',
      options: ['Do it yourself', 'Hire / source workers', 'Use a vendor'],
      linked_section: 'staffing',
    })
  }
  if (!budget.is_priced) {
    organizer_decisions_required.push({
      id: 'budget_unpriced',
      prompt: 'Provide or confirm a budget — an automatic estimate is not available for this plan.',
      type: 'input',
      impacts: 'budget',
      required_before: 'send',
      linked_section: 'budget',
    })
  } else if (budget.is_fallback || budget.pricing_source === 'fallback-seed' || budget.pricing_source === 'none') {
    organizer_decisions_required.push({
      id: 'budget_fallback',
      prompt: 'Review the budget — it uses fallback pricing for this location and may need adjustment.',
      type: 'confirm',
      impacts: 'budget',
      required_before: 'send',
      linked_section: 'budget',
    })
  }
  if (!venue_requirements.venue_type) {
    organizer_decisions_required.push({
      id: 'venue_choose',
      prompt: 'Choose a venue that meets the listed requirements.',
      type: 'choice',
      impacts: 'venue',
      required_before: 'execute',
      linked_section: 'venue',
    })
  }
  const topLever = (budgetSrc.key_cost_drivers ?? []).find((d) => d.lever)
  if (topLever?.lever) {
    organizer_decisions_required.push({
      id: 'budget_lever',
      prompt: `Optional cost lever on "${cap(humanize(topLever.item_key))}": ${topLever.lever}.`,
      type: 'lever',
      impacts: 'budget',
      required_before: 'none',
      linked_section: 'budget',
    })
  }

  return {
    status: 'plan_ready',
    event_summary,
    timeline,
    resources,
    staffing,
    venue_requirements,
    budget,
    risks,
    organizer_decisions_required,
    _meta: {
      contract_version: 'v1',
      deterministic: true,
      modules_used: plan._meta?.modules_used ?? [],
    },
  }
}

// ── Validator ───────────────────────────────────────────────────────────────

export interface OpeOutputValidation {
  ok: boolean
  missing: string[] // sections absent or of the wrong kind
  issues: string[] // present but failing a minimum-content rule
}

/**
 * Assert the 8-section contract: every section present and correctly typed, plus
 * the per-section minimums from docs/OPE_OUTPUT_CONTRACT_V1.md §10. Pure; never throws.
 */
export function validateOpeOutput(o: OpeOutputV1): OpeOutputValidation {
  const missing: string[] = []
  const issues: string[] = []
  const need = (cond: boolean, key: string) => {
    if (!cond) missing.push(key)
  }

  need(!!o.event_summary && typeof o.event_summary === 'object', 'event_summary')
  need(Array.isArray(o.timeline), 'timeline')
  need(Array.isArray(o.resources), 'resources')
  need(!!o.staffing && Array.isArray(o.staffing.roles) && typeof o.staffing.staffing_status === 'string', 'staffing')
  need(!!o.venue_requirements && Array.isArray(o.venue_requirements.must_haves), 'venue_requirements')
  need(!!o.budget && typeof o.budget.is_priced === 'boolean', 'budget')
  need(Array.isArray(o.risks), 'risks')
  need(Array.isArray(o.organizer_decisions_required), 'organizer_decisions_required')

  if (o.event_summary) {
    if (!o.event_summary.title) issues.push('event_summary.title is empty')
    if (!o.event_summary.summary) issues.push('event_summary.summary is empty')
    if (!o.event_summary.desired_outcome) issues.push('event_summary.desired_outcome is empty')
    if (typeof o.event_summary.headcount?.total !== 'number') issues.push('event_summary.headcount.total is missing')
  }
  if (o.budget && o.budget.is_priced) {
    if (!o.budget.estimate) issues.push('budget.is_priced but estimate is null')
    if (!o.budget.breakdown?.length) issues.push('budget.is_priced but breakdown is empty')
  }

  return { ok: missing.length === 0 && issues.length === 0, missing, issues }
}
