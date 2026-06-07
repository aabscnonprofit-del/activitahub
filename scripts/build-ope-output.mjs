#!/usr/bin/env node
/**
 * Temporary OPE Output Builder.
 *
 * Transforms a composed plan skeleton + calculated budget into the exact customer-facing
 * structure defined in ACTIVITY_PLANNER_OUTPUTS_V1.md (sections A–E, plus an F placeholder).
 *
 * Input  : tmp/ope-composed/*.sample.json  (produced by compose-ope-samples.mjs —
 *          contains scenario_echo, timeline_sections, risks, templates, and the real budget).
 * Output : tmp/ope-output/*.output.json
 *
 * Pure deterministic data mapping. No AI (message text + summary left as placeholders),
 * no UI, no API, no database. Uses existing production data only.
 *
 * Usage: node scripts/build-ope-output.mjs   (run compose-ope-samples.mjs first)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSED_DIR = join(ROOT, "tmp", "ope-composed");
const OUT_DIR = join(ROOT, "tmp", "ope-output");
const load = (abs) => JSON.parse(readFileSync(abs, "utf8"));

// --- Helpers -------------------------------------------------------------

/** Turn a phase window [daysBefore_min, daysBefore_max] into a human "when" label. */
function humanWhen([a, b]) {
  if (a === 0 && b === 0) return "Day of";
  if (a < 0) return "After the event";
  if (b >= 14) return `${Math.round(a / 7)}–${Math.round(b / 7)} weeks before`;
  return `${a}–${b} days before`;
}

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

/** Decide whether a risk applies to this scenario (filters conditional risks). */
function riskApplies(risk, scenario) {
  if (risk.applies_if === "always" || risk.applies_if == null) return true;
  // conditional flags the scenario may set (default: not present ⇒ excluded)
  const flags = {
    drop_off_children: scenario._extra?.drop_off_children === true,
    outdoor: ["public_park", "backyard_home", "outdoor"].includes(scenario.venue_type),
  };
  return flags[risk.applies_if] === true;
}

// Map module template names → the four customer message slots.
const MESSAGE_SLOTS = [
  { out: "invitation", names: ["invitation"] },
  { out: "reminder", names: ["rsvp_reminder", "reminder"] },
  { out: "thank_you", names: ["thank_you"] },
  { out: "feedback", names: ["feedback_request", "feedback"] },
];

// --- The builder ---------------------------------------------------------

