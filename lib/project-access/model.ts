// Shared Project Access — the canonical per-Project access RELATIONSHIP model (ADR_012). One shape for every
// access type; type-specific data lives in `metadata`. Pure types + the single access predicate. No I/O.

/** Access types. `client` / `worker` are implemented; the rest are reserved (Access Policy governs wiring). */
export type AccessType = 'client' | 'worker' | 'safety' | 'participant' | 'vendor' | 'inspector' | 'venue' | 'emergency'

export const ACCESS_TYPES: readonly AccessType[] = ['client', 'worker', 'safety', 'participant', 'vendor', 'inspector', 'venue', 'emergency']

export type AccessStatus = 'invited' | 'active' | 'revoked'

/** A persisted Project↔Person access relationship (migration 058). */
export interface ProjectAccessRow {
  id: string
  project_id: string
  access_type: AccessType
  email: string | null
  phone: string | null
  account_id: string | null
  invite_token: string
  status: AccessStatus
  expires_at: string | null
  revoked_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Type guard for an access type. */
export function isAccessType(v: unknown): v is AccessType {
  return typeof v === 'string' && (ACCESS_TYPES as readonly string[]).includes(v)
}

/** Whether a relationship is EXPIRED at `nowIso` (an expiry that has passed). */
export function isExpired(row: Pick<ProjectAccessRow, 'expires_at'>, nowIso: string): boolean {
  return row.expires_at != null && row.expires_at <= nowIso
}

/**
 * The single access predicate: a relationship grants access iff it is not revoked and not expired. Every
 * token-scoped resolution uses this — there is no other place that decides "does this link still work".
 */
export function isActiveGrant(row: Pick<ProjectAccessRow, 'status' | 'expires_at'>, nowIso: string): boolean {
  return row.status !== 'revoked' && !isExpired(row, nowIso)
}
