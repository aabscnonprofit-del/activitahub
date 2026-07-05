// Public activity card — a published activity in the Activity Marketplace. Shows the public-safe fields (title,
// organizer, date, location, capacity, price) and links to the existing public Activity page (/p/[projectId]).
// Consumes only the MarketplaceActivityCard DTO (no internal/organizer-private data).

import Link from 'next/link'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import type { MarketplaceActivityCard } from '@/lib/activity-marketplace/model'
import type { Locale } from '@/lib/types'

export function ActivityCard({ card, locale }: { card: MarketplaceActivityCard; locale: Locale }) {
  return (
    <Link
      href={`/${locale}/p/${card.projectId}`}
      className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
    >
      <h2 className="text-base font-bold text-slate-900">{card.title}</h2>
      {card.organizerName && <p className="mt-0.5 text-xs text-slate-500">by {card.organizerName}</p>}
      {card.summary && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{card.summary}</p>}
      <dl className="mt-3 space-y-1 text-xs text-slate-500">
        {card.startsAt && (
          <div className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden />{formatDate(card.startsAt)}</div>
        )}
        {card.location && (
          <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden />{card.location}</div>
        )}
        {card.capacity != null && (
          <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden />Up to {card.capacity} participants</div>
        )}
      </dl>
      <p className="mt-3 text-sm font-semibold text-slate-900">
        {card.priceCents != null ? formatPrice(card.priceCents) : 'Free'}
      </p>
    </Link>
  )
}
