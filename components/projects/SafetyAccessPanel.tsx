'use client'

// Safety access panel (Organizer control) — create project-scoped Safety access (fire/police/EMS/security/
// inspectors/venue management, as PROJECT relationships) and manage Safety Links via the SHARED Project Access
// layer. Shows each relationship's contact + status + project-scoped Safety Link (copyable), with create /
// revoke / regenerate / remove. Calls the owner-gated server actions and refreshes on success. Organizer-only.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addSafetyAccessAction, revokeSafetyAccessAction, removeSafetyAccessAction, regenerateSafetyLinkAction } from '@/lib/actions/safety-access'

interface SafetyRow {
  id: string
  email: string | null
  phone: string | null
  status: 'invited' | 'active' | 'revoked'
  inviteToken: string
}

export function SafetyAccessPanel({
  grants,
  projectId,
  locale,
}: {
  grants: SafetyRow[]
  projectId: string
  locale: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  function run(action: () => Promise<{ ok: boolean; reason?: string }>, after?: () => void) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (res.ok) { after?.(); router.refresh() }
      else setError(`Could not update: ${(res.reason ?? 'error').replace(/_/g, ' ')}`)
    })
  }

  function safetyLink(token: string): string {
    const path = `/${locale}/safety/${token}`
    return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
  }

  return (
    <div>
      <ul className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
        {grants.length === 0 && <li className="text-xs text-slate-400">No safety access granted yet.</li>}
        {grants.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
            <span className="min-w-0">
              <span>{g.email || g.phone || 'Safety personnel'}</span>
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{g.status}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {g.status !== 'revoked' && (
                <button type="button" onClick={() => navigator.clipboard?.writeText(safetyLink(g.inviteToken))}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50">Copy Safety Link</button>
              )}
              <button type="button" disabled={pending} onClick={() => run(() => regenerateSafetyLinkAction(projectId, g.id, locale))}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Regenerate</button>
              {g.status !== 'revoked' && (
                <button type="button" disabled={pending} onClick={() => run(() => revokeSafetyAccessAction(projectId, g.id, locale))}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Revoke</button>
              )}
              <button type="button" disabled={pending} onClick={() => run(() => removeSafetyAccessAction(projectId, g.id, locale))}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Remove</button>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Safety contact email"
          className="w-52 rounded border border-slate-300 px-2 py-1 text-sm" />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="or phone"
          className="w-36 rounded border border-slate-300 px-2 py-1 text-sm" />
        <button type="button" disabled={pending || (!email.trim() && !phone.trim())}
          onClick={() => run(() => addSafetyAccessAction(projectId, email, phone, locale), () => { setEmail(''); setPhone('') })}
          className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Grant safety access</button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
