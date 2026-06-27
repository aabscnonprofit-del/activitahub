import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { listBudgetsForProject } from '@/lib/budget/store'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/types'

// Project details — reuses lib/projects/store + lib/budget/store (RLS owner-only). The "related plan"
// is surfaced via the existing `current_step` workflow signal (the projects table holds no FK to a
// plan). The Budget button links to the existing budget page, which load-or-creates the budget.
interface Props {
  params: Promise<{ locale: string; projectId: string }>
}

// Human label for the plan stage carried on the project's workflow step.
const PLAN_STAGE: Record<string, string> = {
  discovery: 'Discovery',
  planning: 'In planning',
  plan_ready: 'Plan ready',
}

export default async function ProjectDetailsPage({ params }: Props) {
  const { locale, projectId } = (await params) as { locale: Locale; projectId: string }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const project = await getProject(supabase, projectId)
  if (!project) {
    return <div className="p-6 text-sm text-slate-600">Project not found.</div>
  }

  const budgets = await listBudgetsForProject(supabase, projectId)
  const budget = budgets[0] ?? null
  const budgetHref = `/${locale}/dashboard/projects/${projectId}/budget`
  const planLabel = PLAN_STAGE[project.current_step] ?? project.current_step

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/${locale}/dashboard/projects`} className="text-xs text-slate-500 hover:underline">
            ← Projects
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Project</h1>
          <p className="mt-0.5 font-mono text-sm text-slate-500">{projectId}</p>
        </div>
        <Link
          href={budgetHref}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {budget ? 'Open Budget' : 'Create Budget'}
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-3">
        <Field label="Status" value={project.status} />
        <Field label="Current step" value={project.current_step} />
        <Field label="Related plan" value={planLabel} />
        <Field label="Created" value={formatDate(project.created_at)} />
        <Field label="Last update" value={formatDate(project.updated_at)} />
        <Field label="Related budget" value={budget ? `${budget.currency} · ${budget.status}` : 'None yet'} />
      </dl>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
