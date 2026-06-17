// RFQ Generation V1 — the layer after Supplier Discovery. Converts a rental search
// request + a discovered supplier candidate into a structured, supplier-ready quote
// request (RFQPackage). PURE and DETERMINISTIC.
//
// Pipeline: Requirement → RentalSearchRequest → Supplier Discovery → RFQPackage[]
//
// Out of scope (NOT here): sending/email, messaging, quote collection, booking, vendor
// onboarding/accounts, vendor/worker networks, marketplace. No I/O, no formatting.

import type { RentalSearchRequest, RentalLocation } from '@/lib/rental/search-request'
import type { SupplierCandidate, SourcingResult } from '@/lib/rental/supplier-discovery'

/** A supplier-ready quote request (V1 minimal — no messaging/sending/tracking). */
export interface RFQPackage {
  id: string
  category: string // the rental_key being quoted
  quantity: number | null
  eventDate: string | null
  deliveryDateTime: string | null // optional; set when delivery is required + time known
  pickupDateTime: string | null // optional
  location: RentalLocation
  notes: string | null
  supplierId: string // links the RFQ to the SupplierCandidate it is addressed to
}

/** Combine an ISO date + a time into a single timestamp string, or null. */
function combineDateTime(date: string | null, time: string | null): string | null {
  if (!date) return null
  return time ? `${date}T${time}` : date
}

/**
 * Generate one RFQ package addressed to a single supplier for a single rental request.
 * Deterministic: identical (request, supplier) → identical RFQPackage.
 */
export function generateRfq(request: RentalSearchRequest, supplier: SupplierCandidate): RFQPackage {
  const deliveryDateTime = request.delivery_required ? combineDateTime(request.event_date, request.start_time) : null
  const pickupDateTime = request.delivery_required ? combineDateTime(request.event_date, request.end_time) : null

  const noteParts = [request.title, request.notes].map((s) => (s ?? '').trim()).filter(Boolean)

  return {
    id: `rfq:${supplier.id}:q${request.quantity ?? 0}`,
    category: request.rental_key,
    quantity: request.quantity,
    eventDate: request.event_date,
    deliveryDateTime,
    pickupDateTime,
    location: request.location,
    notes: noteParts.length ? noteParts.join(' — ') : null,
    supplierId: supplier.id,
  }
}

/** Generate one RFQ per candidate for a single request (e.g. 3 suppliers → 3 RFQs). */
export function generateRfqsForRequest(
  request: RentalSearchRequest,
  candidates: SupplierCandidate[],
): RFQPackage[] {
  return candidates.map((c) => generateRfq(request, c))
}

/**
 * Batch generation: SourcingResult[] (from discoverForRequests) → RFQPackage[]. One
 * request may produce multiple RFQs (one per discovered supplier). Order-preserving.
 */
export function generateRfqs(sourcing: SourcingResult[]): RFQPackage[] {
  return sourcing.flatMap((s) => generateRfqsForRequest(s.request, s.candidates))
}
