import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLessonContext } from '@/lib/academy/queries'
import { markLessonComplete } from '@/lib/actions/academy'
import { LessonProgressBeacon } from '@/components/academy/LessonProgressBeacon'
import { MarkCompleteButton } from '@/components/academy/MarkCompleteButton'
import type { Locale } from '@/lib/types'

interface LessonPageProps {
  params: Promise<{ locale: string; lessonId: string }>
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { locale, lessonId } = (await params) as {
    locale: Locale
    lessonId: string
  }
  const t = await getTranslations('academy')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  // RLS returns no lesson for users who are not enrolled in its course.
  const ctx = await getLessonContext(supabase, user.id, lessonId)
  if (!ctx) redirect(`/${locale}/academy`)

  const paragraphs = ctx.lesson.content.split('\n\n').map((p) => p.trim()).filter(Boolean)

  return (
    <article className="space-y-6">
      {/* Records the open as in_progress (once). */}
      <LessonProgressBeacon lessonId={ctx.lesson.id} completed={ctx.completed} />

      {/* Breadcrumb back to dashboard */}
      <Link
        href={`/${locale}/academy`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {ctx.module.title}
      </Link>

      {/* Lesson header */}
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900">
            {ctx.lesson.title}
          </h1>
          {ctx.completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('completed')}
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {ctx.lesson.duration_minutes} {t('min')}
        </p>
      </header>

      {/* Lesson body */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="space-y-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line leading-relaxed text-slate-700">
              {p}
            </p>
          ))}
        </div>

        {/* Quiz notice — Phase 3A shows that a check exists; the exam is Phase 3B */}
        {ctx.quiz && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-900">{ctx.quiz.title}</p>
              <p className="mt-0.5 text-sm text-amber-700">{t('quizComingSoon')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Mark complete */}
      <form action={markLessonComplete} className="flex items-center gap-3">
        <input type="hidden" name="lessonId" value={ctx.lesson.id} />
        <input type="hidden" name="locale" value={locale} />
        <MarkCompleteButton completed={ctx.completed} />
      </form>

      {/* Prev / next navigation */}
      <nav className="flex items-center justify-between border-t border-slate-200 pt-5">
        {ctx.prevLessonId ? (
          <Link
            href={`/${locale}/academy/lessons/${ctx.prevLessonId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('previous')}
          </Link>
        ) : (
          <span />
        )}
        {ctx.nextLessonId ? (
          <Link
            href={`/${locale}/academy/lessons/${ctx.nextLessonId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            {t('next')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  )
}
