'use client'

// Activity Reviews — participant feedback inside Activity Memories. PUBLIC read-only list of participants'
// plain-text reviews (display name + text + creation date, chronological). An ELIGIBLE participant (Review
// Eligibility) gets a lightweight PLAIN-TEXT editor for their OWN review only — the organizer and other
// participants cannot edit it. When there are no reviews and the viewer cannot review, the "Coming soon"
// placeholder shows. NO star/numeric ratings, trust/reputation score, voting, likes, comments, replies,
// reactions, or moderation. No markdown/rich-text/AI. Organizer reputation is a separate future projection.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setActivityReviewAction } from '@/lib/actions/activity-review'
import { ACTIVITY_REVIEW_MAX } from '@/lib/activity-memories/limits'

interface ReviewEntry {
  participantId: string
  name: string | null
  review: string
  createdAt: string
}

export function ActivityReviews({
  projectId,
  locale,
  reviews,
  myReview,
  canReview,
}: {
  projectId: string
  locale: string
  reviews: ReviewEntry[]
  myReview: string | null
  canReview: boolean
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(myReview ?? '')
  const [draft, setDraft] = useState(myReview ?? '')
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await setActivityReviewAction(projectId, draft, locale)
      if (res.ok) { setSaved(draft.trim()); setEditing(false); router.refresh() }
      else setError(res.error === 'too_long' ? 'Review is too long.' : res.error === 'not_eligible' ? 'Only approved participants can review.' : 'Could not save. Please try again.')
    })
  }

  const hasSaved = saved.trim().length > 0

  return (
    <div className="mb-4 rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-800">Activity Reviews</h3>

      {reviews.length === 0 && !canReview ? (
        <p className="mt-1 text-xs text-slate-400">Coming soon</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {reviews.length === 0 && <li className="text-xs text-slate-400">No reviews yet.</li>}
          {reviews.map((r) => (
            <li key={r.participantId} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-slate-600">{r.name || 'Participant'}</p>
                <p className="text-xs text-slate-400">{r.createdAt.slice(0, 10)}</p>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.review}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Eligible participant — a plain-text editor for their OWN review only. */}
      {canReview && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your review</p>
          {editing ? (
            <div className="mt-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, ACTIVITY_REVIEW_MAX))}
                maxLength={ACTIVITY_REVIEW_MAX}
                rows={4}
                placeholder="Describe your experience of this activity."
                className="w-full rounded border border-slate-300 p-2 text-sm"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">{draft.length}/{ACTIVITY_REVIEW_MAX}</span>
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
              {hasSaved ? 'Edit your review' : 'Write a review'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
