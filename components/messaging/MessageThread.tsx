import { getTranslations } from 'next-intl/server'
import { MessageCircle } from 'lucide-react'
import { getConversationThread, sendMessage } from '@/lib/actions/messages'
import type { Locale } from '@/lib/types'

// Shared 1:1 message thread (membership model, migration 028). Self-contained async
// server component: fetches its own thread for (contextType, contextId, otherProfileId),
// marks it read for the viewer, renders the history, and a send form. MVP context = 'request'.

interface Props {
  contextType: 'request'
  contextId: string
  otherProfileId: string
  currentUserId: string
  locale: Locale
  /** Display name of the other party, if known. */
  otherName?: string | null
}

export default async function MessageThread({
  contextType, contextId, otherProfileId, currentUserId, locale, otherName,
}: Props) {
  const t = await getTranslations('messages')
  const { messages } = await getConversationThread(otherProfileId, contextType, contextId)

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
        <MessageCircle className="h-4 w-4" />
        {otherName ? t('titleWith', { name: otherName }) : t('title')}
      </p>

      {messages.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">{t('empty')}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {messages.map((m) => {
            const mine = m.sender_id === currentUserId
            return (
              <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    'max-w-[80%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ' +
                    (mine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700')
                  }
                >
                  <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide opacity-70">
                    {mine ? t('you') : (otherName ?? t('them'))}
                  </span>
                  {m.body}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <form action={sendMessage} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="context_type" value={contextType} />
        <input type="hidden" name="context_id" value={contextId} />
        <input type="hidden" name="other_profile_id" value={otherProfileId} />
        <textarea
          name="body"
          rows={2}
          required
          placeholder={t('placeholder')}
          className="input-base flex-1 resize-none"
        />
        <button className="btn-primary shrink-0">{t('send')}</button>
      </form>
    </div>
  )
}
