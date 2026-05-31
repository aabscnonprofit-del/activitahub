import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ShieldCheck, ShieldX, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { verifyCertificate } from '@/lib/academy/certification'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/types'
import type { Metadata } from 'next'

interface VerifyPageProps {
  params: Promise<{ locale: string; code: string }>
}

export async function generateMetadata({
  params,
}: VerifyPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'verify' })
  return { title: t('title') }
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { locale, code } = (await params) as { locale: Locale; code: string }
  const t = await getTranslations('verify')

  // Anonymous-safe: verify_certificate() is a SECURITY DEFINER function granted
  // to anon; it returns only public-safe fields (or { valid: false }).
  const supabase = await createClient()
  const result = await verifyCertificate(supabase, code)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-16">
      <Link href={`/${locale}`} className="mb-8 flex items-center gap-2 text-slate-900">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <Award className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="font-bold">Activita Hub</span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {result.valid ? (
          <>
            <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-green-500" aria-hidden="true" />
            <h1 className="text-xl font-bold text-slate-900">{t('validTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('validBody')}</p>

            <dl className="mt-6 space-y-3 text-left">
              <Row label={t('holder')} value={result.holder_name ?? '—'} />
              <Row label={t('course')} value={result.course_title} />
              <Row label={t('score')} value={`${result.score}%`} />
              <Row
                label={t('issued')}
                value={formatDate(result.issued_at, 'UTC', locale)}
              />
              <Row label={t('code')} value={result.certificate_code} mono />
            </dl>
          </>
        ) : (
          <>
            <ShieldX className="mx-auto mb-3 h-12 w-12 text-red-400" aria-hidden="true" />
            <h1 className="text-xl font-bold text-slate-900">{t('invalidTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('invalidBody')}</p>
            <p className="mt-4 font-mono text-xs text-slate-400">{code}</p>
          </>
        )}
      </div>

      <Link
        href={`/${locale}`}
        className="mt-6 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        {t('backHome')}
      </Link>
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={mono ? 'font-mono text-xs font-semibold text-slate-800' : 'text-sm font-semibold text-slate-800'}>
        {value}
      </dd>
    </div>
  )
}
