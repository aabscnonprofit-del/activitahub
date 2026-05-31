'use server'

import { createClient } from '@/lib/supabase/server'
import type { ExamSubmissionResult } from '@/lib/types'

export type ExamState = {
  ok: boolean
  result?: ExamSubmissionResult
  error?: string
}

/**
 * Grades a final-exam submission via the SECURITY DEFINER submit_exam()
 * function. The DB records the attempt and — on a pass — issues the certificate
 * and advances the profile to 'certified'. Answer keys never reach the client.
 *
 * Used with useFormState in the exam UI.
 */
export async function submitExam(
  _prev: ExamState,
  formData: FormData
): Promise<ExamState> {
  const quizId = formData.get('quizId') as string
  const answersRaw = (formData.get('answers') as string) || '{}'
  if (!quizId) return { ok: false, error: 'Missing exam reference.' }

  let answers: Record<string, string[]>
  try {
    answers = JSON.parse(answersRaw)
  } catch {
    return { ok: false, error: 'Could not read your answers. Please try again.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const { data, error } = await supabase.rpc('submit_exam', {
    p_quiz_id: quizId,
    p_answers: answers,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, result: data as ExamSubmissionResult }
}
