// Project Workspace — the logical container for all project-level capabilities.
//
// Product Canon §4 / §13 / §22: a workspace is a user-facing projection of an entity, never the entity
// itself. The Project Workspace is the projection of the Project (the Living Project root,
// lib/projects/store.ts, migration 041) — the same Project seen through role-based views. (Canon §13
// currently labels this "Organizer Workspace"; this module uses "Project Workspace" as the architectural
// term to keep it distinct from the Organizer Business, consistent with Phase 0.2.)
//
// Phase 0.4 (Project Workspace Foundation): this module INTRODUCES the Project Workspace as a code-level
// container and NAMES the project-level capabilities that belong to it. It MOVES no logic, wraps no API,
// and changes no behavior — every capability keeps its current module, API, and data ownership. This phase
// only establishes that project-level capabilities have one common container; wiring them to reference it
// is a later phase.
//
// Not this module: the dormant OPE-V2 Module 4 workspace in lib/organizer-workspace/* is the assembly-domain
// workspace (built on the assembly-domain Project, lib/project/*, per Phase 0.2 — not the Living Project
// root). This foundation is keyed to the Living Project root, not to that dormant module, and does not build
// on it.
//
// NOT in this foundation (by rule): UI, Runtime changes, Planner changes, feature development.

/**
 * A logical reference to one Project Workspace — the projection of a Project.
 * `projectId` is the Living Project root id (projects.id, migration 041). The Project Workspace is a view
 * of that Project; it is never the Project entity itself.
 */
export interface ProjectWorkspaceRef {
  projectId: string
}

/**
 * Resolve the Project Workspace for a Project. Pure; no side effects and no data access — it names the
 * container, it does not fetch or change anything.
 */
export function projectWorkspace(projectId: string): ProjectWorkspaceRef {
  return { projectId }
}

/**
 * The role-based projections of the Project Workspace (Canon §4 / §14–§16). Permissions create these views
 * of the SAME Project; they never create separate Projects.
 */
export const PROJECT_WORKSPACE_ROLES = ['organizer', 'client', 'participant', 'vendor', 'worker'] as const
export type ProjectWorkspaceRole = (typeof PROJECT_WORKSPACE_ROLES)[number]

/**
 * The project-level capabilities that belong to the Project Workspace (Canon §22), declared here so they
 * have one common, named container. Each capability keeps its existing module, API, and data ownership —
 * this manifest records belonging only; it does not re-implement, wrap, or re-route anything. `where` is
 * the current location, or the build status where the capability is not yet implemented.
 */
export const PROJECT_WORKSPACE_CAPABILITIES = [
  { key: 'plan', description: 'The EventPlanV2 — the prepared event plan.', where: 'lib/planning/persistence.ts; migration 047_project_event_plans_v2' },
  { key: 'planning_domain', description: 'The durable planning domain (recompute source of truth).', where: 'lib/planning/planning-domain-store.ts; migration 048_project_planning_domain' },
  { key: 'budget', description: 'Budget lines, vendor quotes, totals.', where: 'lib/budget/*; migration 042_budget' },
  { key: 'commercial_proposal', description: 'The commercial proposal (projection + immutable snapshot).', where: 'lib/budget/store.ts, lib/budget/commercial-proposal-projection.ts; migration 042' },
  { key: 'delivery_components', description: 'Delivery-component projection.', where: 'migration 043_project_delivery_components' },
  { key: 'public_space', description: 'The read-only public projection of a published Project.', where: 'lib/planning/public-event-projection.ts, lib/planning/load-public-event-plan.ts; migration 046' },
  { key: 'occurrences', description: 'Concrete dated instances of the Project.', where: 'migration 046 (table); authoring not yet built' },
  { key: 'participants', description: 'Participant list, RSVP, reminders, check-in.', where: 'lib/actions/participants.ts; migration 020' },
  { key: 'timeline', description: 'The event timeline (Canon §22).', where: 'derived from EventPlanV2 itinerary; standalone timeline not yet built' },
  { key: 'tasks', description: 'Work packages / tasks (Canon §22).', where: 'assembly-domain (lib/project/*, dormant); not on the live path' },
  { key: 'runtime', description: 'The operating life of the Project (Canon §22; PROJECT_RUNTIME_SPEC).', where: 'not yet built' },
  { key: 'registration', description: 'Per-occurrence sign-up (Canon §22).', where: 'not yet built' },
  { key: 'event_history', description: 'The Project history / story (Canon §4/§22).', where: 'not yet built as a system' },
  { key: 'completed_project', description: 'The after-activity Project — memory, media, reuse (Canon §20/§22).', where: 'not yet built' },
] as const

/** The stable keys of the capabilities that belong to the Project Workspace. */
export type ProjectWorkspaceCapabilityKey = (typeof PROJECT_WORKSPACE_CAPABILITIES)[number]['key']
