// Scenario Assembly Engine — OPE Stage 2 (see docs/OPE_MASTER_SPEC.md §5).
//
// Merges the selected modules into one coherent skeleton (phases, tasks, risks,
// communication stubs, cost drivers, config), derives quantities (Stage 3), and
// groups the timeline into preparation / day-of / after. Extracted verbatim from
// engine.ts compose(); logic unchanged. The returned Composed object is internal
// (not serialized), so it also carries the budget inputs (costDrivers/config/
// derivedValues) for the orchestrator.

import { deriveQuantities } from './resources'
import type { CommTemplate, CostDriver, OpeModule, PhaseDef, RiskDef, Scenario, TaskDef } from './types'

export function groupOfPhase(phase: PhaseDef): 'after' | 'day_of' | 'preparation' {
  const [a, b] = phase.window_days_before
  if (a < 0) return 'after'
  if (a === 0 && b === 0) return 'day_of'
  return 'preparation'
}

export interface Composed {
  modules_used: string[]
  scenario: Scenario
  phases: PhaseDef[]
  tasks: TaskDef[]
  risks: RiskDef[]
  templates: CommTemplate[]
  timeline_sections: Record<'preparation' | 'day_of' | 'after', { phases: PhaseDef[]; tasks: TaskDef[] }>
  costDrivers: CostDriver[]
  config: Record<string, number>
  derivedValues: Record<string, number | null>
}

export function assemble(modules: OpeModule[], scenario: Scenario): Composed {
  const tag = <T extends object>(arr: T[] | undefined, src: string): (T & { _module: string })[] =>
    (arr ?? []).map((x) => ({ ...x, _module: src }))

  const tasks: TaskDef[] = []
  const risks: RiskDef[] = []
  const templates: CommTemplate[] = []
  const phases: PhaseDef[] = []
  let config_defaults: Record<string, number> = {}
  const costDrivers: CostDriver[] = []
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

  // Derived quantities (Resource Planning Engine — Stage 3).
  const derivedValues = deriveQuantities(modules, scenario, config_defaults)

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

  return {
    modules_used: modules.map((m) => m._meta.module),
    scenario,
    phases,
    tasks,
    risks,
    templates,
    timeline_sections,
    costDrivers,
    config: config_defaults,
    derivedValues,
  }
}
