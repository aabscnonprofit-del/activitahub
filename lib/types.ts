export type Locale = 'en' | 'es' | 'fr' | 'ru'

export type UserRole = 'guest' | 'student' | 'organizer' | 'certified_organizer' | 'admin'

export type OnboardingStatus =
  | 'not_started'
  | 'path_selected'
  | 'profile_created'
  | 'first_activity_added'
  | 'venue_added'
  | 'completed'
  | 'payment_pending'
  | 'payment_complete'
  | 'certified'
  | 'subscribed'

export type OnboardingPath = 'beginner' | 'experienced'

export type Profile = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: UserRole
  onboarding_status: OnboardingStatus
  selected_path: OnboardingPath | null
  preferred_locale: Locale
  timezone: string
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

export type Subscription = {
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

export type Payment = {
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

export interface AuthFormState {
  error?: string
  success?: boolean
  email?: string
}

export interface ProfileFormState {
  error?: string
}

export type OrganizerProfile = {
  id: string
  user_id: string
  display_name: string | null
  bio: string | null
  city: string | null
  country: string | null
  languages: string[] | null
  phone: string | null
  website: string | null
  status: 'draft' | 'published' | 'suspended'
  created_at: string
  updated_at: string
}

export type Activity = {
  id: string
  organizer_id: string
  title: string
  description: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
}

export type Venue = {
  id: string
  organizer_id: string
  name: string
  address: string | null
  city: string | null
  country: string | null
  capacity: number | null
  indoor_outdoor: 'indoor' | 'outdoor' | 'both' | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Client = {
  id: string
  organizer_id: string
  full_name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CalendarEvent = {
  id: string
  organizer_id: string
  title: string
  date: string
  start_time: string | null
  end_time: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T; error?: never }
  | { success?: never; error: string; data?: never }
