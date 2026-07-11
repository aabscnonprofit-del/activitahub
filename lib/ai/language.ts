// Route-locale → AI language directive. The public Planner runs under a localized route
// (/[locale]/plan-an-event); every user-visible AI output — the Discovery interpretation,
// directions and questions, and the "what should happen" draft — must be written in the
// visitor's language, not English. This maps the route locale to a system-message directive
// the AI functions prepend; English (the default) needs none. It changes only the OUTPUT
// language: the JSON structure, field names and planning behavior are untouched.
//
// Note: this governs the AI path only. The deterministic fallbacks (assessRequest, the
// deterministic "what should happen" composer) remain in their base language — they are
// template text, not model output, and localizing them is a separate translation effort.

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  ru: 'Russian',
}

/** The natural-language name for a route locale (defaults to English for unknown/absent). */
export function languageName(locale?: string | null): string {
  return LANGUAGE_NAMES[(locale ?? '').slice(0, 2).toLowerCase()] ?? 'English'
}

/**
 * A system-message directive telling the model to answer in the route language, or null when
 * the language is English/unknown (no directive needed). Prepend it as an extra system message.
 */
export function languageDirective(locale?: string | null): string | null {
  const name = languageName(locale)
  if (name === 'English') return null
  return (
    `Respond in ${name}. Write EVERY natural-language field you return (for example ` +
    `interpretation, directions, discoveryQuestions, whatShouldHappenDraft, and any narrative ` +
    `text) in ${name}, regardless of the language the request is written in. Do NOT change the ` +
    `JSON structure, the field names, or any enum/status value — translate only the human-readable text.`
  )
}
