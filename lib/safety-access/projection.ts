// Safety View — the PURE projection + types (ADR_013). No I/O, no server/marketplace imports (safe to import
// anywhere). It is a CURATED safety-only subset of the Project, built by pulling ONLY the ADR_013-approved
// fields out of the plan (title, description, and the plan's SAFETY considerations — risk/safeguard — which
// the public/participant views deliberately omit). It never touches budget / proposal / planning internals
// (cost, assumptions, feasibility) / delivery / team / resources / logistics / worker assignments /
// participants / contracts / internal notes. "Maximum safety. Minimum information exposure."

import type { EventPlanV2 } from '@/lib/planning/event-plan-v2'

/** A structured safety indicator: a risk and how it is safeguarded (from the plan's safety considerations). */
export interface SafetyConsiderationView {
  risk: string
  safeguard: string
}

/** One scheduled occurrence, safety-safe (time + location). */
export interface SafetyOccurrence {
  startsAt: string
  endsAt: string | null
  location: string | null
}

/** Safety-relevant contacts (public names only — never participant contact info). */
export interface SafetyContacts {
  organizerName: string | null
  leadOrganizerName: string | null
  safetyCoordinatorName: string | null
}

/** The Safety View read model — only ADR_013-approved information. */
export interface SafetyViewData {
  projectId: string
  title: string | null
  description: string | null
  occurrences: SafetyOccurrence[]
  expectedAttendance: number | null
  workerCount: number
  safetyProfile: SafetyConsiderationView[]
  contacts: SafetyContacts
}

/** Pure: the safety-safe event basics (title = intended feeling; description = concept). No internals. */
export function safetyEventFromPlan(plan: EventPlanV2 | null): { title: string | null; description: string | null } {
  if (!plan) return { title: null, description: null }
  return { title: plan.experienceDesign?.intendedFeeling ?? null, description: plan.structure?.concept ?? null }
}

/** Pure: the structured safety profile — the plan's safety considerations (risk + safeguard). */
export function safetyProfileFromPlan(plan: EventPlanV2 | null): SafetyConsiderationView[] {
  return (plan?.safety ?? []).map((s) => ({ risk: s.risk, safeguard: s.safeguard }))
}

/**
 * Compose the Safety View from already-extracted, safety-safe values. Pure and total. It receives ONLY safe
 * values (never the raw plan), so it cannot leak organizer-only or forbidden data.
 */
export function buildSafetyView(args: {
  projectId: string
  title: string | null
  description: string | null
  occurrences: SafetyOccurrence[]
  expectedAttendance: number | null
  workerCount: number
  safetyProfile: SafetyConsiderationView[]
  contacts: SafetyContacts
}): SafetyViewData {
  return {
    projectId: args.projectId,
    title: args.title,
    description: args.description,
    occurrences: args.occurrences,
    expectedAttendance: args.expectedAttendance,
    workerCount: args.workerCount,
    safetyProfile: args.safetyProfile,
    contacts: args.contacts,
  }
}
