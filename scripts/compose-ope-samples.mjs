#!/usr/bin/env node
/**
 * Temporary OPE composer output sampler (enriched).
 *
 * Composes production data modules into an enriched plan skeleton shaped toward
 * ACTIVITY_PLANNER_OUTPUTS_V1, and writes them to tmp/ope-composed/*.sample.json.
 * Samples are throwaway artifacts (tmp/ is gitignored) — NOT product output, not committed.
 *
 * Scope of this script (deliberately limited):
 *   - Merges modules (tasks / milestones / cost drivers / risks / templates / resources /
 *     success / failure / phases / config).
 *   - Echoes a HARDCODED sample scenario.
 *   - Computes DERIVED QUANTITIES (counts only — e.g. servings, supervising adults).
 *   - Groups tasks into a timeline (preparation / day_of / after) using phase windows.
 *   - Emits a plan_output_skeleton with placeholders where other layers will plug in.
 *
 * Explicitly NOT in scope here (placeholders only):
 *   - No AI copy (summaries, message text, narrative) — left null.
 *   - No cost engine (budget amounts) — left null.
 *   - No app code, API, UI, or database.
 *
 * Usage: node scripts/compose-ope-samples.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
const OUT_DIR = join(ROOT, "tmp", "ope-composed");

// --- Hardcoded sample scenarios (placeholders; no real customer data) ----

const SCENARIOS = {
  birthday: {
    category: "birthday",
    activity_type: "Kids Birthday Party",
    guest_count: 25,
    guest_breakdown: { kids: 15, adults: 10 },
    kid_count: 15,
    age_group: "young_kids",
    venue_type: "backyard_home",
    region: "Honolulu",
    budget: 600,
    currency: "USD",
    special_requirements: ["superhero theme", "nut allergy"],
  },
  bbq: {
    category: "bbq",
    activity_type: "BBQ / Family Picnic",
    guest_count: 30,
    guest_breakdown: { kids: 8, adults: 22 },
    kid_count: 8,
    age_group: "mixed",
    venue_type: "public_park",
    region: "Honolulu",
    budget: 450,
    currency: "USD",
    special_requirements: ["vegetarian options", "kids present", "BYO chairs"],
  },
};

// --- Helpers -------------------------------------------------------------

const ceil = (n) => Math.ceil(n);
const round = (n) => Math.round(n);
const round5 = (n) => Math.round(n / 5) * 5;

/**
 * Cost Engine MVP (OPE_COST_ENGINE_MVP_V1.md): qty × seeded price bands → Low/Likely/High.
 * Deterministic; no AI, no prices invented (prices come from the seed file). Returns the
 * budget object that fills plan_output_skeleton.budget. Falls back to is_priced:false when
 * out of scope (e.g. no seed for the region/category) so the Planner keeps a placeholder.
 */
