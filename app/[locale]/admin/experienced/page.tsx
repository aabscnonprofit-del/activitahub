import { getTranslations } from 'next-intl/server'
import { Check, X, GraduationCap, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { reviewExperiencedApplication } from '@/lib/actions/experiencedReview'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/types'

interface Props {
  params: Promise<{ locale: string }>
}

interface AppRow {
  profile_id: string
  status: string
  holder_name: string | null
  holder_email: string | null
  submitted_at: string
  links: Record<string, string | null>
}

const LINK_KEYS = ['instagram', 'facebook', 'meetup', 'linkedin', 'website', 'portfolio'] as const

export default async function AdminExperiencedPage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('admin')

  const supabase = await createClient()
  const { data } = await supabase.rpc('admin_list_experienced_applications')
  const apps = (data ?? []) as AppRow[]

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-900">{t('experienced.title')}</h1>
      <p className="text-sm text-slate-500">{t('experienced.subtitle')}</p>

      {apps.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          {t('experienced.empty')}
        </p>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => {
            const links = LINK_KEYS.map((k) => [k, a.links?.[k]] as const).filter(([, v]) => !!v)
            return (
              <div key={a.profile_id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{a.holder_name ?? '—'}</span>
                      <Badge
                        label={t(`experienced.status.${a.status}` as 'experienced.status.under_review')}
                        variant={a.status === 'approved' ? 'success' : 'warning'}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {a.holder_email} · {formatDate(a.submitted_at, 'UTC', locale)}
                    </p>
                    {links.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {links.map(([k, v]) => (
                          <li key={k}>
                            <a
                              href={v as string}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              {t(`experienced.links.${k}` as 'experienced.links.instagram')}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs italic text-slate-400">{t('experienced.noLinks')}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <form action={reviewExperiencedApplication}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="profile_id" value={a.profile_id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700">
                        <Check className="h-4 w-4" />{t('experienced.approve')}
                      </button>
                    </form>
                    <form action={reviewExperiencedApplication}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="profile_id" value={a.profile_id} />
                      <input type="hidden" name="decision" value="redirect" />
                      <button className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
                        <GraduationCap className="h-4 w-4" />{t('experienced.redirect')}
                      </button>
                    </form>
                    <form action={reviewExperiencedApplication}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="profile_id" value={a.profile_id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        <X className="h-4 w-4" />{t('experienced.reject')}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
