'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { approveProjectAction } from '@/lib/actions/projects'

interface Props {
  projectId: string
  locale: string
  /** The Project's approval timestamp (null until approved). */
  initialApprovedAt: string | null
}

/** Deterministic UTC date (avoids SSR/client hydration mismatch). */
function formatApprovedDate(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

/**
 * Approve Project — records a truthful approval: the approval state on the Project plus a separate immutable
 * Approved Project Snapshot artifact. Owner-only, no confirmation dialog, no redirect: the organizer stays on
 * the Project Workspace. User-facing copy describes only the approval state.
 */
export function ApproveProjectPanel({ projectId, locale, initialApprovedAt }: Props) {
  const [approvedAt, setApprovedAt] = useState<string | null>(initialApprovedAt)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function doApprove() {
    setPending(true)
    setError(null)
    const res = await approveProjectAction(projectId, locale)
    setPending(false)
    if (res.ok) setApprovedAt(res.approvedAt ?? new Date().toISOString())
    else if (res.error === 'no_operational_configuration') setError('This Draft Project has no plan to approve yet.')
    else setError('Could not record approval. Please try again.')
  }

  if (approvedAt) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          <p className="text-sm font-semibold">Project Approved</p>
        </div>
        <p className="mt-1 text-xs text-emerald-800/80">Approved on: {formatApprovedDate(approvedAt)}</p>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={doApprove}
        disabled={pending}
        className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Approve Project
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
