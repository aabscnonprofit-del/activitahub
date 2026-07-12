import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Inbox, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getViewerCtaState } from '@/lib/auth/viewer'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Locale, CustomerRequest, RequestStatus } from '@/lib/types'

const STATUS_VARIANT: Record<RequestStatus, 'default' | 'success' | 'warning' | 'neutral' | 'info'> = {
  open: 'info', matched: 'warning', booked: 'success', closed: 'neutral', cancelled: 'neutral',
}

interface RequestsPageProps {
  params: Promise<{ locale: string }>
}

export default async function RequestsPage({ params }: RequestsPageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('requests')
  const tm = await getTranslations('marketplace')

  const supabase = await createClient()

  const viewer = await getViewerCtaState(supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in?next=/${locale}/requests`)

  const { data } = await supabase
    .from('customer_requests')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
  const requests = (data ?? []) as CustomerRequest[]

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale} isAuthenticated isOrganizer={viewer.isOrganizer} />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{t('list.title')}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{t('list.subtitle')}</p>
            </div>
            <Link href={`/${locale}/requests/new`} className="btn-primary">
              <Plus className="h-4 w-4" />
              {t('list.newCta')}
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">{t('list.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <Link
                  key={r.id}
                  href={`/${locale}/requests/${r.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {tm(`categories.${r.event_type}` as 'categories.sports')}
                      </h3>
                      <Badge label={t(`status.${r.status}` as 'status.open')} variant={STATUS_VARIANT[r.status]} />
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {[r.city, r.desired_date ? formatDate(r.desired_date, 'UTC', locale) : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
