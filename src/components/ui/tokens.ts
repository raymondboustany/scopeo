import type { CoverageLevel, CrosswalkRelation, Domain, MeasureStatus, RegulationId, VerdictStatus } from '@/types/domain'

/**
 * Table unique des signatures visuelles : un référentiel ou un statut a
 * rigoureusement la même couleur d'un écran à l'autre.
 */

export const REG_STYLE: Record<RegulationId, { text: string; wash: string; line: string; bar: string; hex: string }> = {
  RGPD: { text: 'text-rgpd-ink', wash: 'bg-rgpd-wash', line: 'border-rgpd-line', bar: 'bg-rgpd', hex: 'var(--c-rgpd)' },
  NIS2: { text: 'text-nis2-ink', wash: 'bg-nis2-wash', line: 'border-nis2-line', bar: 'bg-nis2', hex: 'var(--c-nis2)' },
  DORA: { text: 'text-dora-ink', wash: 'bg-dora-wash', line: 'border-dora-line', bar: 'bg-dora', hex: 'var(--c-dora)' },
  CRA: { text: 'text-cra-ink', wash: 'bg-cra-wash', line: 'border-cra-line', bar: 'bg-cra', hex: 'var(--c-cra)' },
}

export const REG_LABEL: Record<RegulationId, string> = {
  RGPD: 'RGPD',
  NIS2: 'NIS 2',
  DORA: 'DORA',
  CRA: 'CRA',
}

export const STATUS_STYLE: Record<VerdictStatus, { text: string; wash: string; line: string; dot: string }> = {
  applicable: { text: 'text-accent-strong', wash: 'bg-accent-wash', line: 'border-accent-line', dot: 'bg-accent' },
  probable: { text: 'text-caution', wash: 'bg-caution-wash', line: 'border-caution-line', dot: 'bg-caution' },
  indirect: { text: 'text-ink-2', wash: 'bg-neutral-wash', line: 'border-neutral-line', dot: 'bg-ink-3' },
  hors_champ: { text: 'text-ink-3', wash: 'bg-neutral-wash', line: 'border-neutral-line', dot: 'bg-ink-4' },
}

export const RELATION_STYLE: Record<CrosswalkRelation, { text: string; wash: string; line: string; label: string }> = {
  recouvrement: { text: 'text-ink-2', wash: 'bg-neutral-wash', line: 'border-neutral-line', label: 'Recouvrement' },
  divergence: { text: 'text-critical', wash: 'bg-critical-wash', line: 'border-critical-line', label: 'Divergence' },
  hierarchie: { text: 'text-brass', wash: 'bg-brass-wash', line: 'border-brass-line', label: 'Hiérarchie' },
}

/** Trois états, et une absence d'évaluation qui n'est ni verte ni rouge. */
export const LEVEL_STYLE: Record<CoverageLevel | MeasureStatus, { text: string; wash: string; line: string; dot: string; label: string }> = {
  en_place: { text: 'text-positive', wash: 'bg-positive-wash', line: 'border-positive-line', dot: 'bg-positive', label: 'En place' },
  partiel: { text: 'text-caution', wash: 'bg-caution-wash', line: 'border-caution-line', dot: 'bg-caution', label: 'Partiel' },
  absent: { text: 'text-critical', wash: 'bg-critical-wash', line: 'border-critical-line', dot: 'bg-critical', label: 'Absent' },
  non_evalue: { text: 'text-ink-3', wash: 'bg-neutral-wash', line: 'border-neutral-line', dot: 'bg-ink-4', label: 'Non évalué' },
}

export const DOMAIN_LABEL: Record<Domain, string> = {
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
