import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import {
  ArrowRight, Shuffle, Sparkles, Check, GraduationCap,
  ClipboardList, CalendarClock, Wallet, FileText,
  Plus, UploadCloud, Inbox, Ticket, CreditCard,
  Users, CheckCircle2, BellRing, Megaphone, UserCheck, ClipboardCheck,
  Image as ImageIcon, Radio, Smartphone,
  AlertTriangle, BarChart3, BadgeCheck, ShieldCheck, Star,
} from 'lucide-react'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'becomeOrganizerPage.meta' })
  return { title: t('title'), description: t('description') }
}

const OPE_ICONS = [ClipboardList, CalendarClock, Wallet, FileText] as const
const RUN_ICONS = [Plus, UploadCloud, Inbox, FileText, Ticket, CreditCard] as const
const PARTICIPANT_ICONS = [Users, CheckCircle2, BellRing, Megaphone, UserCheck, ClipboardCheck] as const
const PROMOTE_ICONS = [Sparkles, ImageIcon, Radio, Smartphone] as const
const COMMAND_ICONS = [AlertTriangle, CalendarClock, Users, BarChart3] as const
const TRUST_ICONS = [BadgeCheck, ShieldCheck, Star, GraduationCap] as const

export default async function BecomeAnOrganizerPage({ params }: PageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('becomeOrganizerPage')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Certified organizers stay on the page; their "Get started" CTAs become "Go to dashboard".
  const viewer = await getViewerCtaState(supabase)
  const tOrg = await getTranslations('organizerCta')
  const startHref = viewer.isOrganizer ? `/${locale}/dashboard` : `/${locale}/sign-up?next=/${locale}/onboarding`

  // Renders a capability grid for one section namespace (run / participants / …).
  function Grid({ base, icons }: { base: string; icons: readonly React.ElementType[] }) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {icons.map((Icon, i) => (
          <div key={i} className="card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-3 font-bold text-slate-900">{t(`${base}.items.${i}.title` as 'run.items.0.title')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{t(`${base}.items.${i}.body` as 'run.items.0.body')}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated={!!user} isOrganizer={viewer.isOrganizer} />

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
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href={startHref} className="btn-primary w-full px-7 py-3.5 sm:w-auto">
                {viewer.isOrganizer ? tOrg('dashboard') : t('hero.cta')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href={`/${locale}/pricing`} className="btn-secondary w-full px-7 py-3.5 sm:w-auto">
                {t('hero.ctaSecondary')}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stop jumping between 10 tools ─────────────────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Shuffle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('tools.headline')}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600">{t('tools.body')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <span key={i} className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-500">
                  {t(`tools.items.${i}` as 'tools.items.0')}
                </span>
              ))}
            </div>
            <p className="mx-auto mt-7 max-w-2xl text-base font-semibold text-slate-900 sm:text-lg">{t('tools.conclusion')}</p>
          </div>
        </section>

        {/* ── A · Run your activities ───────────────────────────────────── */}
        <section className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('run.headline')}</h2>
              <p className="mx-auto mt-2 max-w-2xl text-base text-slate-500">{t('run.subheadline')}</p>
            </div>
            <Grid base="run" icons={RUN_ICONS} />
          </div>
        </section>

        {/* ── B · Manage participants (prominent) ───────────────────────── */}
        <section className="bg-brand-600 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-300">{t('hero.badge')}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl lg:text-4xl">{t('participants.headline')}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-brand-100 sm:text-lg">{t('participants.subheadline')}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PARTICIPANT_ICONS.map((Icon, i) => (
                <div key={i} className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-amber-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 font-bold text-white">{t(`participants.items.${i}.title` as 'participants.items.0.title')}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-brand-100">{t(`participants.items.${i}.body` as 'participants.items.0.body')}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── C · Promote your activities ───────────────────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('promote.headline')}</h2>
              <p className="mx-auto mt-2 inline-flex rounded-full bg-amber-100 px-4 py-1.5 text-sm font-bold text-amber-800">{t('promote.tagline')}</p>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">{t('promote.subheadline')}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PROMOTE_ICONS.map((Icon, i) => (
                <div key={i} className="card p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 font-bold text-slate-900">{t(`promote.items.${i}.title` as 'promote.items.0.title')}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{t(`promote.items.${i}.body` as 'promote.items.0.body')}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── D · Organizer Command Center ──────────────────────────────── */}
        <section className="bg-slate-50 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('command.headline')}</h2>
              <p className="mx-auto mt-2 max-w-2xl text-base text-slate-500">{t('command.subheadline')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {COMMAND_ICONS.map((Icon, i) => (
                <div key={i} className="card p-5 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">{t(`command.items.${i}.title` as 'command.items.0.title')}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{t(`command.items.${i}.body` as 'command.items.0.body')}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── E · Plan better — OPE (Early Access) ──────────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-3xl bg-gradient-to-br from-brand-50 to-amber-50 px-5 py-10 ring-1 ring-brand-100 sm:px-12 sm:py-14">
              <div className="text-center">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('ope.flagship')}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">{t('ope.badge')}</span>
                </div>
                <h2 className="mt-5 text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-4xl">{t('ope.headline')}</h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{t('ope.subheadline')}</p>
              </div>
              <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
                {OPE_ICONS.map((Icon, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl bg-white/70 p-5 ring-1 ring-white/60">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{t(`ope.items.${i}.title` as 'ope.items.0.title')}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{t(`ope.items.${i}.body` as 'ope.items.0.body')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col items-center gap-3">
                <Link href={`/${locale}/plan-an-event`} className="btn-primary px-7 py-3">
                  {t('ope.cta')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <p className="max-w-2xl text-center text-xs text-slate-500">{t('ope.note')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── F · Trust & growth ────────────────────────────────────────── */}
        <section className="bg-slate-50 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('trust.headline')}</h2>
              <p className="mx-auto mt-2 max-w-2xl text-base text-slate-500">{t('trust.subheadline')}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TRUST_ICONS.map((Icon, i) => (
                <div key={i} className="card p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 font-bold text-slate-900">{t(`trust.items.${i}.title` as 'trust.items.0.title')}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{t(`trust.items.${i}.body` as 'trust.items.0.body')}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href={`/${locale}/academy`} className="btn-secondary px-7 py-3">
                {t('trust.academyCta')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Why organizers choose ActivLife Hub ───────────────────────── */}
        <section className="px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{t('why.headline')}</h2>
            <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-xl bg-white p-4 text-left text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  {t(`why.items.${i}` as 'why.items.0')}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Pricing reference ─────────────────────────────────────────── */}
        <section className="px-4 pb-4">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h2 className="font-bold text-slate-900">{t('pricing.headline')}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('pricing.body')}</p>
            </div>
            <Link href={`/${locale}/pricing`} className="btn-secondary shrink-0 px-6 py-2.5">
              {t('pricing.cta')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{t('cta.headline')}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-400 sm:text-lg">{t('cta.body')}</p>
            <Link
              href={startHref}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-bold text-white shadow-lg transition-colors hover:bg-brand-400"
            >
              {viewer.isOrganizer ? tOrg('dashboard') : t('cta.button')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter locale={locale} />
    </div>
  )
}
