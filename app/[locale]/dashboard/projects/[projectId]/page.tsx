import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Wallet,
  ClipboardList,
  Inbox,
  FileText,
  BookOpen,
  Store,
  UsersRound,
  CalendarDays,
  MessageSquare,
  Users,
  BarChart2,
  Paperclip,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProject, getProjectPublishState } from '@/lib/projects/store'
import { listBudgetsForProject } from '@/lib/budget/store'
import { PublishPanel } from '@/components/projects/PublishPanel'
import { formatDate, cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'

// Project workspace hub — the central place to manage one event. Reuses lib/projects/store +
// lib/budget/store (RLS owner-only). The "related plan" is surfaced via the existing `current_step`
// signal (no FK to a plan). Only the Budget module has a real Project relation today; every other
// module has no project_id yet, so it is shown as "Project integration planned" rather than a fake link.
interface Props {
  params: Promise<{ locale: string; projectId: string }>
}

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
  const planLabel = PLAN_STAGE[project.current_step] ?? project.current_step
  const isPublished = await getProjectPublishState(supabase, projectId)

  // Workspace modules. Only modules with a real Project relation get a live link; the rest are
  // "Project integration planned" (no project_id exists yet — no fake links).
  const modules: ModuleCard[] = [
    {
      key: 'budget',
      name: 'Budget',
      desc: budget ? 'Cost lines, quotes, fee & totals' : 'Create the budget for this project',
      icon: Wallet,
      href: `/${locale}/dashboard/projects/${projectId}/budget`,
      cta: budget ? 'Open' : 'Create',
    },
    { key: 'plans', name: 'Plans', desc: 'The event plan', icon: ClipboardList },
    { key: 'requests', name: 'Requests', desc: 'Client requests', icon: Inbox },
    { key: 'proposals', name: 'Proposals', desc: 'Client proposals', icon: FileText },
    { key: 'bookings', name: 'Bookings', desc: 'Bookings & payments', icon: BookOpen },
    { key: 'vendors', name: 'Vendors', desc: 'Vendor sourcing & quotes', icon: Store },
    { key: 'workers', name: 'Workers', desc: 'Staffing', icon: UsersRound },
    { key: 'calendar', name: 'Calendar', desc: 'Schedule', icon: CalendarDays },
    { key: 'messages', name: 'Messages', desc: 'Conversations', icon: MessageSquare },
    { key: 'participants', name: 'Participants', desc: 'Attendees & RSVPs', icon: Users },
    { key: 'analytics', name: 'Analytics', desc: 'Reporting', icon: BarChart2 },
    { key: 'files', name: 'Files', desc: 'Documents & attachments', icon: Paperclip },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/dashboard/projects`} className="text-xs text-slate-500 hover:underline">
          ← Projects
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Project workspace</h1>
        <p className="mt-0.5 font-mono text-sm text-slate-500">{projectId}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-3">
        <Field label="Status" value={project.status} />
        <Field label="Current step" value={project.current_step} />
        <Field label="Related plan" value={planLabel} />
        <Field label="Created" value={formatDate(project.created_at)} />
        <Field label="Last update" value={formatDate(project.updated_at)} />
        <Field label="Related budget" value={budget ? `${budget.currency} · ${budget.status}` : 'None yet'} />
      </dl>

      {/* Publish Flow — make the Project visible in Public Space (existing /p/[projectId] route). */}
      <PublishPanel
        projectId={projectId}
        locale={locale}
        initialPublished={isPublished}
        publicPath={`/${locale}/p/${projectId}`}
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Manage this event</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <ModuleTile key={m.key} module={m} />
          ))}
        </div>
      </div>
    </div>
  )
}

interface ModuleCard {
  key: string
  name: string
  desc: string
  icon: React.ElementType
  /** Present only when the module has a real Project relation (a live link). */
  href?: string
  cta?: string
}

function ModuleTile({ module: m }: { module: ModuleCard }) {
  const Icon = m.icon
  const live = !!m.href

  const inner = (
    <>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', live ? 'text-brand-600' : 'text-slate-400')} aria-hidden="true" />
        <span className={cn('text-sm font-semibold', live ? 'text-slate-900' : 'text-slate-500')}>{m.name}</span>
        {live ? (
          <span className="ml-auto rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
            {m.cta}
          </span>
        ) : (
          <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            Project integration planned
          </span>
        )}
      </div>
      <p className={cn('mt-1.5 text-xs', live ? 'text-slate-500' : 'text-slate-400')}>{m.desc}</p>
    </>
  )

  if (live && m.href) {
    return (
      <Link
        href={m.href}
        className="block rounded-lg border border-slate-200 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
      >
        {inner}
      </Link>
    )
  }
  return (
    <div className="cursor-not-allowed rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4" aria-disabled="true">
      {inner}
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
