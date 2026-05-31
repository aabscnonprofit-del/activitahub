import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import type { Locale } from '@/lib/types'

interface PublicFooterProps {
  locale: Locale
}

export async function PublicFooter({ locale }: PublicFooterProps) {
  const t = await getTranslations('footer')
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-xs font-bold text-white">A</span>
              </div>
              <span className="font-bold text-slate-900">Activita Hub</span>
            </div>
            <p className="text-sm text-slate-500">{t('tagline')}</p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
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
