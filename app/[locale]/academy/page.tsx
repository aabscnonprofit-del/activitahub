import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, GraduationCap, Trophy, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  getOrCreateEnrollment,
  getCourseOutline,
  hasAcademyAccess,
} from '@/lib/academy/queries'
import { getCertificate, getFinalExamId } from '@/lib/academy/certification'
import { CourseOutline } from '@/components/academy/CourseOutline'
import type { Locale, Profile } from '@/lib/types'
import type { Metadata } from 'next'

interface AcademyPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: AcademyPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'academy' })
  return { title: t('title') }
}

export default async function AcademyPage({ params }: AcademyPageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('academy')

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

  // Middleware already gates /academy, but stay defensive.
  if (!profile || !hasAcademyAccess(profile)) {
    redirect(`/${locale}/onboarding`)
  }

  const enrollment = await getOrCreateEnrollment(supabase, profile)

  // No course matches the user's path yet (e.g. content not seeded).
  if (!enrollment) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <GraduationCap className="mx-auto mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
        <h1 className="text-lg font-bold text-slate-900">{t('noCourse.title')}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          {t('noCourse.description')}
        </p>
      </div>
    )
  }

  const outline = await getCourseOutline(supabase, user.id, enrollment.course)
  const courseComplete =
    outline.totalLessons > 0 && outline.completedLessons === outline.totalLessons

  const certificate = await getCertificate(supabase, user.id, enrollment.course.id)
  const examId = courseComplete
    ? await getFinalExamId(supabase, enrollment.course.id)
    : null

  return (
    <div className="space-y-8">
      {/* Course header + progress */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-600">
          {t('title')}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
          {outline.course.title}
        </h1>
        {outline.course.description && (
          <p className="mt-2 text-sm text-slate-500">{outline.course.description}</p>
        )}

        {/* Progress bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              {t('progress', {
                completed: outline.completedLessons,
                total: outline.totalLessons,
              })}
            </span>
            <span className="font-semibold text-brand-600">
              {outline.progressPercent}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${outline.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Continue / exam / certificate CTA */}
        <div className="mt-5">
          {certificate ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-green-50 px-4 py-3">
              <Award className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
              <span className="text-sm font-medium text-green-800">{t('certified')}</span>
              <Link
                href={`/${locale}/academy/certificate`}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
              >
                {t('viewCertificate')}
              </Link>
            </div>
          ) : courseComplete && examId ? (
            <Link
              href={`/${locale}/academy/exam`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              {t('takeExam')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : courseComplete ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              <Trophy className="h-5 w-5 text-green-500" aria-hidden="true" />
              {t('courseComplete')}
            </div>
          ) : (
            outline.nextLessonId && (
              <Link
                href={`/${locale}/academy/lessons/${outline.nextLessonId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                {outline.completedLessons > 0 ? t('continueLearning') : t('startLearning')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )
          )}
        </div>
      </div>

      {/* Module / lesson outline */}
      <CourseOutline outline={outline} locale={locale} />
    </div>
  )
}
