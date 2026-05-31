import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { Award, ArrowLeft, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLatestCertificate } from '@/lib/academy/certification'
import { PrintButton } from '@/components/academy/PrintButton'
import { absoluteUrl } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type { Locale, Profile, Course } from '@/lib/types'

interface CertificatePageProps {
  params: Promise<{ locale: string }>
}

export default async function CertificatePage({ params }: CertificatePageProps) {
  const { locale } = (await params) as { locale: Locale }
  const t = await getTranslations('certificate')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/sign-in`)

  const cert = await getLatestCertificate(supabase, user.id)
  if (!cert) redirect(`/${locale}/academy`)

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const holderName =
    (profileRow as Pick<Profile, 'full_name'> | null)?.full_name ?? t('anonymousHolder')

  const { data: courseRow } = await supabase
    .from('courses')
    .select('title')
    .eq('id', cert.course_id)
    .maybeSingle()
  const courseTitle = (courseRow as Pick<Course, 'title'> | null)?.title ?? ''

  // QR encodes the public verification URL.
  const verifyUrl = absoluteUrl(`/${locale}/verify/${cert.certificate_code}`)
  const qrSvg = await QRCode.toString(verifyUrl, {
    type: 'svg',
    margin: 1,
    width: 148,
    color: { dark: '#0f172a', light: '#ffffff' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/${locale}/academy`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('backToAcademy')}
        </Link>
        <PrintButton />
      </div>

      {/* Certificate */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-brand-200 bg-white p-8 sm:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
          <div className="flex h-full items-center justify-center">
            <Award className="h-96 w-96" aria-hidden="true" />
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 text-brand-600">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Award className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold">Activita Hub</span>
          </div>

          <p className="mt-8 text-sm font-medium uppercase tracking-widest text-slate-400">
            {t('title')}
          </p>
          <p className="mt-2 text-sm text-slate-500">{t('issuedTo')}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            {holderName}
          </h1>

          <p className="mt-6 max-w-lg text-sm text-slate-600">
            {t('statement', { course: courseTitle })}
          </p>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <dl className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{t('course')}</dt>
                <dd className="font-semibold text-slate-800">{courseTitle}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{t('score')}</dt>
                <dd className="font-semibold text-slate-800">{cert.score}%</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{t('date')}</dt>
                <dd className="font-semibold text-slate-800">
                  {formatDate(cert.issued_at, 'UTC', locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{t('code')}</dt>
                <dd className="font-mono text-xs font-semibold text-slate-800">
                  {cert.certificate_code}
                </dd>
              </div>
            </dl>

            {/* QR → public verification */}
            <div className="text-center">
              <div
                className="inline-block rounded-lg border border-slate-200 bg-white p-1.5"
                // QR is generated server-side; SVG is trusted output of the qrcode lib.
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="mt-1.5 text-[10px] uppercase tracking-wide text-slate-400">
                {t('scanToVerify')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Next step → subscription */}
      <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 print:hidden">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{t('nextTitle')}</p>
          <p className="mt-0.5 text-sm text-slate-600">{t('nextBody')}</p>
        </div>
        <Link
          href={`/${locale}/billing`}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          {t('nextCta')}
        </Link>
      </div>
    </div>
  )
}
