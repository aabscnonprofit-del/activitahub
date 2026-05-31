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
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

// ── Billing (Phase 2) ───────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'

export type PaymentKind = 'beginner_course' | 'experienced_test'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Subscription {
  id: string
  profile_id: string
  status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  profile_id: string
  kind: PaymentKind
  status: PaymentStatus
  amount: number
  currency: string
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
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

// ── Academy (Phase 3A) ──────────────────────────────────────────────────────

export type EnrollmentStatus = 'active' | 'completed'

export type LessonProgressStatus = 'in_progress' | 'completed'

export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'true_false'

export interface Course {
  id: string
  slug: string
  path: OnboardingPath
  title: string
  description: string | null
  sort_order: number
  published: boolean
  created_at: string
  updated_at: string
}

export interface CourseModule {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  module_id: string
  slug: string
  title: string
  content: string
  sort_order: number
  duration_minutes: number
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  profile_id: string
  course_id: string
  status: EnrollmentStatus
  enrolled_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface LessonProgress {
  id: string
  profile_id: string
  lesson_id: string
  status: LessonProgressStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Quiz {
  id: string
  lesson_id: string
  title: string
  description: string | null
  passing_score: number
  created_at: string
  updated_at: string
}
