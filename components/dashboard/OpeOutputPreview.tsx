import { validateOpeOutput, type OpeOutputV1 } from '@/lib/ope/output-contract'

// Dev-only, debug-safe preview of the assembled OPE Output Contract V1 for a saved
// plan. Renders NOTHING in production (and nothing when no plan exists), so it never
// affects the organizer UI — it only makes the assembled 8-section output visible
// during development to confirm the read path produces a valid contract. No redesign.
export default function OpeOutputPreview({ output }: { output: OpeOutputV1 | null }) {
  if (process.env.NODE_ENV === 'production') return null
  if (!output) return null

  const v = validateOpeOutput(output)
  const rows: [string, number | string][] = [
    ['event_summary', output.event_summary.title ? 'ok' : 'empty'],
    ['timeline', output.timeline.length],
    ['resources', output.resources.length],
    ['staffing', output.staffing.roles.length],
    ['venue_requirements', output.venue_requirements.must_haves.length],
    ['budget', output.budget.is_priced ? 'priced' : 'unpriced'],
    ['risks', output.risks.length],
    ['organizer_decisions_required', output.organizer_decisions_required.length],
  ]

  return (
    <details className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
      <summary className="cursor-pointer font-semibold text-slate-600">
        OPE Output Contract v1 (dev preview) —{' '}
        {v.ok ? 'valid ✓' : `invalid: ${[...v.missing, ...v.issues].join(', ')}`}
      </summary>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map(([k, val]) => (
          <li key={k} className="flex justify-between gap-2">
            <span>{k}</span>
            <span className="font-mono text-slate-700">{val}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
