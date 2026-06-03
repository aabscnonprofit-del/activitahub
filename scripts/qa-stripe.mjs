// Local Stripe QA helper. Reads .env.local, uses the Supabase service-role key
// over plain REST (no supabase-js → avoids the Node-20 websocket requirement).
// Usage:
//   node scripts/qa-stripe.mjs create-user   → ensure a confirmed test organizer in path_selected
//   node scripts/qa-stripe.mjs state         → print that user's billing-relevant DB state
import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) { console.error('Missing Supabase url/service key in .env.local'); process.exit(1) }

const EMAIL = 'organizer.qa@activita.test'
const PASSWORD = 'ActivitaDemo123!'
const authHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function adminFindUser(email) {
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${URL_}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: authHeaders })
    if (!res.ok) throw new Error(`listUsers ${res.status}: ${await res.text()}`)
    const body = await res.json()
    const users = Array.isArray(body) ? body : body.users || []
    const hit = users.find((u) => u.email === email)
    if (hit) return hit
    if (users.length < 200) break
  }
  return null
}

async function rest(path, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { ...authHeaders, Prefer: 'return=representation', ...(init.headers || {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`REST ${path} ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

async function createUser() {
  let user = await adminFindUser(EMAIL)
  if (!user) {
    const res = await fetch(`${URL_}/auth/v1/admin/users`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { full_name: 'QA Organizer' } }),
    })
    if (!res.ok) throw new Error(`createUser ${res.status}: ${await res.text()}`)
    user = await res.json()
    console.log('created auth user:', user.id)
  } else {
    console.log('auth user already exists:', user.id)
  }

  await new Promise((r) => setTimeout(r, 500)) // let handle_new_user trigger run
  const patch = JSON.stringify({ onboarding_status: 'path_selected', selected_path: 'beginner' })
  const updated = await rest(`profiles?id=eq.${user.id}`, { method: 'PATCH', body: patch })
  if (!updated || updated.length === 0) {
    await rest('profiles', {
      method: 'POST',
      body: JSON.stringify({ id: user.id, email: EMAIL, full_name: 'QA Organizer', onboarding_status: 'path_selected', selected_path: 'beginner' }),
    })
  }
  console.log('profile set → onboarding_status=path_selected, selected_path=beginner')
  console.log(`\nSign in at  http://localhost:3000/en/sign-in`)
  console.log(`  email:    ${EMAIL}`)
  console.log(`  password: ${PASSWORD}`)
}

async function state() {
  const user = await adminFindUser(EMAIL)
  if (!user) return console.log('no QA user yet — run create-user')
  const cols = 'id,role,onboarding_status,selected_path,stripe_customer_id'
  const [p] = await rest(`profiles?id=eq.${user.id}&select=${cols}`)
  const pays = await rest(`payments?profile_id=eq.${user.id}&select=kind,status,amount,currency,stripe_checkout_session_id,stripe_payment_intent_id,created_at&order=created_at.desc`)
  const subs = await rest(`subscriptions?profile_id=eq.${user.id}&select=status,stripe_subscription_id,current_period_end,cancel_at_period_end`)
  console.log('PROFILE:', JSON.stringify(p, null, 2))
  console.log('PAYMENTS:', JSON.stringify(pays, null, 2))
  console.log('SUBSCRIPTIONS:', JSON.stringify(subs, null, 2))
}

async function certify() {
  const user = await adminFindUser(EMAIL)
  if (!user) return console.log('no QA user yet — run create-user')
  await rest(`profiles?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ onboarding_status: 'certified' }) })
  console.log('profile set → onboarding_status=certified (subscribe button will now show on /billing)')
}

const cmd = process.argv[2]
if (cmd === 'create-user') await createUser()
else if (cmd === 'state') await state()
else if (cmd === 'certify') await certify()
else console.log('usage: node scripts/qa-stripe.mjs <create-user|state|certify>')
