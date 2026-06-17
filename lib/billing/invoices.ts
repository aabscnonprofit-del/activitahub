/**
 * Invoice pure helpers (migration 036). Dependency-free and side-effect-free —
 * safe to import from server actions, route handlers, and UI. They read only the
 * persisted invoice fields; they never call Stripe or the database.
 *
 * Read-only domain logic for the all-invoice payment rail: a Booking is the
 * agreement, an Invoice is the money request.
 */

import type { Invoice, InvoiceBalance } from '@/lib/types'

/** True when an invoice can currently be paid: it is shared (open) and unpaid. */
export function invoiceIsPayable(invoice: Pick<Invoice, 'status'>): boolean {
  return invoice.status === 'open'
}

/** True when an invoice has been settled. */
export function invoiceIsPaid(invoice: Pick<Invoice, 'status'>): boolean {
  return invoice.status === 'paid'
}

/**
 * Summarise a set of invoices against an agreed total (the plan/booking amount).
 * Voided invoices are ignored. `remainingCents` is total − paid (left unclamped so
 * an overpayment surfaces as a negative); `fullyPaid` requires a known positive total.
 */
export function deriveBalance(
  totalCents: number | null | undefined,
  invoices: Pick<Invoice, 'status' | 'amount_cents'>[]
): InvoiceBalance {
  const total = totalCents ?? 0

  let paidCents = 0
  let openCents = 0
  for (const inv of invoices) {
    if (inv.status === 'paid') paidCents += inv.amount_cents
    else if (inv.status === 'open') openCents += inv.amount_cents
    // 'draft' and 'void' do not count toward paid or outstanding.
  }

  return {
    totalCents: total,
    paidCents,
    openCents,
    remainingCents: total - paidCents,
    fullyPaid: total > 0 && paidCents >= total,
  }
}
