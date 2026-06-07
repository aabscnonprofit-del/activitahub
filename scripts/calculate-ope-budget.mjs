#!/usr/bin/env node
/**
 * Temporary OPE budget calculator (Cost Engine MVP).
 *
 * Implements OPE_COST_ENGINE_MVP_V1.md against the real production data:
 *   - module cost drivers   (data/ope/modules/**)
 *   - pricing seeds         (data/ope/pricing/<region>/<category>.v1.json)
 *   - derived quantities    (computed from config_defaults + scenario)
 *
 * Produces Low / Likely / High with breakdown, UCD rollup, and top cost drivers.
 *
 * Deterministic only — no LLM, no app code, no API, no UI, no database.
 * All amounts are illustrative (the event's costs, not ActivLife Hub fees).
 *
 * Usage: node scripts/calculate-ope-budget.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
const ceil = Math.ceil;
const round = Math.round;
const round5 = (n) => Math.round(n / 5) * 5;

// category → module files (composer would select these; hardcoded for MVP scope)
const MODULES = {
  birthday: ["data/ope/modules/birthday/core.v1.json", "data/ope/modules/birthday/st1-young-kids.v1.json"],
  bbq: ["data/ope/modules/bbq/core.v1.json"],
};

// --- Derived quantities (counts only — never prices) ---------------------
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
      return ctx.kid_count != null && ctx.kids_per_adult ? ceil(ctx.kid_count / ctx.kids_per_adult) : null;
    case "favors_count": return ctx.kid_count ?? null;
    case "game_count": return ctx.game_count ?? null;
    default: return null;
  }
}

// --- The cost engine -----------------------------------------------------
function calculate({ category, region, guest_count, kid_count, adult_count }) {
  const mods = (MODULES[category] ?? []).map(load);
  if (!mods.length) return { is_priced: false, notes: [`category "${category}" not in MVP scope`] };

  let seed;
  try {
    seed = load(`data/ope/pricing/${region.toLowerCase()}/${category}.v1.json`);
  } catch {
    return { is_priced: false, notes: [`no pricing seed for ${region}/${category}`] };
  }
  const seedByKey = Object.fromEntries(seed.seeds.map((s) => [s.item_key, s]));

  // merge config + collect cost drivers from modules
  const config = mods.reduce((c, m) => ({ ...c, ...(m.config_defaults ?? {}) }), {});
  const drivers = mods.flatMap((m) => (m.cost_drivers ?? []).map((d) => ({ ...d, _module: m._meta.module })));

  // resolve quantities
  const ctx = {
    guest_count, kid_count,
    tableware_buffer_pct: config.tableware_buffer_pct,
    food_buffer_pct: config.food_buffer_pct,
    kids_per_adult: config.kids_per_adult,
    game_count: config.game_count,
  };
  const quantities = { guest_count, kid_count };
  for (const m of mods) for (const k of Object.keys(m.derived_quantities ?? {})) quantities[k] = computeQuantity(k, ctx);
  const resolveQty = (name) => (name == null ? 1 : quantities[name]);

  // per-driver line bands
  const breakdown = [];
  for (const d of drivers) {
    const s = seedByKey[d.item_key];
    if (!s) return { is_priced: false, notes: [`unseeded driver: ${d.item_key}`] };
    const qty = d.basis === "flat" ? 1 : resolveQty(d.driver);
    if (qty == null) return { is_priced: false, notes: [`unresolved quantity "${d.driver}" for ${d.item_key}`] };
    const line = { low: round(s.low * qty), likely: round(s.likely * qty), high: round(s.high * qty) };
    const included_in = s.optional ? ["high"] : ["low", "likely", "high"];
    const lever = s.optional ? "up" : (line.low > 0 && line.high >= 2 * line.low ? "down" : null);
    breakdown.push({ item_key: d.item_key, module: d._module, basis: d.basis, ucd: d.cost_category, quantity: qty, line, included_in, optional: !!s.optional, lever });
  }

  // subtotals per band (honor optional inclusion)
  const bands = ["low", "likely", "high"];
  const subtotal = { low: 0, likely: 0, high: 0 };
  const rollup = {};
  for (const b of breakdown) {
    for (const band of bands) {
      if (!b.included_in.includes(band)) continue;
      subtotal[band] += b.line[band];
      (rollup[b.ucd] ??= { low: 0, likely: 0, high: 0 })[band] += b.line[band];
    }
  }

  // contingency: low 0% / likely config% / high config%+5
  const cp = config.contingency_pct ?? 10;
  const rate = { low: 0, likely: cp, high: cp + 5 };
  const contingency = {};
  const estimate = {};
  for (const band of bands) {
    contingency[band] = round(subtotal[band] * rate[band] / 100);
    estimate[band] = round5(subtotal[band] + contingency[band]);
  }
  // enforce monotonicity
  estimate.likely = Math.max(estimate.likely, estimate.low);
  estimate.high = Math.max(estimate.high, estimate.likely);

  const key_cost_drivers = [...breakdown]
    .sort((a, b) => b.line.likely - a.line.likely || b.line.high - a.line.high)
    .slice(0, 5)
    .map((b) => ({ item_key: b.item_key, likely: b.line.likely, lever: b.lever }));

  return {
    is_priced: true, currency: seed._meta.currency, region, category,
    inputs: { guest_count, kid_count, adult_count },
    estimate, contingency: { rate_pct: rate, amount: contingency, ucd: "UCD8" },
    subtotal, rollup_by_category: rollup, breakdown, key_cost_drivers,
  };
}

// --- Presentation --------------------------------------------------------
const fmt = (n) => "$" + n.toLocaleString("en-US");
function show(title, r) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(70));
  if (!r.is_priced) { console.log("  ❌ not priced: " + r.notes.join("; ")); return; }
  console.log(`  ${r.category} · ${r.region} · ${r.currency} · ${r.inputs.guest_count} guests` +
    (r.inputs.kid_count != null ? ` (${r.inputs.kid_count} kids / ${r.inputs.adult_count} adults)` : ""));
  console.log(`\n  ESTIMATE   Low ${fmt(r.estimate.low)}   ·   Likely ${fmt(r.estimate.likely)}   ·   High ${fmt(r.estimate.high)}`);
  console.log(`  (contingency ${r.contingency.rate_pct.low}/${r.contingency.rate_pct.likely}/${r.contingency.rate_pct.high}% → ` +
    `${fmt(r.contingency.amount.low)}/${fmt(r.contingency.amount.likely)}/${fmt(r.contingency.amount.high)})`);

  console.log(`\n  Breakdown ${"".padEnd(2)}${"low".padStart(13)}${"likely".padStart(10)}${"high".padStart(10)}`);
  for (const b of r.breakdown) {
    const tag = b.optional ? " (opt→high)" : "";
    console.log(`   ${(b.item_key + tag).padEnd(26)} ×${String(b.quantity).padEnd(4)} ${String(fmt(b.line.low)).padStart(8)}${String(fmt(b.line.likely)).padStart(10)}${String(fmt(b.line.high)).padStart(10)}  ${b.ucd}`);
  }

  console.log(`\n  Rollup by UCD category:`);
  for (const [ucd, v] of Object.entries(r.rollup_by_category).sort())
    console.log(`   ${ucd}   ${fmt(v.low).padStart(8)} / ${fmt(v.likely).padStart(8)} / ${fmt(v.high).padStart(8)}`);

  console.log(`\n  Top cost drivers (by Likely):`);
  r.key_cost_drivers.forEach((k, i) =>
    console.log(`   ${i + 1}. ${k.item_key.padEnd(24)} ${fmt(k.likely).padStart(8)}${k.lever ? `   lever:${k.lever}` : ""}`));
}

// --- Run -----------------------------------------------------------------
show("Birthday — 15 kids + 10 adults — Honolulu",
  calculate({ category: "birthday", region: "Honolulu", guest_count: 25, kid_count: 15, adult_count: 10 }));

show("BBQ — 30 guests — Honolulu",
  calculate({ category: "bbq", region: "Honolulu", guest_count: 30, kid_count: null, adult_count: null }));

console.log(`\n${"═".repeat(70)}`);
console.log("  Illustrative estimates of the event's costs (not ActivLife Hub fees).");
console.log("═".repeat(70) + "\n");
