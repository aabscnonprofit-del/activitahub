// Communication Engine + AI layer — OPE Stage 6 (see docs/OPE_MASTER_SPEC.md §10).
//
// Deterministic templating (no real LLM) under the frozen-field guard: fills the
// plan summary, headline, budget levers note, ready-to-send messages, and the
// upgrade text. Extracted verbatim from engine.ts; logic unchanged. Free-text
// personalization (injecting allergy/theme into message bodies) is intentionally
// NOT added here (see OPE_GAP_ANALYSIS §10).

import type { PlannerOutput } from './types'

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

export function applyAiLayer(out: PlannerOutput): PlannerOutput {
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
