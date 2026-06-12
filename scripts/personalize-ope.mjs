#!/usr/bin/env node
/**
 * OPE Personalization Layer — MVP v1 (sits on top of the AI Layer).
 *
 * Takes the deterministic Output Builder JSON (frozen source of truth) and the AI Layer output
 * (the generic "before"), and produces a PERSONALIZED "after" that makes the plan feel
 * event-specific — using ONLY data already present (section_a / scenario echo / special_requirements
 * / category / subtype / guest counts / existing budget values).
 *
 * It enriches ONLY customer-facing text:
 *   - section_b_your_plan.headline   (new writable text field: personalized event title)
 *   - section_b_your_plan.summary
 *   - section_c_budget.levers_note   (adds budget-vs-target awareness — no number changes)
 *   - section_e_ready_messages.*.text (theme + audience aware; variable tokens kept intact)
 *   - section_f_upgrade_path.text
 *
 * It changes NOTHING else: no numbers, risks, tasks, milestones, quantities, timelines, pricing.
 * Enforced by the SAME frozen-field guard as the AI Layer (extended to treat headline as writable).
 *
 * No UI, no API, no database, no website/pricing changes.
 *
 * Usage:
 *   node scripts/personalize-ope.mjs            # show BEFORE vs AFTER + guard result
 *   node scripts/personalize-ope.mjs --selftest # also prove the guard rejects a tampered output
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(ROOT, "tmp", "ope-output"); // frozen source of truth (Output Builder)
const AI_DIR = join(ROOT, "tmp", "ope-ai");       // AI Layer output (generic "before")
const OUT_DIR = join(ROOT, "tmp", "ope-personalized");
const load = (abs) => JSON.parse(readFileSync(abs, "utf8"));
const clone = (x) => JSON.parse(JSON.stringify(x));

// ── Frozen-field guard (same as AI Layer; headline added to the writable allowlist) ──
const WRITABLE = {
  headline: (o) => o.section_b_your_plan && delete o.section_b_your_plan.headline,
  summary: (o) => o.section_b_your_plan && delete o.section_b_your_plan.summary,
  leversNote: (o) => o.section_c_budget && delete o.section_c_budget.levers_note,
  messages: (o) => { const m = o.section_e_ready_messages || {}; for (const k of Object.keys(m)) if (m[k]) delete m[k].text; },
  upgrade: (o) => o.section_f_upgrade_path && delete o.section_f_upgrade_path.text,
  optionalSiblings: (o) => {
    (o.section_b_your_plan?.timeline || []).forEach((t) => delete t.note);
    for (const key of ["preparation_checklist", "day_of_checklist", "after_event_checklist"])
      (o.section_b_your_plan?.[key] || []).forEach((t) => delete t.explanation);
    (o.section_d_key_risks?.risks || []).forEach((r) => delete r.explanation);
  },
  meta: (o) => { if (!o._meta) return; for (const k of ["ai_layer","ai_model","ai_layer_version","personalization_layer","personalization_version"]) delete o._meta[k]; },
};
const freeze = (obj) => { const f = clone(obj); for (const s of Object.values(WRITABLE)) s(f); return f; };
const stable = (x) => Array.isArray(x) ? "[" + x.map(stable).join(",") + "]"
  : (x && typeof x === "object") ? "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + stable(x[k])).join(",") + "}"
  : JSON.stringify(x);
function firstDiff(a, b, p) {
  if (stable(a) === stable(b)) return null;
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = firstDiff(a?.[k], b?.[k], p ? `${p}.${k}` : k); if (d) return d; }
  }
  return p || "(root)";
}
function validate(src, out) {
  if (stable(freeze(src)) === stable(freeze(out))) return { ok: true };
  return { ok: false, error: `Frozen field changed at ${firstDiff(freeze(src), freeze(out), "")} — output rejected.` };
}

// ── Personalization helpers (reuse data only; never invent facts) ──
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const VENUE = { backyard_home: "a backyard", public_park: "a park", community_hall: "a community hall" };
const venueLabel = (v) => VENUE[v] || String(v || "").replace(/_/g, " ");
const DRIVER_LABEL = { party_food_per_head: "food for guests", bbq_food_per_head: "food (meat & vegetarian)", drinks_per_head: "drinks", favors_per_kid: "party favors", cake: "the cake", decorations: "decorations", tableware_per_head: "tableware", disposables_per_head: "disposables", activity_materials: "game & activity supplies", ice: "ice", fuel: "grill fuel", prizes: "prizes", grill_rental: "grill rental" };
const driverLabel = (k) => DRIVER_LABEL[k] || String(k).replace(/_per_head|_per_kid/g, "").replace(/_/g, " ");

function detectTheme(a) {
  const r = (a.special_requirements || []).find((x) => /theme/i.test(x));
  return r ? titleCase(r.replace(/theme/i, "").trim()) : null;
}
// category isn't carried in section_a — resolve it from the modules that built the plan.
function resolveCategory(out) {
  const mods = out._meta?.modules_used || [];
  if (mods.some((m) => /BIRTHDAY/i.test(m))) return "birthday";
  if (mods.some((m) => /BBQ/i.test(m))) return "bbq";
  const at = (out.section_a_what_you_told_us.activity_type || "").toLowerCase();
  if (at.includes("birthday")) return "birthday";
  if (at.includes("bbq") || at.includes("picnic")) return "bbq";
  return null;
}
const pluralTheme = (t) => (/o$/i.test(t) ? `${t}es` : `${t}s`); // superhero → superheroes
function audienceProfile(a, category) {
  if (category === "community_meetup") return { vibe: "welcoming and social", guests: "neighbors", tone: "warm" };
  if (category === "networking") return { vibe: "professional and connection-focused", guests: "attendees", tone: "professional" };
  if (a.age_group === "young_kids") return { vibe: "high-energy, simple and playful", guests: "young guests", tone: "playful" };
  if (a.age_group === "adults") return { vibe: "relaxed and practical", guests: "guests", tone: "relaxed" };
  return { vibe: "relaxed and easy to run", guests: "guests", tone: "friendly" };
}
function headline(a, theme, category) {
  if (!theme) return a.activity_type; // unchanged display when no theme
  if (category === "birthday") return `${theme} Birthday Adventure`;
  if (category === "bbq") return `${theme} BBQ & Picnic`;
  return `${theme} ${a.activity_type}`;
}

// ── Generators (AFTER personalization) ──
function genSummary(out, a, theme, aud, category) {
  const bd = a.guest_breakdown;
  const t = theme ? theme.toLowerCase() : null;
  const kidsWord = bd ? (t ? `${bd.kids} little ${pluralTheme(t)}` : `${bd.kids} kids`) : null;
  const who = bd ? `${kidsWord} and ${bd.adults} ${t ? "grown-ups" : "adults"}` : `about ${a.guest_count} ${aud.guests}`;
  const lead = theme && category === "birthday" ? `Get ready for a ${theme} birthday adventure! ` : "";
  const allergyFlagged = (a.special_requirements || []).some((x) => /allerg/i.test(x));
  const mid = a.age_group === "young_kids"
    ? ` It stays easy to run and safe for little ones${allergyFlagged ? ", with the allergy you flagged built into the safety reminders" : ""}.`
    : (allergyFlagged ? " The allergy you flagged is built into the safety reminders." : "");
  return `${lead}This plan is built for ${who} at ${venueLabel(a.venue_type)} in ${a.region}.${mid} You'll get the full timeline, a budget estimate, key safety reminders, and ready-to-send messages tailored to your event.`;
}
function genLeversNote(out, a) {
  const c = out.section_c_budget;
  if (c.priced === false || !c.low) return out.section_c_budget?.levers_note ?? null;
  const top = (c.key_cost_drivers || []).slice(0, 2).map((d) => driverLabel(d.item_key));
  const topPhrase = top.length === 2 ? `${top[0]} and ${top[1]}` : top[0] || "food and supplies";
  const cur = c.currency || "USD";
  let note = `Your biggest costs are ${topPhrase}. Keeping things simple stays near the low end ($${c.low} ${cur}); adding extras pushes toward the high end ($${c.high} ${cur}). A typical plan lands around $${c.likely} ${cur}.`;
  const target = a.budget;
  if (typeof target === "number") {
    if (c.likely > target) note += ` Heads up: a typical plan (~$${c.likely} ${cur}) is slightly above your $${target} target — keeping ${top[0] || "food"} and ${top[1] || "extras"} simple helps bring it closer.`;
    else note += ` Good news: a typical plan (~$${c.likely} ${cur}) is within your $${target} target.`;
  }
  return note;
}
function genMessages(out, a, theme, aud, category) {
  const m = out.section_e_ready_messages || {};
  const tok = (v) => `[${v}]`;
  const has = (vars, v) => vars.includes(v);
  const t = theme ? theme.toLowerCase() : null;
  const res = {};
  for (const [slot, def] of Object.entries(m)) {
    if (!def || def.available === false) { res[slot] = def?.text ?? null; continue; }
    const v = def.variables || [];
    const host = has(v, "honoree_name") ? "honoree_name" : has(v, "host_name") ? "host_name" : null;
    const subj = host ? `${tok(host)}'s ${theme ? headline(a, theme, category) : "event"}` : "our event";
    const when = [has(v, "date") && tok("date"), has(v, "time") && `at ${tok("time")}`].filter(Boolean).join(" ");
    const where = has(v, "location") ? `, at ${tok("location")}` : "";
    const rsvp = has(v, "rsvp_deadline") ? ` Please RSVP by ${tok("rsvp_deadline")}.` : "";
    const dietary = has(v, "allergy_ask") ? ` ${tok("allergy_ask")}` : has(v, "dietary_ask") ? ` ${tok("dietary_ask")}` : "";
    const bring = has(v, "what_to_bring") ? ` ${tok("what_to_bring")}` : "";
    const g = has(v, "guest_name") ? tok("guest_name") : null;

    let text;
    if (slot === "invitation") {
      const open = theme ? `🦸 Calling all ${pluralTheme(t)}! You're invited to ${subj}.` : `You're invited to ${subj}!`;
      const costume = theme ? ` Come dressed as your favorite ${t}!` : "";
      text = `${open}${costume} Join us ${when}${where}.${rsvp}${dietary}${bring}`;
    } else if (slot === "reminder") {
      const lead = g ? `Hi ${g}! ` : "Hi! ";
      const hype = theme ? `${titleCase(t)} ${category === "birthday" ? "training" : "fun"} is almost here — ` : "Just a reminder — ";
      const costume = theme ? " Don't forget your costume!" : "";
      text = `${lead}${hype}${subj} is ${when}${where}.${costume} Hope to see you there!`;
    } else if (slot === "thank_you") {
      const lead = g ? `Thank you, ${g}, ` : "Thank you ";
      const squad = theme ? ` The ${pluralTheme(t)} had a blast` : " Everyone had a great time";
      text = `${lead}for joining ${subj}!${squad} — it meant so much to celebrate with you.`;
    } else if (slot === "feedback" || slot === "feedback_request") {
      const lead = g ? `Hi ${g}! ` : "Hi! ";
      const note = theme ? `Hope you had a heroic time. ` : "";
      text = `${lead}${note}Quick one — was the timing and setup good? Anything we could make even better next time?`;
    } else text = def.text ?? null;
    res[slot] = text.replace(/\s+/g, " ").trim();
  }
  return res;
}
function genUpgrade(out, a, theme) {
  const n = out.section_f_upgrade_path?.current_scale;
  const scale = typeof n === "number" ? ` past ~${n} guests` : " significantly";
  const what = theme ? `${theme.toLowerCase()} party` : "event";
  return `You can absolutely run this ${what} yourself. If your guest list grows${scale}, or you'd rather have it fully handled, hand the plan to a certified organizer for a quote — you keep the plan either way.`;
}

// ── Apply ──
function personalize(src) {
  const out = clone(src);
  const a = out.section_a_what_you_told_us;
  const category = resolveCategory(out);
  const theme = detectTheme(a);
  const aud = audienceProfile(a, category);

  if (out.section_b_your_plan) {
    out.section_b_your_plan.headline = headline(a, theme, category);
    out.section_b_your_plan.summary = genSummary(out, a, theme, aud, category);
  }
  if (out.section_c_budget) out.section_c_budget.levers_note = genLeversNote(out, a);
  const msgs = genMessages(out, a, theme, aud, category);
  for (const [slot, text] of Object.entries(msgs)) if (out.section_e_ready_messages?.[slot]) out.section_e_ready_messages[slot].text = text;
  if (out.section_f_upgrade_path) out.section_f_upgrade_path.text = genUpgrade(out, a, theme);

  out._meta = { ...out._meta, personalization_layer: "filled", personalization_version: "personalize-mvp-1" };
  return { out, theme, aud };
}

// ── Run ──
const SAMPLES = [
  { src: "birthday-young-kids.output.json", ai: "birthday-young-kids.ai.json", out: "birthday-young-kids.personalized.json", label: "Birthday + Young Kids (Superhero)" },
  { src: "bbq-core.output.json", ai: "bbq-core.ai.json", out: "bbq-core.personalized.json", label: "BBQ" },
];
if (!existsSync(SRC_DIR)) { console.error("Run: compose-ope-samples.mjs → build-ope-output.mjs → ai-layer-ope.mjs first"); process.exit(1); }
mkdirSync(OUT_DIR, { recursive: true });
const selftest = process.argv.includes("--selftest");
let failures = 0;

for (const s of SAMPLES) {
  const srcPath = join(SRC_DIR, s.src), aiPath = join(AI_DIR, s.ai);
  if (!existsSync(srcPath) || !existsSync(aiPath)) { console.error(`  missing inputs for ${s.label}`); failures++; continue; }
  const src = load(srcPath);            // frozen source of truth
  const before = load(aiPath);          // generic AI Layer output
  const { out, theme } = personalize(src);
  const verdict = validate(src, out);

  const show = (label, o) => {
    console.log(`    ${label} headline: ${o.section_b_your_plan.headline ?? o.section_a_what_you_told_us.activity_type}`);
    console.log(`    ${label} summary:  ${o.section_b_your_plan.summary}`);
    console.log(`    ${label} invite:   ${o.section_e_ready_messages.invitation.text}`);
    console.log(`    ${label} reminder: ${o.section_e_ready_messages.reminder.text}`);
    console.log(`    ${label} thanks:   ${o.section_e_ready_messages.thank_you.text}`);
    console.log(`    ${label} feedback: ${o.section_e_ready_messages.feedback.text}`);
    console.log(`    ${label} budget:   ${o.section_c_budget.levers_note}`);
    console.log(`    ${label} upgrade:  ${o.section_f_upgrade_path.text}`);
  };

  console.log(`\n${"═".repeat(78)}\n  ${s.label}   (theme detected: ${theme || "none"})\n${"═".repeat(78)}`);
  console.log(`  ── BEFORE personalization (AI Layer output) ──`);
  // 'before' has no headline; show activity_type as its title
  before.section_b_your_plan.headline = before.section_a_what_you_told_us.activity_type;
  show("BEFORE", before);
  console.log(`\n  ── AFTER personalization ──`);
  show("AFTER", out);
  console.log(`\n  VALIDATION (frozen-field guard): ${verdict.ok ? "✓ PASS — numbers, tasks, risks, timeline, milestones, pricing unchanged" : "✗ REJECTED — " + verdict.error}`);
  if (!verdict.ok) failures++;
  if (verdict.ok) { writeFileSync(join(OUT_DIR, s.out), JSON.stringify(out, null, 2) + "\n"); console.log(`  written: ${join("tmp/ope-personalized", s.out)}`); }

  if (selftest) {
    const tampered = clone(out); if (tampered.section_c_budget) tampered.section_c_budget.likely += 1;
    const v2 = validate(src, tampered);
    console.log(`  SELF-TEST (tamper budget.likely +1): ${v2.ok ? "✗ guard FAILED (bug)" : "✓ guard REJECTED: " + v2.error}`);
    if (v2.ok) failures++;
  }
}
console.log(`\n${"═".repeat(78)}\n  ${failures === 0 ? "✅ ALL SAMPLES PASSED VALIDATION" : "❌ " + failures + " FAILURE(S)"}\n${"═".repeat(78)}\n`);
process.exit(failures === 0 ? 0 : 1);
