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
import { REGULATIONS } from '@/data/regulations'
import { applicableRegulations } from './qualification'
import { tr } from '@/i18n'

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
    label: tr('Exposition juridique', 'Legal exposure'),
    hint: tr(
      'Gravité de la sanction encourue et mise en cause personnelle des dirigeants.',
      'Severity of the penalty and personal liability of management.',
    ),
  },
  ecart: {
    label: tr('Écart constaté', 'Observed gap'),
    hint: tr(
      "Distance entre l'attendu réglementaire et l'état déclaré lors de l'évaluation.",
      'Distance between what regulation expects and the state reported in the assessment.',
    ),
  },
  levier: {
    label: tr('Effet de levier', 'Leverage'),
    hint: tr(
      "Nombre de textes qu'une action unique permet de satisfaire simultanément.",
      'Number of texts a single action satisfies at once.',
    ),
  },
  echeance: {
    label: tr('Urgence calendaire', 'Time pressure'),
    hint: tr(
      "Proximité d'une échéance réglementaire ou caractère immédiatement exigible.",
      'How close a regulatory deadline is, or whether it already applies.',
    ),
  },
  effort: {
    label: tr('Faible charge', 'Low effort'),
    hint: tr(
      'Favorise les actions rapides à mettre en œuvre, à valeur réglementaire égale.',
      'Favours quick wins when regulatory value is equal.',
    ),
  },
}

const COVERAGE_GAP: Record<CoverageLevel, number> = {
  non_evalue: 0.7,
  absent: 1,
  partiel: 0.5,
  en_place: 0,
}

export const COVERAGE_LABEL: Record<CoverageLevel, string> = {
  non_evalue: tr('Non évalué', 'Not assessed'),
  absent: tr('Absent', 'Missing'),
  partiel: tr('Partiellement en place', 'Partly in place'),
  en_place: tr('En place', 'In place'),
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
  AIACT: 0.95,
}

/** Thèmes CRA déjà exigibles : le signalement de l'article 14 depuis le 11 septembre 2026. */
const CRA_ALREADY_APPLICABLE = new Set(['REP-01', 'REP-02', 'REP-03', 'DET-03'])

/**
 * Thèmes AI Act déjà exigibles : pratiques interdites et maîtrise de l'IA
 * depuis le 2 février 2025, transparence depuis le 2 août 2026. Le reste
 * dépend du calendrier des systèmes à haut risque.
 */
const AI_ALREADY_APPLICABLE = new Set(['IA-02', 'GOV-04', 'IA-03', 'IA-01'])

interface PrioritiseInput {
  qualification: QualificationResult | null
  coverage: Record<string, CoverageEntry>
  weights: PriorityWeights
  obligations: Obligation[]
}

const regName = (r: RegulationId) => REGULATIONS[r].shortName

function themeRegulations(theme: CrosswalkTheme, applicable: RegulationId[]): RegulationId[] {
  return theme.mappings.map((m) => m.regulation).filter((r) => applicable.includes(r))
}

/** Un thème est-il directement exigible, ou relève-t-il de l'anticipation ? */
function urgencyOf(theme: CrosswalkTheme, qualification: QualificationResult | null): { raw: number; why: string } {
  if (!qualification) return { raw: 0.5, why: tr('Qualification non réalisée : urgence moyenne par défaut.', 'Scoping not done: medium urgency by default.') }

  const regs = theme.mappings.map((m) => m.regulation)
  const statuses = regs.map((r) => qualification.verdicts[r].status)

  // Un texte directement applicable et déjà en vigueur crée une dette immédiate.
  const immediate = regs.some(
    (r, i) => statuses[i] === 'applicable' && (r === 'RGPD' || r === 'DORA'),
  )
  if (immediate) {
    return {
      raw: 1,
      why: tr(
        "Le thème relève d'un texte directement applicable et déjà en vigueur : la dette est immédiate et opposable.",
        'The theme falls under a directly applicable text already in force: the gap is immediate and enforceable.',
      ),
    }
  }

  const nis2Applicable = regs.includes('NIS2') && qualification.verdicts.NIS2.status === 'applicable'
  if (nis2Applicable) {
    return {
      raw: 0.7,
      why: tr(
        "NIS2 n'est pas encore transposée en France, mais le ReCyF en fixe le contenu attendu : la préparation ne peut être différée sans risque.",
        'NIS2 is not yet transposed in France, but the ReCyF sets out what is expected: preparation cannot be safely postponed.',
      ),
    }
  }

  const craApplicable = regs.includes('CRA') && qualification.verdicts.CRA.status === 'applicable'
  if (craApplicable && CRA_ALREADY_APPLICABLE.has(theme.id)) {
    return {
      raw: 1,
      why: tr(
        'Le signalement des vulnérabilités exploitées et des incidents graves est exigible au titre du CRA depuis le 11 septembre 2026.',
        'Reporting of exploited vulnerabilities and severe incidents has applied under the CRA since 11 September 2026.',
      ),
    }
  }
  if (craApplicable) {
    return {
      raw: 0.55,
      why: tr(
        "Exigence du CRA applicable au 11 décembre 2027 : l'échéance est fixée, et la mise en conformité d'un produit demande plusieurs cycles de développement.",
        'CRA requirement applicable from 11 December 2027: the date is fixed, and bringing a product into compliance takes several development cycles.',
      ),
    }
  }

  const aiApplicable = regs.includes('AIACT') && qualification.verdicts.AIACT.status === 'applicable'
  if (aiApplicable && AI_ALREADY_APPLICABLE.has(theme.id)) {
    return {
      raw: 1,
      why: tr(
        "Obligation de l'AI Act déjà applicable : pratiques interdites et maîtrise de l'IA depuis le 2 février 2025, transparence depuis le 2 août 2026.",
        'AI Act obligation already in force: prohibited practices and AI literacy since 2 February 2025, transparency since 2 August 2026.',
      ),
    }
  }
  if (aiApplicable) {
    return {
      raw: 0.55,
      why: tr(
        "Exigence de l'AI Act applicable au 2 décembre 2027 pour les systèmes à haut risque de l'annexe III, depuis l'Omnibus IA.",
        'AI Act requirement applicable from 2 December 2027 for Annex III high-risk systems, following the AI Omnibus.',
      ),
    }
  }

  return { raw: 0.5, why: tr('Aucune échéance ferme identifiée ; exigence permanente.', 'No firm deadline identified; ongoing requirement.') }
}

