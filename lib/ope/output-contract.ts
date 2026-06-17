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

export type VenueNeed = 'required' | 'recommended' | 'not_needed'
export interface OpeVenueRequirements {
  venue_type: string | null
  indoor_outdoor: 'indoor' | 'outdoor' | 'either' | null
  capacity_needed: number | null
  weather_backup: VenueNeed
  parking: VenueNeed
  power: VenueNeed
  restroom: VenueNeed
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
  if (/(staff|instructor|coordinator|server|waiter|host|labou?r|crew|facilitator|guide|bartender|security|referee|first.?aid)/.test(k)) return 'staff'
  if (/(photographer|videographer|\bdj\b|entertainer|magician|vendor|performer|caterer)/.test(k)) return 'vendor'
  if (/(venue|space|hall|\broom\b|site|location_rental|permit)/.test(k)) return 'space'
  if (/(equipment|rental|\bav\b|sound|tent|table|chair|lighting|furniture|stage|grill)/.test(k)) return 'equipment'
  if (/(food|catering|cake|drink|beverage|\bbar|material|supplies|favou?r|consumable|cutlery|tableware|disposable|decor|fuel|\bice\b|prize|gift)/.test(k)) return 'material'
  return 'other'
}

/** A staff role derived from the event type when the budget carries no staff line. */
interface DerivedRole {
  role: string
  headcount: number | null
  estimated: boolean // true = a scaled estimate (lower confidence) vs a single lead role
}

/**
 * Deterministically derive likely staff roles + headcount from the event type, used
 * ONLY when the priced breakdown has no staff line. A single lead role (host /
 * coordinator / instructor) is reasonably confident; scaled roles (helpers,
 * volunteers, support) are flagged `estimated` and drive an organizer decision —
 * never asserted as certainty. Returns [] when the event type is unrecognized.
 */
function deriveStaffRoles(activityType: string, guestCount: number): DerivedRole[] {
  const k = (activityType || '').toLowerCase()
  const scaled = (per: number) => (guestCount > per ? Math.ceil(guestCount / per) : 0)
  const roles: DerivedRole[] = []

  if (/(class|yoga|fitness|workshop|lesson|course|training)/.test(k)) {
    roles.push({ role: 'Instructor', headcount: 1, estimated: false })
  } else if (/(wedding|marriage|ceremony)/.test(k)) {
    roles.push({ role: 'Coordinator', headcount: 1, estimated: false })
    const s = scaled(30)
    if (s) roles.push({ role: 'Server', headcount: s, estimated: true })
  } else if (/(bbq|barbecue|cookout|picnic|grill)/.test(k)) {
    roles.push({ role: 'Host', headcount: 1, estimated: false })
    const h = scaled(25)
    if (h) roles.push({ role: 'Helper', headcount: h, estimated: true })
  } else if (/(network|corporate|conference|seminar|meetup|mixer)/.test(k)) {
    roles.push({ role: 'Coordinator', headcount: 1, estimated: false })
    const s = scaled(40)
    if (s) roles.push({ role: 'Support staff', headcount: s, estimated: true })
  } else if (/(community|festival|gathering|charity|fundrais|volunteer|reunion)/.test(k)) {
    roles.push({ role: 'Coordinator', headcount: 1, estimated: false })
    const v = scaled(20)
    if (v) roles.push({ role: 'Volunteer', headcount: v, estimated: true })
  } else if (/(birthday|party|anniversary|graduation|baby ?shower|celebration)/.test(k)) {
    roles.push({ role: 'Host', headcount: 1, estimated: false })
    const h = scaled(30)
    if (h) roles.push({ role: 'Helper', headcount: h, estimated: true })
  }
  return roles
}

function venueIndoorOutdoor(venueType: string | null): 'indoor' | 'outdoor' | 'either' | null {
  if (!venueType) return null
  if (venueType === 'public_park' || venueType === 'backyard_home') return 'outdoor'
  return null
}

// Event-type leanings used to derive venue needs when the venue itself is unknown.
const isOutdoorLeaning = (k: string) => /(bbq|barbecue|cookout|picnic|grill|festival|community|gathering|charity|reunion)/.test(k)
const isIndoorLeaning = (k: string) => /(class|yoga|fitness|workshop|lesson|course|training|network|corporate|conference|seminar|meetup|mixer)/.test(k)
const needsPower = (k: string, reqs: string[]) =>
  isIndoorLeaning(k) || reqs.some((r) => /(av|sound|music|\bdj\b|microphone|projector|speaker|amp|pa system)/i.test(r))

