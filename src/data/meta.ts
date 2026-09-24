import { LOCALE } from '@/i18n'

/**
 * Date d'arrêté du corpus : l'état du droit (transpositions, dates de
 * promulgation) décrit dans les données. Elle ne suit volontairement pas
 * l'horloge : un texte transposé demain rendrait « au <aujourd'hui> » faux.
 * Tout ce qui dépend de la date du jour (délais, échéances, dates des
 * rapports) est calculé à partir de l'horloge du système.
 */
export const CORPUS_DATE = '2026-09-24'

export const CORPUS_DATE_LONG = new Date(CORPUS_DATE).toLocaleDateString(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
