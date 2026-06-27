import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listProjects } from '@/lib/projects/store'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/types'

// Projects list — the organizer's event projects (the aggregate root created by the planner).
// Reuses lib/projects/store (RLS owner-only). Plain English labels (no new i18n keys).
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Projects</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Every event project you own — open one to manage its budget.
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          No projects yet. A project is created automatically when you generate a plan in the planner.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Project</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Step</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/${locale}/dashboard/projects/${p.id}`}
                      className="font-mono text-brand-700 hover:underline"
                    >
                      {p.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{p.status}</td>
                  <td className="px-4 py-2 text-slate-700">{p.current_step}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(p.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
