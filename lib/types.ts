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

export type ActivityCategory =
  | 'sports'
  | 'arts'
  | 'music'
  | 'education'
  | 'outdoor'
  | 'wellness'
  | 'workshop'
  | 'party'
  | 'food'
  | 'other'

export type Activity = {
  id: string
  organizer_id: string
  title: string
  description: string | null
  status: 'draft' | 'published' | 'archived'
  // Marketplace fields (Phase 5)
  category: ActivityCategory | null
  price_cents: number | null
  currency: string
  languages: string[] | null
  min_age: number | null
  max_age: number | null
  city: string | null
  country: string | null
  indoor_outdoor: 'indoor' | 'outdoor' | 'both' | null
  venue_id: string | null
  duration_minutes: number | null
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

export type CalendarEventType = 'session' | 'block' | 'personal'

export type CalendarEvent = {
  id: string
  organizer_id: string
  title: string
  event_type: CalendarEventType
  activity_id: string | null
  venue_id: string | null
  date: string
  start_time: string | null
  end_time: string | null
  all_day: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type VenuePhoto = {
  id: string
  venue_id: string
  organizer_id: string
  storage_path: string
  sort_order: number
  created_at: string
}

// ── Academy (Phase 3A) ──────────────────────────────────────────────────────

export type EnrollmentStatus = 'active' | 'completed'

export type LessonProgressStatus = 'in_progress' | 'completed'

export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'true_false'

export type Course = {
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

export type CourseModule = {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type Lesson = {
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

export type Enrollment = {
  id: string
  profile_id: string
  course_id: string
  status: EnrollmentStatus
  enrolled_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type LessonProgress = {
  id: string
  profile_id: string
  lesson_id: string
  status: LessonProgressStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type Quiz = {
  id: string
  lesson_id: string
  title: string
  description: string | null
  passing_score: number
  created_at: string
  updated_at: string
}

// Composed view models used by the academy UI.
export type LessonWithProgress = Lesson & {
  completed: boolean
  started: boolean
}

export type ModuleWithLessons = CourseModule & {
  lessons: LessonWithProgress[]
}

export type CourseOutline = {
  course: Course
  modules: ModuleWithLessons[]
  totalLessons: number
  completedLessons: number
  progressPercent: number
  nextLessonId: string | null
}

// ── Certification (Phase 3B) ────────────────────────────────────────────────

export type ExamOption = {
  id: string
  label: string
}

export type ExamQuestion = {
  id: string
  prompt: string
  type: QuizQuestionType
  options: ExamOption[]
}

// Exam as delivered to the student (NO answer key).
export type Exam = {
  id: string
  title: string
  description: string | null
  passing_score: number
  questions: ExamQuestion[]
}

export type ExamSubmissionResult = {
  score: number
  passed: boolean
  passing_score: number
  attempt_id: string
  certificate_id: string | null
  certificate_code: string | null
}

export type Certificate = {
  id: string
  profile_id: string
  course_id: string
  exam_attempt_id: string | null
  certificate_code: string
  score: number
  issued_at: string
  created_at: string
}

// Public, safe-field certificate verification result.
export type CertificateVerification =
  | { valid: false }
  | {
      valid: true
      certificate_code: string
      holder_name: string | null
      course_title: string
      score: number
      issued_at: string
    }

// ── Marketplace, requests, proposals, bookings, notifications (Phase 5) ──────

export type RequestStatus = 'open' | 'matched' | 'booked' | 'closed' | 'cancelled'
export type ProposalStatus = 'sent' | 'accepted' | 'declined' | 'withdrawn'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded'
export type NotificationType =
  | 'request_match'
  | 'proposal_received'
  | 'proposal_accepted'
  | 'proposal_declined'
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'

// Public marketplace RPC shapes (curated, from SECURITY DEFINER functions)
export type MarketplaceCard = {
  id: string
  title: string
  description: string | null
  category: ActivityCategory | null
  price_cents: number | null
  currency: string
  languages: string[] | null
  min_age: number | null
  max_age: number | null
  city: string | null
  country: string | null
  indoor_outdoor: 'indoor' | 'outdoor' | 'both' | null
  organizer_id: string
  organizer_name: string | null
  organizer_certified: boolean
  cover_path: string | null
  rating: number | null
  review_count: number
}

export type MarketplaceActivityDetail = {
  id: string
  title: string
  description: string | null
  category: ActivityCategory | null
  price_cents: number | null
  currency: string
  languages: string[] | null
  min_age: number | null
  max_age: number | null
  city: string | null
  country: string | null
  indoor_outdoor: 'indoor' | 'outdoor' | 'both' | null
  duration_minutes: number | null
  rating: number | null
  review_count: number
  organizer: { id: string; name: string | null; certified: boolean }
  venue: { name: string; city: string | null; country: string | null; indoor_outdoor: string | null } | null
  photo_paths: string[]
  upcoming: { date: string; start_time: string | null }[]
}

export type PublicOrganizer = {
  id: string
  display_name: string | null
  bio: string | null
  city: string | null
  country: string | null
  languages: string[] | null
  website: string | null
  certified: boolean
  member_since: string
  rating: number | null
  review_count: number
  activities: {
    id: string
    title: string
    category: ActivityCategory | null
    price_cents: number | null
    currency: string
    city: string | null
  }[]
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type Review = {
  id: string
  booking_id: string
  customer_id: string
  organizer_id: string
  activity_id: string | null
  rating: number
  comment: string | null
  status: ReviewStatus
  created_at: string
  updated_at: string
}

// Public review row from get_activity_reviews / get_organizer_reviews
export type PublicReview = {
  id: string
  rating: number
  comment: string | null
  author: string
  created_at: string
}

export type CustomerRequest = {
  id: string
  customer_id: string
  event_type: ActivityCategory
  city: string | null
  country: string | null
  desired_date: string | null
  participant_count: number | null
  age_min: number | null
  age_max: number | null
  budget_cents: number | null
  currency: string
  notes: string | null
  status: RequestStatus
  created_at: string
  updated_at: string
}

export type Proposal = {
  id: string
  request_id: string
  organizer_id: string
  activity_id: string | null
  message: string | null
  price_cents: number | null
  currency: string
  proposed_date: string | null
  status: ProposalStatus
  created_at: string
  updated_at: string
}

export type Booking = {
  id: string
  customer_id: string
  organizer_id: string
  activity_id: string | null
  proposal_id: string | null
  request_id: string | null
  venue_id: string | null
  calendar_event_id: string | null
  date: string
  start_time: string | null
  end_time: string | null
  participant_count: number | null
  amount_cents: number | null
  currency: string
  status: BookingStatus
  stripe_payment_intent_id: string | null
  created_at: string
  updated_at: string
}

export type AppNotification = {
  id: string
  profile_id: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T; error?: never }
  | { success?: never; error: string; data?: never }
