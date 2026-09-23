/**
 * Modèle de domaine — Scopeo
 *
 * Le produit repose sur quatre couches, de la plus normative à la plus
 * opérationnelle :
 *
 *   1. Règlement      — le texte et son régime (dates, autorités, sanctions)
 *   2. Obligation     — un article, décomposé en exigences élémentaires
 *   3. Exigence       — la plus petite unité vérifiable d'une obligation
 *   4. Croisement     — l'exigence unifiée qui satisfait plusieurs textes
 *
 * Le ReCyF, traduction opérationnelle française de NIS 2 publiée par l'ANSSI,
 * n'est pas un référentiel autonome : il s'affiche sous les exigences NIS 2
 * qu'il détaille, comme « détail d'implémentation ANSSI ».
 */

// ---------------------------------------------------------------------------
// Règlements
// ---------------------------------------------------------------------------

export const REGULATION_IDS = ['RGPD', 'NIS2', 'DORA', 'CRA'] as const
export type RegulationId = (typeof REGULATION_IDS)[number]

export type LegalKind = 'reglement' | 'directive'

/** État de transposition en droit français (pertinent pour les directives). */
export type FrenchStatus = 'applicable_direct' | 'transpose' | 'en_cours' | 'non_transpose'

export interface SanctionTier {
  id: string
  label: string
  /** Plafond exprimé en pourcentage du chiffre d'affaires mondial annuel. */
  turnoverPct?: number
  /** Plafond exprimé en valeur absolue (euros). */
  capEur?: number
  /** Le plafond retenu est-il le plus élevé des deux, ou le plus bas ? */
  capRule?: 'le_plus_eleve' | 'le_plus_bas'
  basis: string
  note?: string
}

export interface ImplementingAct {
  reference: string
  title: string
  kind: 'reglement_execution' | 'reglement_delegue' | 'rts' | 'its' | 'lignes_directrices' | 'referentiel' | 'loi_nationale'
  date: string
  status: 'en_vigueur' | 'adopte' | 'projet'
  url?: string
  note?: string
}

export interface Regulation {
  id: RegulationId
  shortName: string
  name: string
  reference: string
  celex: string
  kind: LegalKind
  /** Une phrase : ce que le texte régit, et pour qui. */
  purpose: string
  scopeSummary: string
  adopted: string
  entryIntoForce: string
  /** Date d'application effective, ou de transposition pour une directive. */
  application: string
  transpositionDeadline?: string
  officialJournal: string
  eurLexUrl: string
  euAuthorities: string[]
  frAuthorities: string[]
  frenchStatus: {
    status: FrenchStatus
    label: string
    note: string
    url?: string
  }
  sanctions: SanctionTier[]
  implementingActs: ImplementingAct[]
  /** Nombre d'articles du texte, pour situer la couverture du corpus. */
  articleCount: number
}

// ---------------------------------------------------------------------------
// Obligations et exigences
// ---------------------------------------------------------------------------

export type RequirementType =
  | 'gouvernance'
  | 'organisationnel'
  | 'technique'
  | 'documentaire'
  | 'notification'
  | 'contractuel'

export interface Requirement {
  id: string
  text: string
  type: RequirementType
  /** Restreint l'exigence à un sous-ensemble d'entités (ex. entités essentielles). */
  appliesWhen?: string
}

/** Nature de l'échéance attachée à une obligation. */
export interface Deadline {
  kind: 'ponctuelle' | 'recurrente' | 'declenchee' | 'permanente'
  label: string
  /** Date butoir ISO, pour les échéances ponctuelles. */
  date?: string
  /** Délai en heures, pour les obligations déclenchées par un événement. */
  hours?: number
}

export interface ExternalReference {
  label: string
  issuer: string
  url: string
}

/**
 * Condition d'applicabilité évaluée contre le profil de l'entité.
 * `key` désigne une question du questionnaire, ou une clé dérivée
 * (ex. `derived.nis2Category`).
 */
export interface ScopeCondition {
  key: string
  /** `has` : la réponse (multiple) contient au moins une des valeurs. */
  op: 'eq' | 'neq' | 'in' | 'not_in' | 'truthy' | 'has'
  value?: string | string[]
  label: string
}