function buildBudget(scenario, costDrivers, config, derivedValues) {
  if (!scenario.category || !scenario.region) {
    return { is_priced: false, notes: ["missing region/category"], estimate: null };
  }
  let seed;
  try {
    seed = load(`data/ope/pricing/${scenario.region.toLowerCase()}/${scenario.category}.v1.json`);
  } catch {
    return { is_priced: false, notes: [`no pricing seed for ${scenario.region}/${scenario.category}`], estimate: null };
  }
  const seedByKey = Object.fromEntries(seed.seeds.map((s) => [s.item_key, s]));
  const quantities = { guest_count: scenario.guest_count, kid_count: scenario.kid_count, ...derivedValues };
  const resolveQty = (name) => (name == null ? 1 : quantities[name]);

  const breakdown = [];
  for (const d of costDrivers) {
    const s = seedByKey[d.item_key];
    if (!s) return { is_priced: false, notes: [`unseeded driver: ${d.item_key}`], estimate: null };
    const qty = d.basis === "flat" ? 1 : resolveQty(d.driver);
    if (qty == null) return { is_priced: false, notes: [`unresolved quantity "${d.driver}" for ${d.item_key}`], estimate: null };
    const line = { low: round(s.low * qty), likely: round(s.likely * qty), high: round(s.high * qty) };
    const included_in = s.optional ? ["high"] : ["low", "likely", "high"];
    const lever = s.optional ? "up" : (line.low > 0 && line.high >= 2 * line.low ? "down" : null);
    breakdown.push({ item_key: d.item_key, module: d._module, basis: d.basis, ucd: d.cost_category, quantity: qty, line, included_in, optional: !!s.optional, lever });
  }

  const bands = ["low", "likely", "high"];
  const subtotal = { low: 0, likely: 0, high: 0 };
  const rollup = {};
  for (const b of breakdown) for (const band of bands) {
    if (!b.included_in.includes(band)) continue;
    subtotal[band] += b.line[band];
    (rollup[b.ucd] ??= { low: 0, likely: 0, high: 0 })[band] += b.line[band];
  }
  const cp = config.contingency_pct ?? 10;
  const rate = { low: 0, likely: cp, high: cp + 5 };
  const contingency = {}, estimate = {};
  for (const band of bands) {
    contingency[band] = round(subtotal[band] * rate[band] / 100);
    estimate[band] = round5(subtotal[band] + contingency[band]);
  }
  estimate.likely = Math.max(estimate.likely, estimate.low);
  estimate.high = Math.max(estimate.high, estimate.likely);

  const key_cost_drivers = [...breakdown]
    .sort((a, b) => b.line.likely - a.line.likely || b.line.high - a.line.high)
    .slice(0, 5)
    .map((b) => ({ item_key: b.item_key, likely: b.line.likely, lever: b.lever }));

  return {
    is_priced: true,
    currency: seed._meta.currency,
    region: scenario.region,
    category: scenario.category,
    estimate,
    contingency: { rate_pct: rate, amount: contingency, ucd: "UCD8" },
    subtotal,
    rollup_by_category: rollup,
    breakdown,
    key_cost_drivers,
    meta: { engine_version: "cost-mvp-1", seed_region: seed._meta.region, disclaimer: seed._meta.disclaimer },
  };
}

/** Bucket a phase into preparation / day_of / after from its window_days_before. */
function groupOfPhase(phase) {
  const [a, b] = phase.window_days_before;
  if (a < 0) return "after";
  if (a === 0 && b === 0) return "day_of";
  return "preparation";
}

/**
 * Compute a single known derived quantity by key. Counts only — never prices.
 * Unknown / non-numeric formulas return null (kept honest, with the source formula).
 */
function computeQuantity(key, ctx) {
  switch (key) {
    case "kid_count": return ctx.kid_count ?? null;
    case "cake_servings": return ctx.guest_count;
    case "drinks_servings": return ctx.guest_count;
    case "meals":
      return ctx.food_buffer_pct != null
        ? ceil(ctx.guest_count * (1 + ctx.food_buffer_pct / 100))
        : ctx.guest_count;
    case "tableware_units":
    case "disposables_units":
      return ceil(ctx.guest_count * (1 + (ctx.tableware_buffer_pct ?? 0) / 100));
    case "supervising_adults":
      return ctx.kid_count != null && ctx.kids_per_adult
        ? ceil(ctx.kid_count / ctx.kids_per_adult)
        : null;
    case "favors_count": return ctx.kid_count ?? null;
    case "game_count": return ctx.game_count ?? null;
    default: return null; // e.g. ice_units ("scaled from … ambient temperature")
  }
}

