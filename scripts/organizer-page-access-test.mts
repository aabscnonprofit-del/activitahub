// Organizer Public Page access (Wave 1 polish) — saving the organizer profile PUBLISHES it so the public
// page is reachable (root cause of the 404: the public-page RPCs require organizer_profiles.status =
// 'published', but nothing ever set it, so profiles stayed 'draft' forever). The profile UI states the
// publication clearly, and the organizer can set a public avatar photo.
//
//   Run:  npx tsx scripts/organizer-page-access-test.mts

import { readFileSync } from 'node:fs'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

const root = new URL('../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')

const action = read('lib/actions/profile.ts')
const form = read('components/dashboard/ProfileForm.tsx')
const page = read('app/[locale]/dashboard/profile/page.tsx')
const avatar = read('components/dashboard/AvatarUpload.tsx')
const slug015 = read('supabase/migrations/015_organizer_slugs.sql')

// ── Root cause: the public-page RPCs gate on status='published' ────────────────────────────────
check('public-page RPC requires organizer_profiles.status = published (the gate)',
  slug015.includes("op.slug = p_slug AND op.status = 'published'"))

// ── Fix #1: saving the profile publishes it (so the page resolves), never self-unsuspending ─────
check('saving the profile sets status = published', action.includes("payload.status = 'published'"))
check('publish is guarded — an admin-suspended profile is never self-unsuspended',
  /status[\s\S]{0,40}!== 'suspended'/.test(action) && action.includes("select('status')"))

// ── Fix #2: the publication state is clear + refreshes after save ───────────────────────────────
check('profile form shows the page is public when published',
  form.includes("initialProfile?.status === 'published'") && form.includes('is public'))
check('profile form shows a save-to-publish prompt when not yet published', form.includes('Save to publish'))
check('form refreshes after save so the state updates immediately', form.includes('router.refresh()') && form.includes('useRouter'))

// ── Fix #3: avatar upload — reuses existing storage + profiles.avatar_url, no new persistence ────
check('avatar upload action exists', action.includes('export async function uploadOrganizerAvatar'))
check('avatar reuses the existing venue-photos bucket under the owner folder',
  action.includes("storage\n") || action.includes(".from('venue-photos')"))
check('avatar upload path is owner-scoped (RLS: first segment = user id)', action.includes('`${user.id}/avatar-'))
check('avatar url is stored on profiles.avatar_url (owner-updatable)',
  action.includes("from('profiles').update({ avatar_url:"))
check('avatar upload validates image type + size', action.includes("file.type.startsWith('image/')") && action.includes('5 * 1024 * 1024'))
check('AvatarUpload is wired into the profile page', page.includes('<AvatarUpload') && page.includes('avatar_url'))
check('avatar has an initials fallback when no photo', avatar.includes('initials(displayName)'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
