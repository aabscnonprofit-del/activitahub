// Planner / OPE engine — shared types (ported from scripts/*.mjs, made type-safe).

export type PlannerCategory = 'birthday' | 'bbq' | 'networking'

export interface PlannerLocation {
  city: string
  state?: string | null
  country: string
  postalCode?: string | null
}

/** What the user submits from the form. */
export interface PlannerInput {
  category: PlannerCategory
  guestCount: number
  adults?: number | null
  kids?: number | null
  venueType?: 'backyard_home' | 'public_park' | null
  budget?: number | null
  specialRequirements?: string[]
  location: PlannerLocation
}

/** Internal scenario shape the engine consumes (was hardcoded in the script). */
export interface Scenario {
  category: string
  activity_type: string
  guest_count: number
  guest_breakdown: { kids: number; adults: number } | null
  kid_count: number | null
  age_group: string
  venue_type: string | null
  region: string
  location: PlannerLocation
  budget: number | null
  currency: string
  special_requirements: string[]
}

// ── Module JSON pieces (only the fields the engine reads) ───────────────────
export interface CostDriver {
  id: string
  item_key: string
  basis: string
  driver: string | null
  cost_category: string
  _module?: string
}
export interface RiskDef {
  id: string
  name: string
  severity: string
  applies_if?: string | null
  never_drop?: boolean
  mitigation: string
  _module?: string
}
export interface PhaseDef {
  id: string
  name: string
  window_days_before: [number, number]
  goal: string
  _module?: string
}
export interface TaskDef {
  id: string
  title: string
  phase: string
  priority?: string
  _module?: string
}
export interface CommTemplate {
  id: string
  name: string
  required?: boolean
  variables: string[]
  _module?: string
}
export interface OpeModule {
  _meta: { module: string }
  config_defaults?: Record<string, number>
  derived_quantities?: Record<string, string>
  phases?: PhaseDef[]
  tasks?: TaskDef[]
  milestones?: unknown[]
  cost_drivers?: CostDriver[]
  risks?: RiskDef[]
  communication_templates?: CommTemplate[]
  resources?: unknown[]
  success_conditions?: unknown[]
  failure_modes?: unknown[]
  dependencies?: { critical_chains?: { never_drop?: boolean }[] }
}

// ── Pricing ─────────────────────────────────────────────────────────────────
export interface PriceSeed {
  item_key: string
  low: number
  likely: number
  high: number
  optional?: boolean
}
export interface PricingSeedFile {
  _meta: { currency: string; region: string; disclaimer?: string }
  seeds: PriceSeed[]
}
export type PricingSource = 'local' | 'historical' | 'fallback-seed' | 'none'
export interface ResolvedPricing {
  seeds: PriceSeed[]
  currency: string
  seedRegion: string
  disclaimer?: string
  source: PricingSource
  isFallback: boolean
  note: string | null
}

// ── Output ──────────────────────────────────────────────────────────────────
export interface BudgetBand {
  low: number
  likely: number
  high: number
}
export interface BudgetLine {
  item_key: string
  module?: string
  basis: string
  ucd: string
  quantity: number
  line: BudgetBand
  included_in: string[]
  optional: boolean
  lever: string | null
}
export interface BudgetResult {
  is_priced: boolean
  currency?: string
  region?: string
  category?: string
  estimate?: BudgetBand
  contingency?: { rate_pct: Record<string, number>; amount: Record<string, number>; ucd: string }
  subtotal?: BudgetBand
  rollup_by_category?: Record<string, BudgetBand>
  breakdown?: BudgetLine[]
  key_cost_drivers?: { item_key: string; likely: number; lever: string | null }[]
  meta?: { engine_version: string; seed_region?: string; disclaimer?: string }
  levers_note?: string | null
  notes?: string[]
  // location-aware pricing provenance
  pricing_source: PricingSource
  is_fallback: boolean
  fallback_note: string | null
}

export interface ChecklistItem {
  id: string
  task: string
  done: boolean
}
export interface MessageSlot {
  template_id: string | null
  required?: boolean
  variables?: string[]
  text: string | null
  available?: boolean
}
export interface PlannerOutput {
  _meta: { kind: string; format: string; modules_used: string[]; ai_layer: string }
  section_a_what_you_told_us: {
    activity_type: string
    guest_count: number
    guest_breakdown: { kids: number; adults: number } | null
    age_group: string
    venue_type: string | null
    location: PlannerLocation
    region: string
    budget: number | null
    special_requirements: string[]
  }
  section_b_your_plan: {
    summary: string | null
    headline: string | null
    timeline: { phase: string; name: string; when: string; goal: string }[]
    preparation_checklist: ChecklistItem[]
    day_of_checklist: ChecklistItem[]
    after_event_checklist: ChecklistItem[]
  }
  section_c_budget: BudgetResult
  section_d_key_risks: {
    risks: { id: string; name: string; severity: string; never_drop: boolean; mitigation: string; source_module?: string }[]
    excluded_conditional: { id: string; applies_if?: string | null }[]
  }
  section_e_ready_messages: Record<string, MessageSlot>
  section_f_upgrade_path: { current_scale: number; threshold_hint: number | null; text: string | null }
}

/**
 * DB-ready shape for future ActivLife Hub historical pricing / learning.
 * Not persisted yet — defined now so corrected budgets can be stored later
 * (city/state/country + activity_type + guest_count + per-line estimate vs
 * user-corrected price + source + timestamp).
 */
export interface HistoricalPriceRecord {
  city: string
  state: string | null
  country: string
  activity_type: string
  guest_count: number
  line_item: string // item_key
  estimated_price: number
  corrected_price: number | null
  source: string // 'seed' | 'fallback-seed' | 'user' | 'provider:<name>'
  created_at: string // ISO timestamp
}
