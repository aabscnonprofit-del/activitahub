import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import type {
  Course,
  CourseModule,
  Lesson,
  Enrollment,
  LessonProgress,
  Quiz,
  CourseOutline,
  ModuleWithLessons,
  Profile,
} from '@/lib/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type AccessProfile = Pick<
  Profile,
  'id' | 'role' | 'onboarding_status' | 'selected_path'
>

const ACADEMY_ELIGIBLE_STATUSES = [
  'payment_complete',
  'certified',
  'subscribed',
] as const

/** Whether a profile is allowed into the academy (mirrors the RLS rule). */
export function hasAcademyAccess(profile: AccessProfile): boolean {
  if (profile.role === 'admin' || profile.role === 'certified_organizer') return true
  return (ACADEMY_ELIGIBLE_STATUSES as readonly string[]).includes(
    profile.onboarding_status
  )
}

/**
 * Resolves the course for the user's selected path and ensures an enrollment
 * row exists, creating it on first visit. Returns null when the user has no
 * path or no matching course. The insert is RLS-guarded (only paid users).
 */
export async function getOrCreateEnrollment(
  supabase: SupabaseServerClient,
  profile: AccessProfile
): Promise<{ course: Course; enrollment: Enrollment } | null> {
  if (!profile.selected_path) return null

  const { data: courseRow } = await supabase
    .from('courses')
    .select('*')
    .eq('path', profile.selected_path)
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!courseRow) return null
  const course = courseRow as Course

  // Already enrolled?
  const { data: existing } = await supabase
    .from('enrollments')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (existing) return { course, enrollment: existing as Enrollment }

  // Create the enrollment (RLS enforces the user has paid).
  const { data: created, error } = await supabase
    .from('enrollments')
    .insert({ profile_id: profile.id, course_id: course.id, status: 'active' })
    .select('*')
    .single()

  if (error || !created) return null
  return { course, enrollment: created as Enrollment }
}

/**
 * Returns the course's lessons in their true display order
 * (module sort_order, then lesson sort_order), flattened.
 */
async function getOrderedLessons(
  supabase: SupabaseServerClient,
  courseId: string
): Promise<{ modules: CourseModule[]; lessonsByModule: Map<string, Lesson[]>; flat: Lesson[] }> {
  const { data: moduleRows } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true })

  const modules = (moduleRows ?? []) as CourseModule[]
  const moduleIds = modules.map((m) => m.id)

  const lessonsByModule = new Map<string, Lesson[]>()
  const flat: Lesson[] = []

  if (moduleIds.length > 0) {
    const { data: lessonRows } = await supabase
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds)
      .order('sort_order', { ascending: true })

    const lessons = (lessonRows ?? []) as Lesson[]
    for (const m of modules) {
      const ls = lessons
        .filter((l) => l.module_id === m.id)
        .sort((a, b) => a.sort_order - b.sort_order)
      lessonsByModule.set(m.id, ls)
      flat.push(...ls)
    }
  }

  return { modules, lessonsByModule, flat }
}

/** Set of lesson ids the user has completed / started. */
async function getProgressSets(
  supabase: SupabaseServerClient,
  userId: string
): Promise<{ completed: Set<string>; started: Set<string> }> {
  const { data } = await supabase
    .from('lesson_progress')
    .select('lesson_id, status')
    .eq('profile_id', userId)

  const rows = (data ?? []) as Pick<LessonProgress, 'lesson_id' | 'status'>[]
  const completed = new Set<string>()
  const started = new Set<string>()
  for (const r of rows) {
    started.add(r.lesson_id)
    if (r.status === 'completed') completed.add(r.lesson_id)
  }
  return { completed, started }
}

/** Builds the full course outline + real progress for the academy dashboard. */
export async function getCourseOutline(
  supabase: SupabaseServerClient,
  userId: string,
  course: Course
): Promise<CourseOutline> {
  const { modules, lessonsByModule, flat } = await getOrderedLessons(
    supabase,
    course.id
  )
  const { completed, started } = await getProgressSets(supabase, userId)

  const modulesWithLessons: ModuleWithLessons[] = modules.map((m) => ({
    ...m,
    lessons: (lessonsByModule.get(m.id) ?? []).map((l) => ({
      ...l,
      completed: completed.has(l.id),
      started: started.has(l.id),
    })),
  }))

  const totalLessons = flat.length
  const completedLessons = flat.filter((l) => completed.has(l.id)).length
  const progressPercent =
    totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100)
  const nextLessonId = flat.find((l) => !completed.has(l.id))?.id ?? null

  return {
    course,
    modules: modulesWithLessons,
    totalLessons,
    completedLessons,
    progressPercent,
    nextLessonId,
  }
}

export type LessonContext = {
  lesson: Lesson
  module: CourseModule
  course: Course
  completed: boolean
  prevLessonId: string | null
  nextLessonId: string | null
  quiz: Pick<Quiz, 'id' | 'title' | 'description'> | null
}

/**
 * Loads everything the lesson page needs. Returns null when the lesson does not
 * exist or the user cannot access it (RLS returns no row for non-enrolled users).
 */
export async function getLessonContext(
  supabase: SupabaseServerClient,
  userId: string,
  lessonId: string
): Promise<LessonContext | null> {
  const { data: lessonRow } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .maybeSingle()

  if (!lessonRow) return null
  const lesson = lessonRow as Lesson

  const { data: moduleRow } = await supabase
    .from('modules')
    .select('*')
    .eq('id', lesson.module_id)
    .maybeSingle()
  if (!moduleRow) return null
  const courseModule = moduleRow as CourseModule

  const { data: courseRow } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseModule.course_id)
    .maybeSingle()
  if (!courseRow) return null
  const course = courseRow as Course

  // Prev/next across the whole course in display order.
  const { flat } = await getOrderedLessons(supabase, course.id)
  const idx = flat.findIndex((l) => l.id === lessonId)
  const prevLessonId = idx > 0 ? flat[idx - 1].id : null
  const nextLessonId = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1].id : null

  const { data: progressRow } = await supabase
    .from('lesson_progress')
    .select('status')
    .eq('profile_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()
  const completed =
    (progressRow as Pick<LessonProgress, 'status'> | null)?.status === 'completed'

  const { data: quizRow } = await supabase
    .from('quizzes')
    .select('id, title, description')
    .eq('lesson_id', lessonId)
    .maybeSingle()
  const quiz = (quizRow as Pick<Quiz, 'id' | 'title' | 'description'> | null) ?? null

  return {
    lesson,
    module: courseModule,
    course,
    completed,
    prevLessonId,
    nextLessonId,
    quiz,
  }
}
