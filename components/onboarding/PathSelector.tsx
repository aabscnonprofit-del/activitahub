'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import { CheckCircle2, GraduationCap, Zap } from 'lucide-react'
import { selectOnboardingPath } from '@/lib/actions/profile'
import { Alert } from '@/components/ui/Alert'
import { cn } from '@/lib/utils'
import type { Locale, OnboardingPath, ProfileFormState } from '@/lib/types'

interface PathSelectorProps {
  locale: Locale
  currentPath: OnboardingPath | null
  onboardingStatus: string
}

const initialState: ProfileFormState = {}

function PathSubmitButton({
  path,
  currentPath,
}: {
  path: OnboardingPath
  currentPath: OnboardingPath | null
}) {
  const { pending } = useFormStatus()
  const t = useTranslations('onboarding')
  const isSelected = currentPath === path

  const label =
    path === 'beginner' ? t('beginner.cta') : t('experienced.cta')

  return (
    <button
      type="submit"
      name="path"
      value={path}
      disabled={pending}
      className={cn(
        'mt-auto w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors',
        isSelected
          ? 'bg-brand-700 text-white hover:bg-brand-800'
          : 'bg-brand-600 text-white hover:bg-brand-700',
        'disabled:opacity-60 disabled:cursor-not-allowed'
      )}
    >
      {pending ? '...' : label}
    </button>
  )
}

export function PathSelector({
  locale,
  currentPath,
  onboardingStatus,
}: PathSelectorProps) {
  const t = useTranslations('onboarding')
  // useFormState can yield an undefined initial state under Next 15 + React 18;
  // coalesce so `state.*` access never crashes.
  const [rawState, formAction] = useFormState(selectOnboardingPath, initialState)
  const state = rawState ?? initialState

  const pathSelected = onboardingStatus !== 'not_started' && currentPath !== null

  return (
    <div className="space-y-6">
      {state.error && <Alert variant="error" message={state.error} />}

      {pathSelected && (
        <Alert
          variant="info"
          message={t('alreadySelected', {
            path: currentPath === 'beginner' ? 'Beginner' : 'Experienced',
          })}
        />
      )}

      <form action={formAction}>
        <input type="hidden" name="locale" value={locale} />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Beginner path card */}
          <PathCard
            path="beginner"
            currentPath={currentPath}
            badge={t('beginner.badge')}
            title={t('beginner.title')}
            description={t('beginner.description')}
            price={t('beginner.price')}
            priceLabel={t('beginner.priceLabel')}
            features={[
              t('beginner.features.0' as Parameters<typeof t>[0]),
              t('beginner.features.1' as Parameters<typeof t>[0]),
              t('beginner.features.2' as Parameters<typeof t>[0]),
              t('beginner.features.3' as Parameters<typeof t>[0]),
              t('beginner.features.4' as Parameters<typeof t>[0]),
            ]}
            icon={GraduationCap}
          />

          {/* Experienced path card */}
          <PathCard
            path="experienced"
            currentPath={currentPath}
            badge={t('experienced.badge')}
            title={t('experienced.title')}
            description={t('experienced.description')}
            price={t('experienced.price')}
            priceLabel={t('experienced.priceLabel')}
            features={[
              t('experienced.features.0' as Parameters<typeof t>[0]),
              t('experienced.features.1' as Parameters<typeof t>[0]),
              t('experienced.features.2' as Parameters<typeof t>[0]),
              t('experienced.features.3' as Parameters<typeof t>[0]),
              t('experienced.features.4' as Parameters<typeof t>[0]),
            ]}
            icon={Zap}
          />
        </div>
      </form>
    </div>
  )
}

// ── Path Card ─────────────────────────────────────────────────────────────────

interface PathCardProps {
  path: OnboardingPath
  currentPath: OnboardingPath | null
  badge: string
  title: string
  description: string
  price: string
  priceLabel: string
  features: string[]
  icon: React.ElementType
}

function PathCard({
  path,
  currentPath,
  badge,
  title,
  description,
  price,
  priceLabel,
  features,
  icon: Icon,
}: PathCardProps) {
  const t = useTranslations('onboarding')
  const isSelected = currentPath === path
  const selectedLabel = t('selected')

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border-2 p-6 transition-colors',
        isSelected
          ? 'border-brand-500 bg-brand-50'
          : 'border-slate-200 bg-white hover:border-brand-200'
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span
            className={cn(
              'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold',
              path === 'beginner'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
            )}
          >
            {badge}
          </span>
          <h3 className="mt-2 text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            path === 'beginner' ? 'bg-blue-100' : 'bg-amber-100'
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5',
              path === 'beginner' ? 'text-blue-600' : 'text-amber-600'
            )}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Description */}
      <p className="mb-4 text-sm text-slate-600 leading-relaxed">{description}</p>

      {/* Price */}
      <div className="mb-5 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-slate-900">{price}</span>
        <span className="text-sm text-slate-500">{priceLabel}</span>
      </div>

      {/* Feature list */}
      <ul className="mb-6 space-y-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
              aria-hidden="true"
            />
            <span className="text-sm text-slate-700">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA — uses form submit so no client JS required for basic flow */}
      <PathSubmitButton path={path} currentPath={currentPath} />

      {isSelected && (
        <p className="mt-2 text-center text-xs font-medium text-brand-600">
          ✓ {selectedLabel}
        </p>
      )}
    </div>
  )
}
