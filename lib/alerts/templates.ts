// Localized copy for the activity-alert notification (in-app + web push).
// The category label is resolved (localized) by the caller and passed in.

type Loc = 'en' | 'es' | 'fr' | 'ru' | 'de' | 'pt'

const DICT: Record<Loc, { title: (cat: string, city: string | null) => string; body: string; digestTitle: (n: number) => string; digestBody: string }> = {
  en: {
    title: (c, city) => `New ${c} activity${city ? ` near ${city}` : ''}`,
    body: 'A new activity you might like — tap to view.',
    digestTitle: (n) => `${n} new ${n === 1 ? 'activity' : 'activities'} you might like`,
    digestBody: 'Tap to see what’s new near you.',
  },
  es: {
    title: (c, city) => `Nueva actividad de ${c}${city ? ` cerca de ${city}` : ''}`,
    body: 'Una nueva actividad que te puede interesar — toca para verla.',
    digestTitle: (n) => `${n} ${n === 1 ? 'nueva actividad' : 'nuevas actividades'} para ti`,
    digestBody: 'Toca para ver las novedades cerca de ti.',
  },
  fr: {
    title: (c, city) => `Nouvelle activité ${c}${city ? ` près de ${city}` : ''}`,
    body: 'Une nouvelle activité qui pourrait vous plaire — touchez pour voir.',
    digestTitle: (n) => `${n} ${n === 1 ? 'nouvelle activité' : 'nouvelles activités'} pour vous`,
    digestBody: 'Touchez pour voir les nouveautés près de chez vous.',
  },
  ru: {
    title: (c, city) => `Новая активность: ${c}${city ? ` рядом с ${city}` : ''}`,
    body: 'Новая активность для вас — нажмите, чтобы посмотреть.',
    digestTitle: (n) => `${n} новых активностей для вас`,
    digestBody: 'Нажмите, чтобы увидеть новинки рядом.',
  },
  de: {
    title: (c, city) => `Neue ${c}-Aktivität${city ? ` in der Nähe von ${city}` : ''}`,
    body: 'Eine neue Aktivität für dich — zum Ansehen tippen.',
    digestTitle: (n) => `${n} neue ${n === 1 ? 'Aktivität' : 'Aktivitäten'} für dich`,
    digestBody: 'Tippe, um Neues in deiner Nähe zu sehen.',
  },
  pt: {
    title: (c, city) => `Nova atividade de ${c}${city ? ` perto de ${city}` : ''}`,
    body: 'Uma nova atividade que podes gostar — toca para ver.',
    digestTitle: (n) => `${n} ${n === 1 ? 'nova atividade' : 'novas atividades'} para ti`,
    digestBody: 'Toca para ver as novidades perto de ti.',
  },
}

export function buildAlertNotification(locale: string, categoryLabel: string, city: string | null) {
  const T = DICT[(locale as Loc)] ?? DICT.en
  return { title: T.title(categoryLabel, city), body: T.body }
}

export function buildDigestNotification(locale: string, count: number) {
  const T = DICT[(locale as Loc)] ?? DICT.en
  return { title: T.digestTitle(count), body: T.digestBody }
}

const REMINDER: Record<Loc, { title: (t: string) => string; body: string }> = {
  en: { title: (t) => `Reminder: ${t}`, body: 'Your activity is coming up soon.' },
  es: { title: (t) => `Recordatorio: ${t}`, body: 'Tu actividad es muy pronto.' },
  fr: { title: (t) => `Rappel : ${t}`, body: 'Votre activité approche.' },
  ru: { title: (t) => `Напоминание: ${t}`, body: 'Ваша активность скоро начнётся.' },
  de: { title: (t) => `Erinnerung: ${t}`, body: 'Deine Aktivität steht bald an.' },
  pt: { title: (t) => `Lembrete: ${t}`, body: 'A tua atividade está a chegar.' },
}

export function buildReminderNotification(locale: string, activityTitle: string) {
  const T = REMINDER[(locale as Loc)] ?? REMINDER.en
  return { title: T.title(activityTitle), body: T.body }
}
