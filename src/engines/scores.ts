import type {
  Domain,
  MeasureStatus,
  PrioritisedItem,
  PublicSnapshot,
  QualificationResult,
  RecyfObjective,
  RegulationId,
} from '@/types/domain'
import { DOMAINS } from '@/types/domain'
import { COVERAGE_VALUE } from './prioritisation'
import { SECTOR_BY_VALUE } from '@/data/questionnaire'
import { REGULATION_ORDER } from '@/data/regulations'

/**
 * Scores de conformité.
 *
 * Un score n'est pas une note : c'est la part des exigences unifiées déclarées
 * en place, les exigences partielles comptant pour moitié. Il se lit toujours
 * avec son dénominateur — 80 % de trois exigences ne vaut pas 80 % de trente.
 */

export interface ScoreLine {
  score: number
  themes: number
  evaluated: number
  inPlace: number
}

export interface Scores {
  global: ScoreLine
  byRegulation: Partial<Record<RegulationId, ScoreLine>>
  byDomain: Partial<Record<Domain, ScoreLine>>
}

function line(items: PrioritisedItem[]): ScoreLine {
  const themes = items.length
  const evaluated = items.filter((i) => i.coverage !== 'non_evalue').length
  const inPlace = items.filter((i) => i.coverage === 'en_place').length
  const score = themes === 0 ? 0 : items.reduce((s, i) => s + COVERAGE_VALUE[i.coverage], 0) / themes
  return { score, themes, evaluated, inPlace }
}

export function computeScores(prioritised: PrioritisedItem[], applicable: RegulationId[]): Scores {
  const byRegulation: Scores['byRegulation'] = {}
  for (const r of applicable) {
    const items = prioritised.filter((p) => p.regulations.includes(r))
    if (items.length > 0) byRegulation[r] = line(items)
  }
  const byDomain: Scores['byDomain'] = {}
  for (const d of DOMAINS) {
    const items = prioritised.filter((p) => p.theme.domain === d)
    if (items.length > 0) byDomain[d] = line(items)
  }
  return { global: line(prioritised), byRegulation, byDomain }
}

/** Avancement des mesures ANSSI applicables à la catégorie de l'entité. */
export function measureProgress(objectives: RecyfObjective[], statuses: Record<string, MeasureStatus>) {
  const ids = objectives.flatMap((o) => o.measures.map((m) => m.id))
  const counts = { en_place: 0, partiel: 0, absent: 0, non_evalue: 0 }
  for (const id of ids) {
    const s = statuses[id]
    if (s) counts[s] += 1
    else counts.non_evalue += 1
  }
  const score = ids.length === 0 ? 0 : (counts.en_place + counts.partiel * 0.5) / ids.length
  return { total: ids.length, score, ...counts }
}

export const DOMAIN_LABELS: Record<Domain, string> = {
  gouvernance: 'Gouvernance',
  risques: 'Risques',
  protection: 'Protection',
  detection: 'Détection',
  reponse: 'Réponse',
  resilience: 'Résilience',
  tiers: 'Tiers',
  donnees: 'Données',
  documentation: 'Documentation',
}

/**
 * Instantané publié par le Trust Center.
 *
 * Construit ici plutôt qu'au serveur pour que la liste de ce qui sort soit
 * explicite et unique : ni chiffre d'affaires, ni sanction valorisée, ni
 * contact, ni note, ni preuve. Seulement le périmètre et l'avancement.
 */
export function buildSnapshot(
  answers: Record<string, unknown>,
  qualification: QualificationResult | null,
  prioritised: PrioritisedItem[],
  applicable: RegulationId[],
): PublicSnapshot {
  const scores = computeScores(prioritised, applicable)
  const sector = typeof answers.secteur === 'string' ? SECTOR_BY_VALUE.get(answers.secteur)?.label ?? null : null
  return {
    generatedAt: new Date().toISOString(),
    sectorLabel: sector,
    score: Math.round(scores.global.score * 100),
    scores: Object.fromEntries(
      Object.entries(scores.byRegulation).map(([k, v]) => [k, Math.round((v?.score ?? 0) * 100)]),
    ) as PublicSnapshot['scores'],
    verdicts: qualification
      ? REGULATION_ORDER.map((r) => ({
          regulation: r,
          status: qualification.verdicts[r].status,
          qualification: qualification.verdicts[r].qualification,
        }))
      : [],
    domains: DOMAINS.filter((d) => scores.byDomain[d]).map((d) => ({
      domain: d,
      label: DOMAIN_LABELS[d],
      score: Math.round((scores.byDomain[d]?.score ?? 0) * 100),
      themes: scores.byDomain[d]?.themes ?? 0,
    })),
    themesTotal: scores.global.themes,
    themesCovered: scores.global.inPlace,
    nis2Category: qualification?.nis2Category ?? null,
  }
}
