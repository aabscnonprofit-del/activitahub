import type { PlannerInput, PlanGenerationResult, OpeAssessment, CoverageStatus } from '@/lib/ope'

export type Locale = 'en' | 'es' | 'fr' | 'ru' | 'de' | 'pt'

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
  /** End of the 30-day Organizer Platform access included with certification. NULL = none. */
  organizer_access_until: string | null
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
  slug: string | null
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
  // Activity cover image (migration 025) — storage path in the venue-photos bucket
  cover_path?: string | null
  // Activity Alerts bookkeeping (migration 019)
  alerts_sent_at?: string | null
  alerts_reached_count?: number | null
  // Participant reminders config (migration 020)
  reminder_offsets_hours?: number[] | null
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
  | 'activity_alert'
  | 'event_update'
  | 'event_reminder'

// ── Participant Management ──────────────────────────────────────────────────
export type ParticipantStatus =
  | 'invited'
  | 'confirmed'
  | 'maybe'
  | 'declined'
  | 'checked_in'
  | 'no_show'

export type ParticipantSource = 'manual' | 'booking' | 'registration'

export type Participant = {
  id: string
  activity_id: string
  organizer_id: string
  profile_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  status: ParticipantStatus
  notes: string | null
  source: ParticipantSource
  rsvp_token: string
  checked_in_at: string | null
  created_at: string
  updated_at: string
}

export type ParticipantCounts = Record<ParticipantStatus, number>

// ── Activity Alerts (participant discovery) ─────────────────────────────────
export type AlertFrequency = 'immediate' | 'daily_digest'

export type AlertPreferences = {
  profile_id: string
  categories: string[]
  language: string | null
  radius_km: number
  frequency: AlertFrequency
  city: string | null
  country: string | null
  in_app: boolean
  push: boolean
  paused: boolean
  created_at: string
  updated_at: string
}

export type PushSubscriptionRow = {
  id: string
  profile_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

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
  organizer_slug: string | null
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
  organizer: { id: string; slug: string | null; name: string | null; certified: boolean }
  venue: { name: string; city: string | null; country: string | null; indoor_outdoor: string | null } | null
  photo_paths: string[]
  upcoming: { date: string; start_time: string | null }[]
}

export type PublicOrganizer = {
  id: string
  slug: string | null
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
  payment_status: BookingPaymentStatus
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  created_at: string
  updated_at: string
}

export type BookingPaymentStatus = 'unpaid' | 'processing' | 'paid' | 'refunded' | 'failed'

export type RefundRequestStatus = 'requested' | 'approved' | 'rejected' | 'refunded' | 'failed'

export type RefundRequest = {
  id: string
  booking_id: string
  requested_by: string
  reason: string | null
  status: RefundRequestStatus
  stripe_refund_id: string | null
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

// ── Analytics (Phase 6) ──────────────────────────────────────────────────────

export type OrganizerAnalytics = {
  total_bookings: number
  completed_bookings: number
  completion_rate: number
  revenue_cents: number
  proposals_sent: number
  proposals_accepted: number
  proposal_conversion: number
  repeat_customers: number
  avg_rating: number | null
  revenue_by_month: { month: string; revenue_cents: number }[]
  activity_popularity: { title: string; bookings: number }[]
}

export type PlatformAnalytics = {
  gmv_cents: number
  active_organizers: number
  active_customers: number
  total_requests: number
  total_bookings: number
  marketplace_conversion: number
  top_categories: { category: string; count: number }[]
  bookings_by_month: { month: string; count: number }[]
  total_reviews: number
  pending_reviews: number
}

export type CustomerStats = {
  total_bookings: number
  completed: number
  total_spent_cents: number
  organizers: number
  repeat_organizers: number
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T; error?: never }
  | { success?: never; error: string; data?: never }

// ── OPE Organizer Workspace — saved plans (M5 PlanStore, WP1) ───────────────
// An organizer-owned, persisted OPE plan. Mirrors the `ope_plans` table
// (migration 021). The engine (`generatePlan`) stays the source of truth for
// `result`; `input` is re-run on edit; `corrections`/`prep_state` are workspace
// state preserved across reload/recompute. Opaque-JSON fields are stored and
// returned as-is — the store does not model their internals.

/** Organizer-facing lifecycle phase of a saved plan (WP8 approved model). Linear:
 *  Draft → Planning → Ready → In Progress → Completed → Closed. Billing-active =
 *  Planning…Completed (Draft and Closed excluded). See lib/workspace/lifecycle.ts. */
export type OpePlanPhase = 'draft' | 'planning' | 'ready' | 'in_progress' | 'completed' | 'closed'

/** One append-only lifecycle transition record (WP8 audit trail). */
export type OpePlanLogEntry = {
  from: OpePlanPhase
  to: OpePlanPhase
  at: string // ISO timestamp
  by: string // organizer id
  forced: boolean // true for backward / reopen / abandon overrides
  auto?: boolean // true for the system Draft → Planning advance on plan_ready
  reason?: string
}

/** Budget line-item overrides (current-plan-only), keyed by `item_key`. Opaque to the store. */
export type OpePlanCorrections = {
  budget_lines?: Record<string, { low?: number; likely?: number; high?: number }>
  [k: string]: unknown
}

/** Preparation/readiness state the organizer accrues on a plan. */
export type OpePlanPrepState = {
  tasks_done?: string[] // checklist item ids ticked
  risks_handled?: string[] // risk ids marked handled
  resources_sourced?: string[] // need ids marked sourced
}

/** A persisted organizer plan row (the PlanStore record). */
export type SavedPlan = {
  id: string
  organizer_id: string
  title: string | null
  input: PlannerInput // source of truth for recompute
  result: PlanGenerationResult // the generated { status, coverage, plan, questions }
  corrections: OpePlanCorrections
  prep_state: OpePlanPrepState
  phase: OpePlanPhase
  lifecycle_log: OpePlanLogEntry[] // append-only transition history (WP8)
  version: number
  source_request_id: string | null // customer request this plan was generated from (026), else null
  assessment: OpeAssessment | null // deterministic preliminary assessment (026), set on request-derived plans
  created_at: string
  updated_at: string
}

/**
 * Result of createPlanFromRequest (OPE Task #1). A ready plan returns its id +
 * assessment; an unsupported request returns a structured coverage response (no
 * plan persisted); anything else is a plain error code.
 */
export type CreatePlanFromRequestResult =
  | { ok: true; planId: string; assessment: OpeAssessment | null }
  | { ok: false; kind: 'error'; error: string }
  | { ok: false; kind: 'unsupported'; status: CoverageStatus; reason: string; recommended_next_step: string }
