'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, RefreshCw, Megaphone, Sparkles } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { generatePromotionPackage } from '@/lib/actions/marketing'
import type { PromotionAssets } from '@/lib/marketing/promotion-generator'
import type { Activity } from '@/lib/types'

const LOCALES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ru', label: 'Русский' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
]

type Props = {
  activity: Activity | null
  uiLocale: string
  open: boolean
  onClose: () => void
}

/** A single channel's text with a copy button. */
function AssetBlock({
  label,
  text,
  copyLabel,
  copiedLabel,
}: {
  label: string
  text: string
  copyLabel: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <span className="text-sm font-bold text-slate-800">{label}</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap px-4 py-3 font-sans text-sm leading-relaxed text-slate-700">
        {text}
      </pre>
    </div>
  )
}

export default function PromotionPackageModal({ activity, uiLocale, open, onClose }: Props) {
  const t = useTranslations('activities.promotion')

  const [outLocale, setOutLocale] = useState(uiLocale)
  const [variant, setVariant] = useState(0)
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<PromotionAssets | null>(null)
  const [error, setError] = useState(false)

  const run = useCallback(
    async (loc: string, v: number) => {
      if (!activity) return
      setLoading(true)
      setError(false)
      try {
        const res = await generatePromotionPackage(activity.id, loc, v)
        if (res.ok && res.assets) setAssets(res.assets)
        else setError(true)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    },
    [activity],
  )

  // Generate on open; reset when closed.
  useEffect(() => {
    if (open && activity && !assets && !loading) run(outLocale, 0)
    if (!open) {
      setAssets(null)
      setVariant(0)
      setError(false)
      setOutLocale(uiLocale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activity])

  function changeLanguage(loc: string) {
    setOutLocale(loc)
    setVariant(0)
    run(loc, 0)
  }

  function regenerate() {
    const v = variant + 1
    setVariant(v)
    run(outLocale, v)
  }

  return (
    <Modal open={open} onClose={onClose} title={t('title')} size="lg">
      <div className="space-y-4">
        {/* Subtitle + activity */}
        <div className="flex items-start gap-2.5 rounded-xl bg-brand-50 p-3.5 text-sm text-slate-600">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
          <span>
            {t('subtitle')}
            {activity ? <span className="font-semibold text-slate-800"> — {activity.title}</span> : null}
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-500">{t('language')}</span>
            <select
              value={outLocale}
              onChange={(e) => changeLanguage(e.target.value)}
              disabled={loading}
              className="input-base !w-auto !py-1.5 !text-sm"
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={regenerate}
            disabled={loading}
            className="btn-secondary !px-4 !py-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? t('generating') : t('regenerate')}
          </button>
        </div>

        {/* Results */}
        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{t('error')}</p>
        ) : loading && !assets ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Sparkles className="h-4 w-4 animate-pulse text-brand-500" />
            {t('generating')}
          </div>
        ) : assets ? (
          <div className="space-y-3">
            <AssetBlock label={t('channels.facebook')} text={assets.facebook} copyLabel={t('copy')} copiedLabel={t('copied')} />
            <AssetBlock label={t('channels.instagram')} text={assets.instagram} copyLabel={t('copy')} copiedLabel={t('copied')} />
            <AssetBlock label={t('channels.telegram')} text={assets.telegram} copyLabel={t('copy')} copiedLabel={t('copied')} />
            <AssetBlock label={t('channels.whatsapp')} text={assets.whatsapp} copyLabel={t('copy')} copiedLabel={t('copied')} />
            <AssetBlock
              label={t('channels.email')}
              text={`${t('subject')}: ${assets.email.subject}\n\n${assets.email.body}`}
              copyLabel={t('copy')}
              copiedLabel={t('copied')}
            />
            <AssetBlock label={t('channels.ad')} text={assets.ad} copyLabel={t('copy')} copiedLabel={t('copied')} />
            <AssetBlock label={t('channels.description')} text={assets.description} copyLabel={t('copy')} copiedLabel={t('copied')} />
          </div>
        ) : null}

        {/* Honest guardrail note */}
        <p className="text-xs leading-relaxed text-slate-400">{t('disclaimer')}</p>
      </div>
    </Modal>
  )
}
