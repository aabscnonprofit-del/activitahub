// OPE V2 — Module 3: Project Assembly — IR verification surface (Step 2).
//
// Implements the verify-before-assemble gate (mirroring how OPE verifies the FED):
//   verifyIr(ir) → { ok } | { ok:false, refusal }   (total, deterministic, never throws)
//
// At this step there is NO Project assembly, NO grouping, NO dependency lifting, NO timeline
// computation, NO events, NO persistence. Only verification + refusal mapping.
//
// Verification REUSES Module 2's IR structural validator (read-only — Module 2 is not modified):
//   - validateImplementationRequirements   lib/ope-engine/ir.ts
//
// Boundary: imports only the IR data contract + its validator; does NOT import the OPE engine,
// provider, registry, frozen-engine adapter, or the frozen engine (lib/ope/*).

import { validateImplementationRequirements } from '@/lib/ope-engine/ir'
import type { ImplementationRequirements } from '@/lib/ope-engine/types'
import type { ProjectRefusal, ProjectRefusalReason } from './types'

/** Result of IR verification: ok, or a typed Project refusal. */
export type VerifyIrResult = { ok: true } | { ok: false; refusal: ProjectRefusal }

const refuse = (reason: ProjectRefusalReason, message: string): VerifyIrResult => ({ ok: false, refusal: { reason, message } })

/** Minimal structural guard: is the input shaped enough like an IR to inspect at all? */
function isIrLike(v: unknown): v is ImplementationRequirements {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.ir_id === 'string' &&
    typeof o.status === 'string' &&
    Array.isArray(o.requirements) &&
    Array.isArray(o.dependencies) &&
    !!o.fedRef &&
    typeof o.fedRef === 'object'
  )
}

/**
 * Does the IR's dependency graph contain a cycle? Evaluated under the v1 one-package-per-requirement
 * rule, so the (would-be) work-package graph is isomorphic to the requirement graph with self-edges
 * dropped. Dangling edges (to/from a non-existent requirement) are ignored here — they are a
 * structural error caught by the full IR validator. Deterministic (Kahn's algorithm; the cycle
 * verdict is independent of processing order). Never throws.
 */
function hasDependencyCycle(ir: ImplementationRequirements): boolean {
  const ids = new Set<string>()
  for (const r of ir.requirements) if (typeof r?.id === 'string') ids.add(r.id)

  const adj = new Map<string, string[]>()
  const indeg = new Map<string, number>()
  for (const id of ids) { adj.set(id, []); indeg.set(id, 0) }

  for (const d of ir.dependencies) {
    const from = d?.fromRequirementId
    const to = d?.toRequirementId
    if (from === to) continue // self-edge dropped under the lift rule
    if (!ids.has(from) || !ids.has(to)) continue // dangling — caught structurally elsewhere
    adj.get(from)!.push(to)
    indeg.set(to, indeg.get(to)! + 1)
  }

  const queue: string[] = []
  for (const id of ids) if (indeg.get(id) === 0) queue.push(id)
  let processed = 0
  while (queue.length) {
    const n = queue.shift()!
    processed++
    for (const m of adj.get(n)!) {
      const next = indeg.get(m)! - 1
      indeg.set(m, next)
      if (next === 0) queue.push(m)
    }
  }
  return processed < ids.size
}

/**
 * Verify an IR before any Project is assembled. TOTAL: always returns a typed result; never throws.
 *
 * Order & mapping:
 *   1. not a well-formed IR                                   → invalid_ir
 *   2. status ≠ current                                       → ir_not_current
 *   3. zero requirements                                      → unstructurable_requirements
 *   4. dependency graph has a cycle (1:1 lift rule)           → unstructurable_requirements
 *   5. fails Module 2 IR structural validity                 → invalid_ir
 */
export function verifyIr(ir: unknown): VerifyIrResult {
  try {
    if (!isIrLike(ir)) return refuse('invalid_ir', 'input is not a well-formed IR')
    const r = ir

    if (r.status !== 'current') return refuse('ir_not_current', `IR status is '${r.status}', expected 'current'`)
    if (r.requirements.length < 1) return refuse('unstructurable_requirements', 'IR has no requirements')
    if (hasDependencyCycle(r)) return refuse('unstructurable_requirements', 'requirement dependencies form a cycle')

    const v = validateImplementationRequirements(r)
    if (!v.valid) return refuse('invalid_ir', `IR invalid: ${v.errors.join('; ')}`)

    return { ok: true }
  } catch {
    // Total: malformed input that slips past the guard never throws to the caller.
    return refuse('invalid_ir', 'verification error on malformed input')
  }
}
