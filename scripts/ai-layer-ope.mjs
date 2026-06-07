#!/usr/bin/env node
/**
 * OPE AI Layer — MVP v1 (working implementation).
 *
 * Implements the contract in docs/OPE_AI_LAYER_MVP_V1.md:
 *   - Input : an Activity Planner Output JSON (from build-ope-output.mjs).
 *   - Output: the SAME JSON with only the writable text fields filled.
 *   - Guard : freeze(input) === freeze(output) over all non-writable fields; any frozen-field
 *             change → reject with a validation error.
 *
 * The text generator here is a DETERMINISTIC, contract-conformant composer (no external LLM key
 * in this environment). It reuses only values already present in the output and never invents a
 * number, vendor, or fact. A real LLM would slot in behind the SAME guard — the guard is what
 * guarantees safety, not the generator.
 *
 * No UI, no API, no database, no website changes, no pricing changes.
 *
 * Usage:
 *   node scripts/ai-layer-ope.mjs            # run both samples + show results
 *   node scripts/ai-layer-ope.mjs --selftest # also prove the guard REJECTS a tampered output
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IN_DIR = join(ROOT, "tmp", "ope-output");
const OUT_DIR = join(ROOT, "tmp", "ope-ai");
const load = (abs) => JSON.parse(readFileSync(abs, "utf8"));
const clone = (x) => JSON.parse(JSON.stringify(x));

// ── Writable field paths (the ONLY fields the AI Layer may write) ───────────
// Mirrors the §1 allowlist of OPE_AI_LAYER_MVP_V1.md.
const WRITABLE = {
  summary: (o) => o.section_b_your_plan && delete o.section_b_your_plan.summary,
  leversNote: (o) => o.section_c_budget && delete o.section_c_budget.levers_note,
  messages: (o) => {
    const m = o.section_e_ready_messages || {};
    for (const k of Object.keys(m)) if (m[k]) delete m[k].text;
  },
  upgrade: (o) => o.section_f_upgrade_path && delete o.section_f_upgrade_path.text,
  optionalSiblings: (o) => {
    (o.section_b_your_plan?.timeline || []).forEach((t) => delete t.note);
    for (const key of ["preparation_checklist", "day_of_checklist", "after_event_checklist"])
      (o.section_b_your_plan?.[key] || []).forEach((t) => delete t.explanation);
    (o.section_d_key_risks?.risks || []).forEach((r) => delete r.explanation);
  },
  meta: (o) => {
    if (!o._meta) return;
    delete o._meta.ai_layer; delete o._meta.ai_model; delete o._meta.ai_layer_version;
  },
};

/** Produce the "frozen view": the object with all writable paths stripped. */
function freeze(obj) {
  const f = clone(obj);
  for (const strip of Object.values(WRITABLE)) strip(f);
  return f;
}

/** Stable, key-sorted stringify so comparison is order-independent. */
function stable(x) {
  if (Array.isArray(x)) return "[" + x.map(stable).join(",") + "]";
  if (x && typeof x === "object")
    return "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + stable(x[k])).join(",") + "}";
  return JSON.stringify(x);
}

/** The diff guard. Returns { ok, error }. */
function validate(input, output) {
  const a = stable(freeze(input));
  const b = stable(freeze(output));
  if (a === b) return { ok: true };
  // find a representative differing path for the error message
  const fa = freeze(input), fb = freeze(output);
  const diff = firstDiff(fa, fb, "");
  return { ok: false, error: `Frozen field changed at ${diff || "(unknown path)"} — output rejected.` };
}

function firstDiff(a, b, path) {
  if (stable(a) === stable(b)) return null;
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) === !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const d = firstDiff(a?.[k], b?.[k], path ? `${path}.${k}` : k);
      if (d) return d;
    }
  }
  return path || "(root)";
}

// ── Deterministic text generators (reuse data only) ────────────────────────

const VENUE = { backyard_home: "a backyard at home", public_park: "a public park", community_hall: "a community hall" };
const venueLabel = (v) => VENUE[v] || String(v || "").replace(/_/g, " ");

const DRIVER_LABEL = {
  party_food_per_head: "food for guests", bbq_food_per_head: "food (meat & vegetarian)",
  drinks_per_head: "drinks", favors_per_kid: "party favors", cake: "the cake",
  decorations: "decorations", tableware_per_head: "tableware", disposables_per_head: "disposables",
  activity_materials: "game & activity supplies", ice: "ice", fuel: "grill fuel",
  prizes: "prizes", grill_rental: "grill rental",
};
const driverLabel = (k) => DRIVER_LABEL[k] || String(k).replace(/_per_head|_per_kid/g, "").replace(/_/g, " ");

