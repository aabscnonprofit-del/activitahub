import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/projects/store'
import { listBudgetsForProject } from '@/lib/budget/store'
import { getBudgetAction, type AssembledBudget } from '@/lib/actions/budget'
import { BudgetWorkspaceClient } from '@/components/budget/BudgetWorkspaceClient'
import type { Locale } from '@/lib/types'

// Minimal Budget Workspace entry point. Loads (or lets the user create) the Budget overlay for a
// Project and renders the already-implemented Budget backend (lib/actions/budget.ts). Server component:
// auth + initial load only; all mutations happen via server actions from the client component.
interface Props {
  params: Promise<{ locale: string; projectId: string }>
}

export default async function BudgetWorkspacePage({ params }: Props) {
  const { locale, projectId } = (await params) as { locale: Locale; projectId: string }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  // Verify the Project exists and is owned by the caller (RLS-scoped).
  const project = await getProject(supabase, projectId)
  if (!project) {
    return <div className="p-6 text-sm text-slate-600">Project not found.</div>
  }

  // Load the Project's existing Budget (if any); the client offers to create one when absent.
  const budgets = await listBudgetsForProject(supabase, projectId)
  let initialBudget: AssembledBudget | null = null
  const existingId = budgets[0]?.id
  if (existingId) {
    const res = await getBudgetAction({ budgetId: existingId })
    if (res.ok) initialBudget = res.data
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Budget Workspace</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Pricing overlay for project <span className="font-mono">{projectId}</span>.
        </p>
      </div>
      <BudgetWorkspaceClient projectId={projectId} initialBudget={initialBudget} />
    </div>
  )
}
