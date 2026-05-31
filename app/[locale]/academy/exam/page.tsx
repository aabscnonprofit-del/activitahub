import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  getOrCreateEnrollment,
  getCourseOutline,
  hasAcademyAccess,
} from '@/lib/academy/queries'
import {
  getFinalExamId,
  getExam,
  getCertificate,
} from '@/lib/academy/certification'
import { ExamForm } from '@/components/academy/ExamForm'
import type { Locale, Profile } from '@/lib/types'

interface ExamPageProps {
  params: Promise<{ locale: string }>
}

export default async function ExamPage({ params }: ExamPageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('exam')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, role, onboarding_status, selected_path')
    .eq('id', user.id)
    .single()
  const profile = profileRow as Pick<
    Profile,
    'id' | 'role' | 'onboarding_status' | 'selected_path'
  > | null
  if (!profile || !hasAcademyAccess(profile)) redirect(`/${locale}/onboarding`)

  const enrollment = await getOrCreateEnrollment(supabase, profile)
  if (!enrollment) redirect(`/${locale}/academy`)

  // Already certified for this course → straight to the certificate.
  const existingCert = await getCertificate(supabase, user.id, enrollment.course.id)
  if (existingCert) redirect(`/${locale}/academy/certificate`)

  // Must finish all lessons before the exam.
  const outline = await getCourseOutline(supabase, user.id, enrollment.course)
  const courseComplete =
    outline.totalLessons > 0 && outline.completedLessons === outline.totalLessons
  if (!courseComplete) redirect(`/${locale}/academy`)

  const examId = await getFinalExamId(supabase, enrollment.course.id)
  if (!examId) redirect(`/${locale}/academy`)
  const exam = await getExam(supabase, examId)
  if (!exam) redirect(`/${locale}/academy`)

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/academy`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('backToAcademy')}
      </Link>

      <header className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-extrabold text-slate-900">{exam.title}</h1>
        {exam.description && (
          <p className="mt-2 text-sm text-slate-500">{exam.description}</p>
        )}
        <p className="mt-3 text-sm font-medium text-brand-700">
          {t('passingScore', { score: exam.passing_score })}
        </p>
      </header>

      <ExamForm exam={exam} locale={locale} />
    </div>
  )
}
