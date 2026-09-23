import type {
  CoverageEntry,
  CoverageLevel,
  CrosswalkTheme,
  Obligation,
  PriorityFactor,
  PriorityWeights,
  PrioritisedItem,
  QualificationResult,
  RegulationId,
} from '@/types/domain'
import { CROSSWALK } from '@/data/crosswalk'
import { applicableRegulations } from './qualification'

/**
 * Moteur de priorisation.
 *
 * Le score n'a de valeur que s'il est contestable. Chaque facteur est donc
 * exposé avec sa valeur normalisée, son poids et la phrase qui l'explique :
 * l'utilisateur doit pouvoir dire « non, chez nous l'effort compte davantage »
 * et déplacer un curseur, plutôt que de subir un classement opaque.
 */

export const DEFAULT_WEIGHTS: PriorityWeights = {
  exposition: 30,
  ecart: 30,
  levier: 20,
  echeance: 10,
  effort: 10,
}

export const WEIGHT_LABELS: Record<keyof PriorityWeights, { label: string; hint: string }> = {
  exposition: {
    label: 'Exposition juridique',
    hint: "Gravité de la sanction encourue et mise en cause personnelle des dirigeants.",
  },
  ecart: {
    label: 'Écart constaté',
    hint: "Distance entre l'attendu réglementaire et l'état déclaré lors de l'évaluation.",
  },
  levier: {
    label: 'Effet de levier',
    hint: "Nombre de textes qu'une action unique permet de satisfaire simultanément.",
  },
  echeance: {
    label: 'Urgence calendaire',
    hint: "Proximité d'une échéance réglementaire ou caractère immédiatement exigible.",
  },
  effort: {
    label: 'Faible charge',
    hint: "Favorise les actions rapides à mettre en œuvre, à valeur réglementaire égale.",
  },
}

const COVERAGE_GAP: Record<CoverageLevel, number> = {
  non_evalue: 0.7,
  absent: 1,
  partiel: 0.5,
  en_place: 0,
}

export const COVERAGE_LABEL: Record<CoverageLevel, string> = {
  non_evalue: 'Non évalué',
  absent: 'Absent',
  partiel: 'Partiellement en place',
  en_place: 'En place',
}

export const COVERAGE_ORDER: CoverageLevel[] = ['non_evalue', 'absent', 'partiel', 'en_place']

/** Contribution d'un niveau à un score de conformité, de 0 à 1. */
export const COVERAGE_VALUE: Record<CoverageLevel, number> = {
  non_evalue: 0,
  absent: 0,
  partiel: 0.5,
  en_place: 1,
}

/**
 * Dépendances entre thèmes : on ne sécurise pas ce qu'on n'a pas recensé,
 * et on ne notifie pas sans processus de qualification. L'ordonnancement
 * respecte ces antériorités même lorsque le score suggère l'inverse.
 */
const DEPENDENCIES: Record<string, string[]> = {
  'PRO-01': ['DOC-03'],
  'PRO-03': ['DOC-03'],
  'PRO-04': ['DOC-03'],
  'RSK-01': ['DOC-03'],
  'RSK-02': ['RSK-01'],
  'DET-02': ['DET-01', 'DOC-03'],
  'DET-03': ['DOC-03'],
  'REP-02': ['REP-01'],
  'REP-03': ['REP-01'],
  'RES-01': ['DOC-03'],
  'RES-02': ['REP-01'],
  'RES-03': ['RES-01'],
  'RES-04': ['RSK-01'],
  'TIE-01': ['TIE-02'],
  'TIE-03': ['TIE-02'],
  'TIE-04': ['TIE-02'],
  'DOC-02': ['DOC-03'],
  'DON-03': ['DOC-02'],
}

/** Poids d'exposition par règlement, reflétant la sévérité du régime de sanction. */
const REGULATION_EXPOSURE: Record<RegulationId, number> = {
  RGPD: 0.85,
  NIS2: 1,
  DORA: 0.9,
  CRA: 0.9,
}

/** Thèmes CRA déjà exigibles : le signalement de l'article 14 depuis le 11 septembre 2026. */
const CRA_ALREADY_APPLICABLE = new Set(['REP-01', 'REP-02', 'REP-03', 'DET-03'])

