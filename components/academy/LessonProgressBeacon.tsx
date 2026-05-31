'use client'

import { useEffect, useRef } from 'react'
import { markLessonStarted } from '@/lib/actions/academy'

/**
 * Records (once) that the student opened this lesson. Renders nothing.
 * Skips the write when the lesson is already completed so it never downgrades.
 */
export function LessonProgressBeacon({
  lessonId,
  completed,
}: {
  lessonId: string
  completed: boolean
}) {
  const fired = useRef(false)

  useEffect(() => {
    if (completed || fired.current) return
    fired.current = true
    void markLessonStarted(lessonId)
  }, [lessonId, completed])

  return null
}
