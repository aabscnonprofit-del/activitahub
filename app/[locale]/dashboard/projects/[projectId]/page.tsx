import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Wallet, CheckCircle2, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProject, getProjectPublishState, getApprovedProjectSnapshot, getProjectVisibility, getProjectJoinPolicy, getProjectTicketType } from '@/lib/projects/store'
import { loadOrganizerExecutionWorkspace } from '@/lib/organizer-workspace/load-execution-workspace'
import { loadDeliveryWorkspace } from '@/lib/organizer-workspace/load-delivery-workspace'
import { loadTeamWorkspace } from '@/lib/organizer-workspace/load-team-workspace'
import { listProjectOccurrences } from '@/lib/occurrence/store'
import { ExecutionChecklist } from '@/components/workspace/ExecutionChecklist'
import { ActivityScheduler } from '@/components/workspace/ActivityScheduler'
import { DeliveryChecklist } from '@/components/workspace/DeliveryChecklist'
import { TeamWorkspacePanel } from '@/components/workspace/TeamWorkspacePanel'
import { listBudgetsForProject } from '@/lib/budget/store'
import { PublishPanel } from '@/components/projects/PublishPanel'
import { ApproveProjectPanel } from '@/components/projects/ApproveProjectPanel'
import { CapacityGatePanel } from '@/components/projects/CapacityGatePanel'
import { VisibilityPanel } from '@/components/projects/VisibilityPanel'
import { JoinPolicyPanel } from '@/components/projects/JoinPolicyPanel'
import { TicketConfigPanel } from '@/components/projects/TicketConfigPanel'
import { ParticipantsRosterPanel } from '@/components/projects/ParticipantsRosterPanel'
import { listProjectParticipants, getParticipantProfiles } from '@/lib/participants/store'
import { loadCapacityGate } from '@/lib/capacity/gate'
import { listAccessByType } from '@/lib/project-access/store'
import { ClientAccessPanel } from '@/components/projects/ClientAccessPanel'
import { WorkerAccessPanel } from '@/components/projects/WorkerAccessPanel'
import type { WorkerAccessMetadata } from '@/lib/worker-access/view'
import { ParticipantAccessPanel } from '@/components/projects/ParticipantAccessPanel'
import { SafetyAccessPanel } from '@/components/projects/SafetyAccessPanel'
import { getEventPlanV2 } from '@/lib/planning/persistence'
import { activityTitleFromPlan, UNTITLED_ACTIVITY } from '@/lib/planning/activity-identity'
import { projectRolesFromPlan } from '@/lib/team/roles'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/types'

