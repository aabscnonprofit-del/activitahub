// Public Activity Space — the archive state of a COMPLETED public activity. A read-only presentation projection:
// the permanent public-record notice (Activity Archive) + Activity Memories, the permanent container that
// gradually accumulates content. Organizer Story is the first REAL memory (see OrganizerStory); the rest remain
// placeholders. No photos/videos/participant-stories/reviews implementation, no uploads/storage/API/database.

import { OrganizerStory } from './OrganizerStory'

// Remaining Activity Memories (future content) — placeholders. Organizer Story is a real block, not listed here.
const ACTIVITY_MEMORIES = [
  'Photos',
  'Videos',
  'Participant Stories',
  'Reviews',
  'Results',
  'Achievements',
  'Shared Links',
  'Documents',
]

export function ActivityArchive({
  projectId,
  locale,
  organizerStory,
  canEditStory,
}: {
  projectId: string
  locale: string
  organizerStory: string | null
  canEditStory: boolean
}) {
  return (
    <>
      {/* Activity Archive — the permanent-public-record notice. */}
      <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Activity Archive</h2>
        <p className="mt-2 text-sm text-slate-700">This activity has been completed.</p>
        <p className="mt-1 text-sm text-slate-500">This page will become the permanent public archive of the activity.</p>
      </section>

      {/* Activity Memories — the permanent container for everything that will enrich this activity over time. */}
      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Activity Memories</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Memories from this activity — photos, videos, stories, results and more — will appear here in future versions.
        </p>

        {/* Organizer Story — the first real memory (public read-only; the organizer can edit their own). */}
        <div className="mt-4">
          <OrganizerStory projectId={projectId} locale={locale} initialStory={organizerStory} canEdit={canEditStory} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVITY_MEMORIES.map((label) => (
            <div key={label} className="rounded-lg border border-dashed border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700">{label}</p>
              <p className="mt-0.5 text-xs text-slate-400">Coming soon</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
