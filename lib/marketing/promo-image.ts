// Promo Image Generator v1 — deterministic, server-side SVG.
//
// Renders branded promotional images from the SAME frozen facts as the text
// generator (no invented facts; date/location/price/organizer verbatim). SVG is
// rasterised to PNG client-side on download, so there are no native deps, no
// font buffers and no external/paid services. System fonts cover the long
// German / Portuguese / Russian strings.

import type { PromotionFacts, PromotionLocale } from './promotion-generator'

export type PromoImageFormat = 'square' | 'story' | 'wide'

export interface PromoImageSpec {
  format: PromoImageFormat
  width: number
  height: number
}

export const PROMO_IMAGE_FORMATS: PromoImageSpec[] = [
  { format: 'square', width: 1080, height: 1080 }, // Instagram / Facebook feed
  { format: 'story', width: 1080, height: 1920 }, // IG / FB stories
  { format: 'wide', width: 1200, height: 628 }, // FB / X / link preview
]

export function getPromoImageSpec(format: string): PromoImageSpec | null {
  return PROMO_IMAGE_FORMATS.find((s) => s.format === format) ?? null
}

interface ImgDict {
  when: string
  where: string
  price: string
  hostedBy: string
  cta: string
}

const IMG_DICT: Record<PromotionLocale, ImgDict> = {
  en: { when: 'When', where: 'Where', price: 'Price', hostedBy: 'Hosted by', cta: 'Book now' },
  es: { when: 'Cuándo', where: 'Dónde', price: 'Precio', hostedBy: 'Organiza', cta: 'Reserva ya' },
  fr: { when: 'Quand', where: 'Où', price: 'Prix', hostedBy: 'Organisé par', cta: 'Réservez' },
  ru: { when: 'Когда', where: 'Где', price: 'Цена', hostedBy: 'Организатор', cta: 'Записаться' },
  de: { when: 'Wann', where: 'Wo', price: 'Preis', hostedBy: 'Veranstaltet von', cta: 'Jetzt buchen' },
  pt: { when: 'Quando', where: 'Onde', price: 'Preço', hostedBy: 'Organização de', cta: 'Reserva já' },
}

const FONT =
  'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'

// Brand palette (from tailwind.config.ts).
const INK = '#0f172a'
const WHITE = '#ffffff'
const ACCENT = '#fcd34d' // amber-300
const ACCENT2 = '#fbbf24' // amber-400
const BRAND_FROM = '#4f46e5' // brand-600
const BRAND_TO = '#312e81' // brand-900

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (let w of words) {
    if (lines.length >= maxLines) break
    if (w.length > maxChars) {
      if (cur) {
        lines.push(cur)
        cur = ''
      }
      while (w.length > maxChars && lines.length < maxLines) {
        lines.push(w.slice(0, maxChars - 1) + '-')
        w = w.slice(maxChars - 1)
      }
      cur = w
      continue
    }
    const t = cur ? cur + ' ' + w : w
    if (t.length <= maxChars) cur = t
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  // Ellipsis if the title was truncated.
  if (lines.length === maxLines) {
    const used = lines.join(' ').split(/\s+/).length
    if (used < words.length) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'
  }
  return lines
}

type TextOpts = {
  size: number
  weight?: number
  fill?: string
  anchor?: 'start' | 'middle'
  ls?: number
}

function text(x: number, y: number, s: string, o: TextOpts): string {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${o.size}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? WHITE}" text-anchor="${o.anchor ?? 'start'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${esc(s)}</text>`
}

function detail(x: number, y: number, label: string, value: string, size: number): string {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"><tspan fill="${ACCENT}" font-weight="700">${esc(label)}:  </tspan><tspan fill="${WHITE}" font-weight="600">${esc(value)}</tspan></text>`
}

/** Build one promotional image as an SVG document string. */
export function buildPromoImageSVG(facts: PromotionFacts, format: PromoImageFormat): string {
  const spec = getPromoImageSpec(format) ?? PROMO_IMAGE_FORMATS[0]
  const { width: W, height: H } = spec
  const L = IMG_DICT[facts.locale] ?? IMG_DICT.en

  const pad = format === 'wide' ? 72 : Math.round(W * 0.08)
  const titleSize = format === 'wide' ? 66 : format === 'story' ? 88 : 78
  const body = format === 'wide' ? 32 : 38
  const maxTitleLines = format === 'wide' ? 2 : 3
  const brandSize = Math.round(W * 0.03)

  const loc = [facts.city, facts.country].filter(Boolean).join(', ')
  const els: string[] = []

  // Top wordmark + accent underline.
  els.push(text(pad, pad + brandSize, 'ActivLife Hub', { size: brandSize, weight: 800, fill: WHITE }))
  els.push(`<rect x="${pad}" y="${pad + brandSize + 14}" width="${Math.round(brandSize * 2.4)}" height="6" rx="3" fill="${ACCENT2}"/>`)

  // Category eyebrow.
  let y = format === 'wide' ? pad + brandSize + 70 : Math.round(H * 0.2)
  if (facts.categoryLabel) {
    els.push(text(pad, y, facts.categoryLabel.toUpperCase(), { size: Math.round(body * 0.82), weight: 700, fill: ACCENT, ls: 2 }))
    y += Math.round(body * 1.4)
  }

  // Title (wrapped).
  const maxChars = Math.floor((W - 2 * pad) / (titleSize * 0.56))
  const lines = wrap(facts.title, maxChars, maxTitleLines)
  y += titleSize
  for (const ln of lines) {
    els.push(text(pad, y, ln, { size: titleSize, weight: 800, fill: WHITE }))
    y += Math.round(titleSize * 1.12)
  }

  // Detail rows (only present facts).
  y += Math.round(body * 0.6)
  const rows: [string, string][] = []
  if (facts.dateLabel) rows.push([L.when, facts.dateLabel])
  if (loc) rows.push([L.where, loc])
  if (facts.priceLabel) rows.push([L.price, facts.priceLabel])
  for (const [lab, val] of rows) {
    els.push(detail(pad, y, lab, val, body))
    y += Math.round(body * 1.5)
  }

  // CTA button (flows under details).
  y += Math.round(body * 0.6)
  const ctaH = Math.round(body * 2.0)
  const ctaW = Math.min(W - 2 * pad, Math.round(L.cta.length * body * 0.62) + Math.round(body * 1.8))
  els.push(`<rect x="${pad}" y="${y}" width="${ctaW}" height="${ctaH}" rx="${Math.round(ctaH / 2)}" fill="${ACCENT2}"/>`)
  els.push(text(pad + ctaW / 2, y + Math.round(ctaH * 0.66), L.cta, { size: body, weight: 800, fill: INK, anchor: 'middle' }))
  const ctaBottom = y + ctaH

  // Footer: hosted by — pinned to the bottom, but never overlapping the CTA on
  // the short wide format.
  const footerY = Math.min(Math.max(H - pad, ctaBottom + Math.round(body * 1.3)), H - 24)
  els.push(text(pad, footerY, `${L.hostedBy} ${facts.organizerName}`, { size: Math.round(body * 0.82), weight: 600, fill: '#e9e9ff' }))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND_FROM}"/>
      <stop offset="1" stop-color="${BRAND_TO}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${Math.round(W * 0.92)}" cy="${Math.round(H * 0.08)}" r="${Math.round(W * 0.34)}" fill="${ACCENT}" opacity="0.10"/>
  <circle cx="${Math.round(W * 0.08)}" cy="${H}" r="${Math.round(W * 0.28)}" fill="${ACCENT2}" opacity="0.08"/>
  ${els.join('\n  ')}
</svg>`
}
