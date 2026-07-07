// Public Activity Space — the archive state of a COMPLETED public activity. A read-only projection: the
// permanent public record message + placeholders for the future content that will EXTEND this space (photos,
// videos, organizer story, participant reviews, achievements). Nothing here is implemented — placeholders only,
// no media/reviews/uploads/entities.

const FUTURE_SECTIONS = ['Photos', 'Videos', 'Organizer Story', 'Participant Reviews', 'Achievements']

export function ActivityArchive() {
  return (
    <>
      {/* Activity Archive — the permanent-public-record notice. */}
      <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Activity Archive</h2>
        <p className="mt-2 text-sm text-slate-700">This activity has been completed.</p>
        <p className="mt-1 text-sm text-slate-500">This page will become the permanent public archive of the activity.</p>
      </section>

      {/* Future content — placeholders only (extensions of this space, added in later stages). */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FUTURE_SECTIONS.map((label) => (
          <div key={label} className="rounded-lg border border-dashed border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">{label}</p>
            <p className="mt-0.5 text-xs text-slate-400">Coming soon</p>
          </div>
        ))}
      </div>
    </>
  )
}