function expositionOf(
  theme: CrosswalkTheme,
  regs: RegulationId[],
  qualification: QualificationResult | null,
): { raw: number; why: string } {
  if (regs.length === 0) return { raw: 0, why: tr('Aucun texte applicable ne porte ce thème.', 'No applicable text carries this theme.') }

  const base = Math.max(...regs.map((r) => REGULATION_EXPOSURE[r]))
  const isGovernance = theme.domain === 'gouvernance'
  const directorLiability =
    isGovernance && regs.includes('NIS2') && qualification?.nis2Category === 'essentielle'

  const bonus = directorLiability ? 0.15 : 0
  const raw = Math.min(1, base + bonus)

  const why = directorLiability
    ? tr(
        "Thème de gouvernance sous NIS2 pour une entité essentielle : l'autorité peut interdire temporairement l'exercice de fonctions dirigeantes, ce qui place l'exposition au niveau maximal.",
        'Governance theme under NIS2 for an essential entity: the authority may temporarily ban individuals from management functions, which puts exposure at its maximum.',
      )
    : tr(`Sanction la plus élevée portée par ${regs.map(regName).join(', ')} sur ce thème.`, `Highest penalty carried by ${regs.map(regName).join(', ')} on this theme.`)

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
              ? tr(
                  "Thème non évalué : traité comme un écart probable tant que l'état n'est pas établi.",
                  'Theme not assessed: treated as a likely gap until its state is established.',
                )
              : tr(`État déclaré : ${COVERAGE_LABEL[level].toLowerCase()}.`, `Reported state: ${COVERAGE_LABEL[level].toLowerCase()}.`),
        },
        {
          key: 'levier',
          label: WEIGHT_LABELS.levier.label,
          raw: levierRaw,
          weighted: (levierRaw * weights.levier) / totalWeight,
          rationale:
            regs.length > 1
              ? tr(
                  `Une action unique satisfait ${regs.length} textes applicables : ${regs.map(regName).join(', ')}.`,
                  `A single action satisfies ${regs.length} applicable texts: ${regs.map(regName).join(', ')}.`,
                )
              : tr(
                  `Le thème ne concerne qu'un seul texte applicable : ${regs[0] ? regName(regs[0]) : 'aucun'}.`,
                  `The theme concerns a single applicable text: ${regs[0] ? regName(regs[0]) : 'none'}.`,
                ),
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
          rationale: tr(
            `Charge de mise en œuvre estimée à ${theme.effort} sur 5 ; à valeur égale, les actions légères passent devant.`,
            `Estimated effort ${theme.effort} out of 5; at equal value, lighter actions come first.`,
          ),
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
  {
    n: 1 as const,
    label: tr('Phase 1', 'Phase 1'),
    horizon: tr('0 à 3 mois', '0 to 3 months'),
    intent: tr(
      "Éteindre l'exposition la plus grave et poser les prérequis dont tout le reste dépend.",
      'Remove the most serious exposure and lay the groundwork everything else depends on.',
    ),
  },
  {
    n: 2 as const,
    label: tr('Phase 2', 'Phase 2'),
    horizon: tr('3 à 6 mois', '3 to 6 months'),
    intent: tr(
      'Traiter les exigences à fort effet de levier une fois les fondations en place.',
      'Tackle high-leverage requirements once the foundations are in place.',
    ),
  },
  {
    n: 3 as const,
    label: tr('Phase 3', 'Phase 3'),
    horizon: tr('6 à 12 mois', '6 to 12 months'),
    intent: tr("Consolider et formaliser, en vue d'un contrôle.", 'Consolidate and formalise, ready for an inspection.'),
  },
  {
    n: 4 as const,
    label: tr('Phase 4', 'Phase 4'),
    horizon: tr('Au-delà de 12 mois', 'Beyond 12 months'),
    intent: tr('Approfondir, et anticiper les régimes non encore exigibles.', 'Go further, and prepare for regimes not yet in force.'),
  },
]

/** Part de couverture, de 0 à 1, pondérée par le niveau déclaré. */
export function coverageRatio(items: PrioritisedItem[]): number {
  if (items.length === 0) return 0
  return items.reduce((sum, i) => sum + COVERAGE_VALUE[i.coverage], 0) / items.length
}
