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
  CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProject, getProjectPublishState, getApprovedProjectSnapshot } from '@/lib/projects/store'
import { listBudgetsForProject } from '@/lib/budget/store'
import { PublishPanel } from '@/components/projects/PublishPanel'
import { ApproveProjectPanel } from '@/components/projects/ApproveProjectPanel'
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

// Human-friendly labels for the raw stored values (presentation only — does not change stored values).
const STATUS_LABEL: Record<string, string> = {
  active: 'Active Project',
}
const STEP_LABEL: Record<string, string> = {
  discovery: 'Discovery',
  planning: 'Planning',
  plan_ready: 'Planning Complete',
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
  // Approval state (reused; no new query). Once approved, the Draft-only sections are replaced by the
  // Approved presentation — presentation only, no business/approval/snapshot/Publish logic changes.
  const approvedAt = project.approved_at
  // Human-friendly, non-technical labels for the Draft summary (approved → Approved Project).
  const statusLabel = approvedAt ? 'Approved Project' : STATUS_LABEL[project.status] ?? project.status
  const stepLabel = STEP_LABEL[project.current_step] ?? project.current_step
  // Read-only: the Approved Project Snapshot artifact metadata (loaded only once approved). No mutation.
  const approvedSnapshot = approvedAt ? await getApprovedProjectSnapshot(supabase, projectId) : null

  // Workspace modules (future integrations). Budget has its own dedicated Budget Workspace entry above (the
  // single live Budget entry), so it is not repeated here; the rest are "Project integration planned"
  // (no project_id relation yet — no fake links). A module may still carry a live link once integrated.
  const modules: ModuleCard[] = [
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
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Project Workspace</h1>
        <p className="mt-0.5 font-mono text-sm text-slate-500">{projectId}</p>
        {/* Workspace entry (Stage 2) — draft-only orientation; hidden once the Project is approved. */}
        {!approvedAt && (
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Planning is complete. This is your Project Workspace — the working area where you manage this project.
            Review and refine the draft here before approval.
          </p>
        )}
      </div>

      {/* Approved presentation — shown once approved; replaces the Draft-only sections. Records approval
          state only (see docs/PROJECT_LIFECYCLE.md). */}
      {approvedAt && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-base font-bold">Project Approved</h2>
          </div>
          <p className="mt-1 text-xs text-emerald-800/80">Approved on: {formatDate(approvedAt)}</p>
          <p className="mt-2 max-w-2xl text-sm text-slate-700">
            This Project now has an Approved Project Snapshot. The Approved Project is the operational source
            of truth for future Execution.
          </p>
          {/* Read-only Approved Project Snapshot metadata — confirms the artifact exists (no edit controls). */}
          {approvedSnapshot && (
            <dl className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-emerald-200 bg-white/60 p-3 sm:grid-cols-2">
              <Field label="Approved Project Snapshot" value="Captured" />
              <Field label="Approved by" value={approvedSnapshot.approved_by === user.id ? 'You (owner)' : 'Project owner'} />
              <Field label="Snapshot approved" value={formatDate(approvedSnapshot.approved_at)} />
              <Field label="Snapshot recorded" value={formatDate(approvedSnapshot.created_at)} />
            </dl>
          )}
        </section>
      )}

      {/* Draft-only preparation sections — hidden once the Project is approved (Approved block above). */}
      {!approvedAt && (
      <>
      {/* Draft Project Overview (read-only) — the draft summary the organizer reviews before approval. */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Draft Project Overview</h2>
        <p className="mb-3 max-w-2xl text-xs text-slate-500">
          This is the draft project created from Planning — not yet approved. Review and refine it before approval.
        </p>
        <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-3">
          <Field label="Status" value={statusLabel} />
          <Field label="Current step" value={stepLabel} />
          <Field label="Related plan" value={planLabel} />
          <Field label="Created" value={formatDate(project.created_at)} />
          <Field label="Last update" value={formatDate(project.updated_at)} />
          <Field label="Related budget" value={budget ? `${budget.currency} · ${budget.status}` : 'None yet'} />
        </dl>
      </section>

      {/* Review Checklist (read-only) — what the organizer must review/refine before the Project is approved. */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Review Checklist</h2>
        <p className="mb-3 max-w-2xl text-xs text-slate-500">
          Review and complete these before approving the Project — nothing here is approved yet.
        </p>
        <ul className="list-disc space-y-2 rounded-lg border border-slate-200 p-4 pl-8 text-sm text-slate-600">
          <li>Review the draft project details above.</li>
          <li>Check the related plan.</li>
          <li>Check the budget status.</li>
          <li>Review the workspace modules — vendors, participants and timeline — when available.</li>
          <li>Fix any missing or incorrect information before approval.</li>
        </ul>
      </section>

      {/* Module Status Overview (read-only) — which Workspace preparation areas exist and which are not
          connected yet. Reflects the current state (only Budget has a real Project relation); no
          Project↔module relations are wired here. */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Module Status Overview</h2>
        <p className="mb-3 max-w-2xl text-xs text-slate-500">
          These are preparation areas inside the Workspace. Some are planned and not connected yet. Use them
          to prepare the Draft Project before approval.
        </p>
        <dl className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
          <ModuleStatusRow name="Budget" status="Connected" connected />
          <ModuleStatusRow name="Vendors" status="Project integration planned" />
          <ModuleStatusRow name="Participants" status="Project integration planned" />
          <ModuleStatusRow name="Timeline" status="Project integration planned" />
        </dl>
      </section>
      </>
      )}

      {/* Budget Workspace entry — Budget is the one module already connected to the Project; link into its
          existing Workspace (reuses the existing /budget route; never creates a budget). */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Budget Workspace</h2>
        <p className="mb-3 max-w-2xl text-xs text-slate-500">
          {approvedAt
            ? 'The budget for this Project.'
            : 'Budget preparation is part of reviewing the Draft Project before approval. This budget belongs to this Draft Project.'}
        </p>
        <Link
          href={`/${locale}/dashboard/projects/${projectId}/budget`}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
        >
          <Wallet className="h-4 w-4" aria-hidden="true" />
          {budget ? 'Open Budget Workspace' : 'Budget Workspace available'}
        </Link>
      </section>

      {/* Draft-only approval-prep sections — hidden once the Project is approved (Approved block above). */}
      {/* Approve Project (draft-only; hidden once approved). Pre-approval review items live in the single
          Review Checklist above. Records a truthful approval: the approval state on the Project plus a
          separate immutable Approved Project Snapshot artifact. Records approval only: no Publish change, no
          Execution, no freeze of other modules (see docs/PROJECT_LIFECYCLE.md). */}
      {!approvedAt && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Approve Project</h2>
          <p className="mb-3 max-w-2xl text-xs text-slate-500">
            After review, Approve Project records this Draft Project as the Approved Project. Approval does not
            change Publish or start Execution.
          </p>
          <ApproveProjectPanel projectId={projectId} locale={locale} initialApprovedAt={project.approved_at} />
        </section>
      )}

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

function ModuleStatusRow({ name, status, connected }: { name: string; status: string; connected?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-sm font-medium text-slate-700">{name}</dt>
      <dd
        className={cn(
          'rounded px-1.5 py-0.5 text-[10px] font-semibold',
          connected ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-400',
        )}
      >
        {status}
      </dd>
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
