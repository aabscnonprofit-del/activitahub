'use server'

import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import {
  generatePromotionAssets,
  type PromotionAssets,
  type PromotionLocale,
} from '@/lib/marketing/promotion-generator'
import { routing } from '@/i18n/routing'

const SUPPORTED = routing.locales as readonly string[]
function asLocale(l?: string): PromotionLocale {
  return (l && SUPPORTED.includes(l) ? l : 'en') as PromotionLocale
}

const FREE_WORD: Record<PromotionLocale, string> = {
  en: 'Free', es: 'Gratis', fr: 'Gratuit', ru: 'Бесплатно', de: 'Kostenlos', pt: 'Grátis',
}

export interface GenerateResult {
  ok: boolean
  assets?: PromotionAssets
  locale?: PromotionLocale
  packageId?: string
  stored?: boolean
  error?: 'unauthenticated' | 'forbidden' | 'not_found' | 'generation_failed'
}

export interface StoredPackage {
  id: string
  locale: string
  assets: PromotionAssets
  created_at: string
}

/**
 * Generate a multi-channel Promotion Package for one of the organizer's own
 * activities, in the requested language. Generation is deterministic and never
 * touches the network. Persistence is best-effort: the assets are returned even
 * if storage is unavailable (e.g. migration 018 not yet applied).
 */
export async function generatePromotionPackage(
  activityId: string,
  localeInput?: string,
  variant = 0,
): Promise<GenerateResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  // Organizer-access entitlement (mirrors the activity write actions).
  if (!(await userHasOrganizerAccess(supabase, user.id))) return { ok: false, error: 'forbidden' }

  // Ownership-scoped load — an organizer can only promote their own activity.
  const { data: activity } = await supabase
    .from('activities')
    .select('id, title, description, category, price_cents, currency, city, country')
    .eq('id', activityId)
    .eq('organizer_id', user.id)
    .single()
  if (!activity) return { ok: false, error: 'not_found' }

  const a = activity as {
    id: string
    title: string
    description: string | null
    category: string | null
    price_cents: number | null
    currency: string
    city: string | null
    country: string | null
  }

  const locale = asLocale(localeInput)

  // Organizer display name (frozen fact).
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const organizerName =
    (profile as { full_name: string | null } | null)?.full_name?.trim() || 'Your organizer'

  // Soonest upcoming scheduled date, if any (frozen fact, optional).
  let dateLabel: string | null = null
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { data: ev } = await supabase
      .from('calendar_events')
      .select('date')
      .eq('activity_id', a.id)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle()
    const evDate = (ev as { date?: string } | null)?.date
    if (evDate) {
      try {
        dateLabel = new Intl.DateTimeFormat(locale, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }).format(new Date(evDate + 'T00:00:00'))
      } catch {
        dateLabel = evDate
      }
    }
  } catch {
    /* no schedule — date stays null */
  }

  // Localized category label (frozen fact, optional).
  let categoryLabel: string | null = null
  if (a.category) {
    try {
      const tMarket = await getTranslations({ locale, namespace: 'marketplace' })
      categoryLabel = tMarket(`categories.${a.category}` as 'categories.birthday')
    } catch {
      categoryLabel = a.category
    }
  }

  // Price label (frozen fact, optional).
  let priceLabel: string | null = null
  if (a.price_cents != null) {
    if (a.price_cents === 0) {
      priceLabel = FREE_WORD[locale]
    } else {
      try {
        priceLabel = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: (a.currency || 'usd').toUpperCase(),
          maximumFractionDigits: 2,
        }).format(a.price_cents / 100)
      } catch {
        priceLabel = (a.price_cents / 100).toFixed(2)
      }
    }
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const url = `${base}/${locale}/marketplace/${a.id}`

  let assets: PromotionAssets
  try {
    assets = generatePromotionAssets(
      {
        title: a.title,
        description: a.description,
        categoryLabel,
        city: a.city,
        country: a.country,
        dateLabel,
        priceLabel,
        organizerName,
        url,
        locale,
      },
      variant,
    )
  } catch {
    return { ok: false, error: 'generation_failed' }
  }

  // Best-effort persistence (activates once migration 018 is applied).
  let stored = false
  let packageId: string | undefined
  try {
    const { data: pkg, error } = await supabase
      .from('promotion_packages')
      .insert({ activity_id: a.id, organizer_id: user.id, locale, assets })
      .select('id')
      .single()
    if (!error && pkg) {
      stored = true
      packageId = (pkg as { id: string }).id
    }
  } catch {
    /* table not present yet — generation still succeeds */
  }

  return { ok: true, assets, locale, stored, packageId }
}

/** Previously generated packages for an activity (most recent first). */
export async function getPromotionPackages(activityId: string): Promise<StoredPackage[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  try {
    const { data } = await supabase
      .from('promotion_packages')
      .select('id, locale, assets, created_at')
      .eq('activity_id', activityId)
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    return (data ?? []) as StoredPackage[]
  } catch {
    return []
  }
}
