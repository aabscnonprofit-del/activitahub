'use client'

// Participant Stories — participant-generated Activity Memory. PUBLIC read-only list of participants' short
// reflections (display name + text, chronological). An ELIGIBLE participant (approved, completed public activity)
// gets a lightweight PLAIN-TEXT editor for their OWN story only — the organizer and other participants cannot
// edit it. When there are no stories and the viewer cannot contribute, the "Coming soon" placeholder shows. No
// likes / reactions / comments / replies / sorting-by-popularity; no markdown/rich-text/AI.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setParticipantStoryAction } from '@/lib/actions/participant-story'
import { PARTICIPANT_STORY_MAX } from '@/lib/activity-memories/limits'

interface StoryEntry {
  participantId: string
  name: string | null
  story: string
}

export function ParticipantStories({
  projectId,
  locale,
  stories,
  myStory,
  canContribute,
}: {
  projectId: string
  locale: string
  stories: StoryEntry[]
  myStory: string | null
  canContribute: boolean
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(myStory ?? '')
  const [draft, setDraft] = useState(myStory ?? '')
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await setParticipantStoryAction(projectId, draft, locale)
      if (res.ok) { setSaved(draft.trim()); setEditing(false); router.refresh() }
      else setError(res.error === 'too_long' ? 'Story is too long.' : res.error === 'not_eligible' ? 'Only approved participants can add a story.' : 'Could not save. Please try again.')
    })
  }

  const hasSaved = saved.trim().length > 0

  return (
    <div className="mb-4 rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-800">Participant Stories</h3>

      {stories.length === 0 && !canContribute ? (
        <p className="mt-1 text-xs text-slate-400">Coming soon</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {stories.length === 0 && <li className="text-xs text-slate-400">No participant stories yet.</li>}
          {stories.map((s) => (
            <li key={s.participantId} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
              <p className="text-xs font-semibold text-slate-600">{s.name || 'Participant'}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{s.story}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Eligible participant — a plain-text editor for their OWN story only. */}
      {canContribute && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your story</p>
          {editing ? (
            <div className="mt-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, PARTICIPANT_STORY_MAX))}
                maxLength={PARTICIPANT_STORY_MAX}
                rows={4}
                placeholder="What was this experience like for you?"
                className="w-full rounded border border-slate-300 p-2 text-sm"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">{draft.length}/{PARTICIPANT_STORY_MAX}</span>
                <span className="flex gap-2">
                  <button type="button" disabled={pending} onClick={save}
                    className="rounded bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-60">
                    {pending ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" disabled={pending} onClick={() => { setDraft(saved); setEditing(false); setError(null) }}
                    className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                    Cancel
                  </button>
                </span>
              </div>
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
          ) : (
            <button type="button" onClick={() => { setDraft(saved); setEditing(true) }}
              className="mt-1 text-xs font-medium text-brand-600 hover:underline">
              {hasSaved ? 'Edit your story' : 'Add your story'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
