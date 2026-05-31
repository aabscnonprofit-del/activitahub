import { Star } from 'lucide-react'

/** Read-only star rating display (rounded to nearest whole star) + numeric. */
export function StarRating({ rating, count }: { rating: number; count?: number }) {
  const full = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i <= full ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
            aria-hidden="true"
          />
        ))}
      </span>
      <span className="text-xs font-medium text-slate-600">
        {rating.toFixed(1)}
        {count != null ? ` (${count})` : ''}
      </span>
    </span>
  )
}
