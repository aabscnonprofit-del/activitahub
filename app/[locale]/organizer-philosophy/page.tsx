import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'organizerPhilosophy.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function OrganizerPhilosophyPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('organizerPhilosophy')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const principles = Array.from({ length: 11 }, (_, i) => i)

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1">
        {/* ── Intro ─────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-brand-50 to-amber-50 px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-600">
              {t('intro.eyebrow')}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              {t('intro.headline')}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {t('intro.lead')}
            </p>
          </div>
        </section>

        {/* ── Principles ────────────────────────────────────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <ol className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            {principles.map((i) => (
              <li key={i} className="card flex gap-4 p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-bold text-slate-900">
                    {t(`principles.${i}.title` as 'principles.0.title')}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {t(`principles.${i}.body` as 'principles.0.body')}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Closing ───────────────────────────────────────────────────── */}
        <section className="bg-slate-50 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xl font-bold text-slate-900 sm:text-2xl">{t('closing')}</p>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              {t('ctaSection.headline')}
            </h2>
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/${locale}/become-an-organizer`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-bold text-white shadow-lg transition-colors hover:bg-brand-400 sm:w-auto"
              >
                {t('ctaSection.become')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/academy`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/20 sm:w-auto"
              >
                {t('ctaSection.academy')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter locale={locale} />
    </div>
  )
}
