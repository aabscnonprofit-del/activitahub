'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, BellRing, Check, MapPin, Loader2 } from 'lucide-react'
import { CATEGORY_GROUPS, CATEGORIES_BY_GROUP } from '@/lib/categories'
import { ALERT_RADII_MILES } from '@/lib/alerts/constants'
import { saveAlertPreferences, savePushSubscription, removePushSubscription } from '@/lib/actions/alerts'
import { Toaster, useToast } from '@/components/ui/Toast'

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ru', label: 'Русский' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
]

type Initial = {
  categories: string[]
  language: string | null
  radiusMiles: number
  frequency: 'immediate' | 'daily_digest'
  city: string | null
  paused: boolean
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export default function NotificationPreferencesForm({
  locale,
  initial,
  pushSubscribed,
}: {
  locale: string
  initial: Initial
  pushSubscribed: boolean
}) {
  const t = useTranslations('alerts')
  const tMarket = useTranslations('marketplace')
  const { toasts, addToast, dismiss } = useToast()

  const [categories, setCategories] = useState<Set<string>>(new Set(initial.categories))
  const [language, setLanguage] = useState(initial.language || locale)
  const [radius, setRadius] = useState(initial.radiusMiles)
  const [frequency, setFrequency] = useState<'immediate' | 'daily_digest'>(initial.frequency)
  const [city, setCity] = useState(initial.city || '')
  const [paused, setPaused] = useState(initial.paused)
  const [saving, setSaving] = useState(false)

  const [subscribed, setSubscribed] = useState(pushSubscribed)
  const [pushBusy, setPushBusy] = useState(false)

  function toggle(cat: string) {
    setCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  async function save() {
    setSaving(true)
    try {
      const res = await saveAlertPreferences({
        categories: [...categories],
        language,
        radiusMiles: radius,
        frequency,
        city: city.trim() || null,
        paused,
      })
      addToast(res.ok ? 'success' : 'error', res.ok ? t('saved') : t('error'))
    } catch {
      addToast('error', t('error'))
    } finally {
      setSaving(false)
    }
  }

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      addToast('error', t('push.unsupported'))
      return
    }
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapid) {
      addToast('error', t('push.unsupported'))
      return
    }
    setPushBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        addToast('error', t('push.denied'))
        return
      }
      const reg = await navigator.serviceWorker.register('/push-sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      })
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      const res = await savePushSubscription({
        endpoint: json.endpoint || '',
        keys: { p256dh: json.keys?.p256dh || '', auth: json.keys?.auth || '' },
      })
      if (res.ok) {
        setSubscribed(true)
        addToast('success', t('push.enabled'))
      } else addToast('error', t('error'))
    } catch {
      addToast('error', t('error'))
    } finally {
      setPushBusy(false)
    }
  }

  async function disablePush() {
    setPushBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/push-sw.js')
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch {
      /* ignore */
    } finally {
      setPushBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Toaster toasts={toasts} onDismiss={dismiss} />

      {/* Categories */}
      <div className="card p-6">
        <h2 className="font-bold text-slate-900">{t('categories')}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{t('categoriesHint')}</p>
        <div className="mt-4 space-y-4">
          {CATEGORY_GROUPS.map((g) => (
            <div key={g}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                {tMarket(`groups.${g}.name` as 'groups.personal.name')}
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES_BY_GROUP[g].map((c) => {
                  const on = categories.has(c.key)
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggle(c.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        on
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {on && <Check className="h-3.5 w-3.5" />}
                      {tMarket(`categories.${c.key}` as 'categories.birthday')}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Location + language + distance + frequency */}
      <div className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className="label-base flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {t('city')}
          </label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className="input-base" placeholder="Honolulu" />
          <p className="mt-1 text-xs text-slate-400">{t('cityHint')}</p>
        </div>
        <div>
          <label className="label-base">{t('radius')}</label>
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="input-base">
            {ALERT_RADII_MILES.map((m) => (
              <option key={m} value={m}>
                {t('miles', { n: m })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-base">{t('language')}</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input-base">
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-base">{t('frequency')}</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'immediate' | 'daily_digest')}
            className="input-base"
          >
            <option value="immediate">{t('freq.immediate')}</option>
            <option value="daily_digest">{t('freq.daily_digest')}</option>
          </select>
        </div>
      </div>

      {/* Browser push */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            {subscribed ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">{t('push.title')}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{t('push.desc')}</p>
            <div className="mt-3">
              {subscribed ? (
                <button onClick={disablePush} disabled={pushBusy} className="btn-secondary text-sm">
                  {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t('push.enabled')} · {t('push.disable')}
                </button>
              ) : (
                <button onClick={enablePush} disabled={pushBusy} className="btn-primary text-sm">
                  {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                  {pushBusy ? t('push.enabling') : t('push.enable')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pause + consent + save */}
      <div className="card p-6">
        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          {t('pause')}
        </label>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">{t('consent')}</p>
        <button onClick={save} disabled={saving} className="btn-primary mt-4 w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  )
}