function genSummary(out) {
  const a = out.section_a_what_you_told_us;
  const bd = a.guest_breakdown;
  const who = bd ? ` (${bd.kids} kids and ${bd.adults} adults)` : "";
  const youngKids = a.age_group === "young_kids" ? " It's paced to be easy to run and safe for young children." : "";
  const n = out.section_b_your_plan;
  const counts = `${n.preparation_checklist.length} preparation steps, ${n.day_of_checklist.length} day-of steps, and ${n.after_event_checklist.length} wrap-up steps`;
  return `A ${a.activity_type.toLowerCase()} for about ${a.guest_count} guests${who} at ${venueLabel(a.venue_type)} in ${a.region}.${youngKids} The plan walks you through ${counts}, with a budget estimate, key safety reminders, and ready-to-send messages.`;
}

function genLeversNote(out) {
  const c = out.section_c_budget;
  if (c.priced === false || !c.low) return null;
  const top = (c.key_cost_drivers || []).slice(0, 2).map((d) => driverLabel(d.item_key));
  const topPhrase = top.length === 2 ? `${top[0]} and ${top[1]}` : top[0] || "food and supplies";
  const cur = c.currency || "USD";
  const money = (n) => `$${n}`;
  return `Your biggest costs are ${topPhrase}. Keeping things simple stays near the low end (${money(c.low)} ${cur}); adding extras pushes toward the high end (${money(c.high)} ${cur}). A typical plan lands around ${money(c.likely)} ${cur}.`;
}

function genMessages(out) {
  const m = out.section_e_ready_messages || {};
  const tok = (v) => `[${v}]`;                       // keep variables as intact placeholders
  const has = (vars, v) => vars.includes(v);
  const result = {};
  for (const [slot, def] of Object.entries(m)) {
    if (!def || def.available === false) { result[slot] = def?.text ?? null; continue; }
    const v = def.variables || [];
    const host = has(v, "honoree_name") ? "honoree_name" : has(v, "host_name") ? "host_name" : null;
    const subj = host ? tok(host) : "us";
    const when = [has(v, "date") && tok("date"), has(v, "time") && `at ${tok("time")}`].filter(Boolean).join(" ");
    const where = has(v, "location") ? `, at ${tok("location")}` : "";
    const dietary = has(v, "allergy_ask") ? ` ${tok("allergy_ask")}` : has(v, "dietary_ask") ? ` ${tok("dietary_ask")}` : "";
    const bring = has(v, "what_to_bring") ? ` ${tok("what_to_bring")}` : "";
    const rsvp = has(v, "rsvp_deadline") ? ` Please RSVP by ${tok("rsvp_deadline")}.` : "";

    let text;
    if (slot === "invitation") {
      text = `You're invited${host ? ` to ${subj}'s event` : ""}! Join us ${when}${where}.${rsvp}${dietary}${bring}`.replace(/\s+/g, " ").trim();
    } else if (slot === "reminder") {
      const g = has(v, "guest_name") ? `Hi ${tok("guest_name")}, ` : "Hi, ";
      text = `${g}just a reminder${host ? ` about ${subj}'s event` : ""} ${when}${where}. Hope to see you there!`.replace(/\s+/g, " ").trim();
    } else if (slot === "thank_you") {
      const g = has(v, "guest_name") ? `Thank you, ${tok("guest_name")}` : "Thank you";
      text = `${g}, for celebrating${host ? ` with ${subj}` : " with us"}! It meant a lot to have you there.`.replace(/\s+/g, " ").trim();
    } else if (slot === "feedback" || slot === "feedback_request") {
      const g = has(v, "guest_name") ? `Hi ${tok("guest_name")}! ` : "Hi! ";
      text = `${g}We'd love your quick feedback — was the timing and setup good? Anything we could do better next time?`.trim();
    } else {
      text = def.text ?? null;
    }
    result[slot] = text;
  }
  return result;
}

function genUpgrade(out) {
  const n = out.section_f_upgrade_path?.current_scale;
  const scale = typeof n === "number" ? ` (currently about ${n} guests)` : "";
  return `You can run this yourself. If your guest list grows significantly${scale}, or you'd rather have it fully handled, you can hand the plan to a certified organizer who can quote on it — you keep the plan either way.`;
}

