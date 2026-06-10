import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { BrandMark } from '@/components/brand/BrandMark'
import type { Locale } from '@/lib/types'

interface PublicFooterProps {
  locale: Locale
}

export async function PublicFooter({ locale }: PublicFooterProps) {
  const t = await getTranslations('footer')
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <BrandMark size={28} />
              <span className="font-bold text-slate-900">ActivLife Hub</span>
            </div>
            <p className="text-sm font-semibold text-brand-600">{t('positioning')}</p>
            <p className="mt-1 text-sm text-slate-500">{t('tagline')}</p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link
              href={`/${locale}/become-an-organizer`}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              {t('links.becomeOrganizer')}
            </Link>
            <Link
              href={`/${locale}/academy`}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              {t('links.academy')}
            </Link>
            <Link
              href={`/${locale}/organizer-philosophy`}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              {t('links.philosophy')}
            </Link>
            <Link
              href={`/${locale}/privacy-policy`}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              {t('links.privacy')}
            </Link>
            <Link
              href={`/${locale}/terms-of-service`}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              {t('links.terms')}
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-center text-xs text-slate-400">
            {t('copyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
