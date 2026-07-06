'use client'

// Guest Access panel (Organizer control, part of Project Access) — grant someone a Shared View of the event via
// a private access link. Backed by access_type 'participant' in the SHARED Project Access layer (code identifiers
// unchanged); this is the permission/view-sharing model, DISTINCT from the Participants roster (people who
// joined). Shows each grant's contact + status + project-scoped access link (copyable), with add / revoke /
// regenerate / remove. Calls the owner-gated server actions and
// refreshes on success. Organizer-only surface. No clock/randomness → no hydration mismatch.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addParticipantAction, revokeParticipantAction, removeParticipantAction, regenerateParticipantLinkAction } from '@/lib/actions/participant-access'

interface ParticipantRow {
  id: string
  email: string | null
  phone: string | null
  status: 'invited' | 'active' | 'revoked'
  inviteToken: string
}

export function ParticipantAccessPanel({
  participants,
  projectId,
  locale,
}: {
  participants: ParticipantRow[]
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

  function inviteLink(token: string): string {
    const path = `/${locale}/participant/${token}`
    return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
  }

  return (
    <div>
      <ul className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
        {participants.length === 0 && <li className="text-xs text-slate-400">No access granted yet.</li>}
        {participants.map((pt) => (
          <li key={pt.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
            <span className="min-w-0">
              <span>{pt.email || pt.phone || 'Guest'}</span>
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{pt.status}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {pt.status !== 'revoked' && (
                <button type="button" onClick={() => navigator.clipboard?.writeText(inviteLink(pt.inviteToken))}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50">Copy access link</button>
              )}
              <button type="button" disabled={pending} onClick={() => run(() => regenerateParticipantLinkAction(projectId, pt.id, locale))}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Regenerate</button>
              {pt.status !== 'revoked' && (
                <button type="button" disabled={pending} onClick={() => run(() => revokeParticipantAction(projectId, pt.id, locale))}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Revoke</button>
              )}
              <button type="button" disabled={pending} onClick={() => run(() => removeParticipantAction(projectId, pt.id, locale))}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Remove</button>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Guest email"
          className="w-48 rounded border border-slate-300 px-2 py-1 text-sm" />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="or phone"
          className="w-36 rounded border border-slate-300 px-2 py-1 text-sm" />
        <button type="button" disabled={pending || (!email.trim() && !phone.trim())}
          onClick={() => run(() => addParticipantAction(projectId, email, phone, locale), () => { setEmail(''); setPhone('') })}
          className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Grant access</button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
