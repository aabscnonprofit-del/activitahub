'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Message } from '@/lib/types'

// ── Messaging actions (membership model, migration 028) ─────────────────────
// Thin wrappers over the SECURITY DEFINER RPCs (start_or_get_conversation /
// send_message / mark_conversation_read). Reads go through RLS-scoped selects.
// MVP uses context_type = 'request' only; the RPC enforces participation.

/** Resolve (creating if needed) the 1:1 conversation for a context + the other party. */
export async function startOrGetConversation(
  otherProfileId: string,
  contextType: string,
  contextId: string,
): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.rpc('start_or_get_conversation', {
    p_other_profile_id: otherProfileId,
    p_context_type: contextType,
    p_context_id: contextId,
  })
  if (error) return null
  return (data as string) ?? null
}

/**
 * Fetch a thread's messages for rendering, and mark it read for the caller. Returns
 * the conversation id (null if none exists yet) and the ordered messages. RLS scopes
 * both selects to the caller's own conversations.
 */
export async function getConversationThread(
  otherProfileId: string,
  contextType: string,
  contextId: string,
): Promise<{ conversationId: string | null; messages: Message[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { conversationId: null, messages: [] }

  // The conversation for this context whose members include the other party (and me, via RLS).
  const { data: convRow } = await supabase
    .from('conversations')
    .select('id, conversation_members!inner(profile_id)')
    .eq('context_type', contextType)
    .eq('context_id', contextId)
    .eq('conversation_members.profile_id', otherProfileId)
    .maybeSingle()

  const conversationId = (convRow?.id as string) ?? null
  if (!conversationId) return { conversationId: null, messages: [] }

  const { data: msgRows } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  // Viewing the thread clears unread for the caller (basic unread status).
  await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })

  return { conversationId, messages: (msgRows ?? []) as Message[] }
}

/**
 * Send a message (form action). Starts/looks up the conversation for the given
 * context + recipient, then posts the body. Empty bodies are ignored. Revalidates
 * the request surfaces so the new message appears.
 */
export async function sendMessage(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const otherProfileId = (formData.get('other_profile_id') as string) || ''
  const contextType = (formData.get('context_type') as string) || 'request'
  const contextId = (formData.get('context_id') as string) || ''
  const locale = (formData.get('locale') as string) || 'en'
  const body = ((formData.get('body') as string) || '').trim()
  if (!otherProfileId || !contextId || !body) return

  const conversationId = await startOrGetConversation(otherProfileId, contextType, contextId)
  if (!conversationId) return

  await supabase.rpc('send_message', { p_conversation_id: conversationId, p_body: body })

  revalidatePath(`/${locale}/requests/${contextId}`)
  revalidatePath(`/${locale}/dashboard/requests`)
}

/** Mark a conversation read for the current user (explicit, used where needed). */
export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
}
