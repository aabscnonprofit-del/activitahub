import { routing } from './routing'

// Single source of truth for supported locales (en, es, fr, ru, de, pt).
const LOCALE_SET: ReadonlySet<string> = new Set(routing.locales)

/**
 * Replace the first path segment with `nextLocale` **iff** it is a supported
 * locale; otherwise prepend `nextLocale`. Path-only (no query/hash — the caller
 * appends those). Pure and deterministic.
 *
 * Rules (see locale switcher):
 *   /ru            + de  -> /de
 *   /pt            + pt  -> /pt
 *   /ru/planner    + en  -> /en/planner
 *   /en/about      + fr  -> /fr/about
 *   /about (no loc)+ ru  -> /ru/about      (prepend, do NOT append)
 *   /              + ru  -> /ru
 */
export function replaceLocaleInPath(pathname: string, nextLocale: string): string {
  // Capture the first segment and the (optional) remainder: /<seg>(/...rest)?
  const match = pathname.match(/^\/([^/]+)(\/.*)?$/)
  if (match && LOCALE_SET.has(match[1])) {
    // First segment is a locale → replace it, keep the remainder.
    const rest = match[2] ?? ''
    return `/${nextLocale}${rest}`
  }
  // No locale prefix → prepend the locale to the current path (normalise root).
  const rest = pathname === '/' ? '' : pathname
  return `/${nextLocale}${rest}`
}
