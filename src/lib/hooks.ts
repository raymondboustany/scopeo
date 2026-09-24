import { useEffect, useMemo, useState } from 'react'
import { useCurrentEntity, useEntityEditor } from './queries'
import { applicableRegulations, qualify } from '@/engines/qualification'
import { DEFAULT_WEIGHTS, prioritise } from '@/engines/prioritisation'
import { recyfCounts, recyfForCategory, scopeObligations, type ScopedObligation } from '@/engines/corpus'
import { buildSnapshot, computeScores, measureProgress, type Scores } from '@/engines/scores'
import { isComplete } from '@/data/questionnaire'
import {
  isoExclusionAlerts,
  isoRecyfEquivalence,
  isoSuggestions,
  mergeCoverage,
  type IsoContext,
  type IsoExclusionAlert,
  type IsoSuggestion,
} from '@/engines/iso'
import type {
  CoverageEntry,
  EntityRecord,
  MeasureStatus,
  PrioritisedItem,
  PriorityWeights,
  QualificationResult,
  RecyfObjective,
  RegulationId,
} from '@/types/domain'

/**
 * Vue dérivée de l'entité courante.
 *
 * Tout se recalcule à partir des réponses stockées : la qualification n'est
 * jamais enregistrée telle quelle, pour qu'une évolution du moteur ou du
 * corpus s'applique immédiatement à toutes les entités existantes.
 */
export interface Scoping {
  entity: EntityRecord | null
  loading: boolean
  readOnly: boolean
  qualification: QualificationResult | null
  qualified: boolean
  applicable: RegulationId[]
  obligations: ScopedObligation[]
  inScope: ScopedObligation[]
  prioritised: PrioritisedItem[]
  scores: Scores
  weights: PriorityWeights
  recyf: RecyfObjective[]
  recyfCounts: ReturnType<typeof recyfCounts>
  measures: ReturnType<typeof measureProgress>
  nis2Category: 'essentielle' | 'importante' | null
  /**
   * Les exigences ReCyF s'imposent-elles ? Non pour une entité financière :
   * DORA remplace alors les articles 21 et 23 de NIS2 (article 4 de NIS2).
   */
  anssiApplies: boolean
  doraPrevails: boolean
  /** Couverture effective : saisie manuelle, complétée des propositions ISO 27001. */
  coverage: Record<string, CoverageEntry>
  /** Statut des mesures ReCyF, y compris l'équivalence ISO reconnue par l'ANSSI. */
  measureStatuses: Record<string, MeasureStatus>
  iso: {
    context: IsoContext
    suggestions: Map<string, IsoSuggestion>
    alerts: Map<string, IsoExclusionAlert>
    /** Mesures ReCyF réputées en place par équivalence ISO. */
    recyfEquivalence: Record<string, MeasureStatus>
  }
}

export function deriveScoping(entity: EntityRecord | null, loading = false): Scoping {
  const answers = entity?.answers ?? {}
  const qualification = entity && isComplete(answers) ? qualify(answers) : null
  const obligations = entity ? scopeObligations(answers, qualification) : []
  const inScope = obligations.filter((o) => o.inScope)
  const weights: PriorityWeights = { ...DEFAULT_WEIGHTS, ...(entity?.weights ?? {}) }
  const manual = (entity?.coverage ?? {}) as Record<string, CoverageEntry>
  const applicable = applicableRegulations(qualification)

  // ISO 27001 : uniquement une fois le cadrage réglementaire établi.
  const isoContext: IsoContext = {
    profile: entity?.profile?.iso27001,
    assessment: entity?.iso_controls,
    applicable,
    inScope,
  }
  const suggestions = qualification ? isoSuggestions(isoContext) : new Map<string, IsoSuggestion>()
  const alerts = qualification ? isoExclusionAlerts(isoContext) : new Map<string, IsoExclusionAlert>()
  const coverage = mergeCoverage(manual, suggestions)

  const prioritised = qualification ? prioritise({ qualification, coverage, weights, obligations: inScope }) : []
  const category = qualification?.nis2Category ?? null
  const recyf = recyfForCategory(category)
  const doraPrevails = qualification?.derived.doraPrevails === true
  const anssiApplies = applicable.includes('NIS2') && !doraPrevails
  const recyfEquivalence = qualification && anssiApplies ? isoRecyfEquivalence(isoContext.profile, recyf) : {}
  const measureStatuses = { ...recyfEquivalence, ...(entity?.measures ?? {}) }

  return {
    entity,
    loading,
    readOnly: Boolean(entity?.is_demo),
    qualification,
    qualified: qualification !== null,
    applicable,
    obligations,
    inScope,
    prioritised,
    scores: computeScores(prioritised, applicable),
    weights,
    recyf,
    recyfCounts: recyfCounts(category),
    measures: measureProgress(anssiApplies ? recyf : [], measureStatuses),
    nis2Category: category,
    anssiApplies,
    doraPrevails,
    coverage,
    measureStatuses,
    iso: { context: isoContext, suggestions, alerts, recyfEquivalence },
  }
}

export function useScoping(): Scoping {
  const { data: entity, isLoading } = useCurrentEntity()
  return useMemo(() => deriveScoping(entity ?? null, isLoading), [entity, isLoading])
}

/** Horloge partagée, pour les comptes à rebours. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/**
 * Tient l'instantané public à jour : dès que le périmètre ou l'évaluation
 * changent, la vue partagée du Trust Center est recalculée et enregistrée.
 * La date de génération seule ne suffit pas à déclencher une écriture.
 */
export function useSnapshotSync() {
  const scoping = useScoping()
  const edit = useEntityEditor()
  const { entity, qualification, prioritised, applicable, readOnly } = scoping
  useEffect(() => {
    if (!entity || readOnly || !qualification) return
    const next = buildSnapshot(entity.answers, qualification, prioritised, applicable, entity.profile?.iso27001)
    const strip = (s: unknown) => {
      if (!s || typeof s !== 'object') return null
      const { generatedAt: _generatedAt, ...rest } = s as Record<string, unknown>
      return JSON.stringify(rest)
    }
    if (strip(next) !== strip(entity.public_snapshot)) edit({ public_snapshot: next })
  }, [entity, qualification, prioritised, applicable, readOnly, edit])
}
