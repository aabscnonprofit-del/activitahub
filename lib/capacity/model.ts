// Organizer Capacity model — the qualification levels that bound how large a project an organizer may lead
// INDEPENDENTLY. The restriction is on the ORGANIZER, never on the event: a project of any size stays valid;
// the gate only decides whether THIS organizer may be its independent lead. Pure/deterministic; no I/O.

/** Organizer capacity levels. */
export type CapacityLevel = 1 | 2 | 3 | 4

/** All levels, ascending. */
export const CAPACITY_LEVELS: readonly CapacityLevel[] = [1, 2, 3, 4]

/** Maximum participants an organizer of each level may independently lead. `null` = unlimited (Level 4). */
export const CAPACITY_MAX: Record<CapacityLevel, number | null> = {
  1: 20,
  2: 100,
  3: 500,
  4: null,
}

/** The default level for an organizer with no recorded capacity level. */
export const DEFAULT_CAPACITY_LEVEL: CapacityLevel = 1

/** Type guard for a capacity level (accepts 1..4). */
export function isCapacityLevel(v: unknown): v is CapacityLevel {
  return v === 1 || v === 2 || v === 3 || v === 4
}

/** The maximum participants allowed at a level (null = unlimited). */
export function maxParticipantsForLevel(level: CapacityLevel): number | null {
  return CAPACITY_MAX[level]
}

/** Whether a level covers a participant count (unlimited covers everything). */
export function levelCoversCount(level: CapacityLevel, count: number): boolean {
  const max = CAPACITY_MAX[level]
  return max === null || count <= max
}

/** The lowest level that can independently lead a project of `count` participants (Level 4 for anything over the
 *  largest bounded level). Used to tell an over-capacity organizer which level they would need. */
export function minimumLevelForCount(count: number): CapacityLevel {
  for (const level of CAPACITY_LEVELS) {
    if (levelCoversCount(level, count)) return level
  }
  return 4
}

/** The evaluated Organizer Capacity Gate for a (organizer level, project participant count). */
export interface CapacityGateResult {
  /** True when the organizer may independently lead the project. */
  allowed: boolean
  /** The project's participant count, or null when it cannot be determined (then the gate does not block). */
  participantCount: number | null
  organizerLevel: CapacityLevel
  /** The organizer's maximum (null = unlimited). */
  organizerMax: number | null
  /** The lowest level that WOULD cover the project, when blocked (for the upgrade path); null when allowed. */
  requiredLevel: CapacityLevel | null
  reason: 'within_capacity' | 'exceeds_capacity' | 'unknown_count'
}

/**
 * Evaluate the Organizer Capacity Gate. Pure: an unknown participant count never blocks (the gate validates
 * organizer eligibility only, and cannot judge an unknown size). Otherwise the organizer is allowed iff their
 * level covers the count.
 */
export function evaluateCapacityGate(organizerLevel: CapacityLevel, participantCount: number | null): CapacityGateResult {
  const organizerMax = CAPACITY_MAX[organizerLevel]
  if (participantCount === null) {
    return { allowed: true, participantCount: null, organizerLevel, organizerMax, requiredLevel: null, reason: 'unknown_count' }
  }
  const allowed = levelCoversCount(organizerLevel, participantCount)
  return {
    allowed,
    participantCount,
    organizerLevel,
    organizerMax,
    requiredLevel: allowed ? null : minimumLevelForCount(participantCount),
    reason: allowed ? 'within_capacity' : 'exceeds_capacity',
  }
}