interface PrioritiseInput {
  qualification: QualificationResult | null
  coverage: Record<string, CoverageEntry>
  weights: PriorityWeights
  obligations: Obligation[]
}

function themeRegulations(theme: CrosswalkTheme, applicable: RegulationId[]): RegulationId[] {
  return theme.mappings.map((m) => m.regulation).filter((r) => applicable.includes(r))
}

/** Un thème est-il directement exigible, ou relève-t-il de l'anticipation ? */
function urgencyOf(theme: CrosswalkTheme, qualification: QualificationResult | null): { raw: number; why: string } {
  if (!qualification) return { raw: 0.5, why: 'Qualification non réalisée : urgence moyenne par défaut.' }

  const regs = theme.mappings.map((m) => m.regulation)
  const statuses = regs.map((r) => qualification.verdicts[r].status)

  // Un texte directement applicable et déjà en vigueur crée une dette immédiate.
  const immediate = regs.some(
    (r, i) => statuses[i] === 'applicable' && (r === 'RGPD' || r === 'DORA'),
  )
  if (immediate) {
    return {
      raw: 1,
      why: "Le thème relève d'un texte directement applicable et déjà en vigueur : la dette est immédiate et opposable.",
    }
  }

  const nis2Applicable = regs.includes('NIS2') && qualification.verdicts.NIS2.status === 'applicable'
  if (nis2Applicable) {
    return {
      raw: 0.7,
      why: "NIS 2 n'est pas encore transposée en France, mais le ReCyF en fixe le contenu attendu : la préparation ne peut être différée sans risque.",
    }
  }

  const craApplicable = regs.includes('CRA') && qualification.verdicts.CRA.status === 'applicable'
  if (craApplicable && CRA_ALREADY_APPLICABLE.has(theme.id)) {
    return {
      raw: 1,
      why: "Le signalement des vulnérabilités exploitées et des incidents graves est exigible au titre du CRA depuis le 11 septembre 2026.",
    }
  }
  if (craApplicable) {
    return {
      raw: 0.55,
      why: "Exigence du CRA applicable au 11 décembre 2027 : l'échéance est fixée, et la mise en conformité d'un produit demande plusieurs cycles de développement.",
    }
  }

  return { raw: 0.5, why: 'Aucune échéance ferme identifiée ; exigence permanente.' }
}

function expositionOf(
  theme: CrosswalkTheme,
  regs: RegulationId[],
  qualification: QualificationResult | null,
): { raw: number; why: string } {
  if (regs.length === 0) return { raw: 0, why: 'Aucun texte applicable ne porte ce thème.' }

  const base = Math.max(...regs.map((r) => REGULATION_EXPOSURE[r]))
  const isGovernance = theme.domain === 'gouvernance'
  const directorLiability =
    isGovernance && regs.includes('NIS2') && qualification?.nis2Category === 'essentielle'

  const bonus = directorLiability ? 0.15 : 0
  const raw = Math.min(1, base + bonus)

  const why = directorLiability
    ? "Thème de gouvernance sous NIS 2 pour une entité essentielle : l'autorité peut interdire temporairement l'exercice de fonctions dirigeantes, ce qui place l'exposition au niveau maximal."
    : `Sanction la plus élevée portée par ${regs.join(', ')} sur ce thème.`

  return { raw, why }
}

