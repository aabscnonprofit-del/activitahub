// OPE engine — compose + output builder + AI layer, ported from
// scripts/{compose-ope-samples,build-ope-output,ai-layer-ope}.mjs (deterministic,
// no real LLM; same logic, made type-safe and server-importable).

import { buildBudget } from './budget'
import type {
  CommTemplate,
  OpeModule,
  PhaseDef,
  PlannerOutput,
  RiskDef,
  Scenario,
  TaskDef,
} from './types'

const ceil = (n: number) => Math.ceil(n)

// ── compose helpers ─────────────────────────────────────────────────────────
function groupOfPhase(phase: PhaseDef): 'after' | 'day_of' | 'preparation' {
  const [a, b] = phase.window_days_before
  if (a < 0) return 'after'
  if (a === 0 && b === 0) return 'day_of'
  return 'preparation'
}

type QtyCtx = {
  guest_count: number
  kid_count: number | null
  tableware_buffer_pct?: number
  food_buffer_pct?: number
  kids_per_adult?: number
  game_count?: number
}
function computeQuantity(key: string, ctx: QtyCtx): number | null {
  switch (key) {
    case 'kid_count':
      return ctx.kid_count ?? null
    case 'cake_servings':
    case 'drinks_servings':
      return ctx.guest_count
    case 'meals':
      return ctx.food_buffer_pct != null ? ceil(ctx.guest_count * (1 + ctx.food_buffer_pct / 100)) : ctx.guest_count
    case 'tableware_units':
    case 'disposables_units':
      return ceil(ctx.guest_count * (1 + (ctx.tableware_buffer_pct ?? 0) / 100))
    case 'supervising_adults':
      return ctx.kid_count != null && ctx.kids_per_adult ? ceil(ctx.kid_count / ctx.kids_per_adult) : null
    case 'favors_count':
      return ctx.kid_count ?? null
    case 'game_count':
      return ctx.game_count ?? null
    default:
      return null
  }
}

interface Composed {
  modules_used: string[]
  scenario: Scenario
  phases: PhaseDef[]
  tasks: TaskDef[]
  risks: RiskDef[]
  templates: CommTemplate[]
  timeline_sections: Record<'preparation' | 'day_of' | 'after', { phases: PhaseDef[]; tasks: TaskDef[] }>
}

function compose(modules: OpeModule[], scenario: Scenario): { composed: Composed; output: PlannerOutput } {
  const tag = <T extends object>(arr: T[] | undefined, src: string): (T & { _module: string })[] =>
    (arr ?? []).map((x) => ({ ...x, _module: src }))

  const tasks: TaskDef[] = []
  const risks: RiskDef[] = []
  const templates: CommTemplate[] = []
  const phases: PhaseDef[] = []
  let config_defaults: Record<string, number> = {}
  const costDrivers = []
  const seenPhase = new Set<string>()

  for (const m of modules) {
    const src = m._meta.module
    tasks.push(...tag(m.tasks, src))
    risks.push(...tag(m.risks, src))
    templates.push(...tag(m.communication_templates, src))
    costDrivers.push(...tag(m.cost_drivers, src))
    for (const p of m.phases ?? []) {
      if (!seenPhase.has(p.id)) {
        seenPhase.add(p.id)
        phases.push({ ...p, _module: src })
      }
    }
    config_defaults = { ...config_defaults, ...(m.config_defaults ?? {}) }
  }

  // Derived quantities (counts only).
  const ctx: QtyCtx = {
    guest_count: scenario.guest_count,
    kid_count: scenario.kid_count,
    tableware_buffer_pct: config_defaults.tableware_buffer_pct,
    food_buffer_pct: config_defaults.food_buffer_pct,
    kids_per_adult: config_defaults.kids_per_adult,
    game_count: config_defaults.game_count,
  }
  const derivedKeys = new Set<string>()
  for (const m of modules) for (const k of Object.keys(m.derived_quantities ?? {})) derivedKeys.add(k)
  const derivedValues: Record<string, number | null> = {}
  for (const k of derivedKeys) derivedValues[k] = computeQuantity(k, ctx)

  const budget = buildBudget(scenario, costDrivers, config_defaults, derivedValues)

  // Timeline grouping.
  const phaseGroup: Record<string, 'preparation' | 'day_of' | 'after'> = Object.fromEntries(
    phases.map((p) => [p.id, groupOfPhase(p)]),
  )
  const phaseOrder: Record<string, number> = Object.fromEntries(phases.map((p, i) => [p.id, i]))
  const sortByPhase = (a: TaskDef, b: TaskDef) => (phaseOrder[a.phase] ?? 99) - (phaseOrder[b.phase] ?? 99)
  const timeline_sections = {
    preparation: { phases: [] as PhaseDef[], tasks: [] as TaskDef[] },
    day_of: { phases: [] as PhaseDef[], tasks: [] as TaskDef[] },
    after: { phases: [] as PhaseDef[], tasks: [] as TaskDef[] },
  }
  for (const p of phases) timeline_sections[groupOfPhase(p)].phases.push(p)
  for (const t of [...tasks].sort(sortByPhase)) timeline_sections[phaseGroup[t.phase] ?? 'preparation'].tasks.push(t)

  const composed: Composed = {
    modules_used: modules.map((m) => m._meta.module),
    scenario,
    phases,
    tasks,
    risks,
    templates,
    timeline_sections,
  }

  const output = buildOutput(composed, budget)
  return { composed, output }
}