/** Merge modules into an enriched, output-shaped plan skeleton. */
function compose(modules, scenario) {
  const tag = (arr, src) => (arr ?? []).map((x) => ({ ...x, _module: src }));

  const merged = {
    modules_used: modules.map((m) => m._meta.module),
    tasks: [], milestones: [], cost_drivers: [], risks: [], templates: [],
    resources: [], success_conditions: [], failure_modes: [],
    never_drop_chains: [], phases: [], config_defaults: {},
  };

  const seenPhase = new Set();
  for (const m of modules) {
    const src = m._meta.module;
    merged.tasks.push(...tag(m.tasks, src));
    merged.milestones.push(...tag(m.milestones, src));
    merged.cost_drivers.push(...tag(m.cost_drivers, src));
    merged.risks.push(...tag(m.risks, src));
    merged.templates.push(...tag(m.communication_templates, src));
    merged.resources.push(...tag(m.resources, src));
    merged.success_conditions.push(...tag(m.success_conditions, src));
    merged.failure_modes.push(...tag(m.failure_modes, src));
    for (const c of m.dependencies?.critical_chains ?? []) {
      if (c.never_drop) merged.never_drop_chains.push({ ...c, _module: src });
    }
    for (const p of m.phases ?? []) {
      if (!seenPhase.has(p.id)) { seenPhase.add(p.id); merged.phases.push({ ...p, _module: src }); }
    }
    merged.config_defaults = { ...merged.config_defaults, ...(m.config_defaults ?? {}) };
  }

  // 1. scenario_echo (the requested seven fields + helpful extras)
  const scenario_echo = {
    activity_type: scenario.activity_type,
    guest_count: scenario.guest_count,
    age_group: scenario.age_group,
    venue_type: scenario.venue_type,
    region: scenario.region,
    budget: scenario.budget,
    special_requirements: scenario.special_requirements,
    _extra: { guest_breakdown: scenario.guest_breakdown, kid_count: scenario.kid_count, currency: scenario.currency },
  };

  // 3. derived_quantities — computed from the hardcoded scenario + merged config
  const ctx = {
    guest_count: scenario.guest_count,
    kid_count: scenario.kid_count,
    tableware_buffer_pct: merged.config_defaults.tableware_buffer_pct,
    food_buffer_pct: merged.config_defaults.food_buffer_pct,
    kids_per_adult: merged.config_defaults.kids_per_adult,
    game_count: merged.config_defaults.game_count,
  };
  const derivedKeys = new Set();
  for (const m of modules) for (const k of Object.keys(m.derived_quantities ?? {})) derivedKeys.add(k);
  const derived_quantities = {};
  const derivedValues = {};
  for (const k of derivedKeys) {
    const formula = modules.map((m) => m.derived_quantities?.[k]).find(Boolean) ?? null;
    const value = computeQuantity(k, ctx);
    derived_quantities[k] = { formula, value };
    derivedValues[k] = value;
  }

  // Cost Engine — real budget object (replaces the former budget_placeholder).
  const budget = buildBudget(scenario, merged.cost_drivers, merged.config_defaults, derivedValues);

  // 2 + 7. timeline_sections — phases & tasks grouped preparation / day_of / after
  const phaseGroup = Object.fromEntries(merged.phases.map((p) => [p.id, groupOfPhase(p)]));
  const phaseOrder = Object.fromEntries(merged.phases.map((p, i) => [p.id, i]));
  const sortByPhase = (a, b) => (phaseOrder[a.phase] ?? 99) - (phaseOrder[b.phase] ?? 99);
  const timeline_sections = { preparation: { phases: [], tasks: [] }, day_of: { phases: [], tasks: [] }, after: { phases: [], tasks: [] } };
  for (const p of merged.phases) {
    timeline_sections[groupOfPhase(p)].phases.push({ id: p.id, name: p.name, window_days_before: p.window_days_before, goal: p.goal });
  }
  for (const t of [...merged.tasks].sort(sortByPhase)) {
    const g = phaseGroup[t.phase] ?? "preparation";
    timeline_sections[g].tasks.push({ id: t.id, title: t.title, phase: t.phase, priority: t.priority, _module: t._module });
  }

  // 8. plan_output_skeleton — shaped to ACTIVITY_PLANNER_OUTPUTS_V1 (placeholders where layers plug in)
  const windowLabel = (phases) => {
    if (!phases.length) return null;
    const mins = phases.map((p) => p.window_days_before[0]);
    const maxs = phases.map((p) => p.window_days_before[1]);
    return { earliest_days_before: Math.max(...maxs), latest_days_before: Math.min(...mins) };
  };
  const plan_output_skeleton = {
    what_you_told_us: scenario_echo,
    summary_placeholder: { note: "AI layer not run — narrative summary to be generated", value: null },
    timeline: ["preparation", "day_of", "after"].map((g) => ({
      group: g,
      window: windowLabel(timeline_sections[g].phases),
      goals: timeline_sections[g].phases.map((p) => p.goal),
    })),
    checklist: {
      preparation: timeline_sections.preparation.tasks.map((t) => t.title),
      day_of: timeline_sections.day_of.tasks.map((t) => t.title),
      after: timeline_sections.after.tasks.map((t) => t.title),
    },
    budget, // real Cost Engine output: estimate · contingency · rollup_by_category · breakdown · key_cost_drivers
    risk_reminders: merged.risks.map((r) => ({ id: r.id, name: r.name, severity: r.severity, applies_if: r.applies_if, never_drop: !!r.never_drop, mitigation: r.mitigation, _module: r._module })),
    communication_template_slots: merged.templates.map((t) => ({ id: t.id, name: t.name, required: t.required, variables: t.variables, copy: null, _module: t._module })),
    upgrade_path_placeholder: {
      note: "AI layer not run — upgrade-path copy to be generated; scale threshold to be set by composer.",
      current_scale: scenario.guest_count,
      threshold_hint: null,
    },
  };

  return { scenario_echo, derived_quantities, timeline_sections, plan_output_skeleton, ...merged };
}

