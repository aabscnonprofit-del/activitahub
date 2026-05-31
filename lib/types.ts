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
