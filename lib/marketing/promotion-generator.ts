// Promotion Package Generator v1 — deterministic, multi-channel, multilingual.
//
// Mirrors the OPE AI Layer philosophy (see scripts/ai-layer-ope.mjs and
// docs/ORGANIZER_MARKETING_AUTOMATION_V1.md): factual fields — date, location,
// price, organizer — are FROZEN. This v1 inserts them verbatim into channel
// templates (so facts can never drift); `assertFactsPreserved()` is the same
// guard a future LLM would have to pass before its output is accepted.
//
// No external APIs, no publishing — pure text generation.

export type PromotionLocale = 'en' | 'es' | 'fr' | 'ru' | 'de' | 'pt'

export const PROMOTION_CHANNELS = [
  'facebook',
  'instagram',
  'telegram',
  'whatsapp',
  'email',
  'ad',
  'description',
] as const
export type PromotionChannel = (typeof PROMOTION_CHANNELS)[number]

/** The frozen facts taken from the activity. Pre-formatted, locale-aware. */
export interface PromotionFacts {
  title: string
  description: string | null
  categoryLabel: string | null
  city: string | null
  country: string | null
  dateLabel: string | null // e.g. "Sat, 14 Jun" — already formatted, or null
  priceLabel: string | null // e.g. "$25" or localized "Free", or null
  organizerName: string
  url: string
  locale: PromotionLocale
}

export interface PromotionAssets {
  facebook: string
  instagram: string
  telegram: string
  whatsapp: string
  email: { subject: string; body: string }
  ad: string
  description: string
}

type Dict = {
  when: string
  where: string
  price: string
  host: string
  book: string
  spots: string
  message: string
  linkInBio: string
  invited: (t: string) => string
  hi: string
  intro: string
  reserve: string
  seeYou: string
  dontMiss: string
  hooks: string[] // variant openers, "{title}" placeholder
  ctas: string[] // variant CTAs
  tags: string[] // generic localized hashtags
}

