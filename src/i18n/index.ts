/**
 * Langue de l'interface.
 *
 * La langue est lue une fois, au chargement : les données réglementaires,
 * les moteurs et les rapports sont ainsi produits directement dans la bonne
 * langue, sans abonnement ni rendu conditionnel. Changer de langue recharge
 * la page ; l'état de travail est conservé par le serveur local.
 *
 * Hors navigateur (tests, génération de la démonstration), la langue de
 * référence est le français.
 */

export type Lang = 'fr' | 'en'

const STORAGE_KEY = 'scopeo:lang'

function detect(): Lang {
  if (typeof window === 'undefined') return 'fr'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    /* stockage indisponible : on retombe sur la langue du navigateur */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() ?? '' : ''
  return nav.startsWith('fr') || nav === '' ? 'fr' : 'en'
}

export const LANG: Lang = detect()

/** Espace insécable : elle garde la ponctuation et les unités attachées au mot qui les précède. */
export const NBSP = '\u00a0'

/**
 * Typographie d'affichage. Apostrophe droite partout ; en français, espace
 * insécable devant « : ; ! ? % » et à l'intérieur des guillemets « ».
 */
export function typo(text: string): string {
  const straight = text.replace(/\u2019/g, "'")
  if (LANG !== 'fr') return straight
  return straight.replace(/ (?=[:;!?»%])/g, NBSP).replace(/« /g, '«' + NBSP)
}

/** Applique `typo` à toutes les chaînes d'une donnée (objets, listes), sans toucher au reste. */
export function typoDeep<T>(value: T): T {
  if (typeof value === 'string') return typo(value) as T
  if (Array.isArray(value)) return value.map((v) => typoDeep(v)) as T
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typoDeep(v)])) as T
  }
  return value
}

/** Locale des formats de date et de nombre. */
export const COLON = LANG === 'fr' ? NBSP + ': ' : ': '
export const LOCALE = LANG === 'en' ? 'en-GB' : 'fr-FR'

/** Libellé bilingue : le français fait référence, l'anglais l'accompagne. */
export function tr(fr: string, en: string): string {
  return typo(LANG === 'en' ? en : fr)
}

/** Choisit une valeur quelconque selon la langue (listes, nœuds React). */
export function pick<T>(fr: T, en: T): T {
  const value = LANG === 'en' ? en : fr
  return typeof value === 'string' ? (typo(value) as T) : value
}

export function setLang(lang: Lang): void {
  if (lang === LANG) return
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* sans stockage, le choix ne survit pas au rechargement */
  }
  window.location.reload()
}

/** Pluriel simple, suffisant pour les deux langues servies. */
export function plural(n: number, one: string, many: string): string {
  return n > 1 || (LANG === 'en' && n === 0) ? many : one
}

/**
 * Applique une surcouche de traduction à une liste d'objets identifiés.
 * Les champs absents de la surcouche restent en français : une traduction
 * incomplète dégrade l'affichage, jamais le raisonnement.
 */
export function overlay<T extends object, K extends keyof T>(
  items: T[],
  key: K,
  translations: Record<string, Partial<T>>,
): T[] {
  if (LANG !== 'en') return items
  return items.map((item) => {
    const t = translations[String(item[key])]
    return t ? { ...item, ...t } : item
  })
}
