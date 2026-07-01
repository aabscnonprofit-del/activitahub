// OPE V2 — Module 3: Project Assembly — Project domain model (Step 1).
//
// Logical entities + enums for the operational Project structure, per
// docs/OPE_V2_MODULE3_IMPLEMENTATION_SPEC.md (§9). TYPES and allowed ENUMS only — no assembly, no
// dependency lifting, no timeline computation, no grouping, no workflow, no events, no persistence.
//
// Module 3 depends ONLY on the IR data contract (Module 2 §12) — the carried sub-objects keep their
// Module 2 shapes unchanged. It imports nothing from the OPE engine, provider, registry, or the
// frozen engine.

import type {
  CostEstimate,
  DependencyType,
  Phase,
  ProvenanceReference,
  ResourceNeed,
  RoleNeed,
  Risk,
} from '@/lib/ope-engine/types'

// ── Fixed identity (v1) ─────────────────────────────────────────────────────────────────

/** Every assembled Project has version 1 (lineage/versioning is Module 4's concern — §6). */
export const PROJECT_VERSION = 1 as const
export type ProjectVersion = typeof PROJECT_VERSION

/** Every assembled Project has status `assembled` (current/superseded lineage is Module 4's). */
export const PROJECT_STATUSES = ['assembled'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

/** Typed refusal reasons (§4.3). */
export const PROJECT_REFUSAL_REASONS = ['invalid_ir', 'ir_not_current', 'unstructurable_requirements'] as const
export type ProjectRefusalReason = (typeof PROJECT_REFUSAL_REASONS)[number]

/** Max length of a derived WorkPackage name (§9). */
export const WORK_PACKAGE_NAME_MAX = 120

// ── References ──────────────────────────────────────────────────────────────────────────

/** A generic `{ id, version }` reference; used for both `irRef` and `fedRef`. */
export interface ProjectReference {
  id: string
  version: number
}

// ── Structural entities ─────────────────────────────────────────────────────────────────

/** A unit of organized work. v1: holds exactly one IR requirement; no needs/risks attached. */
export interface WorkPackage {
  id: string
  name: string
  phase: Phase
  /** IR requirement ids grouped here — exactly one in v1. */
  requirementIds: string[]
  /** WorkPackage ids this package depends on (from the dependency graph). */
  dependsOn: string[]
  /** Provenance copied from the requirement (transitive to FED). */
  derivedFrom: ProvenanceReference[]
}

/** A lifted, work-package-level dependency edge. */
export interface ProjectDependency {
  fromWorkPackageId: string
  toWorkPackageId: string
  type: DependencyType
}

/** The validated, ordered work-package dependency graph. */
export interface DependencyGraph {
  edges: ProjectDependency[]
  /** A valid topological ordering of all WorkPackage ids. */
  order: string[]
}

/** One phase entry of the relative timeline (never a real date). */
export interface TimelinePhase {
  phase: Phase
  workPackageIds: string[]
  relativeWindow: string | null
}

/** The sequenced, relative phase plan. */
export interface TimelinePlan {
  phases: TimelinePhase[]
}

// ── Project root (operational structure) ────────────────────────────────────────────────

export interface Project {
  project_id: string
  version: ProjectVersion
  status: ProjectStatus
  irRef: ProjectReference
  fedRef: ProjectReference
  workPackages: WorkPackage[]
  dependencyGraph: DependencyGraph
  timeline: TimelinePlan
  /** IR resource needs, carried unchanged at the root (v1). */
  resourceNeeds: ResourceNeed[]
  /** IR role needs, carried unchanged at the root (v1). */
  roleNeeds: RoleNeed[]
  /** IR risks, carried unchanged at the root (v1). */
  risks: Risk[]
  /** IR cost estimate, carried read-only. */
  costSummary: CostEstimate
  /** The IR's `createdAt`, carried forward (no system clock). */
  createdAt: string
}

/** A typed refusal returned instead of a Project (§4.3). */
export interface ProjectRefusal {
  reason: ProjectRefusalReason
  message?: string
}

// ── Domain events (logical; emitted by the assembleProjectWithEvents wrapper — §8) ──────

export const PROJECT_EVENT_TYPES = [
  'project.requested',
  'project.ir_rejected',
  'project.work_packages_built',
  'project.dependencies_resolved',
  'project.assembled',
  'project.assembly_failed',
] as const
export type ProjectEventType = (typeof PROJECT_EVENT_TYPES)[number]

/** A logical Project domain event. In-memory only — no queue/bus/transport/persistence. */
export interface ProjectEvent {
  type: ProjectEventType
  at: string
  payload?: Record<string, unknown>
}
