import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Locale } from '@/lib/types'

const STATUSES = ['invited', 'confirmed', 'maybe', 'declined', 'checked_in', 'no_show'] as const
type Status = (typeof STATUSES)[number]

function statusClasses(s: string): string {
  if (s === 'confirmed' || s === 'checked_in') return 'bg-emerald-100 text-emerald-700'
  if (s === 'maybe') return 'bg-amber-100 text-amber-700'
  if (s === 'declined' || s === 'no_show') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function AllParticipantsPage({ params, searchParams }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const { status } = await searchParams
  const t = await getTranslations('participants')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const active = (STATUSES as readonly string[]).includes(status ?? '') ? (status as Status) : undefined

  let rows: { id: string; full_name: string; email: string | null; status: string; activity_id: string }[] = []
  try {
    let q = supabase
      .from('participants')
      .select('id, full_name, email, status, activity_id')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500)
    if (active) q = q.eq('status', active)
    const { data } = await q
    rows = (data ?? []) as typeof rows
  } catch {
    rows = []
  }

  const actIds = [...new Set(rows.map((r) => r.activity_id))]
  const titles = new Map<string, string>()
  if (actIds.length) {
    try {
      const { data } = await supabase.from('activities').select('id, title').in('id', actIds)
      for (const a of (data ?? []) as { id: string; title: string }[]) titles.set(a.id, a.title)
    } catch { /* ignore */ }
  }

  const chip = (s?: Status) => {
    const href = s ? `/${locale}/dashboard/participants?status=${s}` : `/${locale}/dashboard/participants`
    const on = active === s
    return (
      <Link key={s ?? 'all'} href={href} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${on ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
        {s ? t(`status.${s}` as 'status.invited') : t('allStatuses')}
      </Link>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/${locale}/dashboard`} className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />{t('back')}
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('title')}</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {chip(undefined)}
        {STATUSES.map((s) => chip(s))}
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <Users className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.id} className="card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-900">{p.full_name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClasses(p.status)}`}>{t(`status.${p.status}` as 'status.invited')}</span>
                </div>
                <p className="truncate text-sm text-slate-500">{p.email || '—'}</p>
              </div>
              <Link href={`/${locale}/dashboard/activities/${p.activity_id}/participants`} className="shrink-0 truncate text-xs font-semibold text-brand-600 hover:underline">
                {titles.get(p.activity_id) || t('title')}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
