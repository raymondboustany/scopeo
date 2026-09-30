import type { Answers, RegulationId, TimelineEvent } from '@/types/domain'
import { TIMELINE } from '@/data/timeline'
import { tr } from '@/i18n'
import { daysUntil, parseDate } from '@/lib/utils'

/**
 * Alertes du tableau de bord.
 *
 * Une alerte ne mérite d'exister que si elle appelle une action ou un
 * arbitrage : ici, les échéances réglementaires proches qui concernent
 * l'entité. Le reste relève de la consultation, pas de l'alerte.
 */

export type AlertLevel = 'critical' | 'warning' | 'info'

export interface Alert {
  id: string
  level: AlertLevel
  title: string
  detail: string
  date: Date
  href: string
  /** Signal lumineux : urgence réelle, non encore consultée, non échue. */
  pulse: boolean
}

const DAY = 86_400_000

export function conditionsMet(e: TimelineEvent, answers: Answers): boolean {
  return (e.appliesWhen ?? []).every((c) => {
    const v = answers[c.key]
    if (c.op === 'has') return Array.isArray(v) && Array.isArray(c.value) && c.value.some((x) => (v as string[]).includes(x))
    if (c.op === 'eq') return v === c.value
    return true
  })
}

export function regulatoryAlerts(
  applicable: RegulationId[],
  answers: Answers,
  seen: string[],
  now = new Date(),
): Alert[] {
  return TIMELINE.filter((e) => e.regulation === 'TRANSVERSE' || applicable.includes(e.regulation))
    .filter((e) => conditionsMet(e, answers))
    .map((e) => ({ e, date: parseDate(e.date) }))
    .filter(({ e }) => daysUntil(e.date, now) <= 45 && daysUntil(e.date, now) >= -20)
    .map(({ e, date }) => {
      const delta = daysUntil(e.date, now)
      const upcoming = delta >= 0
      const days = Math.abs(delta)
      const id = `TL:${e.id}`
      const when =
        days === 0
          ? tr("Aujourd'hui", 'Today')
          : upcoming
            ? days === 1
              ? tr('Demain', 'Tomorrow')
              : tr(`Dans ${days} jours`, `In ${days} days`)
            : days === 1
              ? tr('Hier', 'Yesterday')
              : tr(`Il y a ${days} jours`, `${days} days ago`)
      return {
        id,
        level: upcoming && days <= 14 ? 'warning' : 'info',
        title: e.title,
        detail: `${when}. ${e.detail}`,
        date,
        href: `/app/echeancier?event=${e.id}`,
        pulse: upcoming && days <= 30 && !seen.includes(id),
      } satisfies Alert
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

/** Événements du calendrier qui concernent l'entité : textes applicables et conditions remplies. */
export function relevantEvents(applicable: RegulationId[], answers: Answers): TimelineEvent[] {
  return TIMELINE.filter((e) => e.regulation === 'TRANSVERSE' || applicable.includes(e.regulation)).filter((e) =>
    conditionsMet(e, answers),
  )
}

/** Prochains jalons à venir, du plus proche au plus lointain. */
export function nextMilestones(applicable: RegulationId[], answers: Answers, now = new Date(), count = 3): TimelineEvent[] {
  return relevantEvents(applicable, answers)
    .filter((e) => parseDate(e.date).getTime() >= now.getTime() - DAY / 2)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count)
}
