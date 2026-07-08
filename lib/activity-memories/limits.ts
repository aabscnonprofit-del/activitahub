// Plain-text length caps for Activity Memories content. Kept in a NON-'use server' module: a Server-Action file
// ('use server') may only export async functions, so these runtime constants must live here and be imported by
// both the actions (validation) and the components (maxLength). No behavior — values only.

/** Organizer Story cap. */
export const ORGANIZER_STORY_MAX = 4000

/** Participant Story cap (a short reflection). */
export const PARTICIPANT_STORY_MAX = 2000

/** Activity Review cap. */
export const ACTIVITY_REVIEW_MAX = 2000
