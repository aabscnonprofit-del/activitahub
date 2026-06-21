import type { OnboardingPath, PaymentKind } from '@/lib/types'

/**
 * Stripe configuration — pure, no secrets, safe to import anywhere.
 *
 * Price IDs come from environment variables (set in the Stripe Dashboard,
 * test mode). NEVER hardcode price IDs or secrets here.
 */

// Pinned to the API version shipped with the installed stripe-node SDK.
export const STRIPE_API_VERSION = '2025-02-24.acacia' as const

/**
 * Maps an onboarding path to its certification product.
 * - beginner   → paid course   (STRIPE_PRICE_BEGINNER_COURSE)
 * - experienced → skills test    (STRIPE_PRICE_EXPERIENCED_TEST)
 */
export const CERTIFICATION_PRODUCTS: Record<
  OnboardingPath,
  { kind: PaymentKind; priceEnv: string }
> = {
  beginner: { kind: 'beginner_course', priceEnv: 'STRIPE_PRICE_BEGINNER_COURSE' },
  experienced: { kind: 'experienced_test', priceEnv: 'STRIPE_PRICE_EXPERIENCED_TEST' },
}

/** Resolves the certification price id for a path, or throws if unconfigured. */
export function getCertificationPriceId(path: OnboardingPath): string {
  const { priceEnv } = CERTIFICATION_PRODUCTS[path]
  const priceId = process.env[priceEnv]
  if (!priceId) {
    throw new Error(
      `Stripe price not configured: set ${priceEnv} in your environment.`
    )
  }
  return priceId
}

/** Resolves the recurring subscription price id, or throws if unconfigured. */
export function getSubscriptionPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_SUBSCRIPTION
  if (!priceId) {
    throw new Error(
      'Stripe price not configured: set STRIPE_PRICE_SUBSCRIPTION in your environment.'
    )
  }
  return priceId
}

/**
 * Resolves the One Event License (Activity Planner $9.99) one-time price id, or
 * throws if unconfigured. A PLATFORM price (not a connected-account product).
 */
export function getOneEventLicensePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ONE_EVENT_LICENSE
  if (!priceId) {
    throw new Error(
      'Stripe price not configured: set STRIPE_PRICE_ONE_EVENT_LICENSE in your environment.'
    )
  }
  return priceId
}

/** Maps an onboarding path to the payment kind recorded in the payments table. */
export function pathToPaymentKind(path: OnboardingPath): PaymentKind {
  return CERTIFICATION_PRODUCTS[path].kind
}
