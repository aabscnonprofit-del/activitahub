import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { CheckCircle2, Circle, Clock, PlayCircle } from 'lucide-react'
import type { CourseOutline as CourseOutlineData } from '@/lib/types'

/**
 * Presentational course tree for the academy dashboard: modules, lessons,
 * real completion state, and per-lesson links. Server Component.
 */
export async function CourseOutline({
  outline,
  locale,
}: {
  outline: CourseOutlineData
  locale: string
}) {
  const t = await getTranslations('academy')

  return (
    <div className="space-y-6">
      {outline.modules.map((mod, modIndex) => (
        <section
          key={mod.id}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <header className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">
              {t('module')} {modIndex + 1}
            </p>
            <h3 className="mt-0.5 font-bold text-slate-900">{mod.title}</h3>
            {mod.description && (
              <p className="mt-0.5 text-sm text-slate-500">{mod.description}</p>
            )}
          </header>

          <ul className="divide-y divide-slate-100">
            {mod.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/${locale}/academy/lessons/${lesson.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                >
                  {lesson.completed ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
                  ) : lesson.started ? (
                    <PlayCircle className="h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
                  )}

                  <span
                    className={
                      lesson.completed
                        ? 'flex-1 text-sm font-medium text-slate-500 line-through'
                        : 'flex-1 text-sm font-medium text-slate-800'
                    }
                  >
                    {lesson.title}
                  </span>

                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {lesson.duration_minutes} {t('min')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
