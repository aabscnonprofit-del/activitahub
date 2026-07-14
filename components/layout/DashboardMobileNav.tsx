'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

// Narrow-screen navigation. Below the `lg` breakpoint the permanent left sidebar is hidden, so
// this adds a hamburger (in the Dashboard top bar) that opens the EXISTING DashboardSidebar as a
// slide-over drawer. The sidebar is passed in as `children` — the same server-rendered component
// the desktop column uses — so desktop and mobile navigation always stay identical. No second nav
// structure, no route changes.
export function DashboardMobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close when navigation occurs (tapping a nav item routes, then the drawer closes).
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // While open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          {/* Overlay — clicking outside closes and returns to the current page. */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          {/* Slide-over panel holding the existing sidebar. */}
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 shadow-xl">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
