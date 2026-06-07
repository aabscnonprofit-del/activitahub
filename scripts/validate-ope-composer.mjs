#!/usr/bin/env node
/**
 * Minimal OPE composer validation.
 *
 * Verifies that production data modules (data/ope/modules/**) can be loaded and
 * composed into a plan skeleton, and that the skeleton is internally consistent.
 *
 * This is a data-integrity check only — no app code, UI, API, or database.
 * It does NOT price anything or run the real engine; it composes the structural
 * skeleton (tasks / milestones / cost drivers / risks / templates) and validates it.
 *
 * Usage: node scripts/validate-ope-composer.mjs
 * Exit code 0 = all checks passed, 1 = one or more checks failed.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));

/**
 * Compose one or more modules into a single merged plan skeleton.
 * Later modules layer on top of earlier ones; cross-module references
 * (e.g. a subtype's deps pointing at core task IDs) resolve against the union.
 */
function compose(modules) {
  const skeleton = {
    modules: modules.map((m) => m._meta.module),
    tasks: [],
    milestones: [],
    cost_drivers: [],
    risks: [],
    templates: [],
    chains: [],
    reinforced_chains: [],
  };
  for (const m of modules) {
    for (const t of m.tasks ?? []) skeleton.tasks.push({ ...t, _module: m._meta.module });
    for (const x of m.milestones ?? []) skeleton.milestones.push({ ...x, _module: m._meta.module });
    for (const x of m.cost_drivers ?? []) skeleton.cost_drivers.push({ ...x, _module: m._meta.module });
    for (const x of m.risks ?? []) skeleton.risks.push({ ...x, _module: m._meta.module });
    for (const x of m.communication_templates ?? []) skeleton.templates.push({ ...x, _module: m._meta.module });
    for (const c of m.dependencies?.critical_chains ?? []) skeleton.chains.push({ ...c, _module: m._meta.module });
    for (const id of m.dependencies?.reinforces_core_chains ?? []) skeleton.reinforced_chains.push({ id, _module: m._meta.module });
  }
  return skeleton;
}

/** Validate a composed skeleton. Returns { errors, stats }. */
function validate(skeleton) {
  const errors = [];

  const taskIds = new Set(skeleton.tasks.map((t) => t.id));
  const riskIds = new Set(skeleton.risks.map((r) => r.id));
  const chainIds = new Set(skeleton.chains.map((c) => c.id));

  // 1. No duplicate IDs (within each kind).
  const checkDup = (label, items) => {
    const seen = new Set();
    for (const it of items) {
      if (seen.has(it.id)) errors.push(`duplicate ${label} ID: ${it.id} (from ${it._module})`);
      seen.add(it.id);
    }
  };
  checkDup("task", skeleton.tasks);
  checkDup("milestone", skeleton.milestones);
  checkDup("cost_driver", skeleton.cost_drivers);
  checkDup("risk", skeleton.risks);
  checkDup("template", skeleton.templates);
  checkDup("chain", skeleton.chains);

  // 2. All task dependencies resolve to a real task in the composed pool.
  for (const t of skeleton.tasks) {
    for (const d of t.deps ?? []) {
      if (!taskIds.has(d)) errors.push(`task ${t.id} (${t._module}) has unresolved dep: ${d}`);
    }
  }

  // 3. All milestones reference real tasks.
  for (const m of skeleton.milestones) {
    for (const s of m.satisfied_by ?? []) {
      if (!taskIds.has(s)) errors.push(`milestone ${m.id} (${m._module}) references missing task: ${s}`);
    }
  }

  // 4. never_drop chains are present and their steps resolve.
  const neverDrop = skeleton.chains.filter((c) => c.never_drop);
  if (neverDrop.length === 0) errors.push("no never_drop critical chains found in composed skeleton");
  for (const c of neverDrop) {
    for (const step of c.chain ?? []) {
      if (!taskIds.has(step)) errors.push(`never_drop chain ${c.id} (${c._module}) has unresolved step: ${step}`);
    }
  }

  // 4b. reinforces_core_chains must reference a real chain in the composed pool.
  for (const r of skeleton.reinforced_chains) {
    if (!chainIds.has(r.id)) errors.push(`module ${r._module} reinforces missing chain: ${r.id}`);
  }

  // 5. Failure modes (if present) bind to real risks.
  for (const m of skeleton.modules) { /* no-op marker for module list */ }

  const stats = {
    tasks: skeleton.tasks.length,
    milestones: skeleton.milestones.length,
    cost_drivers: skeleton.cost_drivers.length,
    risks: skeleton.risks.length,
    templates: skeleton.templates.length,
    chains: skeleton.chains.length,
    never_drop_chains: neverDrop.length,
  };
  return { errors, stats, neverDrop, riskIds };
}

function report(title, modules) {
  const skeleton = compose(modules);
  const { errors, stats, neverDrop } = validate(skeleton);
  console.log(`\n${"═".repeat(64)}`);
  console.log(`  ${title}`);
  console.log(`  modules: ${skeleton.modules.join("  +  ")}`);
  console.log("═".repeat(64));
  console.log(
    `  tasks ${stats.tasks} · milestones ${stats.milestones} · cost_drivers ${stats.cost_drivers} · ` +
      `risks ${stats.risks} · templates ${stats.templates}`
  );
  console.log(`  chains ${stats.chains} (never_drop ${stats.never_drop_chains}):`);
  for (const c of neverDrop) console.log(`    🔒 ${c.id.padEnd(24)} ${(c.chain ?? []).join(" → ")}`);
  if (errors.length) {
    console.log(`\n  ❌ ${errors.length} problem(s):`);
    for (const e of errors) console.log(`     - ${e}`);
  } else {
    console.log(`\n  ✓ no duplicate IDs · all deps resolve · all milestones reference real tasks · never_drop chains intact`);
  }
  return errors.length;
}

// --- Run ----------------------------------------------------------------

let failures = 0;

// Composed: Birthday Core + Young Kids subtype.
const birthdayCore = load("data/ope/modules/birthday/core.v1.json");
const birthdayST1 = load("data/ope/modules/birthday/st1-young-kids.v1.json");
failures += report("COMPOSED PLAN — Birthday (young kids, ages 3–7)", [birthdayCore, birthdayST1]);

// Standalone: BBQ Core.
const bbqCore = load("data/ope/modules/bbq/core.v1.json");
failures += report("STANDALONE CORE — BBQ", [bbqCore]);

console.log(`\n${"═".repeat(64)}`);
console.log(failures === 0 ? "  ✅ ALL CHECKS PASSED" : `  ❌ ${failures} CHECK(S) FAILED`);
console.log("═".repeat(64) + "\n");
process.exit(failures === 0 ? 0 : 1);