export interface Obligation {
  id: string
  regulation: RegulationId
  /** Référence normative affichable, ex. « Article 32 ». */
  article: string
  /**
   * Forme abrégée pour les affichages denses, lorsque la compaction
   * automatique de `article` donnerait un résultat illisible.
   */
  shortRef?: string
  /** Clé de tri numérique dans le texte. */
  order: number
  chapter: string
  title: string
  /** Formulation actionnable : ce que l'entité doit faire. */
  statement: string
  /** Extrait littéral du texte officiel, cité tel quel. */
  quote?: string
  appliesTo: string[]
  requirements: Requirement[]
  deadline: Deadline
  /** Livrables attendus lors d'un contrôle. */
  evidence: string[]
  sanctionTier: string
  /** Charge de mise en œuvre estimée, de 1 (faible) à 5 (lourde). */
  effort: 1 | 2 | 3 | 4 | 5
  /** Force contraignante : obligation dure, ou exigence conditionnée. */
  binding: 'obligatoire' | 'conditionnelle' | 'recommandee'
  themes: string[]
  conditions?: ScopeCondition[]
  guidance?: ExternalReference[]
  /** Objectifs ReCyF qui détaillent la mise en œuvre de cette exigence NIS 2. */
  recyf?: number[]
  sourceUrl: string
}

// ---------------------------------------------------------------------------
// Croisements — le cœur du produit
// ---------------------------------------------------------------------------

export type CrosswalkRelation = 'recouvrement' | 'divergence' | 'hierarchie'

export const DOMAINS = [
  'gouvernance',
  'risques',
  'protection',
  'detection',
  'reponse',
  'resilience',
  'tiers',
  'donnees',
  'documentation',
] as const
export type Domain = (typeof DOMAINS)[number]

export interface CrosswalkMapping {
  regulation: RegulationId
  obligationIds: string[]
  /** Ce que ce texte exige précisément sur ce thème. */
  requirement: string
  /** Ce qui distingue cette exigence de celle des autres textes. */
  nuance?: string
}

export interface CrosswalkTheme {
  id: string
  code: string
  title: string
  domain: Domain
  summary: string
  /**
   * L'action unique qui, correctement menée, satisfait l'ensemble des
   * textes listés dans `mappings`. C'est la promesse de déduplication.
   */
  unifiedAction: string
  relation: CrosswalkRelation
  mappings: CrosswalkMapping[]
  /** Pour une divergence : quelle règle l'emporte en pratique, et pourquoi. */
  strictest?: {
    regulation: RegulationId
    rule: string
    rationale: string
  }
  /** Pour une hiérarchie : quel texte prime, sur quel fondement. */
  precedence?: {
    prevails: RegulationId
    over: RegulationId[]
    basis: string
  }
  /** Objectifs ReCyF correspondants, le cas échéant. */
  recyf?: number[]
  evidence: string[]
  effort: 1 | 2 | 3 | 4 | 5
}

// ---------------------------------------------------------------------------
// ReCyF — Référentiel Cyber France (ANSSI)
// ---------------------------------------------------------------------------

export type RecyfPillar = 'gouvernance' | 'protection' | 'defense' | 'resilience'

export interface RecyfMeasure {
  /** Identifiant officiel, ex. « 10.B.3-EI/EE ». */
  id: string
  /** Sous-section de l'objectif, ex. « Politique de sécurité ». */
  group?: string
  text: string
  /** Attendu d'une entité importante. */
  ei: boolean
  /** Attendu d'une entité essentielle. */
  ee: boolean
}

export interface RecyfObjective {
  n: number
  pillar: RecyfPillar
  title: string
  /** Rappel de l'objectif de sécurité, tel que formulé par l'ANSSI. */
  statement: string
  /** Portée : toutes entités, ou entités essentielles seulement. */
  scope: 'EI+EE' | 'EE'
  /** Dispositions de NIS 2 couvertes par l'objectif. */
  nis2: string[]
  themes: string[]
  measures: RecyfMeasure[]
  /** Certifications ou qualifications opposables lors d'un contrôle. */
  equivalence?: string
}

