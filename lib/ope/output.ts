// Output Builder — OPE Stage 14 (see docs/OPE_MASTER_SPEC.md §14).
//
// Assembles the ACTIVITY_PLANNER_OUTPUTS_V1 plan object (sections A–F) from the
// composed skeleton + the budget result, invoking the Risk Engine for section D.
// Extracted verbatim from engine.ts buildOutput(); object shape and key order are
// unchanged so the serialized output is byte-for-byte identical.

import type { Composed } from './assembly'
import { evaluateRisks } from './risk'
import type { PlannerOutput } from './types'

function humanWhen([a, b]: [number, number]): string {
  if (a === 0 && b === 0) return 'Day of'
  if (a < 0) return 'After the event'
  if (b >= 14) return `${Math.round(a / 7)}–${Math.round(b / 7)} weeks before`
  return `${a}–${b} days before`
}
const MESSAGE_SLOTS = [
  { out: 'invitation', names: ['invitation'] },
  { out: 'reminder', names: ['rsvp_reminder', 'reminder'] },
  { out: 'thank_you', names: ['thank_you'] },
  { out: 'feedback', names: ['feedback_request', 'feedback'] },
]

export function buildOutput(c: Composed, budget: PlannerOutput['section_c_budget']): PlannerOutput {
  const s = c.scenario
  const ts = c.timeline_sections

  const timeline = c.phases.map((p) => ({
    phase: p.id,
    name: p.name,
    when: humanWhen(p.window_days_before),
    goal: p.goal,
  }))

  const { applicable, excluded } = evaluateRisks(c.risks, s)

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
