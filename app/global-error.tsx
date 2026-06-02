'use client'

import { useEffect } from 'react'

/**
 * Last-resort boundary — replaces the root layout if it (or the i18n provider)
 * fails, so there are no providers/styles to rely on. Intentionally minimal and
 * English-only; the localized boundary above handles the common case.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error-boundary]', error?.digest ?? '', error?.message)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#f8fafc',
          color: '#0f172a',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: '#64748b', maxWidth: '28rem', margin: 0 }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            cursor: 'pointer',
            borderRadius: '0.75rem',
            border: 'none',
            background: '#4f46e5',
            color: 'white',
            padding: '0.625rem 1.5rem',
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