// ── output builder ──────────────────────────────────────────────────────────
function humanWhen([a, b]: [number, number]): string {
  if (a === 0 && b === 0) return 'Day of'
  if (a < 0) return 'After the event'
  if (b >= 14) return `${Math.round(a / 7)}–${Math.round(b / 7)} weeks before`
  return `${a}–${b} days before`
}
const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }
function riskApplies(risk: RiskDef, scenario: Scenario): boolean {
  if (risk.applies_if === 'always' || risk.applies_if == null) return true
  const flags: Record<string, boolean> = {
    drop_off_children: false,
    outdoor: ['public_park', 'backyard_home', 'outdoor'].includes(scenario.venue_type ?? ''),
  }
  return flags[risk.applies_if] === true
}
const MESSAGE_SLOTS = [
  { out: 'invitation', names: ['invitation'] },
  { out: 'reminder', names: ['rsvp_reminder', 'reminder'] },
  { out: 'thank_you', names: ['thank_you'] },
  { out: 'feedback', names: ['feedback_request', 'feedback'] },
]

function buildOutput(c: Composed, budget: PlannerOutput['section_c_budget']): PlannerOutput {
  const s = c.scenario
  const ts = c.timeline_sections

  const timeline = c.phases.map((p) => ({
    phase: p.id,
    name: p.name,
    when: humanWhen(p.window_days_before),
    goal: p.goal,
  }))

  const applicable = c.risks.filter((r) => riskApplies(r, s))
  const excluded = c.risks.filter((r) => !riskApplies(r, s)).map((r) => ({ id: r.id, applies_if: r.applies_if }))
  applicable.sort(
    (x, y) =>
      (y.never_drop ? 1 : 0) - (x.never_drop ? 1 : 0) ||
      (SEVERITY_RANK[x.severity] ?? 9) - (SEVERITY_RANK[y.severity] ?? 9),
  )

  const section_e_ready_messages: PlannerOutput['section_e_ready_messages'] = {}
  for (const slot of MESSAGE_SLOTS) {
    const tpl = c.templates.find((t) => slot.names.includes(t.name))
    section_e_ready_messages[slot.out] = tpl
      ? { template_id: tpl.id, required: !!tpl.required, variables: tpl.variables, text: null }
      : { template_id: null, available: false, text: null }
  }

  return {
    _meta: {
      kind: 'activity-planner-output',
      format: 'ACTIVITY_PLANNER_OUTPUTS_V1',
      modules_used: c.modules_used,
      ai_layer: 'filled',
    },
    section_a_what_you_told_us: {
      activity_type: s.activity_type,
      guest_count: s.guest_count,
      guest_breakdown: s.guest_breakdown,
      age_group: s.age_group,
      venue_type: s.venue_type,
      location: s.location,
      region: s.region,
      budget: s.budget,
      special_requirements: s.special_requirements,
    },
    section_b_your_plan: {
      summary: null,
      headline: null,
      timeline,
      preparation_checklist: ts.preparation.tasks.map((t) => ({ id: t.id, task: t.title, done: false })),
      day_of_checklist: ts.day_of.tasks.map((t) => ({ id: t.id, task: t.title, done: false })),
      after_event_checklist: ts.after.tasks.map((t) => ({ id: t.id, task: t.title, done: false })),
    },
    section_c_budget: { ...budget, levers_note: null },
    section_d_key_risks: {
      risks: applicable.map((r) => ({
        id: r.id,
        name: r.name,
        severity: r.severity,
        never_drop: !!r.never_drop,
        mitigation: r.mitigation,
        source_module: r._module,
      })),
      excluded_conditional: excluded,
    },
    section_e_ready_messages,
    section_f_upgrade_path: { current_scale: s.guest_count, threshold_hint: null, text: null },
  }
}

