'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

// Small client helper: copy an absolute URL (origin + path) to the clipboard and
// show a brief "Copied" state. Used by the organizer Invoices panel to share the
// public invoice payment link.
export default function CopyLinkButton({
  path,
  label,
  copiedLabel,
}: {
  path: string
  label: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // Clipboard unavailable (e.g. insecure context) — silently no-op.
        }
      }}
      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
    >
      {copied ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
      {copied ? copiedLabel : label}
    </button>
  )
}
