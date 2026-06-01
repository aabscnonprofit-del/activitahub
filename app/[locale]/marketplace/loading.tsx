/**
 * Marketplace route-level loading skeleton (Next.js streaming fallback).
 * Mirrors the page's filter + results grid so navigation feels instant.
 */
export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-200" />

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          {/* Filters skeleton */}
          <div className="hidden h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="mb-2 h-3 w-20 animate-pulse rounded bg-slate-200" />
                <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>

          {/* Cards skeleton */}
          <div>
            <div className="mb-4 h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="aspect-[3/2] animate-pulse bg-slate-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                    <div className="mt-3 flex items-center justify-between">
                      <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
