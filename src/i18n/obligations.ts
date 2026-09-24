import type { Obligation } from '@/types/domain'
import { LANG } from '@/i18n'
import RGPD from './en/obligations.rgpd.json'
import NIS2 from './en/obligations.nis2.json'
import DORA from './en/obligations.dora.json'
import CRA from './en/obligations.cra.json'
import AIACT from './en/obligations.aiact.json'

/**
 * Version anglaise du corpus d'obligations.
 *
 * Seuls les textes affichés sont traduits ; identifiants, conditions et
 * rattachements restent ceux de la version française, qui fait référence.
 * Les citations littérales restent en français : ce sont des extraits du
 * texte officiel publié au Journal officiel.
 */

interface ObligationEn {
  article?: string
  shortRef?: string
  chapter?: string
  title?: string
  statement?: string
  appliesTo?: string[]
  requirements?: Record<string, string | [string, string]>
  deadline?: string
  evidence?: string[]
  conditions?: string[]
  guidance?: string[]
}

const EN = { ...RGPD, ...NIS2, ...DORA, ...CRA, ...AIACT } as unknown as Record<string, ObligationEn>

/** « Article 32, paragraphe 1, point a) » → « Article 32(1)(a) », pour les références non traduites à la main. */
function articleEn(article: string): string {
  return article
    .replace(/, paragraphe (\d+)/g, '($1)')
    .replace(/, point ([a-z])\)/g, '($1)')
    .replace(/Articles (\d+) et (\d+)/, 'Articles $1 and $2')
    .replace(/Articles (\d+) à (\d+)/, 'Articles $1 to $2')
    .replace(/Annexe/g, 'Annex')
}

export function localizeObligations(list: Obligation[]): Obligation[] {
  if (LANG !== 'en') return list
  return list.map((o) => {
    const e = EN[o.id]
    const base: Obligation = { ...o, article: articleEn(o.article), sourceUrl: o.sourceUrl.replace('/FR/', '/EN/') }
    if (!e) return base
    return {
      ...base,
      article: e.article ?? base.article,
      shortRef: e.shortRef ?? o.shortRef,
      chapter: e.chapter ?? o.chapter,
      title: e.title ?? o.title,
      statement: e.statement ?? o.statement,
      appliesTo: e.appliesTo ?? o.appliesTo,
      requirements: o.requirements.map((r) => {
        const t = e.requirements?.[r.id]
        if (!t) return r
        return Array.isArray(t) ? { ...r, text: t[0], appliesWhen: t[1] } : { ...r, text: t }
      }),
      deadline: { ...o.deadline, label: e.deadline ?? o.deadline.label },
      evidence: e.evidence ?? o.evidence,
      conditions: o.conditions?.map((c, i) => ({ ...c, label: e.conditions?.[i] ?? c.label })),
      guidance: o.guidance?.map((g, i) => ({ ...g, label: e.guidance?.[i] ?? g.label })),
    }
  })
}
