'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Records that a student has opened a lesson (status = in_progress).
 * Idempotent and never downgrades a completed lesson (ignoreDuplicates).
 * Writes are RLS-guarded: only allowed for lessons in an enrolled course.
 */
export async function markLessonStarted(lessonId: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('lesson_progress').upsert(
    { profile_id: user.id, lesson_id: lessonId, status: 'in_progress' },
    { onConflict: 'profile_id,lesson_id', ignoreDuplicates: true }
  )
}

/**
 * Marks a lesson complete for the current student, then rolls the result up to
 * the enrollment: if every lesson in the course is now complete, the enrollment
 * is marked completed. Real persistence only — completion is derived from actual
 * lesson_progress rows, never faked.
 *
 * On success, advances the student to the next lesson (or back to the academy
 * dashboard when the course is finished).
 */
export async function markLessonComplete(formData: FormData): Promise<void> {
  const lessonId = formData.get('lessonId') as string
  const locale = (formData.get('locale') as string) || 'en'
  if (!lessonId) redirect(`/${locale}/academy`)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  // Record completion (overwrites in_progress).
  await supabase.from('lesson_progress').upsert(
    {
      profile_id: user.id,
      lesson_id: lessonId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id,lesson_id' }
  )

  // Resolve the lesson's course to roll up completion + find the next lesson.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, module_id')
    .eq('id', lessonId)
    .maybeSingle()

  let nextLessonId: string | null = null

  if (lesson) {
    const { data: courseModule } = await supabase
      .from('modules')
      .select('id, course_id')
      .eq('id', (lesson as { module_id: string }).module_id)
      .maybeSingle()

    if (courseModule) {
      const courseId = (courseModule as { course_id: string }).course_id

      // All lesson ids in the course, in display order.
      const { data: moduleRows } = await supabase
        .from('modules')
        .select('id, sort_order')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true })
      const moduleIds = (moduleRows ?? []).map((m) => (m as { id: string }).id)

      const { data: lessonRows } = await supabase
        .from('lessons')
        .select('id, module_id, sort_order')
        .in('module_id', moduleIds.length ? moduleIds : ['00000000-0000-0000-0000-000000000000'])
        .order('sort_order', { ascending: true })

      // Flatten in (module order, lesson order).
      const orderedIds: string[] = []
      for (const mid of moduleIds) {
        for (const l of (lessonRows ?? []) as { id: string; module_id: string }[]) {
          if (l.module_id === mid) orderedIds.push(l.id)
        }
      }

      // Completed lessons for this user within this course.
      const { data: progressRows } = await supabase
        .from('lesson_progress')
        .select('lesson_id, status')
        .eq('profile_id', user.id)
        .in('lesson_id', orderedIds.length ? orderedIds : ['00000000-0000-0000-0000-000000000000'])

      const completedIds = new Set(
        ((progressRows ?? []) as { lesson_id: string; status: string }[])
          .filter((p) => p.status === 'completed')
          .map((p) => p.lesson_id)
      )

      nextLessonId = orderedIds.find((id) => !completedIds.has(id)) ?? null

      // Roll up enrollment completion when the whole course is done.
      if (orderedIds.length > 0 && completedIds.size >= orderedIds.length) {
        await supabase
          .from('enrollments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('profile_id', user.id)
          .eq('course_id', courseId)
      }
    }
  }

  if (nextLessonId && nextLessonId !== lessonId) {
    redirect(`/${locale}/academy/lessons/${nextLessonId}`)
  }
  redirect(`/${locale}/academy`)
}
