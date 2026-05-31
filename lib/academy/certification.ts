import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import type { Exam, Certificate, CertificateVerification } from '@/lib/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** The course's final-exam quiz id, if one exists (enrolled students may read meta). */
export async function getFinalExamId(
  supabase: SupabaseServerClient,
  courseId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('quizzes')
    .select('id')
    .eq('course_id', courseId)
    .eq('kind', 'final_exam')
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

/**
 * Loads an exam (questions + option labels, NO answer key) via the
 * SECURITY DEFINER get_exam() function. Returns null if not deliverable.
 */
export async function getExam(
  supabase: SupabaseServerClient,
  quizId: string
): Promise<Exam | null> {
  const { data, error } = await supabase.rpc('get_exam', { p_quiz_id: quizId })
  if (error || !data) return null
  return data as Exam
}

/** The user's certificate for a given course, if issued. */
export async function getCertificate(
  supabase: SupabaseServerClient,
  userId: string,
  courseId: string
): Promise<Certificate | null> {
  const { data } = await supabase
    .from('certificates')
    .select('*')
    .eq('profile_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()
  return (data as Certificate | null) ?? null
}

/** The user's most recent certificate, if any. */
export async function getLatestCertificate(
  supabase: SupabaseServerClient,
  userId: string
): Promise<Certificate | null> {
  const { data } = await supabase
    .from('certificates')
    .select('*')
    .eq('profile_id', userId)
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Certificate | null) ?? null
}

/** Public certificate verification via verify_certificate() (anon-callable). */
export async function verifyCertificate(
  supabase: SupabaseServerClient,
  code: string
): Promise<CertificateVerification> {
  const { data, error } = await supabase.rpc('verify_certificate', { p_code: code })
  if (error || !data) return { valid: false }
  return data as CertificateVerification
}
