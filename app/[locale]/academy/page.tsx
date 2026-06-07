import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import {
  ArrowRight, GraduationCap, Trophy, Award,
  ShieldCheck, BadgeCheck, CheckCircle2,
} from 'lucide-react'
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
  const t = await getTranslations({ locale, namespace: 'academyLanding' })
  return { title: t('hero.title'), description: t('hero.subtitle') }
}

export default async function AcademyPage({ params }: AcademyPageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('academy')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Resolve academy access for the (gated) course experience.
  let profile: Pick<Profile, 'id' | 'role' | 'onboarding_status' | 'selected_path'> | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, role, onboarding_status, selected_path')
      .eq('id', user.id)
      .single()
    profile = data as typeof profile
  }

  // ── Enrolled learners: the course experience ─────────────────────────────
  if (user && profile && hasAcademyAccess(profile)) {
    const enrollment = await getOrCreateEnrollment(supabase, profile)

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
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-600">{t('title')}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{outline.course.title}</h1>
          {outline.course.description && (
            <p className="mt-2 text-sm text-slate-500">{outline.course.description}</p>
          )}

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                {t('progress', {
                  completed: outline.completedLessons,
                  total: outline.totalLessons,
                })}
              </span>
              <span className="font-semibold text-brand-600">{outline.progressPercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${outline.progressPercent}%` }}
              />
            </div>
          </div>

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

        <CourseOutline outline={outline} locale={locale} />
      </div>
    )
  }

  // ── Everyone else: the public marketing landing ──────────────────────────
  const tL = await getTranslations('academyLanding')
  const modules = Array.from({ length: 8 }, (_, i) => i)

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <GraduationCap className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {tL('hero.title')}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          {tL('hero.subtitle')}
        </p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/${locale}/sign-up?next=/${locale}/onboarding`}
            className="btn-primary w-full px-7 py-3 sm:w-auto"
          >
            {tL('hero.cta')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={`/${locale}/become-an-organizer`}
            className="btn-secondary w-full px-7 py-3 sm:w-auto"
          >
            {tL('hero.ctaSecondary')}
          </Link>
        </div>
      </section>

      {/* Two paths in */}
      <section>
        <h2 className="text-center text-2xl font-extrabold text-slate-900">{tL('paths.headline')}</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-bold text-slate-900">{tL('paths.beginnerTitle')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{tL('paths.beginnerBody')}</p>
          </div>
          <div className="card p-6">
            <h3 className="font-bold text-slate-900">{tL('paths.fastTitle')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{tL('paths.fastBody')}</p>
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section>
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-900">{tL('curriculum.headline')}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            {tL('curriculum.subheadline')}
          </p>
        </div>
        <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {modules.map((i) => (
            <li
              key={i}
              className={`card flex gap-4 p-5 ${i === 6 ? 'ring-2 ring-brand-400' : ''}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {tL(`curriculum.modules.${i}.title` as 'curriculum.modules.0.title')}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {tL(`curriculum.modules.${i}.desc` as 'curriculum.modules.0.desc')}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Certification */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <BadgeCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{tL('certification.headline')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{tL('certification.body')}</p>
      </section>

      {/* Verified vs Certified */}
      <section>
        <h2 className="text-center text-2xl font-extrabold text-slate-900">{tL('badges.headline')}</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <BadgeCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-3 font-bold text-slate-900">{tL('badges.certifiedTitle')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{tL('badges.certifiedBody')}</p>
          </div>
          <div className="card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-3 font-bold text-slate-900">{tL('badges.verifiedTitle')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{tL('badges.verifiedBody')}</p>
          </div>
        </div>
      </section>

      {/* Mastery philosophy */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-50 to-amber-50 p-6 ring-1 ring-brand-100 sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{tL('mastery.headline')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{tL('mastery.body')}</p>
      </section>

      {/* Organizer Philosophy */}
      <section className="text-center">
        <h2 className="text-2xl font-extrabold text-slate-900">{tL('philosophy.headline')}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {tL('philosophy.body')}
        </p>
        <Link
          href={`/${locale}/organizer-philosophy`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
        >
          {tL('philosophy.cta')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl bg-slate-900 p-8 text-center">
        <h2 className="text-2xl font-extrabold text-white">{tL('cta.headline')}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 sm:text-base">{tL('cta.body')}</p>
        <Link
          href={`/${locale}/sign-up?next=/${locale}/onboarding`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3 text-base font-bold text-white shadow-lg transition-colors hover:bg-brand-400"
        >
          {tL('cta.button')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  )
}
