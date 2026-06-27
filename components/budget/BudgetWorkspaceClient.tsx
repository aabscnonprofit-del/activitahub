'use client'

// Minimal, functional Budget Workspace UI. Wires the existing Budget backend (lib/actions/budget.ts)
// to the site. No Marketplace, no committed/booking/payment, no proposal sending, no design polish.
// Budget Lines come ONLY from the Project's delivery components (resource_need / role_need) — this UI
// NEVER invents them; if there are none it shows a clear empty state. Plain English labels (no i18n
// keys added, to avoid touching messages/*).

import { useState, useTransition } from 'react'
import {
  addVendorQuoteAction,
  createBudgetForProjectAction,
  createCommercialProposalSnapshotAction,
  selectVendorQuoteAction,
  setOrganizerFeeAction,
  updateBudgetLineEstimateAction,
  type AssembledBudget,
  type BudgetActionResult,
} from '@/lib/actions/budget'
import type { BudgetLine, CostState, FeeModel } from '@/lib/budget/types'

const COST_STATE_STYLE: Record<CostState, string> = {
  unknown: 'bg-slate-100 text-slate-600',
  estimated: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
}

function describeError(res: Extract<BudgetActionResult<unknown>, { ok: false }>): string {
  return res.details && res.details.length ? `${res.error}: ${res.details.join('; ')}` : res.error
}

export function BudgetWorkspaceClient({
  projectId,
  initialBudget,
}: {
  projectId: string
  initialBudget: AssembledBudget | null
}) {
  const [budget, setBudget] = useState<AssembledBudget | null>(initialBudget)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const currency = budget?.budget.currency ?? 'USD'
  const fmt = (n: number | null): string => (n === null ? 'TBD' : `${currency} ${n.toFixed(2)}`)

  // Run a server action, then refresh local state from its assembled result.
  function run(action: () => Promise<BudgetActionResult<AssembledBudget>>, okMessage?: string) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await action()
      if (res.ok) {
        setBudget(res.data)
        if (okMessage) setNotice(okMessage)
      } else {
        setError(describeError(res))
      }
    })
  }

  // ── No budget yet: offer to create one ──────────────────────────────────────────────────────
  if (!budget) {
    return (
      <div className="space-y-3">
        {error && <Banner kind="error" text={error} />}
        <p className="text-sm text-slate-600">No budget exists for this project yet.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => createBudgetForProjectAction({ projectId, projectVersion: 1, currency: 'USD' }),
              'Budget created.',
            )
          }
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create Budget'}
        </button>
      </div>
    )
  }

  const { totals, lines } = budget
  const fee = budget.budget.organizerFee

  return (
    <div className="space-y-6">
      {error && <Banner kind="error" text={error} />}
      {notice && <Banner kind="ok" text={notice} />}

      {/* Totals */}
      <section className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-4">
        <Stat label="Project Cost" value={fmt(totals.projectBaseCost)} />
        <Stat label="Organizer Fee" value={fmt(totals.organizerFeeAmount)} />
        <Stat label="Commercial Total" value={fmt(totals.commercialTotal)} />
        <Stat
          label="Unpriced items"
          value={`${totals.unpricedCount}${totals.isComplete ? ' (complete)' : ''}`}
        />
      </section>

      {/* Organizer fee */}
      <FeeForm
        currentModel={fee?.model ?? 'flat'}
        currentValue={fee?.value ?? 0}
        disabled={pending}
        onSubmit={(model, value) =>
          run(() => setOrganizerFeeAction({ budgetId: budget.budget.id, model, value }), 'Organizer fee updated.')
        }
      />

      {/* Lines */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Budget Lines</h2>
        {lines.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            This Project has no delivery components yet.
          </p>
        ) : (
          lines.map((line) => (
            <LineCard
              key={line.id}
              line={line}
              currency={currency}
              disabled={pending}
              onSetEstimate={(amount) =>
                run(
                  () => updateBudgetLineEstimateAction({ lineId: line.id, organizerEstimate: amount }),
                  'Estimate updated.',
                )
              }
              onAddQuote={(amount, vendorLabel) =>
                run(
                  () =>
                    addVendorQuoteAction({
                      budgetId: budget.budget.id,
                      lineId: line.id,
                      source: 'manual',
                      amount,
                      basis: 'unspecified',
                      quoteStatus: 'received',
                      vendorLabel,
                    }),
                  'Quote added.',
                )
              }
              onSelectQuote={(quoteId) =>
                run(
                  () => selectVendorQuoteAction({ budgetId: budget.budget.id, lineId: line.id, quoteId }),
                  'Quote selected.',
                )
              }
            />
          ))
        )}
      </section>

      {/* Commercial proposal draft */}
      <section className="rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700">Commercial Proposal</h2>
        <p className="mt-1 text-xs text-slate-500">
          Creates an immutable draft snapshot of the current budget. Sending is out of scope.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null)
              setNotice(null)
              const res = await createCommercialProposalSnapshotAction({ budgetId: budget.budget.id })
              if (res.ok) {
                setBudget(res.data.budget)
                setNotice(`Proposal draft v${res.data.proposal.version} created.`)
              } else {
                setError(describeError(res))
              }
            })
          }
          className="mt-2 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Working…' : 'Create proposal draft'}
        </button>
      </section>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────────────────────