// Project workspace hub — the central place to manage one event. Reuses lib/projects/store +
// lib/budget/store (RLS owner-only). The "related plan" is surfaced via the existing `current_step`
// signal (no FK to a plan). Sections are ordered to follow the real organizer workflow:
// Overview → Review → Approve → Budget → Delivery → Team → External Access. Actions are exposed only when
// they become meaningful (Delivery/Team once approved; sharing/External Access only once approved).
interface Props {
  params: Promise<{ locale: string; projectId: string }>
  searchParams: Promise<{ created?: string }>
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

export default async function ProjectDetailsPage({ params, searchParams }: Props) {
  const { locale, projectId } = (await params) as { locale: Locale; projectId: string }
  const { created } = await searchParams
  const justCreated = created === '1'

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
  // Discovery visibility (private/public) — independent of publication; tolerant default 'private'.
  const visibility = await getProjectVisibility(supabase, projectId)
  // Join policy (instant/approval/ticket) — how participants join; tolerant default 'approval'.
  const joinPolicy = await getProjectJoinPolicy(supabase, projectId)
  // Ticket type (free/paid/donation) — the Ticket System config; applies when join policy is 'ticket'.
  const ticketType = await getProjectTicketType(supabase, projectId)
  // Project Participants — people who joined this Project (owner sees all); graceful [] if 061 unapplied.
  const participants = await listProjectParticipants(supabase, projectId)
  // Participant card enrichment: account profiles (name/email) + a join-source label derived from the Project's
  // current join configuration (no per-participant source column — schema-free approximation).
  const participantProfiles = await getParticipantProfiles(participants.map((p) => p.accountId))
  const joinSourceLabel =
    joinPolicy === 'instant' ? 'Instant Join' : joinPolicy === 'approval' ? 'Approval Request' : ticketType === 'free' ? 'Free Ticket' : ticketType === 'paid' ? 'Paid Ticket' : 'Donation'
  // Approval state (reused; no new query). Once approved, the Draft-only sections are replaced by the
  // Approved presentation — presentation only, no business/approval/snapshot/Publish logic changes.
  const approvedAt = project.approved_at
  // Human-friendly, non-technical labels for the Draft summary (approved → Approved Project).
  const statusLabel = approvedAt ? 'Approved Project' : STATUS_LABEL[project.status] ?? project.status
  // Read-only: the Approved Project Snapshot artifact metadata (loaded only once approved). No mutation.
  const approvedSnapshot = approvedAt ? await getApprovedProjectSnapshot(supabase, projectId) : null
  // Organizer Capacity Gate (draft-only) — may this organizer independently lead a project of this size?
  const capacityGate = !approvedAt ? await loadCapacityGate(supabase, projectId, user.id) : null
  const capacityBlocked = !!capacityGate && !capacityGate.allowed
  // Client + Worker access (Organizer control) — via the shared Project Access layer (owner-scoped).
  const projectClients = await listAccessByType(supabase, projectId, 'client')
  const projectWorkers = await listAccessByType(supabase, projectId, 'worker')
  const projectParticipants = await listAccessByType(supabase, projectId, 'participant')
  const projectSafety = await listAccessByType(supabase, projectId, 'safety')
  const workerPlan = await getEventPlanV2(supabase, projectId, 1).catch(() => null)
  // The activity's canonical name — the SAME identity the public page and Discover show (one source of truth).
  const activityTitle = activityTitleFromPlan(workerPlan) ?? UNTITLED_ACTIVITY
  const workerRoles = workerPlan ? projectRolesFromPlan(workerPlan) : []
  const workerRoleLabelById = Object.fromEntries(workerRoles.map((r) => [r.id, r.label]))
  // Live Organizer Execution Workspace (approved projects only). Null → render nothing new (preserve behavior).
  const executionWorkspace = approvedAt ? await loadOrganizerExecutionWorkspace(supabase, projectId) : null
  const workspaceLabelById: Record<string, string> = executionWorkspace
    ? Object.fromEntries(executionWorkspace.checklist.map((i) => [i.id, i.label]))
    : {}
  // The project's occurrences (approved projects only) — the canonical date/time source. Drives the Schedule
  // section, its upcoming-dates list, and the scheduler prefill (the sole occurrence, when there is exactly one).
  const projectOccurrences = approvedAt ? await listProjectOccurrences(supabase, projectId) : []
  const nowMsWorkspace = Date.now()
  const futureOccurrences = projectOccurrences.filter((o) => new Date(o.starts_at).getTime() >= nowMsWorkspace)
  const soleOccurrence = projectOccurrences.length === 1 ? projectOccurrences[0] : null
  // Delivery Workspace (approved projects only) — delivery components projected from the plan + per-occurrence state.
  const deliveryWorkspace = approvedAt ? await loadDeliveryWorkspace(supabase, projectId) : null
  // Team Workspace (approved projects only) — project roles (from staffing) + the persisted team + assignments.
  const teamWorkspace = approvedAt ? await loadTeamWorkspace(supabase, projectId) : null

  return (
    <div className="space-y-6">
      {/* Just arrived from creating the activity — a single, state-aware confirmation shared by BOTH create
          paths (Quick Activity lands approved → publish next; AI Planning lands as a draft → approve next). */}
      {justCreated && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
          {approvedAt ? (
            <><span className="font-semibold">Activity created.</span> This is its workspace — set it public and publish it below to go live.</>
          ) : (
            <><span className="font-semibold">Your activity is planned.</span> This is its workspace — review it below, then approve it to continue.</>
          )}
        </div>
      )}
      <div>
        <Link href={`/${locale}/dashboard/projects`} className="text-xs text-slate-500 hover:underline">
          ← Your activities
        </Link>
        {/* Identity: lead with the activity's real name (same as the public page), not the internal id. */}
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Activity workspace</p>
        <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">{activityTitle}</h1>
        {/* Workspace entry — draft-only orientation; hidden once approved, and hidden right after creation
            (the arrival banner above already gives the state-aware next step). */}
        {!approvedAt && !justCreated && (
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Planning is complete. This is your Project Workspace. Review the draft, then approve it — approval is
            the step that turns this plan into an event you can deliver.
          </p>
        )}
      </div>

      {/* ── 1. Project Overview ─────────────────────────────────────────────────────────────────────── */}
      {/* Approved presentation — the Overview once approved; replaces the Draft summary. Records approval
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

      {/* Draft Project Overview (read-only) — the draft summary the organizer reviews before approval. */}
      {!approvedAt && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Project Overview</h2>
          <p className="mb-3 max-w-2xl text-xs text-slate-500">
            This is the draft project created from Planning — not yet approved. Review and refine it before approval.
          </p>
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-3">
            <Field label="Status" value={statusLabel} />
            <Field label="Related plan" value={planLabel} />
            <Field label="Created" value={formatDate(project.created_at)} />
            <Field label="Last update" value={formatDate(project.updated_at)} />
            <Field label="Related budget" value={budget ? `${budget.currency} · ${budget.status}` : 'None yet'} />
          </dl>
        </section>
      )}

