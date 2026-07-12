'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadOrganizerAvatar } from '@/lib/actions/profile'
import { Toaster, useToast } from '@/components/ui/Toast'
import { Camera } from 'lucide-react'

function initials(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'O'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Organizer profile photo — the identity/trust element shown on the public Organizer Page. Uploads on
 *  file select (reuses the venue-photos bucket + profiles.avatar_url), then refreshes so it appears at once. */
export default function AvatarUpload({ avatarUrl, displayName }: { avatarUrl: string | null; displayName: string | null }) {
  const router = useRouter()
  const { toasts, addToast, dismiss } = useToast()
  const [pending, setPending] = useState(false)

  async function handleFile(formData: FormData) {
    setPending(true)
    try {
      await uploadOrganizerAvatar(formData)
      addToast('success', 'Photo updated')
      router.refresh()
    } catch (e) {
      addToast('error', (e as Error)?.message || 'Upload failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Toaster toasts={toasts} onDismiss={dismiss} />
      <form action={handleFile} className="card mb-6 flex items-center gap-4 p-6">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
            {initials(displayName)}
          </span>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-900">Profile photo</p>
          <p className="mb-2 text-xs text-slate-400">Shown on your public organizer page. JPG or PNG, up to 5 MB.</p>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Camera className="h-4 w-4" aria-hidden />
            {pending ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="hidden"
              disabled={pending}
              onChange={(e) => { if (e.target.files?.length) e.currentTarget.form?.requestSubmit() }}
            />
          </label>
        </div>
      </form>
    </>
  )
}
