import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { MetalField, EngravedRule, Fastener, ENGRAVE, PLATE, CONTROL } from '@/components/why/metal'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'why.meta' })
  return { title: t('title'), description: t('description') }
}

/** Equipment-marking header for a compartment: stamped designator, label, documentary title. */
function PanelHeader({
  section,
  index,
  label,
  title,
}: {
  section: string
  index: string
  label: string
  title: string
}) {
  return (
    <header>
      <div className="flex items-center gap-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#5a5f66]">
          {section} {index}
        </span>
        <span aria-hidden="true" className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <span className="font-mono text-[11px] tracking-[0.3em] text-[#41464c]">ALH·OS</span>
      </div>
      <h2
        className="mt-4 font-mono text-xl font-bold uppercase tracking-[0.18em] text-[#c8cdd2] sm:text-2xl"
        style={ENGRAVE}
      >
        {label}
      </h2>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#8b9098] sm:text-lg">{title}</p>
    </header>
  )
}

export default async function WhyPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('why')
  const tUi = await getTranslations('why.ui')
  const SECTION = tUi('section')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const viewer = await getViewerCtaState(supabase)

  const originBody = t.raw('origin.body') as string[]
  const pipeline = t.raw('system.pipeline') as string[]
  const fightItems = t.raw('fight.items') as { term: string; detail: string }[]
  const buildItems = t.raw('build.items') as { term: string; detail: string }[]

  return (
    <div className="flex min-h-screen flex-col bg-[#08090b] text-[#aab0b6]">
      <PublicHeader locale={locale} isAuthenticated={!!user} isOrganizer={viewer.isOrganizer} />

      {/* The slab: one continuous metal surface behind every compartment. */}
      <main className="relative isolate flex-1">
        <div className="fixed inset-0 -z-10">
          <MetalField />
        </div>

        {/* ── Title block / nameplate ───────────────────────────────────── */}
        <section className="relative px-6 py-24 sm:px-10 sm:py-32">
          <Fastener className="absolute left-5 top-5" />
          <Fastener className="absolute right-5 top-5" />
          <Fastener className="absolute bottom-5 left-5" />
          <Fastener className="absolute bottom-5 right-5" />
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.3em] text-[#5a5f66]">
              <span>ALH·OS — 001</span>
              <span>DOC · WHY / REV A</span>
            </div>
            <EngravedRule className="mt-4" />

            <h1
              className="mt-12 max-w-4xl text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-[#cfd4d9] sm:text-6xl lg:text-7xl"
              style={ENGRAVE}
            >
              {t('hero.headline')}
            </h1>

            <div className="mt-12 flex items-stretch gap-5">
              <span
                aria-hidden="true"
                className="block w-[3px] shrink-0"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.03))', boxShadow: '1px 0 0 rgba(0,0,0,0.6)' }}
              />
              <div className="space-y-1 text-lg sm:text-xl">
                <p className="text-[#868c93]">{t('hero.supportingA')}</p>
                <p className="font-semibold text-[#cfd4d9]" style={ENGRAVE}>{t('hero.supportingB')}</p>
              </div>
            </div>

            <EngravedRule className="mt-14" />
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-[10px] uppercase tracking-[0.32em] text-[#4d525a]">
              <span>{t('hero.eyebrow')}</span>
              <span>UNIT 001</span>
              <span>GRAPHITE · METEORIC IRON</span>
            </div>
          </div>
        </section>

        <EngravedRule />

        {/* ── 01 Origin ─────────────────────────────────────────────────── */}
        <section className="relative px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <PanelHeader section={SECTION} index="01" label={t('origin.label')} title={t('origin.title')} />
            <div className="mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-[#8b9098] sm:text-lg">
              {originBody.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        <EngravedRule />

        {/* ── 02 Core system ────────────────────────────────────────────── */}
        <section className="relative px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <PanelHeader section={SECTION} index="02" label={t('system.label')} title={t('system.title')} />
            <p className="mt-6 max-w-2xl text-base text-[#8b9098] sm:text-lg">{t('system.lead')}</p>

            <ol className="mt-10 flex flex-wrap items-stretch gap-3">
              {pipeline.map((node, i) => (
                <li key={i} className="flex items-center gap-3">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="h-px w-6 shrink-0"
                      style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.05), rgba(255,255,255,0.22))' }}
                    />
                  )}
                  <div className="flex min-w-[9rem] flex-col gap-1.5 border border-white/10 px-4 py-3" style={PLATE}>
                    <span className="font-mono text-[10px] tracking-[0.25em] text-[#565b62]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-sm uppercase tracking-[0.12em] text-[#c8cdd2]">{node}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <EngravedRule />

        {/* ── 03 What we fight ──────────────────────────────────────────── */}
        <section className="relative px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <PanelHeader section={SECTION} index="03" label={t('fight.label')} title={t('fight.title')} />
            <div className="mt-10 grid grid-cols-1 gap-px border border-white/10 sm:grid-cols-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
              {fightItems.map((item, i) => (
                <div key={i} className="p-6" style={PLATE}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] tracking-[0.25em] text-[#565b62]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-mono text-sm uppercase tracking-[0.12em] text-[#c8cdd2]">{item.term}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#868c93]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <EngravedRule />

        {/* ── 04 What we build ──────────────────────────────────────────── */}
        <section className="relative px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <PanelHeader section={SECTION} index="04" label={t('build.label')} title={t('build.title')} />
            <div className="mt-10 grid grid-cols-1 gap-px border border-white/10 sm:grid-cols-2 lg:grid-cols-4" style={{ background: 'rgba(255,255,255,0.07)' }}>
              {buildItems.map((item, i) => (
                <div key={i} className="flex flex-col p-5" style={PLATE}>
                  <span className="font-mono text-[10px] tracking-[0.25em] text-[#565b62]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 font-mono text-sm uppercase tracking-[0.12em] text-[#c8cdd2]">{item.term}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#868c93]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <EngravedRule />

        {/* ── 05 Economics ──────────────────────────────────────────────── */}
        <section className="relative px-6 py-20 sm:px-10 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <PanelHeader section={SECTION} index="05" label={t('economics.label')} title={t('economics.title')} />
            <div className="mt-10 max-w-3xl">
              <p className="font-mono text-sm uppercase tracking-[0.12em] text-[#565b62] line-through decoration-[#3a3e44]">
                {t('economics.statementA')}
              </p>
              <p className="mt-3 text-2xl font-extrabold leading-snug text-[#cfd4d9] sm:text-4xl" style={ENGRAVE}>
                {t('economics.statementB')}
              </p>
              <p className="mt-8 max-w-2xl text-base leading-relaxed text-[#8b9098] sm:text-lg">
                {t('economics.note')}
              </p>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#4d525a]">
                {t('economics.fineprint')}
              </p>
            </div>
          </div>
        </section>

        <EngravedRule />

        {/* ── 06 Closing nameplate ──────────────────────────────────────── */}
        <section className="relative px-6 py-24 sm:px-10 sm:py-32">
          <Fastener className="absolute left-5 top-5" />
          <Fastener className="absolute right-5 top-5" />
          <Fastener className="absolute bottom-5 left-5" />
          <Fastener className="absolute bottom-5 right-5" />
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#5a5f66]">{SECTION} 06</span>
              <span aria-hidden="true" className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#41464c]">{t('final.label')}</span>
            </div>
            <p className="mt-10 text-lg text-[#868c93] sm:text-xl">{t('final.statementA')}</p>
            <p className="mt-3 max-w-4xl text-3xl font-extrabold uppercase leading-[1.02] tracking-tight text-[#cfd4d9] sm:text-5xl" style={ENGRAVE}>
              {t('final.statementB')}
            </p>

            <div className="mt-14 flex flex-col gap-3 sm:flex-row">
              <Link
                href={viewer.isOrganizer ? `/${locale}/dashboard` : `/${locale}/become-an-organizer`}
                className="inline-flex w-full items-center justify-center border border-white/12 px-8 py-3.5 text-sm font-bold uppercase tracking-[0.15em] text-[#cfd4d9] transition-colors hover:text-white sm:w-auto"
                style={CONTROL}
              >
                {t('final.ctaPrimary')}
              </Link>
              <Link
                href={`/${locale}/plan-an-event`}
                className="inline-flex w-full items-center justify-center border border-white/12 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-[#9aa0a7] transition-colors hover:border-white/25 hover:text-[#cfd4d9] sm:w-auto"
              >
                {t('final.ctaSecondary')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter locale={locale} />
    </div>
  )
}
