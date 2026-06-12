/**
 * Deterministic tests for refund webhook sync (lib/stripe/refund-core.ts).
 * In-memory fakes for the admin client + Stripe SDK — no network, no DB.
 */
import { mapRefundStatus, idOf } from '../lib/stripe/refund-mapping.ts'
import { syncRefund, handleChargeRefunded, handleChargeRefundUpdated } from '../lib/stripe/refund-core.ts'

let pass = 0
let fail = 0
const ok = (c: boolean, m: string) => {
  if (c) pass++
  else {
    fail++
    console.log('FAIL:', m)
  }
}

// ── pure mapping ─────────────────────────────────────────────────────────────
ok(mapRefundStatus('succeeded') === 'refunded', "mapRefundStatus: succeeded → refunded")
ok(mapRefundStatus('failed') === 'failed', 'mapRefundStatus: failed → failed')
ok(mapRefundStatus('canceled') === 'failed', 'mapRefundStatus: canceled → failed')
ok(mapRefundStatus('pending') === null, 'mapRefundStatus: pending → null (non-terminal)')
ok(mapRefundStatus('requires_action') === null, 'mapRefundStatus: requires_action → null')
ok(idOf('re_1') === 're_1' && idOf({ id: 're_2' }) === 're_2' && idOf(null) === null, 'idOf: string / object / null')

// ── fake admin client ────────────────────────────────────────────────────────
function makeAdmin({ booking, refundMatch = [] as any[] }: { booking: any; refundMatch?: any[] }) {
  const w = { bookingUpdate: null as any, calendarDelete: null as any, refundUpdates: [] as any[] }
  function from(table: string) {
    const st: any = { table, op: 'select', payload: null, filters: {}, inVals: null }
    const record = () => {
      if (table === 'bookings' && st.op === 'update') w.bookingUpdate = { payload: st.payload, filters: st.filters }
      if (table === 'calendar_events' && st.op === 'delete') w.calendarDelete = { filters: st.filters }
      if (table === 'refund_requests' && st.op === 'update')
        w.refundUpdates.push({ payload: st.payload, filters: st.filters, inVals: st.inVals })
    }
    const b: any = {
      select(_c?: string) {
        if (st.op === 'select') return b // read chain
        record() // terminal .select() after .update()
        return Promise.resolve({ data: refundMatch })
      },
      update(p: any) { st.op = 'update'; st.payload = p; return b },
      delete() { st.op = 'delete'; return b },
      eq(c: string, v: any) { st.filters[c] = v; return b },
      in(c: string, v: any[]) { st.inVals = { col: c, vals: v }; return b },
      maybeSingle() { return Promise.resolve({ data: table === 'bookings' ? booking : null }) },
      then(res: any, rej: any) { record(); return Promise.resolve({ data: null, error: null }).then(res, rej) },
    }
    return b
  }
  return { admin: { from }, w }
}

const PAID_BOOKING = { id: 'bk_1', payment_status: 'paid', status: 'confirmed', calendar_event_id: 'cal_1' }

// ── full successful refund → booking refunded + calendar deleted + request synced ─
{
  const { admin, w } = makeAdmin({ booking: { ...PAID_BOOKING }, refundMatch: [{ id: 'rr_1' }] })
  await syncRefund(admin as any, { paymentIntentId: 'pi_1', stripeRefundId: 're_1', refundStatus: 'succeeded', chargeFullyRefunded: true })
  ok(w.bookingUpdate?.payload?.payment_status === 'refunded' && w.bookingUpdate?.payload?.status === 'refunded', 'FULL refund: booking → refunded')
  ok(w.calendarDelete?.filters?.id === 'cal_1', 'FULL refund: calendar_event deleted')
  ok(w.refundUpdates.some((u) => u.payload.status === 'refunded' && u.payload.stripe_refund_id === 're_1'), 'FULL refund: refund_requests → refunded')
}

