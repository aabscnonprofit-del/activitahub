'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { userHasOrganizerAccess } from '@/lib/auth/organizer-access.server'
import { getStripe, isStripeConfigured } from '@/lib/stripe/client'
import { absoluteUrl } from '@/lib/utils'

// ── Stripe Connect onboarding (Foundation Commit 3) ─────────────────────────
// Creates (or reuses) the organizer's Stripe Connect Express account and sends
// them into Stripe-hosted onboarding. Entitlement-gated. The connect row is
// written with the service-role client because organizer_connect_accounts (035)
// grants the owner SELECT only — capability flags must never be self-set; they
// are filled later by the account.updated webhook (a separate commit).
//
// Scope: account + onboarding link only. No charges, no payment routing, no
// application fees, no UI, no webhook here.

/**
 * Create or reuse the caller's Express connected account and redirect them to a
 * fresh Stripe-hosted onboarding link. On any precondition failure, redirects
 * back to the dashboard with a ?connect=<reason> marker instead of throwing.
 */
export async function startConnectOnboarding(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as string) || 'en'
  const dash = (reason: string) => redirect(`/${locale}/dashboard?connect=${reason}`)

  // 1. Auth — user-scoped (RLS) client.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/sign-in`)

  // 2. Entitlement gate — only an organizer with active access may onboard.
  if (!(await userHasOrganizerAccess(supabase, user.id))) return dash('no_access')

  // 3. Stripe config guard — fail gracefully rather than throw.
  if (!isStripeConfigured()) return dash('unconfigured')

  const stripe = getStripe()

  // 4. Create or reuse the Express account. Reads/writes go through the service
  // role: the connect table has no owner-write policy by design (035).
  const admin = await createAdminClient()
  const { data: existing, error: readErr } = await admin
    .from('organizer_connect_accounts')
    .select('stripe_account_id')
    .eq('organizer_id', user.id)
    .maybeSingle()

  // Never proceed on an ambiguous read: treating a transient error as "no account"
  // would create a duplicate Stripe account on the next branch.
  if (readErr) return dash('setup_error')

  let accountId = (existing?.stripe_account_id as string | undefined) ?? undefined

  if (!accountId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    // Idempotency key keyed on the organizer makes a retried/double-submitted
    // create return the same account instead of minting a duplicate.
    const account = await stripe.accounts.create(
      {
        type: 'express',
        email: (profile?.email as string | null) ?? undefined,
        metadata: { organizer_id: user.id },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      },
      { idempotencyKey: `connect_acct_create_${user.id}` }
    )
    accountId = account.id

    // Persist the account id (capability booleans stay FALSE until the webhook syncs).
    // If this write fails we must NOT continue to onboarding: a missing row would
    // orphan this account and cause a second one to be created next time.
    const { error: insertErr } = await admin
      .from('organizer_connect_accounts')
      .insert({ organizer_id: user.id, stripe_account_id: accountId })
    if (insertErr) return dash('setup_error')
  }

  // 5. Fresh onboarding link (Account Links are short-lived; create one per call).
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    return_url: absoluteUrl(`/${locale}/dashboard?connect=return`),
    refresh_url: absoluteUrl(`/${locale}/dashboard?connect=refresh`),
  })

  // 6. Hand off to Stripe-hosted onboarding.
  redirect(accountLink.url)
}