function writeSample(filename, modules, scenario) {
  const skeleton = compose(modules, scenario);
  const path = join(OUT_DIR, filename);
  writeFileSync(path, JSON.stringify(skeleton, null, 2) + "\n");
  return { path, skeleton };
}

// --- Run ----------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

const samples = [
  {
    file: "birthday-young-kids.sample.json",
    label: "Birthday — Young Kids (ages 3–7)",
    scenario: SCENARIOS.birthday,
    modules: [load("data/ope/modules/birthday/core.v1.json"), load("data/ope/modules/birthday/st1-young-kids.v1.json")],
  },
  {
    file: "bbq-core.sample.json",
    label: "BBQ — Core (standalone)",
    scenario: SCENARIOS.bbq,
    modules: [load("data/ope/modules/bbq/core.v1.json")],
  },
];

console.log("\nOPE composed samples → tmp/ope-composed/ (throwaway, not committed)\n");
for (const s of samples) {
  const { path, skeleton } = writeSample(s.file, s.modules, s.scenario);
  const rel = path.replace(ROOT + "/", "");
  const ts = skeleton.timeline_sections;
  const dq = Object.entries(skeleton.derived_quantities).map(([k, v]) => `${k}=${v.value}`).join(", ");
  console.log(`  ${s.label}`);
  console.log(`    modules:   ${skeleton.modules_used.join(" + ")}`);
  console.log(`    scenario:  ${skeleton.scenario_echo.activity_type}, ${skeleton.scenario_echo.guest_count} guests, ${skeleton.scenario_echo.venue_type}, ${skeleton.scenario_echo.region}`);
  console.log(`    merged:    tasks ${skeleton.tasks.length} · milestones ${skeleton.milestones.length} · cost_drivers ${skeleton.cost_drivers.length} · risks ${skeleton.risks.length} · templates ${skeleton.templates.length} · resources ${skeleton.resources.length} · success ${skeleton.success_conditions.length} · failure ${skeleton.failure_modes.length}`);
  console.log(`    timeline:  preparation ${ts.preparation.tasks.length} · day_of ${ts.day_of.tasks.length} · after ${ts.after.tasks.length}`);
  console.log(`    derived:   ${dq}`);
  const b = skeleton.plan_output_skeleton.budget;
  const bstr = b.is_priced ? `Low $${b.estimate.low} · Likely $${b.estimate.likely} · High $${b.estimate.high} (${b.currency})` : `not priced (${b.notes.join("; ")})`;
  console.log(`    budget:    ${bstr}`);
  console.log(`    skeleton:  what_you_told_us · summary(∅) · timeline · checklist · BUDGET(real) · risk_reminders · template_slots(copy ∅) · upgrade_path(∅)`);
  console.log(`    written:   ${rel}\n`);
}
console.log("Budget = real Cost Engine output (deterministic). Placeholders (∅) = AI copy not run yet, by design.\n");