// ── failed refund → request failed, booking untouched ────────────────────────
{
  const { admin, w } = makeAdmin({ booking: { ...PAID_BOOKING }, refundMatch: [{ id: 'rr_1' }] })
  await syncRefund(admin as any, { paymentIntentId: 'pi_1', stripeRefundId: 're_x', refundStatus: 'failed', chargeFullyRefunded: false })
  ok(w.bookingUpdate === null, 'FAILED refund: booking NOT changed')
  ok(w.calendarDelete === null, 'FAILED refund: no calendar delete')
  ok(w.refundUpdates.some((u) => u.payload.status === 'failed'), 'FAILED refund: refund_requests → failed')
}

// ── partial refund (not fully refunded) → booking NOT flipped ────────────────
{
  const { admin, w } = makeAdmin({ booking: { ...PAID_BOOKING }, refundMatch: [{ id: 'rr_1' }] })
  await syncRefund(admin as any, { paymentIntentId: 'pi_1', stripeRefundId: 're_p', refundStatus: 'succeeded', chargeFullyRefunded: false })
  ok(w.bookingUpdate === null, 'PARTIAL refund: booking NOT flipped to refunded')
}

// ── non-terminal (pending) → no writes at all ────────────────────────────────
{
  const { admin, w } = makeAdmin({ booking: { ...PAID_BOOKING } })
  await syncRefund(admin as any, { paymentIntentId: 'pi_1', stripeRefundId: 're_pend', refundStatus: 'pending', chargeFullyRefunded: false })
  ok(w.bookingUpdate === null && w.refundUpdates.length === 0, 'PENDING refund: no writes')
}

// ── no matching booking → no-op ──────────────────────────────────────────────
{
  const { admin, w } = makeAdmin({ booking: null })
  await syncRefund(admin as any, { paymentIntentId: 'pi_unknown', stripeRefundId: 're_1', refundStatus: 'succeeded', chargeFullyRefunded: true })
  ok(w.bookingUpdate === null && w.refundUpdates.length === 0 && w.calendarDelete === null, 'NO booking: no-op')
}

// ── idempotent: booking already refunded → no second booking write ───────────
{
  const { admin, w } = makeAdmin({ booking: { ...PAID_BOOKING, payment_status: 'refunded', status: 'refunded' }, refundMatch: [{ id: 'rr_1' }] })
  await syncRefund(admin as any, { paymentIntentId: 'pi_1', stripeRefundId: 're_1', refundStatus: 'succeeded', chargeFullyRefunded: true })
  ok(w.bookingUpdate === null, 'IDEMPOTENT: already-refunded booking not rewritten')
}

// ── EXTERNAL refund (no in-app request row) still reconciles the booking ─────
{
  const { admin, w } = makeAdmin({ booking: { ...PAID_BOOKING }, refundMatch: [] }) // no request rows
  await syncRefund(admin as any, { paymentIntentId: 'pi_1', stripeRefundId: 're_ext', refundStatus: 'succeeded', chargeFullyRefunded: true })
  ok(w.bookingUpdate?.payload?.payment_status === 'refunded', 'EXTERNAL (Dashboard) refund: booking reconciled to refunded')
}

// ── handleChargeRefunded builds args from a Charge object ────────────────────
{
  const { admin, w } = makeAdmin({ booking: { ...PAID_BOOKING }, refundMatch: [{ id: 'rr_1' }] })
  const charge: any = { payment_intent: 'pi_1', refunded: true, refunds: { data: [{ id: 're_c', status: 'succeeded' }] } }
  await handleChargeRefunded(admin as any, charge)
  ok(w.bookingUpdate?.payload?.payment_status === 'refunded', 'charge.refunded: booking refunded from Charge object')
}

// ── handleChargeRefundUpdated retrieves the charge to learn full-refund state ─
{
  const { admin, w } = makeAdmin({ booking: { ...PAID_BOOKING }, refundMatch: [{ id: 'rr_1' }] })
  const fakeStripe: any = { charges: { retrieve: async (_id: string) => ({ refunded: true }) } }
  const refund: any = { id: 're_u', status: 'succeeded', payment_intent: 'pi_1', charge: 'ch_1' }
  await handleChargeRefundUpdated(admin as any, fakeStripe, refund)
  ok(w.bookingUpdate?.payload?.payment_status === 'refunded', 'charge.refund.updated: booking refunded after charge retrieve says full')
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
