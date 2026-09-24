import type {
  Answers,
  Obligation,
  QualificationResult,
  RegulationId,
  ScopeCondition,
} from '@/types/domain'
import { RGPD_OBLIGATIONS } from '@/data/obligations/rgpd'
import { NIS2_OBLIGATIONS } from '@/data/obligations/nis2'
import { DORA_OBLIGATIONS } from '@/data/obligations/dora'
import { CRA_OBLIGATIONS } from '@/data/obligations/cra'
import { AIACT_OBLIGATIONS } from '@/data/obligations/aiact'
import { RECYF_OBJECTIVES } from '@/data/recyf'
import { REGULATION_ORDER } from '@/data/regulations'
import { tr } from '@/i18n'
import { localizeObligations } from '@/i18n/obligations'
import { applicableRegulations } from './qualification'

export const ALL_OBLIGATIONS: Obligation[] = localizeObligations([
  ...RGPD_OBLIGATIONS,
  ...NIS2_OBLIGATIONS,
  ...DORA_OBLIGATIONS,
  ...CRA_OBLIGATIONS,
  ...AIACT_OBLIGATIONS,
])

export const OBLIGATION_BY_ID = new Map(ALL_OBLIGATIONS.map((o) => [o.id, o]))

const RECYF_MEASURE_COUNT = RECYF_OBJECTIVES.reduce((n, o) => n + o.measures.length, 0)

export const CORPUS_STATS = {
  obligations: ALL_OBLIGATIONS.length,
  /** Exigences élémentaires des textes, hors mesures ReCyF. */
  textRequirements: ALL_OBLIGATIONS.reduce((n, o) => n + o.requirements.length, 0),
  /** Exigences élémentaires, y compris les mesures ReCyF qui détaillent NIS2. */
  requirements: ALL_OBLIGATIONS.reduce((n, o) => n + o.requirements.length, 0) + RECYF_MEASURE_COUNT,
  texts: REGULATION_ORDER.length,
  byRegulation: REGULATION_ORDER.reduce(
    (acc, id) => {
      acc[id] = ALL_OBLIGATIONS.filter((o) => o.regulation === id).length
      return acc
    },
    {} as Record<RegulationId, number>,
  ),
  recyfMeasures: RECYF_MEASURE_COUNT,
}

// ---------------------------------------------------------------------------
// Applicabilité conditionnelle
// ---------------------------------------------------------------------------

function evaluateCondition(c: ScopeCondition, answers: Answers, derived: Record<string, unknown>): boolean {
  const source = c.key.startsWith('derived.') ? derived[c.key.slice(8)] : answers[c.key]

  switch (c.op) {
    case 'eq':
      return source === c.value
    case 'neq':
      return source !== c.value
    case 'in':
      return Array.isArray(c.value) ? c.value.includes(String(source)) : false
    case 'not_in':
      return Array.isArray(c.value) ? !c.value.includes(String(source)) : true
    case 'truthy':
      return Boolean(source)
    case 'has':
      return Array.isArray(source) && Array.isArray(c.value) && c.value.some((v) => (source as string[]).includes(v))
    default:
      return true
  }
}

export interface ScopedObligation extends Obligation {
  /** L'obligation est-elle retenue au vu du profil ? */
  inScope: boolean
  /** Conditions non remplies, expliquant une mise hors périmètre. */
  unmetConditions: string[]
  /** L'obligation ne concerne-t-elle qu'un régime de qualification supérieur ? */
  reservedTo?: string
}

/**
 * Restreint le corpus au profil de l'entité.
 *
 * Deux filtres se combinent : l'applicabilité du texte, issue de la
 * qualification, et les conditions propres à chaque obligation. Les
 * obligations écartées ne sont pas supprimées mais marquées, afin que
 * l'utilisateur voie ce qui ne le concerne pas et pourquoi.
 */
export function scopeObligations(
  answers: Answers,
  qualification: QualificationResult | null,
): ScopedObligation[] {
  const applicable = applicableRegulations(qualification)
  const derived = qualification?.derived ?? {}

  return ALL_OBLIGATIONS.map((o) => {
    const regulationInScope = qualification === null || applicable.includes(o.regulation)
    const unmet = (o.conditions ?? [])
      .filter((c) => !evaluateCondition(c, answers, derived))
      .map((c) => c.label)

    // Une entité financière n'applique pas le régime NIS2 de gestion des
    // risques et de notification : DORA le remplace (article 4 de NIS2).
    const supersededByDora =
      o.regulation === 'NIS2' &&
      derived.doraPrevails === true &&
      /^NIS2-A2[13]/.test(o.id)

    return {
      ...o,
      inScope: regulationInScope && unmet.length === 0 && !supersededByDora,
      unmetConditions: supersededByDora
        ? [
            tr(
              "Écartée par l'article 4 de NIS2 : DORA constitue une lex specialis pour les entités financières.",
              'Set aside by Article 4 of NIS2: DORA is lex specialis for financial entities.',
            ),
          ]
        : unmet,
      reservedTo: supersededByDora ? 'DORA' : undefined,
    }
  })
}

// ---------------------------------------------------------------------------
// ReCyF : restriction selon la catégorie NIS2
// ---------------------------------------------------------------------------

export function recyfForCategory(category: 'essentielle' | 'importante' | null) {
  return RECYF_OBJECTIVES.filter((o) => (category === 'importante' ? o.scope === 'EI+EE' : true)).map((o) => ({
    ...o,
    measures: o.measures.filter((m) => (category === 'importante' ? m.ei : true)),
  }))
}

export function recyfCounts(category: 'essentielle' | 'importante' | null) {
  const objectives = recyfForCategory(category)
  return {
    objectives: objectives.length,
    measures: objectives.reduce((n, o) => n + o.measures.length, 0),
    totalObjectives: RECYF_OBJECTIVES.length,
    totalMeasures: CORPUS_STATS.recyfMeasures,
  }
}

// ---------------------------------------------------------------------------
// Agrégats
// ---------------------------------------------------------------------------

export function requirementCount(obligations: Obligation[]): number {
  return obligations.reduce((n, o) => n + o.requirements.length, 0)
}

export function obligationsForTheme(themeId: string, obligations: Obligation[]): Obligation[] {
  return obligations.filter((o) => o.themes.includes(themeId))
}

/** Échéances déclenchées les plus courtes, utiles pour dimensionner la cellule de crise. */
export function tightestDeadlines(obligations: Obligation[]): Obligation[] {
  return obligations
    .filter((o) => o.deadline.kind === 'declenchee' && typeof o.deadline.hours === 'number')
    .sort((a, b) => (a.deadline.hours ?? 0) - (b.deadline.hours ?? 0))
}

// ---------------------------------------------------------------------------
// ReCyF : exigences détaillées de NIS2
// ---------------------------------------------------------------------------

/**
 * Objectifs ReCyF qui détaillent une obligation NIS2, restreints à la
 * catégorie de l'entité. Sans qualification, le référentiel complet est rendu.
 */
export function recyfForObligation(obligation: Obligation, category: 'essentielle' | 'importante' | null) {
  if (obligation.regulation !== 'NIS2' || !obligation.recyf?.length) return []
  const wanted = new Set(obligation.recyf)
  return recyfForCategory(category).filter((o) => wanted.has(o.n))
}

/** Objectifs ReCyF rattachés à un thème de croisement portant NIS2. */
export function recyfForTheme(themeRecyf: number[] | undefined, category: 'essentielle' | 'importante' | null) {
  if (!themeRecyf?.length) return []
  const wanted = new Set(themeRecyf)
  return recyfForCategory(category).filter((o) => wanted.has(o.n))
}
