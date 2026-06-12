import 'server-only'

// Public, server-only surface for subscription sync. App/runtime code imports from
// here so the `server-only` guard keeps the implementation out of any client bundle.
// The logic lives in ./sync-core (no server-only) so it stays unit-testable and
// reusable by maintenance scripts.
export { syncSubscription, syncSubscriptionById } from './sync-core'
export { customerIdOf, mapStripeStatus } from './subscription-mapping'
