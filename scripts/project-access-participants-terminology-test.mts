// Project Access vs Participants — terminology separation contract test.
//
// Two DISTINCT concepts must read distinctly in the organizer workspace:
//   Participants   = people who JOINED the activity (project_participants, 061).
//   Project Access = people invited to VIEW / collaborate on the Project via access links (project_access).
// This test asserts the terminology no longer collides — the access section is "Project Access" and does not
// label access recipients as "Participants". Source analysis only; asserts NO architecture change.
//
//   Run:  npx tsx scripts/project-access-participants-terminology-test.mts

import { readFileSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
const workspace = read('../app/[locale]/dashboard/projects/[projectId]/page.tsx')
const accessPanel = read('../components/projects/ParticipantAccessPanel.tsx')

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`)
  else { failures++; console.log(`  FAIL ${name}`) }
}

// 1. Participants section (061) — the JOINED roster; "Participants" means only people who joined.
check('workspace has a Participants section (the join roster)', workspace.includes('>Participants</h2>') && workspace.includes('<ParticipantsRosterPanel'))
check('"Participants" refers to people who joined the activity', /People who joined this activity/.test(workspace))
check('exactly ONE "Participants" heading (only the roster carries it)', (workspace.match(/>Participants<\/h2>/g) ?? []).length === 1)

// 2. Project Access section — the permission / view-sharing model, clearly separate.
check('workspace has a clearly separate Project Access section', workspace.includes('>Project Access</h2>'))
check('Project Access is framed as view/collaborate access, separate from Participants',
  /invite to view or collaborate/i.test(workspace) && /separate from[\s\S]{0,40}Participants/i.test(workspace))
check('the participant-type access panel is NO LONGER labeled "Participants"', workspace.includes('>Guest Access</h2>'))

// 3. The access panel does not label access recipients as activity Participants (user-facing copy).
check('access panel: empty state is access-worded, not "participants"', accessPanel.includes('No access granted yet') && !accessPanel.includes('No participants attached'))
check('access panel: recipient fallback is "Guest", not "Participant"', accessPanel.includes("|| 'Guest'") && !accessPanel.includes("|| 'Participant'"))
check('access panel: "access link" not "invite link"', accessPanel.includes('Copy access link') && !accessPanel.includes('Copy invite link'))
check('access panel: "Grant access" not "Add participant"', accessPanel.includes('Grant access') && !accessPanel.includes('>Add participant<'))
check('access panel: input placeholder is not participant-labeled', accessPanel.includes('placeholder="Guest email"') && !accessPanel.includes('placeholder="Participant email"'))

// 4. Architecture unchanged — the shared access LOGIC/identifiers are intact (only UI copy changed).
check('shared access layer logic unchanged (still uses the same access server actions)',
  accessPanel.includes('addParticipantAction') && accessPanel.includes('revokeParticipantAction') && accessPanel.includes('regenerateParticipantLinkAction'))
check('access route unchanged (project-scoped /participant/[token] access link)', accessPanel.includes('/participant/${token}'))

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