// ---------------------------------------------------------------------------
// Questionnaire de qualification
// ---------------------------------------------------------------------------

export type QuestionType = 'radio' | 'select' | 'multi' | 'number'

export interface QuestionOption {
  value: string
  label: string
  hint?: string
}

export interface Question {
  id: string
  section: string
  sectionLabel: string
  /** Fondement juridique interrogé — affiché pour justifier la question. */
  basis: string
  question: string
  help?: string
  type: QuestionType
  options?: QuestionOption[]
  unit?: string
  required: boolean
  /** La question n'est posée que si la condition est vraie. */
  showIf?: (answers: Answers) => boolean
}

export type AnswerValue = string | string[] | number | null
export type Answers = Record<string, AnswerValue>

// ---------------------------------------------------------------------------
// Résultat de qualification
// ---------------------------------------------------------------------------

export type VerdictStatus = 'applicable' | 'probable' | 'indirect' | 'hors_champ'

export interface LegalBasis {
  article: string
  label: string
  met: boolean
  detail: string
}

export interface RegulationVerdict {
  regulation: RegulationId
  status: VerdictStatus
  /** Qualification retenue, ex. « Entité essentielle » ou « Entité financière ». */
  qualification: string | null
  basis: LegalBasis[]
  /** Points qui restent à confirmer hors de l'outil. */
  caveats: string[]
  /** Sanction encourue, valorisée avec le chiffre d'affaires déclaré. */
  exposure: {
    tier: string
    maxEur: number | null
    formula: string
  } | null
}

export interface QualificationResult {
  verdicts: Record<RegulationId, RegulationVerdict>
  /** Catégorie NIS 2 retenue, utilisée pour filtrer le ReCyF. */
  nis2Category: 'essentielle' | 'importante' | null
  /** Clés dérivées réutilisées par les conditions d'applicabilité. */
  derived: Record<string, string | boolean | number>
  completedAt: string
}

// ---------------------------------------------------------------------------
// Évaluation de couverture
// ---------------------------------------------------------------------------

/**
 * Trois états, plus l'absence d'évaluation : en place, partiellement en place,
 * absent. Au-delà, la distinction devient subjective et ne tient pas en contrôle.
 */
export const COVERAGE_LEVELS = ['non_evalue', 'absent', 'partiel', 'en_place'] as const
export type CoverageLevel = (typeof COVERAGE_LEVELS)[number]

/** Statut d'une mesure ANSSI, dans le même format à trois états. */
export type MeasureStatus = 'absent' | 'partiel' | 'en_place'

