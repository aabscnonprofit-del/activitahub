'use client'

// Organizer Story — the first real content inside Activity Memories. The organizer's public reflection on a
// completed public activity (a property of the Project). PUBLIC read-only display; the Project owner gets a
// lightweight PLAIN-TEXT editor (no markdown, no rich text). When empty, the existing "Coming soon" placeholder
// shows. Runs the owner-gated setOrganizerStoryAction.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setOrganizerStoryAction } from '@/lib/actions/organizer-story'
import { ORGANIZER_STORY_MAX } from '@/lib/activity-memories/limits'

export function OrganizerStory({
  projectId,
  locale,
  initialStory,
  canEdit,
}: {
  projectId: string
  locale: string
  initialStory: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [story, setStory] = useState(initialStory ?? '')
  const [draft, setDraft] = useState(initialStory ?? '')
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const hasStory = story.trim().length > 0
  const heading = <h3 className="text-sm font-semibold text-slate-800">Organizer Story</h3>

  // Public (and any non-owner) — read-only: the story, or the placeholder.
  if (!canEdit) {
    return (
      <div className="mb-4 rounded-lg border border-slate-200 p-4">
        {heading}
        {hasStory ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{story}</p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Coming soon</p>
        )}
      </div>
    )
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await setOrganizerStoryAction(projectId, draft, locale)
      if (res.ok) {
        setStory(draft.trim())
        setEditing(false)
        router.refresh()
      } else {
        setError(res.error === 'too_long' ? 'Story is too long.' : 'Could not save. Please try again.')
      }
    })
  }

  // Owner — lightweight plain-text editor.
  return (
    <div className="mb-4 rounded-lg border border-slate-200 p-4">
      {heading}
      {editing ? (
        <div className="mt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, ORGANIZER_STORY_MAX))}
            maxLength={ORGANIZER_STORY_MAX}
            rows={6}
            placeholder="What happened? What made this activity special? What should future participants know?"
            className="w-full rounded border border-slate-300 p-2 text-sm"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">{draft.length}/{ORGANIZER_STORY_MAX}</span>
            <span className="flex gap-2">
              <button type="button" disabled={pending} onClick={save}
                className="rounded bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-60">
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" disabled={pending} onClick={() => { setDraft(story); setEditing(false); setError(null) }}
                className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                Cancel
              </button>
            </span>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="mt-2">
          {hasStory ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{story}</p>
          ) : (
            <p className="text-xs text-slate-400">Coming soon — add your story of this activity (only you can edit this).</p>
          )}
          <button type="button" onClick={() => { setDraft(story); setEditing(true) }}
            className="mt-2 text-xs font-medium text-brand-600 hover:underline">
            {hasStory ? 'Edit story' : 'Add story'}
          </button>
        </div>
      )}
    </div>
  )
}
