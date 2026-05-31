'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Star } from 'lucide-react'
import { createReview } from '@/lib/actions/reviews'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('reviews')
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
    >
      {pending ? t('submitting') : t('submit')}
    </button>
  )
}

/** Review entry for a completed booking. */
export function ReviewForm({ bookingId }: { bookingId: string }) {
  const t = useTranslations('reviews')
  const [rating, setRating] = useState(5)

  return (
    <form action={createReview} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="rating" value={rating} />
      <p className="text-xs font-medium text-slate-500">{t('yourRating')}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button type="button" key={i} onClick={() => setRating(i)} aria-label={`${i}`}>
            <Star className={`h-5 w-5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
          </button>
        ))}
      </div>
      <textarea name="comment" rows={2} placeholder={t('placeholder')} className="input-base resize-none" />
      <SubmitButton />
    </form>
  )
}