function buildOutput(sample) {
  const s = sample.scenario_echo;
  const pos = sample.plan_output_skeleton;
  const ts = sample.timeline_sections;

  // A. What you told us — echo scenario
  const section_a_what_you_told_us = {
    activity_type: s.activity_type,
    guest_count: s.guest_count,
    guest_breakdown: s._extra?.guest_breakdown ?? null,
    age_group: s.age_group,
    venue_type: s.venue_type,
    region: s.region,
    budget: s.budget,
    special_requirements: s.special_requirements,
  };

  // B. Your Plan — grouped timeline + three checklists
  const timeline = sample.phases.map((p) => ({
    phase: p.id,
    name: p.name,
    when: humanWhen(p.window_days_before),
    goal: p.goal,
  }));
  const section_b_your_plan = {
    summary: null, // AI placeholder — no AI in this builder
    timeline,
    preparation_checklist: ts.preparation.tasks.map((t) => ({ id: t.id, task: t.title, done: false })),
    day_of_checklist: ts.day_of.tasks.map((t) => ({ id: t.id, task: t.title, done: false })),
    after_event_checklist: ts.after.tasks.map((t) => ({ id: t.id, task: t.title, done: false })),
  };

  // C. Budget — low/likely/high + key cost drivers + category rollups
  const b = pos.budget;
  const section_c_budget = b.is_priced
    ? {
        currency: b.currency,
        low: b.estimate.low,
        likely: b.estimate.likely,
        high: b.estimate.high,
        contingency: b.contingency,
        key_cost_drivers: b.key_cost_drivers,
        category_rollups: b.rollup_by_category,
        levers_note: null, // AI placeholder (engine supplies which drivers; AI writes the prose)
        disclaimer: b.meta?.disclaimer ?? null,
      }
    : { priced: false, note: b.notes?.join("; ") ?? "not priced" };

  // D. Key Risks — filtered applicable risks + mitigations
  const applicable = sample.risks.filter((r) => riskApplies(r, s));
  const excluded = sample.risks.filter((r) => !riskApplies(r, s)).map((r) => ({ id: r.id, applies_if: r.applies_if }));
  applicable.sort(
    (x, y) => (y.never_drop ? 1 : 0) - (x.never_drop ? 1 : 0) ||
      (SEVERITY_RANK[x.severity] ?? 9) - (SEVERITY_RANK[y.severity] ?? 9)
  );
  const section_d_key_risks = {
    risks: applicable.map((r) => ({
      id: r.id,
      name: r.name,
      severity: r.severity,
      never_drop: !!r.never_drop,
      mitigation: r.mitigation,
      source_module: r._module,
    })),
    excluded_conditional: excluded,
  };

  // E. Ready Messages — invitation / reminder / thank-you / feedback (text = placeholder)
  const templates = sample.templates;
  const section_e_ready_messages = {};
  for (const slot of MESSAGE_SLOTS) {
    const tpl = templates.find((t) => slot.names.includes(t.name));
    section_e_ready_messages[slot.out] = tpl
      ? {
          template_id: tpl.id,
          required: !!tpl.required,
          variables: tpl.variables,
          text: null, // AI placeholder
          placeholder: `[${slot.out} — to be generated by AI using: ${tpl.variables.join(", ")}]`,
        }
      : { template_id: null, available: false };
  }

  // F. Upgrade path — placeholder (no AI)
  const section_f_upgrade_path = {
    current_scale: s.guest_count,
    threshold_hint: null,
    text: null,
    placeholder: "[upgrade-path copy — to be generated by AI]",
  };

  return {
    _meta: {
      kind: "activity-planner-output",
      format: "ACTIVITY_PLANNER_OUTPUTS_V1",
      modules_used: sample.modules_used,
      builder: "output-builder-mvp-1",
      ai_layer: "not-run (message text + summaries are placeholders)",
    },
    section_a_what_you_told_us,
    section_b_your_plan,
    section_c_budget,
    section_d_key_risks,
    section_e_ready_messages,
    section_f_upgrade_path,
  };
}

// --- Run -----------------------------------------------------------------

const INPUTS = [
  { in: "birthday-young-kids.sample.json", out: "birthday-young-kids.output.json", label: "Birthday — Young Kids" },
  { in: "bbq-core.sample.json", out: "bbq-core.output.json", label: "BBQ" },
];

if (!existsSync(COMPOSED_DIR)) {
  console.error("Composed samples not found. Run: node scripts/compose-ope-samples.mjs");
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

console.log("\nOPE Output Builder → tmp/ope-output/ (throwaway, not committed)\n");
const built = [];
for (const item of INPUTS) {
  const samplePath = join(COMPOSED_DIR, item.in);
  if (!existsSync(samplePath)) { console.error(`  missing ${item.in} — run compose-ope-samples.mjs first`); continue; }
  const out = buildOutput(load(samplePath));
  const outPath = join(OUT_DIR, item.out);
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  built.push({ item, out, outPath });

  const c = out.section_c_budget;
  console.log(`  ${item.label}`);
  console.log(`    A what_you_told_us: ${out.section_a_what_you_told_us.activity_type}, ${out.section_a_what_you_told_us.guest_count} guests, ${out.section_a_what_you_told_us.region}`);
  console.log(`    B timeline ${out.section_b_your_plan.timeline.length} phases · prep ${out.section_b_your_plan.preparation_checklist.length} · day-of ${out.section_b_your_plan.day_of_checklist.length} · after ${out.section_b_your_plan.after_event_checklist.length}`);
  console.log(`    C budget ${c.priced === false ? "(not priced)" : `Low $${c.low} · Likely $${c.likely} · High $${c.high} (${c.currency})`} · drivers ${c.key_cost_drivers?.length ?? 0} · UCD ${Object.keys(c.category_rollups ?? {}).join(",")}`);
  console.log(`    D risks ${out.section_d_key_risks.risks.length} applicable (${out.section_d_key_risks.excluded_conditional.length} conditional excluded)`);
  console.log(`    E messages ${Object.keys(out.section_e_ready_messages).join(", ")} (text = AI placeholder)`);
  console.log(`    written: ${outPath.replace(ROOT + "/", "")}\n`);
}
console.log("Sections A–F built deterministically. Message text & summaries are AI placeholders (null), by design.\n");
