'use client'

// Worker access panel (Organizer control) — attach Workers to the Project and manage their access to the Worker
// View. The role select reuses the CANONICAL project roles (Team/Delivery source) — no new role definitions.
// Shows each worker's contact + role + status + confirmation + project-scoped invite link (copyable), with add
// / revoke / resend / remove. Calls the owner-gated server actions and refreshes on success. Organizer-only.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addWorkerAction, revokeWorkerAction, removeWorkerAction, resendWorkerInvitationAction } from '@/lib/actions/worker-access'

interface WorkerRow {
  id: string
  email: string | null
  phone: string | null
  roleLabel: string | null
  status: 'invited' | 'active' | 'revoked'
  confirmed: boolean
  inviteToken: string
}

interface RoleOption {
  id: string
  label: string
}

export function WorkerAccessPanel({
  workers,
  roles,
  projectId,
  locale,
}: {
  workers: WorkerRow[]
  roles: RoleOption[]
  projectId: string
  locale: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [roleId, setRoleId] = useState('')

  function run(action: () => Promise<{ ok: boolean; reason?: string }>, after?: () => void) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (res.ok) { after?.(); router.refresh() }
      else setError(`Could not update: ${(res.reason ?? 'error').replace(/_/g, ' ')}`)
    })
  }

  function inviteLink(token: string): string {
    const path = `/${locale}/worker/${token}`
    return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
  }

  return (
    <div>
      <ul className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
        {workers.length === 0 && <li className="text-xs text-slate-400">No workers attached yet.</li>}
        {workers.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
            <span className="min-w-0">
              <span>{w.email || w.phone || 'Worker'}</span>
              {w.roleLabel && <span className="ml-2 text-xs text-slate-400">{w.roleLabel}</span>}
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{w.status}</span>
              {w.confirmed && <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">confirmed</span>}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {w.status !== 'revoked' && (
                <button type="button" onClick={() => navigator.clipboard?.writeText(inviteLink(w.inviteToken))}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50">Copy invite link</button>
              )}
              <button type="button" disabled={pending} onClick={() => run(() => resendWorkerInvitationAction(projectId, w.id, locale))}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Resend</button>
              {w.status !== 'revoked' && (
                <button type="button" disabled={pending} onClick={() => run(() => revokeWorkerAction(projectId, w.id, locale))}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Revoke</button>
              )}
              <button type="button" disabled={pending} onClick={() => run(() => removeWorkerAction(projectId, w.id, locale))}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Remove</button>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Worker email"
          className="w-44 rounded border border-slate-300 px-2 py-1 text-sm" />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="or phone"
          className="w-32 rounded border border-slate-300 px-2 py-1 text-sm" />
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm">
          <option value="">No role</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <button type="button" disabled={pending || (!email.trim() && !phone.trim())}
          onClick={() => run(() => addWorkerAction(projectId, email, phone, roleId, locale), () => { setEmail(''); setPhone(''); setRoleId('') })}
          className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Add worker</button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
