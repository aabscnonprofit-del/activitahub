import 'server-only'
import Stripe from 'stripe'
import { STRIPE_API_VERSION } from './config'

/**
 * Lazily-constructed, server-only Stripe client.
 *
 * The secret key is read at call time (never at module load) so that importing
 * this file never throws — only *using* Stripe without configuration does.
 * This keeps the build green and lets unrelated routes render when Stripe is
 * not yet configured. There is NO mock/fake fallback: an unconfigured call
 * fails loudly.
 */
let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error(
      'Stripe is not configured: set STRIPE_SECRET_KEY in your environment.'
    )
  }

  cached = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    appInfo: { name: 'ActivitaHub', url: 'https://activitahub.com' },
  })

  return cached
}

/** True when the minimum Stripe server config is present. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