// ── AI layer (deterministic templating) ─────────────────────────────────────
const VENUE_LABEL: Record<string, string> = {
  backyard_home: 'a backyard / home',
  public_park: 'a public park',
  outdoor: 'an outdoor venue',
}
const venueLabel = (v: string | null) => (v ? VENUE_LABEL[v] ?? v.replace(/_/g, ' ') : 'your venue')
const DRIVER_LABEL: Record<string, string> = {
  bbq_food_per_head: 'food', meals: 'food', drinks_per_head: 'drinks', favors_per_kid: 'party favors',
  cake: 'the cake', decorations: 'decorations', tableware_per_head: 'tableware', activity_materials: 'game & activity supplies',
  ice: 'ice', fuel: 'grill fuel', prizes: 'prizes', grill_rental: 'grill rental',
}
const driverLabel = (k: string) => DRIVER_LABEL[k] || k.replace(/_per_head|_per_kid/g, '').replace(/_/g, ' ')

function genSummary(out: PlannerOutput): string {
  const a = out.section_a_what_you_told_us
  const bd = a.guest_breakdown
  const who = bd ? ` (${bd.kids} kids and ${bd.adults} adults)` : ''
  const youngKids = a.age_group === 'young_kids' ? " It's paced to be easy to run and safe for young children." : ''
  const n = out.section_b_your_plan
  const counts = `${n.preparation_checklist.length} preparation steps, ${n.day_of_checklist.length} day-of steps, and ${n.after_event_checklist.length} wrap-up steps`
  return `A ${a.activity_type.toLowerCase()} for about ${a.guest_count} guests${who} at ${venueLabel(a.venue_type)} in ${a.region}.${youngKids} The plan walks you through ${counts}, with a budget estimate, key safety reminders, and ready-to-send messages.`
}

function genLeversNote(out: PlannerOutput): string | null {
  const c = out.section_c_budget
  if (!c.is_priced || !c.estimate) return null
  const top = (c.key_cost_drivers || []).slice(0, 2).map((d) => driverLabel(d.item_key))
  const topPhrase = top.length === 2 ? `${top[0]} and ${top[1]}` : top[0] || 'food and supplies'
  const cur = c.currency || 'USD'
  return `Your biggest costs are ${topPhrase}. Keeping things simple stays near the low end ($${c.estimate.low} ${cur}); adding extras pushes toward the high end ($${c.estimate.high} ${cur}). A typical plan lands around $${c.estimate.likely} ${cur}.`
}

