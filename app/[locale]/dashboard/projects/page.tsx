import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listProjects } from '@/lib/projects/store'
import { getActivityTitles } from '@/lib/planning/persistence'
import { UNTITLED_ACTIVITY } from '@/lib/planning/activity-identity'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/types'

// Activities list — every activity the organizer has created. Reuses lib/projects/store (RLS owner-only) and
// the single identity source (getActivityTitles) so each row shows the activity's real name — the same name
// the public page shows — never a raw internal id.
interface Props {
  params: Promise<{ locale: string }>
}

export default async function ProjectsPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const projects = await listProjects(supabase)
  const titles = await getActivityTitles(supabase, projects.map((p) => p.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Your activities</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Every activity you&rsquo;ve created — open one to schedule, publish and manage it.
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          No activities yet. Use <span className="font-medium">Create activity</span> to make your first one.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Activity</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2 font-medium">Public page</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => {
                const title = titles[p.id]
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link
                        href={`/${locale}/dashboard/projects/${p.id}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {title ?? UNTITLED_ACTIVITY}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-2 text-slate-500">{formatDate(p.updated_at)}</td>
                    <td className="px-4 py-2">
                      {/* Pure navigation to the existing Public Activity Space (published + public only). */}
                      <Link href={`/${locale}/p/${p.id}`} className="text-brand-700 hover:underline">
                        View public page
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
