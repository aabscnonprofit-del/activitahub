// ============================================================
// Core domain types — Phase 1
// All types derive from the Supabase schema.
// ============================================================

export type Locale = 'en' | 'es' | 'fr' | 'ru'

export type UserRole = 'guest' | 'student' | 'certified_organizer' | 'admin'

export type OnboardingStatus =
  | 'not_started'
  | 'path_selected'
  | 'payment_pending'
  | 'payment_complete'
  | 'certified'
  | 'subscribed'

export type OnboardingPath = 'beginner' | 'experienced'

export interface Profile {
  id: string
  role: UserRole
  onboarding_status: OnboardingStatus
  selected_path: OnboardingPath | null
  full_name: string | null
  email: string | null
  avatar_url: string | null
  timezone: string
  preferred_locale: Locale
  suspended: boolean
  created_at: string
  updated_at: string
}

// Subset used for middleware checks (avoids fetching unnecessary columns)
export interface ProfileAccessInfo {
  role: UserRole
  onboarding_status: OnboardingStatus
  suspended: boolean
}

// Result type for server actions that return errors
export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

// Auth form state shapes (used with useFormState)
export interface AuthFormState {
  error?: string
  success?: boolean
  email?: string // returned on success for display in confirmation messages
}

export interface ProfileFormState {
  error?: string
}
