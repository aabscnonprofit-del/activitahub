import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signInWithGoogle } from '@/lib/actions/auth'
import { BrandMark } from '@/components/brand/BrandMark'
import Link from 'next/link'

type Props = { params: Promise<{ locale: string }> }

export default async function SignInPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('auth.signIn')

  // Already logged in
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect(`/${locale}/dashboard`)

  const googleAction = signInWithGoogle.bind(null, locale)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2">
            <BrandMark size={40} priority />
            <span className="font-extrabold text-slate-900 text-xl">
              ActivLife<span className="text-indigo-600">Hub</span>
            </span>
          </Link>
          <p className="mt-2 text-sm font-medium text-indigo-600">Activate Life Together</p>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{t('title')}</h1>
            <p className="text-slate-500 text-sm">{t('subtitle')}</p>
          </div>

          {/* Google sign-in */}
          <form action={googleAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 font-semibold rounded-xl transition-all"
            >
              {/* Google SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t('googleButton')}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            By signing in, you agree to our{' '}
            <Link href={`/${locale}/terms-of-service`} className="underline hover:text-slate-600">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href={`/${locale}/privacy-policy`} className="underline hover:text-slate-600">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="text-center mt-6">
          <Link
            href={`/${locale}`}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
