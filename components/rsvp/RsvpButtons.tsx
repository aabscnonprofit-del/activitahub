'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, HelpCircle, X, Loader2 } from 'lucide-react'
import { respondToRsvp } from '@/lib/actions/participants'

const OPTIONS: { key: 'confirmed' | 'maybe' | 'declined'; icon: typeof Check; cls: string }[] = [
  { key: 'confirmed', icon: Check, cls: 'bg-emerald-600 hover:bg-emerald-500' },
  { key: 'maybe', icon: HelpCircle, cls: 'bg-amber-500 hover:bg-amber-400' },
  { key: 'declined', icon: X, cls: 'bg-slate-600 hover:bg-slate-500' },
]

export default function RsvpButtons({ token, initialStatus }: { token: string; initialStatus: string }) {
  const t = useTranslations('rsvp')
  const [status, setStatus] = useState(initialStatus)
  const [busy, setBusy] = useState<string | null>(null)

  async function respond(r: 'confirmed' | 'maybe' | 'declined') {
    setBusy(r)
    try {
      const res = await respondToRsvp(token, r)
      if (res.ok && res.status) setStatus(res.status)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {OPTIONS.map(({ key, icon: Icon, cls }) => (
          <button
            key={key}
            onClick={() => respond(key)}
            disabled={!!busy}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white transition-colors ${cls} ${
              status === key ? 'ring-2 ring-slate-900 ring-offset-2' : ''
            }`}
          >
            {busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {t(`respond.${key}` as 'respond.confirmed')}
          </button>
        ))}
      </div>
      {status && status !== 'invited' && (
        <p className="mt-4 text-center text-sm font-medium text-slate-600">
          {t('current', { status: t(`status.${status}` as 'status.confirmed') })}
        </p>
      )}
    </div>
  )
}
