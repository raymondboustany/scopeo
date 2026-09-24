import type {
  CoverageEntry,
  CoverageLevel,
  CrosswalkTheme,
  IsoAssessment,
  IsoControlEntry,
  IsoProfile,
  MeasureStatus,
  Obligation,
  RecyfObjective,
  RegulationId,
} from '@/types/domain'
import { CROSSWALK } from '@/data/crosswalk'
import {
  ISO_CLAUSE_BY_ID,
  ISO_CONTROLS,
  ISO_CONTROL_BY_ID,
  ISO_MAPPING_BY_THEME,
  ISO_PREFILL_REGULATIONS,
  ISO_RECYF_EQUIVALENCE,
  ISO_STRUCTURAL_OBLIGATIONS,
  ISO_STRUCTURAL_THEMES,
  type IsoStructuralCategory,
  type IsoThemeMapping,
} from '@/data/iso27001'
import { isoCertificateValid } from './scores'

/**
 * Moteur ISO/IEC 27001.
 *
 * Il ne décide jamais à la place de l'utilisateur : il propose un état de
 * départ pour les exigences réglementaires qui ont une contrepartie ISO, et
 * signale ce que la démarche ISO laisse de côté. Toute saisie manuelle prime
 * sur ce qu'il propose.
 */

// ---------------------------------------------------------------------------
// État effectif d'un contrôle
// ---------------------------------------------------------------------------

/** La saisie contrôle par contrôle prime sur la saisie groupée du thème. */
export function effectiveControl(assessment: IsoAssessment | undefined, controlId: string): IsoControlEntry {
  if (!assessment) return {}
  const control = ISO_CONTROL_BY_ID.get(controlId)
  if (!control) return {}
  const own = assessment.controls?.[controlId]
  if (own?.applicability) return own
  return assessment.themes?.[control.theme] ?? {}
}

/** Les clauses du système de management suivent le statut déclaré de la démarche. */
function clauseEntry(profile: IsoProfile | undefined): IsoControlEntry {
  switch (profile?.status) {
    case 'certifie':
    case 'conforme':
      return { applicability: 'applicable', implementation: 'mis_en_oeuvre' }
    case 'partiel':
      return { applicability: 'applicable', implementation: 'partiel' }
    default:
      return {}
  }
}

export function controlState(controlId: string, profile: IsoProfile | undefined, assessment: IsoAssessment | undefined): IsoControlEntry {
  return controlId.startsWith('C') ? clauseEntry(profile) : effectiveControl(assessment, controlId)
}

const isImplemented = (e: IsoControlEntry) => e.applicability === 'applicable' && e.implementation === 'mis_en_oeuvre'
const isPartly = (e: IsoControlEntry) => e.applicability === 'applicable' && e.implementation === 'partiel'

/** Nombre de contrôles renseignés, pour l'avancement du module. */
export function isoProgress(assessment: IsoAssessment | undefined) {
  const states = ISO_CONTROLS.map((c) => effectiveControl(assessment, c.id))
  return {
    total: ISO_CONTROLS.length,
    assessed: states.filter((e) => e.applicability === 'non_applicable' || (e.applicability === 'applicable' && e.implementation)).length,
    notApplicable: states.filter((e) => e.applicability === 'non_applicable').length,
    implemented: states.filter(isImplemented).length,
    partial: states.filter(isPartly).length,
    notImplemented: states.filter((e) => e.applicability === 'applicable' && e.implementation === 'non_mis_en_oeuvre').length,
  }
}

// ---------------------------------------------------------------------------
// Contexte
// ---------------------------------------------------------------------------

export interface IsoContext {
  profile: IsoProfile | undefined
  assessment: IsoAssessment | undefined
  applicable: RegulationId[]
  /** Obligations retenues dans le périmètre de l'entité. */
  inScope: Obligation[]
}

/** La démarche déclarée ne couvre qu'une partie du périmètre réglementaire. */
export function perimeterIsPartial(profile: IsoProfile | undefined): boolean {
  return profile?.status !== undefined && profile.status !== 'aucune' && profile.perimeter === 'partiel'
}

// ---------------------------------------------------------------------------
// Pré-remplissage des exigences unifiées
// ---------------------------------------------------------------------------

export interface IsoSuggestion {
  themeId: string
  /** Niveau proposé, ou null lorsque rien ne peut être proposé. */
  level: Exclude<CoverageLevel, 'non_evalue'> | null
  controls: { id: string; state: IsoControlEntry }[]
  capped: boolean
  capReason?: string
  /** Pré-remplissage désactivé car la démarche ne couvre qu'une partie du périmètre. */
  blockedByPerimeter: boolean
  /** Référentiels du thème qui justifient le pré-remplissage. */
  regulations: RegulationId[]
}

function mappingApplies(theme: CrosswalkTheme, ctx: IsoContext): RegulationId[] {
  return theme.mappings
    .map((m) => m.regulation)
    .filter((r, i, all) => ISO_PREFILL_REGULATIONS.includes(r) && ctx.applicable.includes(r) && all.indexOf(r) === i)
}