// ── Apply the AI Layer ─────────────────────────────────────────────────────

function applyAiLayer(input) {
  const out = clone(input);

  if (out.section_b_your_plan) out.section_b_your_plan.summary = genSummary(out);
  if (out.section_c_budget) out.section_c_budget.levers_note = genLeversNote(out);
  const msgs = genMessages(out);
  for (const [slot, text] of Object.entries(msgs)) {
    if (out.section_e_ready_messages?.[slot]) out.section_e_ready_messages[slot].text = text;
  }
  if (out.section_f_upgrade_path) out.section_f_upgrade_path.text = genUpgrade(out);

  out._meta = { ...out._meta, ai_layer: "filled", ai_model: "deterministic-stub (contract-conformant)", ai_layer_version: "ai-mvp-1" };
  return out;
}

// ── Run ────────────────────────────────────────────────────────────────────

const SAMPLES = [
  { in: "birthday-young-kids.output.json", out: "birthday-young-kids.ai.json", label: "Birthday + Young Kids" },
  { in: "bbq-core.output.json", out: "bbq-core.ai.json", label: "BBQ" },
];

if (!existsSync(IN_DIR)) { console.error("Output JSON not found. Run: node scripts/compose-ope-samples.mjs && node scripts/build-ope-output.mjs"); process.exit(1); }
mkdirSync(OUT_DIR, { recursive: true });

const selftest = process.argv.includes("--selftest");
let failures = 0;

for (const s of SAMPLES) {
  const inPath = join(IN_DIR, s.in);
  if (!existsSync(inPath)) { console.error(`  missing ${s.in} — run the builder first`); failures++; continue; }
  const input = load(inPath);
  const output = applyAiLayer(input);
  const verdict = validate(input, output);

  console.log(`\n${"═".repeat(74)}`);
  console.log(`  ${s.label}`);
  console.log("═".repeat(74));

  const a = input.section_a_what_you_told_us;
  const c = input.section_c_budget;
  console.log(`  INPUT SUMMARY`);
  console.log(`    ${a.activity_type} · ${a.guest_count} guests · ${venueLabel(a.venue_type)} · ${a.region}`);
  console.log(`    budget ${c.priced === false ? "(not priced)" : `Low $${c.low} · Likely $${c.likely} · High $${c.high}`}`);
  console.log(`    text fields before: summary=${input.section_b_your_plan.summary} · levers_note=${c.levers_note} · invitation.text=${input.section_e_ready_messages.invitation.text} · upgrade.text=${input.section_f_upgrade_path.text}`);

  console.log(`\n  GENERATED TEXT`);
  console.log(`    B.summary: ${output.section_b_your_plan.summary}`);
  console.log(`    C.levers_note: ${output.section_c_budget.levers_note}`);
  for (const slot of Object.keys(output.section_e_ready_messages))
    console.log(`    E.${slot}: ${output.section_e_ready_messages[slot].text}`);
  console.log(`    F.upgrade: ${output.section_f_upgrade_path.text}`);

  console.log(`\n  VALIDATION (frozen-field guard)`);
  console.log(`    ${verdict.ok ? "✓ PASS — all non-writable fields identical (numbers, tasks, risks, timeline, milestones unchanged)" : "✗ REJECTED — " + verdict.error}`);
  if (!verdict.ok) failures++;

  const outPath = join(OUT_DIR, s.out);
  if (verdict.ok) { writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n"); console.log(`    written: ${outPath.replace(ROOT + "/", "")}`); }
  else console.log(`    NOT written (rejected).`);

  if (selftest) {
    // Prove the guard catches a frozen-field mutation (here: a budget number).
    const tampered = clone(output);
    if (tampered.section_c_budget?.likely != null) tampered.section_c_budget.likely += 1;
    const v2 = validate(input, tampered);
    console.log(`\n  SELF-TEST (tamper budget.likely by +1)`);
    console.log(`    ${v2.ok ? "✗ guard FAILED to catch tamper (bug!)" : "✓ guard correctly REJECTED: " + v2.error}`);
    if (v2.ok) failures++;
  }
}

console.log(`\n${"═".repeat(74)}`);
console.log(failures === 0 ? "  ✅ ALL SAMPLES PASSED VALIDATION" : `  ❌ ${failures} FAILURE(S)`);
console.log("═".repeat(74) + "\n");
process.exit(failures === 0 ? 0 : 1);