function genMessages(out: PlannerOutput): Record<string, string | null> {
  const m = out.section_e_ready_messages
  const tok = (v: string) => `[${v}]`
  const result: Record<string, string | null> = {}
  for (const [slot, def] of Object.entries(m)) {
    if (!def || def.available === false) {
      result[slot] = def?.text ?? null
      continue
    }
    const v = def.variables || []
    const has = (x: string) => v.includes(x)
    const host = has('honoree_name') ? 'honoree_name' : has('host_name') ? 'host_name' : null
    const subj = host ? tok(host) : 'us'
    const when = [has('date') && tok('date'), has('time') && `at ${tok('time')}`].filter(Boolean).join(' ')
    const where = has('location') ? `, at ${tok('location')}` : ''
    const dietary = has('allergy_ask') ? ` ${tok('allergy_ask')}` : has('dietary_ask') ? ` ${tok('dietary_ask')}` : ''
    const bring = has('what_to_bring') ? ` ${tok('what_to_bring')}` : ''
    const rsvp = has('rsvp_deadline') ? ` Please RSVP by ${tok('rsvp_deadline')}.` : ''
    let text: string | null
    if (slot === 'invitation') {
      text = `You're invited${host ? ` to ${subj}'s event` : ''}! Join us ${when}${where}.${rsvp}${dietary}${bring}`.replace(/\s+/g, ' ').trim()
    } else if (slot === 'reminder') {
      const g = has('guest_name') ? `Hi ${tok('guest_name')}, ` : 'Hi, '
      text = `${g}just a reminder${host ? ` about ${subj}'s event` : ''} ${when}${where}. Hope to see you there!`.replace(/\s+/g, ' ').trim()
    } else if (slot === 'thank_you') {
      const g = has('guest_name') ? `Thank you, ${tok('guest_name')}` : 'Thank you'
      text = `${g}, for celebrating${host ? ` with ${subj}` : ' with us'}! It meant a lot to have you there.`.replace(/\s+/g, ' ').trim()
    } else if (slot === 'feedback') {
      const g = has('guest_name') ? `Hi ${tok('guest_name')}! ` : 'Hi! '
      text = `${g}We'd love your quick feedback — was the timing and setup good? Anything we could do better next time?`.trim()
    } else {
      text = def.text ?? null
    }
    result[slot] = text
  }
  return result
}

function genUpgrade(out: PlannerOutput): string {
  const n = out.section_f_upgrade_path.current_scale
  const scale = typeof n === 'number' ? ` (currently about ${n} guests)` : ''
  return `You can run this yourself. If your guest list grows significantly${scale}, or you'd rather have it fully handled, you can hand the plan to a certified organizer who can quote on it — you keep the plan either way.`
}

function genHeadline(out: PlannerOutput): string {
  const a = out.section_a_what_you_told_us
  const theme = (a.special_requirements || []).find((r) => /theme/i.test(r))
  const themePart = theme ? `${theme.replace(/\s*theme\s*/i, '').trim()} ` : ''
  const base =
    a.activity_type ||
    (a.region ? `Event in ${a.region}` : 'Your Event')
  return `${themePart ? themePart.charAt(0).toUpperCase() + themePart.slice(1) : ''}${base}`.trim()
}

function applyAiLayer(out: PlannerOutput): PlannerOutput {
  out.section_b_your_plan.summary = genSummary(out)
  out.section_b_your_plan.headline = genHeadline(out)
  out.section_c_budget.levers_note = genLeversNote(out)
  const msgs = genMessages(out)
  for (const [slot, text] of Object.entries(msgs)) {
    if (out.section_e_ready_messages[slot]) out.section_e_ready_messages[slot].text = text
  }
  out.section_f_upgrade_path.text = genUpgrade(out)
  return out
}

/** Full pipeline: compose → budget → output → AI layer. */
export function runEngine(modules: OpeModule[], scenario: Scenario): PlannerOutput {
  const { output } = compose(modules, scenario)
  return applyAiLayer(output)
}
