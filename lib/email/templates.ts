// Email templates — renders one queued notification into a branded, responsive ActivLife Hub email.
// Reuses the existing localization approach (a per-locale dictionary, like lib/alerts/templates.ts)
// so emails follow the recipient's preferred_locale. The email's SUBJECT is the notification's title
// (already meaningful, built when the notification was created); the body presents it with a single
// call-to-action into the app. It invents no new copy per notification type and no new concepts.

import { absoluteUrl } from '@/lib/utils'

type Loc = 'en' | 'de' | 'es' | 'fr' | 'pt' | 'ru'
const LOCALES: readonly Loc[] = ['en', 'de', 'es', 'fr', 'pt', 'ru']

function asLocale(l: string | null | undefined): Loc {
  const s = (l ?? '').slice(0, 2).toLowerCase()
  return (LOCALES as readonly string[]).includes(s) ? (s as Loc) : 'en'
}

const DICT: Record<Loc, { cta: string; footer: string; heading: string }> = {
  en: { cta: 'Open ActivLife Hub', footer: 'You received this email from ActivLife Hub.', heading: 'You have a new update' },
  de: { cta: 'ActivLife Hub öffnen', footer: 'Sie haben diese E-Mail von ActivLife Hub erhalten.', heading: 'Sie haben eine neue Mitteilung' },
  es: { cta: 'Abrir ActivLife Hub', footer: 'Has recibido este correo de ActivLife Hub.', heading: 'Tienes una novedad' },
  fr: { cta: 'Ouvrir ActivLife Hub', footer: 'Vous avez reçu cet e-mail d’ActivLife Hub.', heading: 'Vous avez une nouveauté' },
  pt: { cta: 'Abrir o ActivLife Hub', footer: 'Você recebeu este e-mail do ActivLife Hub.', heading: 'Você tem uma novidade' },
  ru: { cta: 'Открыть ActivLife Hub', footer: 'Вы получили это письмо от ActivLife Hub.', heading: 'У вас новое уведомление' },
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

/** The link the CTA points to: a same-origin path from the payload (url/href), else the notifications page. */
function ctaHref(locale: Loc, payload: Record<string, unknown>): string {
  const raw = typeof payload.url === 'string' ? payload.url : typeof payload.href === 'string' ? payload.href : null
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return absoluteUrl(raw)
  return absoluteUrl(`/${locale}/notifications`)
}

/**
 * Render a queued email. Returns the subject (the notification title) and a branded, responsive,
 * inline-styled HTML body (table layout for email-client compatibility, max-width 600px).
 */
export function renderEmail(
  localeInput: string | null | undefined,
  subject: string,
  payload: Record<string, unknown>,
): { subject: string; html: string } {
  const locale = asLocale(localeInput)
  const t = DICT[locale]
  const href = ctaHref(locale, payload)
  const title = escapeHtml(subject || t.heading)
  const brand = '#4f46e5'

  const html = `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr><td style="padding:20px 28px;border-bottom:1px solid #e2e8f0;">
            <span style="font-size:18px;font-weight:800;color:#0f172a;">ActivLife<span style="color:${brand};">Hub</span></span>
          </td></tr>
          <tr><td style="padding:28px;">
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:800;color:#0f172a;">${title}</h1>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:${brand};">
              <a href="${href}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(t.cta)}</a>
            </td></tr></table>
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
            ${escapeHtml(t.footer)}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  return { subject: subject || t.heading, html }
}