const DICT: Record<PromotionLocale, Dict> = {
  en: {
    when: 'When', where: 'Where', price: 'Price', host: 'Hosted by',
    book: 'Book now', spots: 'Save your spot', message: 'Message us to book',
    linkInBio: 'Link in bio 👆',
    invited: (t) => `You're invited: ${t}`,
    hi: 'Hi there,', intro: 'Here are the details:', reserve: 'Reserve your spot',
    seeYou: 'See you there,', dontMiss: "Don't miss out!",
    hooks: ['✨ Join {title}', '🎉 {title} is happening!', "👋 Come to {title}"],
    ctas: ['Book now', 'Save your spot', 'Grab your place'],
    tags: ['#event', '#thingstodo', '#community'],
  },
  es: {
    when: 'Cuándo', where: 'Dónde', price: 'Precio', host: 'Organiza',
    book: 'Reserva ya', spots: 'Reserva tu plaza', message: 'Escríbenos para reservar',
    linkInBio: 'Enlace en la bio 👆',
    invited: (t) => `Estás invitado: ${t}`,
    hi: 'Hola,', intro: 'Estos son los detalles:', reserve: 'Reserva tu plaza',
    seeYou: 'Nos vemos,', dontMiss: '¡No te lo pierdas!',
    hooks: ['✨ Únete a {title}', '🎉 ¡Llega {title}!', '👋 Ven a {title}'],
    ctas: ['Reserva ya', 'Reserva tu plaza', 'Consigue tu lugar'],
    tags: ['#evento', '#planes', '#comunidad'],
  },
  fr: {
    when: 'Quand', where: 'Où', price: 'Prix', host: 'Organisé par',
    book: 'Réservez', spots: 'Réservez votre place', message: 'Écrivez-nous pour réserver',
    linkInBio: 'Lien dans la bio 👆',
    invited: (t) => `Vous êtes invité : ${t}`,
    hi: 'Bonjour,', intro: 'Voici les détails :', reserve: 'Réservez votre place',
    seeYou: 'À bientôt,', dontMiss: 'Ne manquez pas ça !',
    hooks: ['✨ Rejoignez {title}', '🎉 {title} arrive !', '👋 Venez à {title}'],
    ctas: ['Réservez', 'Réservez votre place', 'Prenez votre place'],
    tags: ['#événement', '#sortir', '#communauté'],
  },
  ru: {
    when: 'Когда', where: 'Где', price: 'Цена', host: 'Организатор',
    book: 'Записаться', spots: 'Забронируйте место', message: 'Напишите нам, чтобы записаться',
    linkInBio: 'Ссылка в профиле 👆',
    invited: (t) => `Приглашаем: ${t}`,
    hi: 'Здравствуйте!', intro: 'Подробности:', reserve: 'Забронируйте место',
    seeYou: 'До встречи,', dontMiss: 'Не пропустите!',
    hooks: ['✨ Присоединяйтесь: {title}', '🎉 Уже скоро: {title}', '👋 Приходите на {title}'],
    ctas: ['Записаться', 'Забронировать место', 'Занять место'],
    tags: ['#мероприятие', '#куда_пойти', '#сообщество'],
  },
  de: {
    when: 'Wann', where: 'Wo', price: 'Preis', host: 'Veranstaltet von',
    book: 'Jetzt buchen', spots: 'Sichere dir deinen Platz', message: 'Schreib uns zum Buchen',
    linkInBio: 'Link in der Bio 👆',
    invited: (t) => `Du bist eingeladen: ${t}`,
    hi: 'Hallo,', intro: 'Hier die Details:', reserve: 'Sichere dir deinen Platz',
    seeYou: 'Bis bald,', dontMiss: 'Verpass es nicht!',
    hooks: ['✨ Komm zu {title}', '🎉 {title} steht an!', '👋 Sei dabei bei {title}'],
    ctas: ['Jetzt buchen', 'Platz sichern', 'Sei dabei'],
    tags: ['#event', '#unternehmungen', '#community'],
  },
  pt: {
    when: 'Quando', where: 'Onde', price: 'Preço', host: 'Organização de',
    book: 'Reserva já', spots: 'Garante o teu lugar', message: 'Envia-nos mensagem para reservar',
    linkInBio: 'Link na bio 👆',
    invited: (t) => `Estás convidado: ${t}`,
    hi: 'Olá,', intro: 'Eis os detalhes:', reserve: 'Garante o teu lugar',
    seeYou: 'Até já,', dontMiss: 'Não percas!',
    hooks: ['✨ Junta-te a {title}', '🎉 {title} está a chegar!', '👋 Vem ao {title}'],
    ctas: ['Reserva já', 'Garante o teu lugar', 'Marca presença'],
    tags: ['#evento', '#oquefazer', '#comunidade'],
  },
}

const slug = (s: string) =>
  '#' + s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

function detailParts(f: PromotionFacts) {
  const loc = [f.city, f.country].filter(Boolean).join(', ') || null
  return { loc }
}

/** "📅 date · 📍 location · 💸 price" — only present facts. */
function inlineDetails(f: PromotionFacts, sep = ' · ') {
  const { loc } = detailParts(f)
  return [
    f.dateLabel ? `📅 ${f.dateLabel}` : null,
    loc ? `📍 ${loc}` : null,
    f.priceLabel ? `💸 ${f.priceLabel}` : null,
  ]
    .filter(Boolean)
    .join(sep)
}

/** Each detail on its own line (Instagram). */
function lineDetails(f: PromotionFacts) {
  return inlineDetails(f, '\n')
}