function capFor(mapping: IsoThemeMapping, ctx: IsoContext): boolean {
  if (mapping.capWhen?.some((r) => ctx.applicable.includes(r))) return true
  const ids = new Set(ctx.inScope.map((o) => o.id))
  return Boolean(mapping.capWhenObligations?.some((id) => ids.has(id)))
}

export function isoSuggestionFor(theme: CrosswalkTheme, ctx: IsoContext): IsoSuggestion | null {
  if (ISO_STRUCTURAL_THEMES[theme.id]) return null
  const mapping = ISO_MAPPING_BY_THEME.get(theme.id)
  if (!mapping || mapping.confidence !== 'etablie') return null
  const regulations = mappingApplies(theme, ctx)
  if (regulations.length === 0) return null

  const controls = mapping.controls.map((id) => ({ id, state: controlState(id, ctx.profile, ctx.assessment) }))
  const anyCovered = controls.some((c) => isImplemented(c.state) || isPartly(c.state))
  const allImplemented = controls.every((c) => isImplemented(c.state))
  const capped = capFor(mapping, ctx)
  const blockedByPerimeter = perimeterIsPartial(ctx.profile)

  let level: IsoSuggestion['level'] = null
  if (anyCovered && !blockedByPerimeter) level = allImplemented && !capped ? 'en_place' : 'partiel'

  return { themeId: theme.id, level, controls, capped, capReason: capped ? mapping.capReason : undefined, blockedByPerimeter, regulations }
}

/** Propositions pour tous les thèmes concernés. */
export function isoSuggestions(ctx: IsoContext): Map<string, IsoSuggestion> {
  const out = new Map<string, IsoSuggestion>()
  for (const theme of CROSSWALK) {
    const s = isoSuggestionFor(theme, ctx)
    if (s) out.set(theme.id, s)
  }
  return out
}

/** Le niveau d'un thème a-t-il été choisi, ou la proposition ISO écartée, à la main ? */
export function isManualLevel(entry: CoverageEntry | undefined): boolean {
  return Boolean(entry && (entry.level !== 'non_evalue' || entry.isoDismissed))
}

/**
 * Couverture effective : un niveau choisi à la main prime toujours ; à
 * défaut, la proposition ISO s'applique. Les champs saisis par ailleurs
 * (preuve, commentaire, porteur) sont conservés.
 */
export function mergeCoverage(
  manual: Record<string, CoverageEntry>,
  suggestions: Map<string, IsoSuggestion>,
): Record<string, CoverageEntry> {
  const merged: Record<string, CoverageEntry> = { ...manual }
  for (const [themeId, s] of suggestions) {
    const entry = merged[themeId]
    if (isManualLevel(entry) || !s.level) continue
    merged[themeId] = { ...(entry ?? { updatedAt: '' }), level: s.level, fromIso: true }
  }
  return merged
}

// ---------------------------------------------------------------------------
// Équivalence ReCyF reconnue par l'ANSSI
// ---------------------------------------------------------------------------

/** Mesures des objectifs 2 et 16 réputées en place grâce à un certificat valide. */
export function isoRecyfEquivalence(profile: IsoProfile | undefined, recyf: RecyfObjective[]): Record<string, MeasureStatus> {
  if (!isoCertificateValid(profile) || perimeterIsPartial(profile)) return {}
  const out: Record<string, MeasureStatus> = {}
  for (const o of recyf) {
    if (!ISO_RECYF_EQUIVALENCE.includes(o.n)) continue
    for (const m of o.measures) out[m.id] = 'en_place'
  }
  return out
}

// ---------------------------------------------------------------------------
// Contrôles exclus : alertes
// ---------------------------------------------------------------------------

export interface IsoExclusionAlert {
  themeId: string
  controls: string[]
  regulations: RegulationId[]
}

/**
 * Un contrôle déclaré non applicable ne supprime pas l'obligation
 * réglementaire correspondante. L'alerte vise les exigences obligatoires
 * d'un texte applicable, dans le périmètre de l'entité.
 */
export function isoExclusionAlerts(ctx: IsoContext): Map<string, IsoExclusionAlert> {
  const out = new Map<string, IsoExclusionAlert>()
  for (const theme of CROSSWALK) {
    const mapping = ISO_MAPPING_BY_THEME.get(theme.id)
    if (!mapping) continue
    const excluded = mapping.controls.filter((id) => !id.startsWith('C') && effectiveControl(ctx.assessment, id).applicability === 'non_applicable')
    if (excluded.length === 0) continue
    const regulations = [
      ...new Set(
        ctx.inScope
          .filter((o) => o.binding === 'obligatoire' && o.themes.includes(theme.id) && ctx.applicable.includes(o.regulation))
          .map((o) => o.regulation),
      ),
    ]
    if (regulations.length > 0) out.set(theme.id, { themeId: theme.id, controls: excluded, regulations })
  }
  return out
}

// ---------------------------------------------------------------------------
// Recoupement par référentiel
// ---------------------------------------------------------------------------

