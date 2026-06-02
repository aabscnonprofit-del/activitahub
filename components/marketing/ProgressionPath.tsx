import { getTranslations } from 'next-intl/server'
import {
  Compass, Ticket, GraduationCap, Briefcase, BadgeCheck, ChevronRight,
} from 'lucide-react'
import type { Locale } from '@/lib/types'

/**
 * Discover → Participate → Learn → Organize → Certify.
 *
 * A single, always-visible progression so a visitor instantly understands where
 * they start, what the next step is, and how they grow inside the platform.
 * Read-only marketing surface — no levels, points, or identity systems.
 */
const STAGE_ICONS = [Compass, Ticket, GraduationCap, Briefcase, BadgeCheck]
const STAGE_COLORS = [
  'bg-rose-50 text-rose-600',
  'bg-amber-50 text-amber-600',
  'bg-green-50 text-green-600',
  'bg-brand-50 text-brand-600',
  'bg-indigo-50 text-indigo-600',
]

export async function ProgressionPath({ locale }: { locale: Locale }) {
  // locale is accepted for symmetry with sibling sections; copy comes from the
  // request-scoped translator.
  void locale
  const t = await getTranslations('home')
  const stages = [0, 1, 2, 3, 4] as const

  return (
    <section className="bg-slate-50 px-4 py-14 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center sm:mb-14">
          <p className="text-sm font-bold uppercase tracking-wide text-brand-600">
            {t('progression.eyebrow')}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">
            {t('progression.headline')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 sm:text-lg">
            {t('progression.subheadline')}
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-5 lg:gap-3">
          {stages.map((i) => {
            const Icon = STAGE_ICONS[i]
            return (
              <li key={i} className="relative flex flex-col items-center text-center">
                <div className="relative">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${STAGE_COLORS[i]}`}>
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white ring-2 ring-slate-50">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-slate-900">
                  {t(`progression.stages.${i}.title` as 'progression.stages.0.title')}
                </h3>
                <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-slate-600">
                  {t(`progression.stages.${i}.description` as 'progression.stages.0.description')}
                </p>

                {i < 4 && (
                  <ChevronRight
                    className="absolute -right-3 top-5 hidden h-6 w-6 text-slate-300 lg:block"
                    aria-hidden="true"
                  />
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

export default ProgressionPath
