// Arrival Coordination (MVP) — contract test.
//
// A lightweight social coordination layer: approved participants say "need a ride / offer a ride" (+ optional
// ZIP/area, seats, note). Organizer + approved participants see a SAFE summary (counts + ZIP/seats/note only);
// public visitors see nothing. Only approved participants submit; Ticket System never read. NOT transportation:
// no maps/exact address/phone/payment/matching. Source analysis. Reads source only.
//
//   Run:  npx tsx scripts/arrival-preferences-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const mig = read('../supabase/migrations/068_participant_arrival_preferences.sql')
const store = read('../lib/arrival/store.ts')
const action = read('../lib/actions/arrival-preference.ts')
const comp = read('../components/activities/ArrivalCoordination.tsx')
const page = read('../app/[locale]/p/[projectId]/page.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Storage — minimal fields; one per participant per project; no PII columns (phone/email/address).
check('participant_arrival_preferences table created (idempotent)', mig.includes('CREATE TABLE IF NOT EXISTS participant_arrival_preferences'))
check('minimal fields present (needs_ride/can_offer_ride/pickup_zip/seats_available/note/occurrence_id)',
  ['needs_ride', 'can_offer_ride', 'pickup_zip', 'seats_available', 'note', 'occurrence_id'].every((c) => mig.includes(c)))
check('one preference per participant per project (PK project_id, account_id)', mig.includes('PRIMARY KEY (project_id, account_id)'))
check('no phone/email/exact-address columns', !/\b(phone|email|address|latitude|longitude|geo)\b/i.test(mig.replace(/--.*$/gm, '')))

// 2. Permissions (RLS) — approved-participant self-write; owner OR approved read; never public.
check('write requires own row + approved participant', mig.includes('pap_self_write') && mig.includes('account_id = auth.uid()') && mig.includes("pp.status = 'approved'"))
check('read = owner OR approved participant (never public)', mig.includes('pap_read') && mig.includes('p.owner_id = auth.uid()') && mig.includes("pp.status = 'approved'"))
check('no public/anon read policy', !/USING \(true\)|is_published = TRUE/.test(mig))

// 3. Action — approved-participant only; never reads the Ticket System; validates, no matching.
check('setArrivalPreferenceAction requires an approved participant', action.includes("error: 'not_approved'") && action.includes("mine?.status !== 'approved'"))
check('action never reads the Ticket System', !/ticket/i.test(action.replace(/\/\/.*$/gm, '')))
check('action validates length/seats (no free-form address/phone capture)', action.includes('ARRIVAL_ZIP_MAX') && action.includes('ARRIVAL_SEATS_MAX') && action.includes('ARRIVAL_NOTE_MAX'))

// 4. Store — own preference + SAFE summary (counts + zip/seats/note; no identity/PII).
check('store reads own preference + upserts one per (project, account)', store.includes('getArrivalPreference') && store.includes("onConflict: 'project_id,account_id'"))
check('summary = counts + safe entries (zip/seats/note only, no name/PII)',
  store.includes('needsRideCount') && store.includes('canOfferRideCount') && !/full_name|email|phone|display_name|getParticipantProfiles/.test(store.replace(/\/\/.*$/gm, '')))

// 5. Display — "Getting there", checkboxes, safety copy; NO maps/exact-address/phone/payment/matching.
check('"Getting there" section with need/offer choices', comp.includes('Getting there') && comp.includes('I need a ride') && comp.includes('I can offer a ride'))
check('safety copy present (not transportation/insurance/payment)', comp.includes('does not provide transportation, drivers, insurance, or payment handling'))
// Target IMPLEMENTATION tokens (map libraries, payment integration, tel input, matching engine) — the words
// map/phone/payment/address appear only in the safety copy + placeholders (as negations), so bare words are not
// evidence of implementation.
check('no maps/payment/phone-input/matching implementation',
  !/leaflet|mapbox|google.?maps|<GoogleMap|react-map|stripe|createCheckout|<input[^>]*type="tel"|autoMatch|auto-match|matchRides|matchingEngine|streetAddress|geocod/i.test(comp.replace(/\/\/.*$/gm, '')))
check('collects no exact address / phone field (zip + note + seats only)',
  !/type="tel"|placeholder="[^"]*street[^"]*"|name="phone"|name="address"/i.test(comp))

// 6. Wiring — only in the CURRENT (non-archive) activity, only for owner/approved (never public).
check('rendered only in the current activity, gated to owner/approved',
  page.includes('!showArchive && (isOwner || isApprovedParticipant)') && page.includes('<ArrivalCoordination'))
check('public visitors never load it (showArrival gate)', page.includes('showArrival ? await getArrivalSummary(projectId) : null'))

// 7. No new lifecycle / entity beyond the minimal preference table.
check('no lifecycle/status changes introduced', !/lifecycle|project_status|advanceStage|current_step/i.test(action + store))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
