// Shared Project Access store/resolver — the ONE place that creates, lists, resolves, revokes, removes, and
// re-tokens access relationships (migration 058). Token generation, token resolution, expiry, and revocation
// live here and nowhere else, so every access type (client / worker today; safety / … later) inherits the same
// hardened behaviour with no duplication.

import { randomBytes } from 'node:crypto'
import type { createClient } from '@/lib/supabase/server'
import { isActiveGrant, type AccessType, type ProjectAccessRow } from './model'

type ServerClient = Awaited<ReturnType<typeof createClient>>

const COLS = 'id, project_id, access_type, email, phone, account_id, invite_token, status, expires_at, revoked_at, metadata, created_at, updated_at'

/** The ONE invitation-token generator: a secure, unguessable, project-scoped token. */
export function generateInviteToken(): string {
  return randomBytes(24).toString('hex')
}

/** Create an access relationship (status invited). Owner RLS enforces ownership. */
export async function createAccessRelationship(
  supabase: ServerClient,
  args: {
    projectId: string
    accessType: AccessType
    email: string | null
    phone: string | null
    accountId?: string | null
    metadata?: Record<string, unknown>
    expiresAt?: string | null
  },
): Promise<ProjectAccessRow | null> {
  const { data } = await supabase
    .from('project_access')
    .insert({
      project_id: args.projectId,
      access_type: args.accessType,
      email: args.email,
      phone: args.phone,
      account_id: args.accountId ?? null,
      invite_token: generateInviteToken(),
      status: 'invited',
      expires_at: args.expiresAt ?? null,
      metadata: args.metadata ?? {},
    })
    .select(COLS)
    .single()
  return (data as ProjectAccessRow) ?? null
}

/** List a project's access relationships of one type (owner RLS). */
export async function listAccessByType(supabase: ServerClient, projectId: string, accessType: AccessType): Promise<ProjectAccessRow[]> {
  const { data } = await supabase
    .from('project_access')
    .select(COLS)
    .eq('project_id', projectId)
    .eq('access_type', accessType)
    .order('created_at', { ascending: true })
  return (data as ProjectAccessRow[]) ?? []
}

/**
 * THE token-access choke point: resolve a relationship by token and return it ONLY if it is an active grant
 * (not revoked, not expired at `nowIso`). Everything token-scoped (Views + confirmations) goes through here.
 */
export async function resolveActiveByToken(admin: ServerClient, token: string, nowIso: string): Promise<ProjectAccessRow | null> {
  const { data } = await admin.from('project_access').select(COLS).eq('invite_token', token).maybeSingle()
  const row = (data as ProjectAccessRow) ?? null
  if (!row || !isActiveGrant(row, nowIso)) return null
  return row
}

/** Revoke access — the ONE revocation path (status revoked + revoked_at). Scoped to the project (owner RLS). */
export async function revokeAccess(supabase: ServerClient, projectId: string, id: string, revokedAtIso: string): Promise<boolean> {
  const { error } = await supabase.from('project_access').update({ status: 'revoked', revoked_at: revokedAtIso }).eq('id', id).eq('project_id', projectId)
  return !error
}

/** Detach a relationship (owner RLS). */
export async function removeAccess(supabase: ServerClient, projectId: string, id: string): Promise<boolean> {
  const { error } = await supabase.from('project_access').delete().eq('id', id).eq('project_id', projectId)
  return !error
}

/** Resend: issue a fresh project-scoped token and re-activate (old link stops resolving). Owner RLS. */
export async function regenerateToken(supabase: ServerClient, projectId: string, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('project_access')
    .update({ invite_token: generateInviteToken(), status: 'invited', revoked_at: null })
    .eq('id', id)
    .eq('project_id', projectId)
  return !error
}

/** Merge type-specific metadata onto a relationship by id (e.g. a worker's work confirmation). */
export async function setAccessMetadata(client: ServerClient, id: string, metadata: Record<string, unknown>): Promise<boolean> {
  const { error } = await client.from('project_access').update({ metadata }).eq('id', id)
  return !error
}
