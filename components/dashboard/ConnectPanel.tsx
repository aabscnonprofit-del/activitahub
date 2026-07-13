import { getTranslations } from 'next-intl/server'
import { CreditCard, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { getMyConnectAccount } from '@/lib/billing/connect.server'
import { deriveConnectStatus } from '@/lib/billing/connect'
import { startConnectOnboarding } from '@/lib/actions/connect'
import ConnectStripeFirstTime from '@/components/dashboard/ConnectStripeFirstTime'

// Organizer "Get paid" panel — surfaces Stripe Connect status and the onboarding CTA.
// Reads the owner-scoped connect row (migration 035); capability flags are synced by
// the account.updated webhook, so this reflects the latest synced state on each load.
// The startConnectOnboarding action enforces the organizer-access gate; this UI does
// not introduce any new role/business rule.

const MARKER_TONE: Record<string, 'ok' | 'warn' | 'err'> = {
  return: 'ok',
  refresh: 'warn',
  no_access: 'err',
  unconfigured: 'err',
  setup_error: 'err',
}

const MARKER_STYLE: Record<'ok' | 'warn' | 'err', string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  err: 'border-red-200 bg-red-50 text-red-700',
}

export default async function ConnectPanel({
  locale,
  statusMarker,
}: {
  locale: string
  statusMarker?: string
}) {
  const t = await getTranslations('connectPayments')
  const account = await getMyConnectAccount()
  const status = deriveConnectStatus(account)

  const marker = statusMarker && statusMarker in MARKER_TONE ? statusMarker : null
  // Returning from Stripe but not yet enabled → the webhook may lag a moment.
  const markerKey = marker === 'return' && status !== 'enabled' ? 'return_pending' : marker
  const markerMsg = markerKey ? t(`marker.${markerKey}` as 'marker.return') : null
  const markerTone = marker ? MARKER_TONE[marker] : null

  // Connected and ready, with nothing to announce → a slim confirmation only.
  if (status === 'enabled' && !marker) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {t('enabled.short')}
      </div>
    )
  }

  const head = {
    none: { Icon: CreditCard, ring: 'bg-brand-100 text-brand-600', title: t('none.title'), body: t('none.body') },
    onboarding: { Icon: Clock, ring: 'bg-amber-100 text-amber-600', title: t('onboarding.title'), body: t('onboarding.body') },
    restricted: { Icon: AlertTriangle, ring: 'bg-rose-100 text-rose-600', title: t('restricted.title'), body: t('restricted.body') },
    enabled: { Icon: CheckCircle2, ring: 'bg-emerald-100 text-emerald-600', title: t('enabled.title'), body: t('enabled.body') },
  }[status]

  const ctaLabel = status === 'none' ? t('cta.connect') : status === 'restricted' ? t('cta.fix') : t('cta.finish')

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${head.ring}`}>
          <head.Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900">{head.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{head.body}</p>

          {markerMsg && markerTone && (
            <p className={`mt-3 rounded-xl border px-3 py-2 text-sm ${MARKER_STYLE[markerTone]}`}>{markerMsg}</p>
          )}

          {status === 'none' ? (
            // First-time connect → confirm before creating the very first Connect account.
            <ConnectStripeFirstTime
              locale={locale}
              label={ctaLabel}
              warning={{
                title: t('warning.title'),
                body1: t('warning.body1'),
                body2: t('warning.body2'),
                body3: t('warning.body3'),
                body4: t('warning.body4'),
                checkbox: t('warning.checkbox'),
                cancel: t('warning.cancel'),
                continue: t('warning.continue'),
              }}
            />
          ) : status !== 'enabled' ? (
            // Resume ("Finish setup"/"Continue on Stripe") — an account already exists; no warning.
            <form action={startConnectOnboarding} className="mt-4">
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn-primary">{ctaLabel}</button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  )
}
