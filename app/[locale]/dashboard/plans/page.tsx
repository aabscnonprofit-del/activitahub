import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Plus, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listPlans } from '@/lib/actions/opePlans'
import type { SavedPlan } from '@/lib/types'

// Organizer plans index (M5 WP3) — portfolio-level visibility over saved OPE
// plans. Read-only list; each card opens the read-only detail view (T5). No
// editing, recompute, sourcing, or readiness editing here.

type Props = { params: Promise<{ locale: string }> }

const fmtDate = (iso: string) => (iso ? iso.slice(0, 10) : '—')

// status → { i18n key, color class }
const STATUS_BADGE: Record<string, { key: string; cls: string }> = {
  plan_ready: { key: 'statusReady', cls: 'bg-emerald-100 text-emerald-700' },
  needs_clarification: { key: 'statusNeedsInfo', cls: 'bg-amber-100 text-amber-700' },
  needs_human_review: { key: 'statusReview', cls: 'bg-amber-100 text-amber-700' },
  needs_certified_organizer: { key: 'statusOrganizer', cls: 'bg-amber-100 text-amber-700' },
  unsupported: { key: 'statusUnsupported', cls: 'bg-slate-100 text-slate-600' },
  unsupported_modifier: { key: 'statusUnsupported', cls: 'bg-slate-100 text-slate-600' },
}
const PHASE_KEY: Record<string, string> = {
  draft: 'phaseDraft', planning: 'phasePlanning', ready: 'phaseReady',
  in_progress: 'phaseInProgress', completed: 'phaseCompleted', closed: 'phaseClosed',
}

export default async function PlansIndexPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'workspace' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const res = await listPlans()
  const plans: SavedPlan[] = res.success ? (res.data ?? []) : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
        {plans.length > 0 && (
          <Link href={`/${locale}/dashboard/plans/new`} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm">
            <Plus className="h-4 w-4" /> {t('newPlan')}
          </Link>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-base font-semibold text-slate-900">{t('emptyTitle')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('emptyBody')}</p>
          <Link
            href={`/${locale}/dashboard/plans/new`}
            className="btn-primary mt-5 inline-flex items-center gap-1.5 px-6 py-3 text-sm"
          >
            <Plus className="h-4 w-4" /> {t('createFirst')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {plans.map((p) => {
            const badge = STATUS_BADGE[p.result?.status] ?? STATUS_BADGE.unsupported
            return (
              <li key={p.id}>
                <Link
                  href={`/${locale}/dashboard/plans/${p.id}`}
                  className="card flex items-center justify-between gap-4 p-5 transition-colors hover:border-brand-200"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold text-slate-900">{p.title || t('untitled')}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.cls}`}>{t(badge.key)}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{t(PHASE_KEY[p.phase] ?? 'phasePlanning')}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {t('updated')} {fmtDate(p.updated_at)} · {t('created')} {fmtDate(p.created_at)} · v{p.version}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700">
                    {t('openPlan')} <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
