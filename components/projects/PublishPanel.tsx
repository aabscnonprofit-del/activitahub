'use client'

import { useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, Globe } from 'lucide-react'
import { publishProjectAction } from '@/lib/actions/projects'

interface Props {
  projectId: string
  locale: string
  initialPublished: boolean
  /** Public Space path for this Project (existing /[locale]/p/[projectId] route). */
  publicPath: string
}

export function PublishPanel({ projectId, locale, initialPublished, publicPath }: Props) {
  const [published, setPublished] = useState(initialPublished)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function doPublish() {
    setPending(true)
    setError(null)
    const res = await publishProjectAction(projectId, locale)
    setPending(false)
    if (res.ok) {
      setPublished(true)
      setConfirming(false)
    } else {
      setError(res.error ?? 'publish_failed')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — the Open button still works */
    }
  }

  // ── Published screen ─────────────────────────────────────────────────────────
  if (published) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          <h2 className="text-base font-bold">Activity published</h2>
        </div>
        <p className="mt-1 text-sm text-emerald-800/80">This activity is now live on its public page.</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copied ? 'Copied!' : 'Copy Public Link'}
          </button>
          <a
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open public page
          </a>
        </div>
      </div>
    )
  }

  // ── Publish / confirm ────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-slate-200 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Globe className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">Publish this activity</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Make it live on its own public page. Set visibility to <span className="font-medium">Public</span> as well to have it appear in Discover.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">
          {error === 'not_authorized'
            ? 'Only the owner can publish this Project.'
            : error === 'no_future_occurrence'
              ? 'Set a date first — a public activity needs at least one upcoming date before it can be published. Use the Schedule section above.'
              : 'Could not publish. Please try again.'}
        </p>
      )}

      <div className="mt-4">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-700">Publish now? It will become publicly visible.</span>
            <button
              type="button"
              onClick={doPublish}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
            >
              {pending ? 'Publishing…' : 'Confirm Publish'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-500"
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            Publish
          </button>
        )}
      </div>
    </div>
  )
}
