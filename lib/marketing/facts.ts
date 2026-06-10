import 'server-only'

import { getTranslations } from 'next-intl/server'
import type { createClient } from '@/lib/supabase/server'
import type { PromotionFacts, PromotionLocale } from './promotion-generator'
import { routing } from '@/i18n/routing'

type ServerClient = Awaited<ReturnType<typeof createClient>>

const SUPPORTED = routing.locales as readonly string[]

export function asPromotionLocale(l?: string): PromotionLocale {
  return (l && SUPPORTED.includes(l) ? l : 'en') as PromotionLocale
}

const FREE_WORD: Record<PromotionLocale, string> = {
  en: 'Free', es: 'Gratis', fr: 'Gratuit', ru: 'Бесплатно', de: 'Kostenlos', pt: 'Grátis',
}

/**
 * Build the FROZEN promotional facts for one of the organizer's own activities.
 * Ownership-scoped (organizer_id = userId). Returns null if the activity is not
 * found / not owned. Shared by the text generator action and the image route so
 * both render identical, accurate facts. Caller is responsible for the
 * organizer-access entitlement check.
 */
export async function buildPromotionFacts(
  supabase: ServerClient,
  userId: string,
  activityId: string,
  localeInput?: string,
): Promise<PromotionFacts | null> {
  const { data: activity } = await supabase
    .from('activities')
    .select('id, title, description, category, price_cents, currency, city, country')
    .eq('id', activityId)
    .eq('organizer_id', userId)
    .single()
  if (!activity) return null

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

  const locale = asPromotionLocale(localeInput)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()
  const organizerName =
    (profile as { full_name: string | null } | null)?.full_name?.trim() || 'Your organizer'

  // Soonest upcoming scheduled date (optional, frozen).
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
    /* no schedule */
  }

  // Localized category (optional, frozen).
  let categoryLabel: string | null = null
  if (a.category) {
    try {
      const tMarket = await getTranslations({ locale, namespace: 'marketplace' })
      categoryLabel = tMarket(`categories.${a.category}` as 'categories.birthday')
    } catch {
      categoryLabel = a.category
    }
  }

  // Price (optional, frozen).
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

  return {
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
  }
}