function Banner({ kind, text }: { kind: 'error' | 'ok'; text: string }) {
  const cls = kind === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
  return <div className={`rounded px-3 py-2 text-sm ${cls}`}>{text}</div>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  )
}

function FeeForm({
  currentModel,
  currentValue,
  disabled,
  onSubmit,
}: {
  currentModel: FeeModel
  currentValue: number
  disabled: boolean
  onSubmit: (model: FeeModel, value: number) => void
}) {
  const [model, setModel] = useState<FeeModel>(currentModel)
  const [value, setValue] = useState<string>(String(currentValue))
  const parsed = Number(value)
  return (
    <section className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600">Organizer fee model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as FeeModel)}
          className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="flat">flat</option>
          <option value="percentage">percentage (% of base)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Value</label>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 w-28 rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <button
        type="button"
        disabled={disabled || !Number.isFinite(parsed)}
        onClick={() => onSubmit(model, parsed)}
        className="rounded bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        Set fee
      </button>
    </section>
  )
}

function LineCard({
  line,
  currency,
  disabled,
  onSetEstimate,
  onAddQuote,
  onSelectQuote,
}: {
  line: BudgetLine
  currency: string
  disabled: boolean
  onSetEstimate: (amount: number | null) => void
  onAddQuote: (amount: number, vendorLabel: string) => void
  onSelectQuote: (quoteId: string) => void
}) {
  const [estimate, setEstimate] = useState<string>(line.organizerEstimate === null ? '' : String(line.organizerEstimate))
  const [quoteAmount, setQuoteAmount] = useState<string>('')
  const [quoteVendor, setQuoteVendor] = useState<string>('')
  const fmt = (n: number | null): string => (n === null ? 'TBD' : `${currency} ${n.toFixed(2)}`)
  const estParsed = estimate.trim() === '' ? null : Number(estimate)
  const qa = Number(quoteAmount)

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-900">{line.label}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${COST_STATE_STYLE[line.costState]}`}>
          {line.costState}
        </span>
        <span className="text-sm text-slate-500">{fmt(line.effectiveAmount)}</span>
        <span className="ml-auto text-xs text-slate-400">{line.sourceComponentRef.itemKind}</span>
      </div>

      {/* Organizer estimate */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="number"
          placeholder="organizer estimate"
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          className="w-40 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          disabled={disabled || (estimate.trim() !== '' && !Number.isFinite(estParsed))}
          onClick={() => onSetEstimate(estParsed)}
          className="rounded bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 disabled:opacity-50"
        >
          Set estimate
        </button>
      </div>

      {/* Quotes */}
      {line.quotes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {line.quotes.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-700">{q.vendorLabel ?? q.vendorRef ?? 'vendor'}</span>
              <span className="text-slate-500">{fmt(q.amount)}</span>
              <span className="text-xs text-slate-400">{q.quoteStatus}</span>
              {q.quoteStatus !== 'selected' && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectQuote(q.id)}
                  className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Select
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add manual quote */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="number"
          placeholder="quote amount"
          value={quoteAmount}
          onChange={(e) => setQuoteAmount(e.target.value)}
          className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          type="text"
          placeholder="vendor name (required)"
          value={quoteVendor}
          onChange={(e) => setQuoteVendor(e.target.value)}
          className="w-44 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          disabled={disabled || !Number.isFinite(qa) || quoteAmount.trim() === '' || quoteVendor.trim() === ''}
          onClick={() => {
            onAddQuote(qa, quoteVendor.trim())
            setQuoteAmount('')
            setQuoteVendor('')
          }}
          className="rounded bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 disabled:opacity-50"
        >
          Add manual quote
        </button>
      </div>
    </div>
  )
}