/** A seating/space resource estimated from guest count (operational, not priced). */
interface DerivedResourceSpec {
  id: string
  label: string
  type: OpeResourceType
  quantity: number
  required: boolean
  unit: string
}

/**
 * Conservatively estimate seating / staging resources from the event type and guest
 * count, used to enrich Resources beyond the priced budget lines. Quantities are
 * deliberate over-estimates (e.g. 1 chair/guest) and are flagged via an organizer
 * decision — never precise. Returns [] for unknown types or zero guests.
 */
function deriveSeating(activityType: string, guestCount: number): DerivedResourceSpec[] {
  const k = (activityType || '').toLowerCase()
  if (guestCount <= 0) return []
  const out: DerivedResourceSpec[] = []
  const chairs = (required: boolean) =>
    out.push({ id: 'seating_chairs', label: 'Seating (chairs)', type: 'equipment', quantity: guestCount, required, unit: 'chairs' })
  const tables = (per: number, label: string, required: boolean) =>
    out.push({ id: 'seating_tables', label, type: 'equipment', quantity: Math.ceil(guestCount / per), required, unit: 'tables' })
  const area = () =>
    out.push({ id: 'registration_area', label: 'Registration / check-in area', type: 'space', quantity: 1, required: false, unit: 'area' })

  if (/(class|yoga|fitness|workshop|lesson|course|training)/.test(k)) {
    chairs(true)
    tables(4, 'Worktables', true) // classroom / workshop worktables
  } else if (/(bbq|barbecue|cookout|picnic|grill)/.test(k)) {
    tables(8, 'Picnic tables', true)
    chairs(false) // outdoor casual — seating optional
  } else if (/(network|corporate|conference|seminar|meetup|mixer)/.test(k)) {
    out.push({ id: 'seating_chairs', label: 'Seating (chairs)', type: 'equipment', quantity: Math.ceil(guestCount / 2), required: false, unit: 'chairs' }) // mostly standing
    area()
  } else if (/(birthday|party|anniversary|graduation|reunion|baby ?shower|celebration|wedding|festival|community|gathering)/.test(k)) {
    chairs(true)
    tables(8, 'Tables', true)
    if (guestCount > 40) area()
  }
  return out
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
  // Staff is a resource type. When the priced breakdown carries no staff line,
  // derive likely roles from the event type and ADD them as resources, so Staffing
  // stays a strict view of Resources. Derived roles are low-confidence (source
  // 'unknown', not budget-linked) and drive an organizer decision below — never
  // asserted as certainty.
  const budgetStaffCount = resources.filter((r) => r.type === 'staff').length
  const derivedRoles = budgetStaffCount === 0 ? deriveStaffRoles(a.activity_type, total) : []
  for (const dr of derivedRoles) {
    resources.push({
      id: `staff_${dr.role.toLowerCase().replace(/\s+/g, '_')}`,
      label: dr.role,
      type: 'staff',
      quantity: dr.headcount,
      required: true,
      unit: 'person',
      linked_budget_item_key: null, // derived, not a priced line
      lever: null,
    })
  }
  const staffResources = resources.filter((r) => r.type === 'staff')
  const hasDerivedStaff = staffResources.some((r) => r.linked_budget_item_key === null)
  const staffing: OpeStaffing = {
    roles: staffResources.map((r) => ({
      role: r.label,
      headcount: r.quantity,
      source: 'unknown',
      required: r.required,
    })),
    staffing_status:
      staffResources.length === 0 ? 'self_serviceable' : hasDerivedStaff ? 'unknown' : 'needs_hiring',
  }

  // ── Resource quantities: estimate seating/staging from guest count (operational,
  // not priced). Skipped when the budget already carries a furniture line. ──
  const hasFurniture = lines.some((l) => /\bchairs?\b|\btables?\b|seating/.test(l.item_key.toLowerCase()))
  const seatingSpecs = hasFurniture ? [] : deriveSeating(a.activity_type, total)
  for (const s of seatingSpecs) {
    resources.push({
      id: s.id,
      label: s.label,
      type: s.type,
      quantity: s.quantity,
      required: s.required,
      unit: s.unit,
      linked_budget_item_key: null, // derived estimate, not a priced line
      lever: null,
    })
  }

  // ── §5 Venue Requirements (derived from event type + guests + venue) ──
  const venueType = a.venue_type ?? null
  const ak = (a.activity_type || '').toLowerCase()
  const reqsList = a.special_requirements ?? []
  const venueIO = venueIndoorOutdoor(venueType)
  // Preference when the venue is unknown: lean from the activity type.
  const indoor_outdoor: OpeVenueRequirements['indoor_outdoor'] =
    venueIO ?? (isOutdoorLeaning(ak) ? 'outdoor' : isIndoorLeaning(ak) ? 'indoor' : null)
  const outdoorKnown = venueIO === 'outdoor'
  const outdoor = outdoorKnown || indoor_outdoor === 'outdoor'
  const capacity_needed = total > 0 ? Math.ceil(total * 1.1) : null

  const weather_backup: VenueNeed = outdoorKnown ? 'required' : isOutdoorLeaning(ak) ? 'recommended' : 'not_needed'
  const parking: VenueNeed = total > 50 ? 'required' : total >= 20 ? 'recommended' : 'not_needed'
  const power: VenueNeed = needsPower(ak, reqsList) ? (outdoor ? 'required' : 'recommended') : 'not_needed'
  const restroom: VenueNeed = total > 20 || outdoor ? 'required' : 'recommended'

  const must_haves: string[] = []
  if (capacity_needed) must_haves.push(`space for ~${capacity_needed} people`)
  const needLabel = (n: VenueNeed, req: string, rec: string) => {
    if (n === 'required') must_haves.push(req)
    else if (n === 'recommended') must_haves.push(rec)
  }
  needLabel(restroom, 'restroom access', 'restroom access (recommended)')
  needLabel(power, 'power supply', 'power supply (recommended)')
  needLabel(parking, 'parking', 'parking (recommended)')
  needLabel(weather_backup, 'weather backup / cover', 'weather backup (recommended)')

  const venue_requirements: OpeVenueRequirements = {
    venue_type: venueType,
    indoor_outdoor,
    capacity_needed,
    weather_backup,
    parking,
    power,
    restroom,
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
  // Staffing: estimated (low confidence) → confirm; priced roles → how to fill them.
  if (hasDerivedStaff) {
    organizer_decisions_required.push({
      id: 'staffing_estimated',
      prompt: `Staffing is an estimate (${staffing.roles
        .map((r) => (r.headcount != null ? `${r.headcount}× ${r.role}` : r.role))
        .join(', ')}). Confirm the roles and headcount.`,
      type: 'confirm',
      impacts: 'staffing',
      required_before: 'execute',
      linked_section: 'staffing',
    })
  } else if (staffResources.length > 0) {
    organizer_decisions_required.push({
      id: 'staffing_source',
      prompt: `Decide how you will fill these roles: ${staffResources.map((r) => r.label).join(', ')}.`,
      type: 'choice',
      impacts: 'staffing',
      required_before: 'execute',
      options: ['Do it yourself', 'Hire / source workers', 'Use a vendor'],
      linked_section: 'staffing',
    })
  }
  // Required, non-staff resources whose quantity could not be derived.
  const unknownQty = resources.filter((r) => r.type !== 'staff' && r.required && r.quantity === null)
  if (unknownQty.length > 0) {
    organizer_decisions_required.push({
      id: 'resource_quantity',
      prompt: `Confirm quantities for: ${unknownQty.map((r) => r.label).join(', ')}.`,
      type: 'input',
      impacts: 'resources',
      required_before: 'execute',
      linked_section: 'resources',
    })
  }
  // Estimated seating/staging quantities — low confidence, confirm before ordering.
  if (seatingSpecs.length > 0) {
    organizer_decisions_required.push({
      id: 'resource_quantity_estimated',
      prompt: `Resource quantities are estimates (${seatingSpecs
        .map((s) => `${s.quantity} ${s.unit}`)
        .join(', ')}). Confirm before ordering.`,
      type: 'confirm',
      impacts: 'resources',
      required_before: 'execute',
      linked_section: 'resources',
    })
  }
  // Weather backup is uncertain (outdoor-leaning but venue/season unconfirmed).
  if (venue_requirements.weather_backup === 'recommended') {
    organizer_decisions_required.push({
      id: 'weather_backup',
      prompt: 'Decide on a weather backup plan — recommended for this event, but it depends on the venue and season.',
      type: 'confirm',
      impacts: 'venue',
      required_before: 'execute',
      linked_section: 'venue',
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
    // Venue assumptions affect derived staffing/resources — flag the dependency.
    if (hasDerivedStaff) {
      organizer_decisions_required.push({
        id: 'venue_affects_staffing',
        prompt: 'No venue is set yet — the final staffing and resource needs may shift once you choose one.',
        type: 'confirm',
        impacts: 'venue',
        required_before: 'execute',
        linked_section: 'venue',
      })
    }
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