      {/* ── 2. Review (draft-only) ──────────────────────────────────────────────────────────────────── */}
      {!approvedAt && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Review Checklist</h2>
          <p className="mb-3 max-w-2xl text-xs text-slate-500">
            Review and complete these before approving the Project — nothing here is approved yet.
          </p>
          <ul className="list-disc space-y-2 rounded-lg border border-slate-200 p-4 pl-8 text-sm text-slate-600">
            <li>Review the draft project details above.</li>
            <li>Check the related plan.</li>
            <li>Check the budget status.</li>
            <li>Fix any missing or incorrect information before approval.</li>
          </ul>
        </section>
      )}

      {/* ── 3. Approve — the central transition between planning and execution (draft-only, prominent) ── */}
      {/* Organizer Capacity Gate: when the organizer exceeds their capacity for this project's size, the gate
          panel (with the two resolution paths) replaces the Approve action. The project stays valid. */}
      {!approvedAt && capacityBlocked && capacityGate && <CapacityGatePanel gate={capacityGate} projectId={projectId} locale={locale} />}
      {!approvedAt && !capacityBlocked && (
        <section className="rounded-lg border-2 border-brand-200 bg-brand-50/50 p-4">
          <h2 className="mb-1 text-base font-bold text-brand-800">Approve Project</h2>
          <p className="mb-3 max-w-2xl text-xs text-slate-600">
            After review, Approve Project records this Draft Project as the Approved Project — the step that lets
            real work (Delivery, Team, sharing) begin. Approval does not change Publish or start Execution.
          </p>
          {/* Current Lead Organizer + eligibility — the effective lead whose capacity cleared the gate. */}
          {capacityGate && (
            <p className="mb-3 text-xs text-emerald-700">
              Lead Organizer: {capacityGate.leadOrganizerId ? capacityGate.leadOrganizerId : 'you (owner)'} — eligible to lead this project.
            </p>
          )}
          <ApproveProjectPanel projectId={projectId} locale={locale} initialApprovedAt={project.approved_at} />
        </section>
      )}

      {/* ── 3.5 Schedule — the obvious place to set the real date(s). Visible for every APPROVED project
          (independent of the Execution Workspace / EventPlanV2). Occurrence is the sole date/time source of
          truth; publishing a PUBLIC activity requires at least one future date (enforced on Publish). ── */}
      {approvedAt ? (
        <section className="rounded-lg border-2 border-brand-200 bg-brand-50/40 p-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-brand-800">Schedule</h2>
          </div>
          <p className="mb-3 mt-1 max-w-2xl text-xs text-slate-600">
            Set when this activity happens — a one-time date or a weekly repeat. The date, time, and place appear
            on the public activity page and in Local Activities. A public activity can be published only once it
            has an upcoming date.
          </p>

          {futureOccurrences.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Upcoming {futureOccurrences.length > 1 ? `(${futureOccurrences.length})` : ''}
              </h3>
              <ul className="space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                {futureOccurrences.slice(0, 8).map((o) => (
                  <li key={o.id} className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                    <span>{formatDate(o.starts_at)}</span>
                    {o.location && <span className="text-xs text-slate-500">· {o.location}</span>}
                  </li>
                ))}
                {futureOccurrences.length > 8 && (
                  <li className="text-xs text-slate-400">+ {futureOccurrences.length - 8} more</li>
                )}
              </ul>
            </div>
          )}

          <ActivityScheduler
            projectId={projectId}
            locale={locale}
            initial={
              soleOccurrence
                ? { location: soleOccurrence.location, capacity: soleOccurrence.capacity, priceCents: soleOccurrence.price_cents, title: soleOccurrence.title }
                : undefined
            }
          />
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Schedule</h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Approve this Project first — then you can set its date(s) here (one-time or weekly).
          </p>
        </section>
      )}

      {/* ── 4. Budget — immediately available after Planning (reuses the existing /budget route) ──────── */}
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

      {/* ── 5. Delivery — appears only once the Project is approved and ready for execution ───────────── */}
      {/* Live Execution Workspace (read-only) — rendered only for an approved project that has a workspace
          (loader returns null otherwise → nothing new is shown, page behavior preserved). */}
      {executionWorkspace && (
        <section className="rounded-lg border border-slate-200 p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Execution Workspace</h2>
          <p className="mb-3 max-w-2xl text-xs text-slate-500">
            Live execution state for this approved project&rsquo;s current occurrence. Set the date in the
            Schedule section above.
          </p>

          {/* Occurrence-level progress / completion. */}
          <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <span className="text-sm text-slate-700">
              Progress: {executionWorkspace.progress.completed} / {executionWorkspace.progress.total} completed
            </span>
            {executionWorkspace.progress.isComplete && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Execution complete
              </span>
            )}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-4">
            <Field label="Pending" value={String(executionWorkspace.readiness.pending)} />
            <Field label="Active" value={String(executionWorkspace.readiness.active)} />
            <Field label="Blocked" value={String(executionWorkspace.readiness.blocked)} />
            <Field label="Completed" value={String(executionWorkspace.readiness.completed)} />
          </dl>

          <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Checklist</h3>
          {/* Interactive: status changes go through the runtime-validated server action (client island). */}
          <ExecutionChecklist
            items={executionWorkspace.checklist}
            readiness={executionWorkspace.itemReadiness}
            projectId={projectId}
            locale={locale}
          />

          {executionWorkspace.timeline.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Timeline</h3>
              <ul className="space-y-1 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                {executionWorkspace.timeline.map((entry) => (
                  <li key={entry.monitoringItemId} className="flex items-center justify-between gap-2">
                    <span>{workspaceLabelById[entry.monitoringItemId] ?? entry.monitoringItemId}</span>
                    <span className="text-xs text-slate-500">{entry.absoluteStart.replace('T', ' ').slice(0, 16)} UTC</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {executionWorkspace.unbound.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Not scheduled</h3>
              <ul className="space-y-1 rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
                {executionWorkspace.unbound.map((u) => (
                  <li key={u.monitoringItemId}>{workspaceLabelById[u.monitoringItemId] ?? u.monitoringItemId}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Delivery Workspace (read + interactive) — the plan's delivery components (resources + staffing) and
          their delivery state for the current occurrence. Shown only when the plan has delivery components. */}
      {deliveryWorkspace && deliveryWorkspace.components.length > 0 && (
        <section className="rounded-lg border border-slate-200 p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Delivery Workspace</h2>
          <p className="mb-3 max-w-2xl text-xs text-slate-500">
            Resources and staffing to deliver this approved project&rsquo;s current occurrence.
          </p>

          {/* Occurrence-level delivery progress / completion. */}
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <span className="text-sm text-slate-700">
              Delivered: {deliveryWorkspace.progress.delivered} / {deliveryWorkspace.progress.total}
            </span>
            {deliveryWorkspace.progress.isComplete && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Delivery complete
              </span>
            )}
          </div>

          {/* Interactive: status + assignment go through the runtime-validated server actions (client island). */}
          <DeliveryChecklist items={deliveryWorkspace.components} projectId={projectId} locale={locale} />
        </section>
      )}

      {/* ── 6. Team — follows Approval (approved projects with roles to staff) ────────────────────────── */}
      {teamWorkspace && teamWorkspace.roles.length > 0 && (
        <section className="rounded-lg border border-slate-200 p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Team Workspace</h2>
          <p className="mb-3 max-w-2xl text-xs text-slate-500">
            The people working on this project and their assignment to its roles.
          </p>

          {/* Role assignment progress. */}
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <span className="text-sm text-slate-700">
              Roles assigned: {teamWorkspace.progress.assigned} / {teamWorkspace.progress.totalRoles}
            </span>
            {teamWorkspace.progress.allAssigned && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Fully staffed
              </span>
            )}
          </div>

          {/* Interactive: members + assignments go through the runtime-validated server actions (client island). */}
          <TeamWorkspacePanel
            members={teamWorkspace.members}
            roles={teamWorkspace.roles}
            projectId={projectId}
            locale={locale}
          />
        </section>
      )}

      {/* Participants — the roster of people who JOINED this Project (Local Activities → Activity Page → Join),
          grouped by status. Displays participants + lets the organizer approve/decline pending join requests.
          No messaging/editing/attendance/ticketing. */}
      <section className="rounded-lg border border-slate-200 p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Participants</h2>
        <p className="mb-3 max-w-2xl text-xs text-slate-500">
          Manage the people who joined this activity — a card for each, grouped by status. Approve, decline, or remove where appropriate.
        </p>
        <ParticipantsRosterPanel
          participants={participants.map((p) => {
            const prof = participantProfiles[p.accountId]
            return { id: p.id, accountId: p.accountId, status: p.status, createdAt: p.createdAt, name: prof?.fullName ?? null, email: prof?.email ?? null, phone: null, joinSource: joinSourceLabel }
          })}
          projectId={projectId}
          locale={locale}
        />
      </section>

      {/* ── 7. Project Access — permission / view-sharing. People you invite to VIEW or collaborate on this
          Project via private access links (Client / Worker / Guest / Safety). DISTINCT from Participants (who
          JOINED the activity). Sharing appears only once the Project is approved. The access model is unchanged
          (ADR_012 / ADR_013); each recipient sees only their own View via a project-scoped access link. */}
      {approvedAt && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Project Access</h2>
            <p className="max-w-2xl text-xs text-slate-500">
              People you invite to view or collaborate on this Project via private access links — separate from
              Participants, who joined the activity.
            </p>
          </div>

          {/* Client access — attach the client who ordered this event; they see only their Client View. */}
          <section className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-700">Clients</h2>
            <p className="mb-3 max-w-2xl text-xs text-slate-500">
              Attach the client who ordered this event and share a private link to their Client View.
            </p>
            <ClientAccessPanel
              clients={projectClients.map((c) => ({ id: c.id, email: c.email, phone: c.phone, status: c.status, inviteToken: c.invite_token }))}
              projectId={projectId}
              locale={locale}
            />
          </section>

          {/* Worker access — attach Workers to canonical roles (Team/Delivery source); they see only their Worker View. */}
          <section className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-700">Workers</h2>
            <p className="mb-3 max-w-2xl text-xs text-slate-500">
              Attach the people and providers doing the work and share a private link to their Worker View.
            </p>
            <WorkerAccessPanel
              workers={projectWorkers.map((w) => {
                const meta = (w.metadata ?? {}) as WorkerAccessMetadata
                return { id: w.id, email: w.email, phone: w.phone, roleLabel: meta.roleId ? workerRoleLabelById[meta.roleId] ?? null : null, status: w.status, confirmed: meta.confirmedAt != null, inviteToken: w.invite_token }
              })}
              roles={workerRoles}
              projectId={projectId}
              locale={locale}
            />
          </section>

          {/* Guest access — a Shared View of the event via a private access link. (Backed by access_type
              'participant' in the shared layer; UI terminology only — NOT the Participants roster of joiners.) */}
          <section className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-700">Guest Access</h2>
            <p className="mb-3 max-w-2xl text-xs text-slate-500">
              Share a private access link to a Shared View of this event — for a guest, not to be confused with Participants who joined.
            </p>
            <ParticipantAccessPanel
              participants={projectParticipants.map((pt) => ({ id: pt.id, email: pt.email, phone: pt.phone, status: pt.status, inviteToken: pt.invite_token }))}
              projectId={projectId}
              locale={locale}
            />
          </section>

          {/* Safety access — grant project-scoped Safety Links to authorized safety personnel (Safety View only). */}
          <section className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-700">Safety access</h2>
            <p className="mb-3 max-w-2xl text-xs text-slate-500">
              Grant a private Safety Link to authorized safety personnel (fire, police, EMS, inspectors, venue). They see only safety information.
            </p>
            <SafetyAccessPanel
              grants={projectSafety.map((g) => ({ id: g.id, email: g.email, phone: g.phone, status: g.status, inviteToken: g.invite_token }))}
              projectId={projectId}
              locale={locale}
            />
          </section>
        </>
      )}

      {/* Participation — how participants join this Project (instant / approval / ticket). Drives the Join
          action on the public Activity Page; creates no Join/Ticket/Registration entity. */}
      <JoinPolicyPanel projectId={projectId} locale={locale} initialJoinPolicy={joinPolicy} />

      {/* Ticket Configuration — the Ticket System (free / paid / donation), on top of Participants. Applies when
          the Join Policy is "Ticket Required". No checkout/payment in this stage. */}
      <TicketConfigPanel projectId={projectId} locale={locale} initialTicketType={ticketType} joinPolicyIsTicket={joinPolicy === 'ticket'} />

      {/* Publish & Visibility — one publication decision. Publication answers "Is this Project published?";
          visibility answers "Who can discover this published Project?". Core rule: Local Activities = published
          Projects with visibility = public (private Projects stay hidden). */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Publish &amp; Visibility</h2>
          <p className="max-w-2xl text-xs text-slate-500">
            Publishing makes this Project live. Visibility decides who can discover it — a{' '}
            <span className="font-medium">published</span> and <span className="font-medium">public</span> Project
            appears in Local Activities, while private Projects stay hidden (reachable only by invitation or direct link).
          </p>
        </div>
        <VisibilityPanel projectId={projectId} locale={locale} initialVisibility={visibility} />
        <PublishPanel
          projectId={projectId}
          locale={locale}
          initialPublished={isPublished}
          publicPath={`/${locale}/p/${projectId}`}
        />
      </section>
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