export interface CoverageEntry {
  level: CoverageLevel
  owner?: string
  note?: string
  evidence?: string
  targetDate?: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Priorisation
// ---------------------------------------------------------------------------

export interface PriorityWeights {
  /** Exposition juridique : plafond de sanction et responsabilité dirigeante. */
  exposition: number
  /** Écart constaté entre l'attendu et l'état déclaré. */
  ecart: number
  /** Effet de levier : nombre de textes couverts par une action unique. */
  levier: number
  /** Urgence calendaire au regard des échéances réglementaires. */
  echeance: number
  /** Charge de mise en œuvre — pondération inversée. */
  effort: number
}

export interface PriorityFactor {
  key: keyof PriorityWeights
  label: string
  /** Valeur normalisée entre 0 et 1. */
  raw: number
  weighted: number
  /** Justification lisible de la valeur retenue. */
  rationale: string
}

export interface PrioritisedItem {
  themeId: string
  theme: CrosswalkTheme
  score: number
  rank: number
  factors: PriorityFactor[]
  /** Vague de traitement proposée. */
  wave: 1 | 2 | 3 | 4
  coverage: CoverageLevel
  regulations: RegulationId[]
  /** Thèmes à traiter avant celui-ci. */
  blockedBy: string[]
}

// ---------------------------------------------------------------------------
// Échéancier
// ---------------------------------------------------------------------------

export interface TimelineEvent {
  id: string
  date: string
  /** Date de fin, pour les jalons qui couvrent une période. */
  endDate?: string
  regulation: RegulationId | 'TRANSVERSE'
  title: string
  detail: string
  kind: 'application' | 'transposition' | 'acte' | 'echeance' | 'surveillance' | 'projet'
  /** Concerne uniquement certains profils. */
  appliesWhen?: ScopeCondition[]
  source?: string
}

// ---------------------------------------------------------------------------
// Persistance — miroir des objets du serveur
// ---------------------------------------------------------------------------

export type UserRole = 'consultant' | 'dpo' | 'rssi' | 'juriste' | 'dirigeant' | 'auditeur' | 'autre'

export interface UserProfile {
  id: string
  name: string
  role: UserRole
  organisation: string
  email: string
  is_guest: boolean
  onboarded: boolean
  created_at: string
  updated_at: string
  entity_count: number
}

export interface InternalContact {
  id: string
  role: 'dpo' | 'rssi' | 'direction' | 'juridique' | 'communication' | 'autre'
  name: string
  title: string
  email: string
  phone: string
}

/** Personne citée dans la fiche entité : interlocuteur, sponsor, équipe. */
export interface Stakeholder {
  id: string
  name: string
  role: string
  email: string
}

/**
 * Fiche entité. Deux usages : le cadrage d'un client par un conseil, et le
 * cadrage de sa propre organisation. Les champs communs alimentent la page
 * de garde des rapports.
 */
export interface EntityProfile {
  mode?: 'client' | 'interne'
  legalName?: string
  siren?: string
  address?: string
  website?: string
  group?: string
  /** Mission (client) ou projet (interne). */
  missionRef?: string
  objective?: string
  startDate?: string
  reportDate?: string
  /** Consultant en charge (client) ou pilote du cadrage (interne). */
  lead?: string
  /** Commanditaire côté entité. */
  sponsor?: string
  stakeholders?: Stakeholder[]
}

export const NOTE_TAGS = ['verifier', 'hypothese', 'decision', 'preuve', 'note'] as const
export type NoteTag = (typeof NOTE_TAGS)[number]

/** Où une note est posée : elle se relit dans son contexte. */
export interface NoteAnchor {
  kind: 'general' | 'question' | 'theme' | 'obligation' | 'regulation'
  id: string
  label: string
}

export interface EntityNote {
  id: string
  tag: NoteTag
  text: string
  anchor: NoteAnchor
  resolved: boolean
  createdAt: string
  updatedAt: string
}

export interface EntitySummary {
  id: string
  name: string
  scope_note: string
  sector: string | null
  answered: number
  mode: 'client' | 'interne' | null
  share_enabled: boolean
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface EntityRecord {
  id: string
  user_id: string
  name: string
  scope_note: string
  answers: Answers
  coverage: Record<string, CoverageEntry>
  measures: Record<string, MeasureStatus>
  weights: Partial<PriorityWeights>
  contacts: InternalContact[]
  seen_alerts: string[]
  profile: EntityProfile
  notes: EntityNote[]
  public_snapshot: PublicSnapshot | null
  share_enabled: boolean
  share_token: string
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface Revision {
  id: string
  answers: Answers
  created_at: string
}

/**
 * Scénario d'incident simulé : sert à exercer les délais de notification.
 * Il n'est jamais enregistré — l'outil prépare la réaction, il ne la pilote pas.
 */
export interface IncidentRecord {
  id: string
  entity_id: string
  title: string
  description: string
  detected_at: string
  classified_at: string | null
  corrected_at: string | null
  /** Régimes déclenchés : RGPD, NIS2, DORA, CRA-VULN, CRA-INC. */
  regimes: string[]
  /** Étape de notification → horodatage d'accomplissement. */
  steps: Record<string, string>
  closed: boolean
  created_at: string
  updated_at: string
}

/**
 * Ce que le Trust Center publie. Construit côté client à partir de l'entité,
 * en excluant délibérément chiffres d'affaires, contacts, notes et preuves.
 */
export interface PublicSnapshot {
  generatedAt: string
  sectorLabel: string | null
  score: number
  scores: Partial<Record<RegulationId, number>>
  verdicts: { regulation: RegulationId; status: VerdictStatus; qualification: string | null }[]
  domains: { domain: Domain; label: string; score: number; themes: number }[]
  themesTotal: number
  themesCovered: number
  nis2Category: 'essentielle' | 'importante' | null
}
