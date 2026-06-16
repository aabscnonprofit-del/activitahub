// Pure DOB helpers for worker profiles (no deps). Minor/adult status is DERIVED from
// date_of_birth here — never stored. "Identify + flag only" (no hard block on minors).

/** True if the ISO date (YYYY-MM-DD) is strictly after today. Empty/invalid → false. */
export function isFutureDate(iso: string | null | undefined): boolean {
  if (!iso) return false
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() > today.getTime()
}

/** Whole-years age from an ISO date of birth, or null when absent/invalid. */
export function ageFromDob(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age
}

/** True = minor (<18), false = adult, null = unknown (no DOB). */
export function isMinor(iso: string | null | undefined): boolean | null {
  const age = ageFromDob(iso)
  return age == null ? null : age < 18
}

/** Today as an ISO date string (for <input type="date" max=…>). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