export function prioritise({
  qualification,
  coverage,
  weights,
  obligations,
}: PrioritiseInput): PrioritisedItem[] {
  const applicable = applicableRegulations(qualification)
  const relevantObligationIds = new Set(obligations.map((o) => o.id))

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1

  const scored = CROSSWALK
    // Un thème n'entre dans le plan que si au moins une obligation retenue le porte.
    .filter((theme) =>
      theme.mappings.some(
        (m) => applicable.includes(m.regulation) && m.obligationIds.some((id) => relevantObligationIds.has(id)),
      ),
    )
    .map((theme) => {
      const regs = themeRegulations(theme, applicable)
      const entry = coverage[theme.id]
      const level: CoverageLevel = entry?.level ?? 'non_evalue'

      const exp = expositionOf(theme, regs, qualification)
      const gapRaw = COVERAGE_GAP[level]
      const levierRaw = Math.min(1, (regs.length - 1) / 2)
      const urg = urgencyOf(theme, qualification)
      const effortRaw = (6 - theme.effort) / 5

      const factors: PriorityFactor[] = [
        {
          key: 'exposition',
          label: WEIGHT_LABELS.exposition.label,
          raw: exp.raw,
          weighted: (exp.raw * weights.exposition) / totalWeight,
          rationale: exp.why,
        },
        {
          key: 'ecart',
          label: WEIGHT_LABELS.ecart.label,
          raw: gapRaw,
          weighted: (gapRaw * weights.ecart) / totalWeight,
          rationale:
            level === 'non_evalue'
              ? "Thème non évalué : traité comme un écart probable tant que l'état n'est pas établi."
              : `État déclaré : ${COVERAGE_LABEL[level].toLowerCase()}.`,
        },
        {
          key: 'levier',
          label: WEIGHT_LABELS.levier.label,
          raw: levierRaw,
          weighted: (levierRaw * weights.levier) / totalWeight,
          rationale:
            regs.length > 1
              ? `Une action unique satisfait ${regs.length} textes applicables : ${regs.join(', ')}.`
              : `Le thème ne concerne qu'un seul texte applicable : ${regs[0] ?? '—'}.`,
        },
        {
          key: 'echeance',
          label: WEIGHT_LABELS.echeance.label,
          raw: urg.raw,
          weighted: (urg.raw * weights.echeance) / totalWeight,
          rationale: urg.why,
        },
        {
          key: 'effort',
          label: WEIGHT_LABELS.effort.label,
          raw: effortRaw,
          weighted: (effortRaw * weights.effort) / totalWeight,
          rationale: `Charge de mise en œuvre estimée à ${theme.effort} sur 5 ; à valeur égale, les actions légères passent devant.`,
        },
      ]

      const score = factors.reduce((sum, f) => sum + f.weighted, 0)

      return { theme, score, factors, regulations: regs, coverage: level }
    })

  scored.sort((a, b) => b.score - a.score)

  const rankById = new Map(scored.map((s, i) => [s.theme.id, i]))
  const presentIds = new Set(scored.map((s) => s.theme.id))

  return scored.map((s, index) => {
    // Un thème dont un prérequis est mieux classé attend son tour.
    const blockedBy = (DEPENDENCIES[s.theme.id] ?? []).filter(
      (dep) => presentIds.has(dep) && (rankById.get(dep) ?? Infinity) < index,
    )

    const depthPenalty = blockedBy.length > 0 ? 1 : 0
    const base = index < 4 ? 1 : index < 10 ? 2 : index < 18 ? 3 : 4
    const wave = Math.min(4, base + depthPenalty) as 1 | 2 | 3 | 4

    return {
      themeId: s.theme.id,
      theme: s.theme,
      score: s.score,
      rank: index + 1,
      factors: s.factors,
      wave,
      coverage: s.coverage,
      regulations: s.regulations,
      blockedBy,
    }
  })
}

export const WAVES = [
  { n: 1 as const, label: 'Vague 1', horizon: '0 à 3 mois', intent: "Éteindre l'exposition la plus grave et poser les prérequis dont tout le reste dépend." },
  { n: 2 as const, label: 'Vague 2', horizon: '3 à 6 mois', intent: "Traiter les exigences à fort effet de levier une fois les fondations en place." },
  { n: 3 as const, label: 'Vague 3', horizon: '6 à 12 mois', intent: "Consolider et formaliser, en vue d'un contrôle." },
  { n: 4 as const, label: 'Vague 4', horizon: 'Au-delà de 12 mois', intent: "Approfondir, et anticiper les régimes non encore exigibles." },
]

/** Part de couverture, de 0 à 1, pondérée par le niveau déclaré. */
export function coverageRatio(items: PrioritisedItem[]): number {
  if (items.length === 0) return 0
  return items.reduce((sum, i) => sum + COVERAGE_VALUE[i.coverage], 0) / items.length
}
