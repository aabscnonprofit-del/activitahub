'use server'

import { createClient } from '@/lib/supabase/server'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import {
  generatePromotionAssets,
  type PromotionAssets,
  type PromotionLocale,
} from '@/lib/marketing/promotion-generator'
import { buildPromotionFacts, asPromotionLocale } from '@/lib/marketing/facts'
import { PROMO_IMAGE_FORMATS } from '@/lib/marketing/promo-image'

export interface PromoImageMeta {
  format: string
  width: number
  height: number
}

export interface GenerateResult {
  ok: boolean
  assets?: PromotionAssets
  images?: PromoImageMeta[]
  locale?: PromotionLocale
  packageId?: string
  stored?: boolean
  error?: 'unauthenticated' | 'forbidden' | 'not_found' | 'generation_failed'
}

export interface StoredPackage {
  id: string
  locale: string
  assets: PromotionAssets & { images?: PromoImageMeta[] }
  created_at: string
}

/**
 * Generate a multi-channel Promotion Package (text + image descriptors) for one
 * of the organizer's own activities, in the requested language. Deterministic
 * and offline. Persistence is best-effort: assets are returned even if storage
 * is unavailable (e.g. migration 018 not yet applied).
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

  if (!(await userHasOrganizerAccess(supabase, user.id))) return { ok: false, error: 'forbidden' }

  const locale = asPromotionLocale(localeInput)
  const facts = await buildPromotionFacts(supabase, user.id, activityId, locale)
  if (!facts) return { ok: false, error: 'not_found' }

  let assets: PromotionAssets
  try {
    assets = generatePromotionAssets(facts, variant)
  } catch {
    return { ok: false, error: 'generation_failed' }
  }

  const images: PromoImageMeta[] = PROMO_IMAGE_FORMATS.map((s) => ({
    format: s.format,
    width: s.width,
    height: s.height,
  }))

  // Best-effort persistence (activates once migration 018 is applied). Image
  // metadata is stored alongside the text assets in the same JSONB column.
  let stored = false
  let packageId: string | undefined
  try {
    const { data: pkg, error } = await supabase
      .from('promotion_packages')
      .insert({ activity_id: activityId, organizer_id: user.id, locale, assets: { ...assets, images } })
      .select('id')
      .single()
    if (!error && pkg) {
      stored = true
      packageId = (pkg as { id: string }).id
    }
  } catch {
    /* table not present yet — generation still succeeds */
  }

  return { ok: true, assets, images, locale, stored, packageId }
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