/** Labelled bullets (Telegram / email). */
function bulletDetails(f: PromotionFacts, L: Dict) {
  const { loc } = detailParts(f)
  return [
    f.dateLabel ? `• ${L.when}: ${f.dateLabel}` : null,
    loc ? `• ${L.where}: ${loc}` : null,
    f.priceLabel ? `• ${L.price}: ${f.priceLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function hashtags(f: PromotionFacts, L: Dict, n: number) {
  const tags: string[] = []
  if (f.categoryLabel) tags.push(slug(f.categoryLabel))
  if (f.city) tags.push(slug(f.city))
  for (const t of L.tags) if (!tags.includes(t)) tags.push(t)
  return tags.slice(0, n).join(' ')
}

const pick = <T,>(arr: T[], variant: number) => arr[((variant % arr.length) + arr.length) % arr.length]
const hook = (L: Dict, f: PromotionFacts, v: number) => pick(L.hooks, v).replace('{title}', f.title)

function fallbackDescription(f: PromotionFacts, L: Dict) {
  const { loc } = detailParts(f)
  const tail = [f.categoryLabel ? `— ${f.categoryLabel}` : '', loc ? `in ${loc}` : ''].filter(Boolean).join(' ')
  return `${f.title}${tail ? ' ' + tail : ''}. ${L.dontMiss}`.trim()
}

/**
 * Generate all seven channel assets for one activity, in one language.
 * `variant` lets "Regenerate" produce visibly different (but equally accurate)
 * copy without an LLM.
 */
export function generatePromotionAssets(facts: PromotionFacts, variant = 0): PromotionAssets {
  const L = DICT[facts.locale] ?? DICT.en
  const desc = facts.description?.trim() || fallbackDescription(facts, L)
  const cta = pick(L.ctas, variant)

  const facebook = [
    hook(L, facts, variant),
    desc,
    inlineDetails(facts),
    `👉 ${cta}: ${facts.url}`,
    hashtags(facts, L, 3),
  ]
    .filter(Boolean)
    .join('\n\n')

  const instagram = [
    hook(L, facts, variant + 1),
    desc,
    lineDetails(facts),
    L.linkInBio,
    hashtags(facts, L, 12),
  ]
    .filter(Boolean)
    .join('\n\n')

  const telegram = [
    `*${facts.title}*`,
    desc,
    bulletDetails(facts, L),
    `[${cta}](${facts.url})`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const whatsapp = [
    `👋 ${hook(L, facts, variant).replace(/^[^ ]+ /, '')}`,
    inlineDetails(facts),
    `${L.message}: ${facts.url}`,
  ]
    .filter(Boolean)
    .join('\n')

  const email = {
    subject: L.invited(facts.title),
    body: [
      L.hi,
      desc,
      L.intro,
      bulletDetails(facts, L) || inlineDetails(facts),
      `${L.reserve}: ${facts.url}`,
      `${L.seeYou}\n${facts.organizerName}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
  }

  const ad = [facts.title, desc.length > 120 ? desc.slice(0, 117).trimEnd() + '…' : desc, `${cta} →`]
    .filter(Boolean)
    .join('\n')

  const description = facts.description?.trim() || fallbackDescription(facts, L)

  const assets: PromotionAssets = { facebook, instagram, telegram, whatsapp, email, ad, description }
  assertFactsPreserved(facts, assets)
  return assets
}

/**
 * The frozen-field guard. Verifies that the factual fields appear verbatim in the
 * long-form channels and were never altered. Throws on any drift — the same
 * contract a future LLM-backed generator must satisfy before its output is used.
 */
export function assertFactsPreserved(facts: PromotionFacts, assets: PromotionAssets): void {
  const { loc } = detailParts(facts)
  // Channels that must carry the booking URL (Instagram intentionally uses link-in-bio).
  const urlChannels = [assets.facebook, assets.telegram, assets.whatsapp, assets.email.body]
  for (const text of urlChannels) {
    if (!text.includes(facts.url)) throw new Error('promotion guard: booking URL missing or altered')
  }
  // Where a fact is present it must appear unchanged in the detail-bearing channels.
  const detailChannels = [assets.facebook, assets.instagram, assets.telegram, assets.email.body]
  for (const text of detailChannels) {
    if (facts.dateLabel && !text.includes(facts.dateLabel)) throw new Error('promotion guard: date altered')
    if (facts.priceLabel && !text.includes(facts.priceLabel)) throw new Error('promotion guard: price altered')
    if (loc && !text.includes(loc)) throw new Error('promotion guard: location altered')
  }
}
