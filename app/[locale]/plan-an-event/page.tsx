import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { ArrowRight, Check, Sparkles, CalendarCheck, ShieldCheck, Wallet } from 'lucide-react'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'plannerLanding.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function PlanAnEventPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('plannerLanding')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const list = (key: string, n: number) =>
    Array.from({ length: n }, (_, i) => i).map((i) => t(`${key}.${i}` as 'whatItDoes.items.0'))

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-brand-50 to-amber-50 px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/70 px-4 py-1.5 text-sm font-semibold text-brand-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t('hero.badge')}
            </p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              {t('hero.title')}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {t('hero.subtitle')}
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-2">
              <Link
                href={`/${locale}/sign-up?next=/${locale}/plan-an-event`}
                className="btn-primary px-7 py-3.5"
              >
                {t('cta.button')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="text-sm font-semibold text-slate-700">
                {t('price.amount')} · {t('price.note')}
              </p>
            </div>
          </div>
        </section>

        {/* ── What it does / What you receive ───────────────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">{t('whatItDoes.headline')}</h2>
              <ul className="mt-4 space-y-2.5">
                {list('whatItDoes.items', 3).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">{t('receive.headline')}</h2>
              <ul className="mt-4 space-y-2.5">
                {list('receive.items', 5).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Example outputs ───────────────────────────────────────────── */}
        <section className="bg-slate-50 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-extrabold text-slate-900">{t('examples.headline')}</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-6">
                  <h3 className="font-bold text-slate-900">
                    {t(`examples.items.${i}.title` as 'examples.items.0.title')}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {t(`examples.items.${i}.line` as 'examples.items.0.line')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Benefits ──────────────────────────────────────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">{t('benefits.headline')}</h2>
            <ul className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              {list('benefits.items', 4).map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-xl bg-white p-4 text-left text-sm text-slate-700 ring-1 ring-slate-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Waitlist CTA (placeholder) ────────────────────────────────── */}
        <section className="bg-slate-900 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{t('cta.headline')}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-400 sm:text-lg">{t('cta.body')}</p>
            <Link
              href={`/${locale}/sign-up?next=/${locale}/plan-an-event`}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-bold text-white shadow-lg transition-colors hover:bg-brand-400"
            >
              {t('cta.button')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="mt-4 text-sm text-slate-400">{t('cta.note')}</p>
          </div>
        </section>
      </main>

      <PublicFooter locale={locale} />
    </div>
  )
}
