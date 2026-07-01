// Organizer Business — the SECOND durable root entity of ActivLife Hub.
//
// Product Canon §4 / §22: ActivLife Hub has exactly two durable root entities — the Organizer Business
// and the Project. The Project (lib/projects/store.ts) is the root of one activity; the Organizer Business
// is the organizer's business itself — the durable parent that exists between and across all their
// Projects and owns the cross-Project, business-level capabilities.
//
// Phase 0.3 (Organizer Business Foundation): this module INTRODUCES the entity as a code-level root and
// names the single common owner of the existing business-level capabilities. It MOVES no logic, wraps no
// API, and changes no behavior — every capability listed below keeps its current module, API, and data
// ownership unchanged. This phase only establishes that these capabilities have one common root; wiring
// them to reference it is a later phase.
//
// Identity: an Organizer Business IS the organizer's account — the `profiles` row (profiles.id = the auth
// user id). Every business-level capability today is already keyed to that same identity (profile_id /
// organizer_id / owner_id all resolve to the organizer's profiles.id), so the common root already exists
// implicitly in the data; this module names it. No schema change is introduced.
//
// NOT in this foundation (by rule): CRM, leads, clients, the Organizer Business Workspace UI, or any new
// data or behavior. Those are later phases.

/**
 * A logical reference to one Organizer Business — the second root entity.
 * `organizerId` is the organizer's account id (profiles.id / auth user id) that already owns every
 * business-level capability below.
 */
export interface OrganizerBusinessRef {
  organizerId: string
}

/**
 * Resolve the Organizer Business root for an organizer account. Pure; no side effects and no data access —
 * it names the root, it does not fetch or change anything.
 */
export function organizerBusiness(organizerId: string): OrganizerBusinessRef {
  return { organizerId }
}

/**
 * The business-level capabilities the Organizer Business owns (Canon §22), declared here so they have one
 * common, named root. Each capability keeps its existing module, API, and data ownership — this manifest
 * records ownership only; it does not re-implement, wrap, or re-route anything.
 */
export const ORGANIZER_BUSINESS_CAPABILITIES = [
  { key: 'stripe_connect', description: 'Payout account for accepting payments (optional — only for organizers accepting payments).', where: 'lib/actions/connect.ts; migration 035_organizer_connect_accounts' },
  { key: 'subscription', description: 'Organizer License subscription and access.', where: 'lib/stripe/subscription-mapping.ts; lib/auth/organizer-access.ts; subscriptions table' },
  { key: 'billing', description: 'Billing state (webhook-authoritative).', where: 'lib/billing/*; lib/stripe/*' },
  { key: 'invoices', description: 'Issued invoices (immutable once issued).', where: 'lib/billing/invoices.ts; lib/actions/invoices.ts; migration 036_invoices' },
  { key: 'academy', description: 'Academy enrollment and progress.', where: 'migration 003_academy' },
  { key: 'certification', description: 'Verified / Certified credentials.', where: 'migration 005_certification; profiles.role' },
  { key: 'event_licenses', description: 'One Event Licenses.', where: 'lib/billing/eventLicense.server.ts; lib/actions/eventLicense.ts; migrations 038/040' },
] as const

/** The stable keys of the capabilities the Organizer Business owns. */
export type OrganizerBusinessCapabilityKey = (typeof ORGANIZER_BUSINESS_CAPABILITIES)[number]['key']
