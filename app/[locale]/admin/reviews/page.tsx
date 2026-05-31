import { getTranslations } from 'next-intl/server'
import { Check, X, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { moderateReview } from '@/lib/actions/admin'
import { formatDate } from '@/lib/utils'
import type { Locale, Review, ReviewStatus } from '@/lib/types'

const VARIANT: Record<ReviewStatus, 'warning' | 'success' | 'neutral'> = {
  pending: 'warning', approved: 'success', rejected: 'neutral',
}

interface Props {
  params: Promise<{ locale: string }>
}

export default async function AdminReviewsPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('admin')

  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
  const reviews = (data ?? []) as Review[]
  // Pending first.
  reviews.sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0))

  const ids = [...new Set(reviews.flatMap((r) => [r.customer_id, r.organizer_id]))]
  const name = new Map<string, string>()
  if (ids.length) {
    const { data: p } = await supabase.from('profiles').select('id, full_name').in('id', ids)
    for (const r of (p ?? []) as { id: string; full_name: string | null }[]) name.set(r.id, r.full_name ?? '—')
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-900">{t('reviews.title')}</h1>

      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">{t('reviews.empty')}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-sm font-bold text-amber-500">
                      {r.rating}<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </span>
                    <Badge label={t(`reviews.status.${r.status}` as 'reviews.status.pending')} variant={VARIANT[r.status]} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {name.get(r.customer_id)} → {name.get(r.organizer_id)} · {formatDate(r.created_at, 'UTC', locale)}
                  </p>
                  {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status !== 'approved' && (
                    <form action={moderateReview}>
                      <input type="hidden" name="review_id" value={r.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700">
                        <Check className="h-4 w-4" />{t('reviews.approve')}
                      </button>
                    </form>
                  )}
                  {r.status !== 'rejected' && (
                    <form action={moderateReview}>
                      <input type="hidden" name="review_id" value={r.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        <X className="h-4 w-4" />{t('reviews.reject')}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
