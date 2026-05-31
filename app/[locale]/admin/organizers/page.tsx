import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { setSuspended } from '@/lib/actions/admin'
import type { Locale } from '@/lib/types'

interface Props {
  params: Promise<{ locale: string }>
}

type Row = { id: string; full_name: string | null; email: string | null; suspended: boolean }

export default async function AdminOrganizersPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('admin')

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, suspended')
    .eq('role', 'certified_organizer')
    .order('full_name', { ascending: true })
  const organizers = (data ?? []) as Row[]

  // Public display names where available.
  const { data: op } = await supabase
    .from('organizer_profiles')
    .select('user_id, display_name')
    .in('user_id', organizers.map((o) => o.id).length ? organizers.map((o) => o.id) : ['00000000-0000-0000-0000-000000000000'])
  const display = new Map<string, string>()
  for (const r of (op ?? []) as { user_id: string; display_name: string | null }[]) if (r.display_name) display.set(r.user_id, r.display_name)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('organizers.title')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('organizers.subtitle')}</p>
      </div>

      {organizers.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">{t('organizers.empty')}</p>
      ) : (
        <div className="space-y-2">
          {organizers.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/${locale}/organizers/${o.id}`} className="font-semibold text-slate-900 hover:underline">
                    {display.get(o.id) ?? o.full_name ?? '—'}
                  </Link>
                  {o.suspended && <Badge label={t('organizers.suspended')} variant="error" />}
                </div>
                <p className="text-xs text-slate-500">{o.email}</p>
              </div>
              <form action={setSuspended}>
                <input type="hidden" name="user_id" value={o.id} />
                <input type="hidden" name="suspended" value={o.suspended ? 'false' : 'true'} />
                <button
                  className={
                    o.suspended
                      ? 'rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700'
                      : 'rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50'
                  }
                >
                  {o.suspended ? t('organizers.unsuspend') : t('organizers.suspend')}
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
