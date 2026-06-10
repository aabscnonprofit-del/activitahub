import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import { buildPromotionFacts, asPromotionLocale } from '@/lib/marketing/facts'
import {
  buildPromoImageSVG,
  getPromoImageSpec,
  type PromoImageFormat,
} from '@/lib/marketing/promo-image'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Renders a branded promotional image (SVG) for one of the caller's own
 * activities. Facts are loaded server-side (never trusted from the client) so
 * date/location/price/organizer are always accurate. Organizer-access + activity
 * ownership are enforced here just like the text generator action.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const activityId = searchParams.get('activityId') || ''
  const format = (searchParams.get('format') || 'square') as PromoImageFormat
  const locale = asPromotionLocale(searchParams.get('locale') || undefined)

  if (!activityId || !getPromoImageSpec(format)) {
    return new Response('Bad request', { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!(await userHasOrganizerAccess(supabase, user.id))) {
    return new Response('Forbidden', { status: 403 })
  }

  const facts = await buildPromotionFacts(supabase, user.id, activityId, locale)
  if (!facts) return new Response('Not found', { status: 404 })

  const svg = buildPromoImageSVG(facts, format)
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=60',
    },
  })
}
