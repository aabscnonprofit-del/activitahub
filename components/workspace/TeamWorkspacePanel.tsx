'use client'

// Interactive Team Workspace — manage the people on a project and assign them to project roles. Team members
// (add / set availability / remove) and roles (assign a member) call the runtime-validated server actions and
// refresh on success so the workspace reloads with the persisted team. No new model/route; no clock/randomness
// → no hydration mismatch.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addTeamMemberAction, removeTeamMemberAction, setMemberAvailabilityAction, assignRoleAction } from '@/lib/actions/team'
import { AVAILABILITIES, type Availability } from '@/lib/team/model'

interface Member { id: string; name: string; availability: Availability }
interface Role { id: string; label: string; assignedMemberId: string | null; status: 'unassigned' | 'assigned' | 'at_risk' }

export function TeamWorkspacePanel({
  members,
  roles,
  projectId,
  locale,
}: {
  members: Member[]
  roles: Role[]
  projectId: string
  locale: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  function run(action: () => Promise<{ ok: boolean; reason?: string }>, after?: () => void) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (res.ok) { after?.(); router.refresh() }
      else setError(`Could not update: ${(res.reason ?? 'error').replace(/_/g, ' ')}`)
    })
  }

  return (
    <div className="space-y-4">
      {/* Members */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Team members</h3>
        <ul className="space-y-1 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          {members.length === 0 && <li className="text-xs text-slate-400">No team members yet.</li>}
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2">
              <span>{m.name}</span>
              <span className="flex items-center gap-2">
                <select
                  value={m.availability}
                  onChange={(e) => run(() => setMemberAvailabilityAction(projectId, m.id, e.target.value, locale))}
                  disabled={pending}
                  className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                >
                  {AVAILABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => run(() => removeTeamMemberAction(projectId, m.id, locale))}
                  disabled={pending}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a team member"
            className="w-48 rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => run(() => addTeamMemberAction(projectId, newName, locale), () => setNewName(''))}
            disabled={pending || !newName.trim()}
            className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Roles + assignment */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Roles</h3>
        <ul className="space-y-1 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          {roles.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <span>{r.label}</span>
              <span className="flex items-center gap-2">
                {r.status === 'at_risk' && <span className="text-[10px] font-medium text-amber-600">Assignee unavailable</span>}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{r.status.replace('_', ' ')}</span>
                <select
                  value={r.assignedMemberId ?? ''}
                  onChange={(e) => run(() => assignRoleAction(projectId, r.id, e.target.value, locale))}
                  disabled={pending}
                  className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