export type IsoOverlapCategory = 'couvert' | 'ecart' | 'structurel' | 'sans_correspondance'

export interface IsoOverlapItem {
  obligation: Obligation
  category: IsoOverlapCategory
  controls: string[]
  structural?: IsoStructuralCategory
}

/** Contrôles ISO de correspondance établie pour une obligation, via ses thèmes. */
export function controlsForObligation(o: Obligation): string[] {
  const ids = new Set<string>()
  for (const t of o.themes) {
    if (ISO_STRUCTURAL_THEMES[t]) continue
    const m = ISO_MAPPING_BY_THEME.get(t)
    if (m?.confidence === 'etablie') m.controls.forEach((c) => ids.add(c))
  }
  return [...ids]
}

/**
 * Répartit les obligations d'un référentiel en trois catégories : couvertes
 * par ISO 27001, non couvertes alors qu'un contrôle correspondant existe
 * (exclu ou non mis en œuvre), et hors du champ d'ISO 27001 par nature. Les
 * obligations sans correspondance établie sont comptées à part.
 */
export function isoOverlap(regulation: RegulationId, ctx: IsoContext): IsoOverlapItem[] {
  return ctx.inScope
    .filter((o) => o.regulation === regulation)
    .map((o) => {
      const structural = ISO_STRUCTURAL_OBLIGATIONS[o.id]
      if (structural) return { obligation: o, category: 'structurel' as const, controls: [], structural }
      const controls = controlsForObligation(o)
      if (controls.length === 0) return { obligation: o, category: 'sans_correspondance' as const, controls }
      const covered = controls.some((id) => {
        const s = controlState(id, ctx.profile, ctx.assessment)
        return isImplemented(s) || isPartly(s)
      })
      return { obligation: o, category: covered ? ('couvert' as const) : ('ecart' as const), controls }
    })
}

// ---------------------------------------------------------------------------
// Vue par exigence unifiée, pour la carte de croisement
// ---------------------------------------------------------------------------

/** État d'un contrôle au regard de la démarche déclarée. */
export type IsoControlStatus = 'mis_en_oeuvre' | 'partiel' | 'non_mis_en_oeuvre' | 'exclu' | 'non_renseigne'

/** Synthèse d'une exigence : ce que la démarche ISO en dit. */
export type IsoThemeSummary = 'couvert' | 'partiel' | 'ecart' | 'exclu' | 'non_renseigne'

export interface IsoThemeView {
  themeId: string
  /** Hors champ par nature, sans correspondance, ou correspondance à afficher. */
  kind: 'structurel' | 'aucune' | 'correspondance'
  structural?: IsoStructuralCategory
  /** Correspondance établie, ou simple piste à faire valider. */
  confidence?: 'etablie' | 'a_valider'
  controls: { id: string; title: string; status: IsoControlStatus }[]
  summary: IsoThemeSummary
  capReason?: string
  note?: string
}

function controlStatus(entry: IsoControlEntry): IsoControlStatus {
  if (entry.applicability === 'non_applicable') return 'exclu'
  if (entry.applicability !== 'applicable') return 'non_renseigne'
  if (entry.implementation === 'mis_en_oeuvre') return 'mis_en_oeuvre'
  if (entry.implementation === 'partiel') return 'partiel'
  if (entry.implementation === 'non_mis_en_oeuvre') return 'non_mis_en_oeuvre'
  return 'non_renseigne'
}

/** Ce que la démarche ISO déclarée dit d'une exigence unifiée, contrôle par contrôle. */
export function isoThemeView(themeId: string, ctx: IsoContext): IsoThemeView {
  const structural = ISO_STRUCTURAL_THEMES[themeId]
  if (structural) return { themeId, kind: 'structurel', structural, controls: [], summary: 'non_renseigne' }
  const mapping = ISO_MAPPING_BY_THEME.get(themeId)
  if (!mapping) return { themeId, kind: 'aucune', controls: [], summary: 'non_renseigne' }

  const controls = mapping.controls.map((id) => ({
    id,
    title: ISO_CONTROL_BY_ID.get(id)?.title ?? ISO_CLAUSE_BY_ID.get(id)?.title ?? id,
    status: controlStatus(controlState(id, ctx.profile, ctx.assessment)),
  }))
  const statuses = controls.map((c) => c.status)
  let summary: IsoThemeSummary
  if (statuses.every((x) => x === 'non_renseigne')) summary = 'non_renseigne'
  else if (statuses.every((x) => x === 'mis_en_oeuvre')) summary = 'couvert'
  else if (statuses.some((x) => x === 'exclu') && !statuses.some((x) => x === 'mis_en_oeuvre' || x === 'partiel')) summary = 'exclu'
  else if (statuses.some((x) => x === 'mis_en_oeuvre' || x === 'partiel')) summary = 'partiel'
  else summary = 'ecart'

  return {
    themeId,
    kind: 'correspondance',
    confidence: mapping.confidence,
    controls,
    summary,
    capReason: capFor(mapping, ctx) ? mapping.capReason : undefined,
    note: mapping.note,
  }
}
