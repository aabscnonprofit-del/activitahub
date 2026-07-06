// Access Policy — the explicit map from an access type to the Project View it may render (and whether that
// view is implemented yet). This is the single source of truth for "which View does this relationship grant",
// so View loaders enforce view-scope (a token of one type can never open another type's View) from one place.
// Structure is ready for safety / etc.; client + worker + participant are implemented.

import type { AccessType } from './model'

/** A View name (route/segment). */
export type ProjectViewName = 'client' | 'worker' | 'safety' | 'participant' | 'vendor' | 'inspector' | 'venue' | 'emergency'

export interface AccessPolicyEntry {
  /** The Project View this access type may render. */
  view: ProjectViewName
  /** Whether this access type's View is implemented today. */
  implemented: boolean
}

export const ACCESS_POLICY: Record<AccessType, AccessPolicyEntry> = {
  client: { view: 'client', implemented: true },
  worker: { view: 'worker', implemented: true },
  safety: { view: 'safety', implemented: true },
  participant: { view: 'participant', implemented: true },
  vendor: { view: 'vendor', implemented: false },
  inspector: { view: 'inspector', implemented: false },
  venue: { view: 'venue', implemented: false },
  emergency: { view: 'emergency', implemented: false },
}

/** The View an access type may render. */
export function viewForAccessType(type: AccessType): ProjectViewName {
  return ACCESS_POLICY[type].view
}

/** Whether an access relationship of `type` may render the given View (view-scope enforcement). */
export function accessGrantsView(type: AccessType, view: ProjectViewName): boolean {
  return ACCESS_POLICY[type].implemented && ACCESS_POLICY[type].view === view
}
