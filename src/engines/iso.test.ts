import { describe, expect, it } from 'vitest'
import {
  effectiveControl,
  isoExclusionAlerts,
  isoOverlap,
  isoRecyfEquivalence,
  isoSuggestionFor,
  isoSuggestions,
  isoThemeView,
  mergeCoverage,
  type IsoContext,
} from './iso'
import { CROSSWALK_BY_ID } from '@/data/crosswalk'
import { ISO_CONTROLS, ISO_MAPPING, ISO_STRUCTURAL_OBLIGATIONS, ISO_STRUCTURAL_THEMES, ISO_THEME_META } from '@/data/iso27001'
import { RECYF_OBJECTIVES } from '@/data/recyf'
import { ALL_OBLIGATIONS, OBLIGATION_BY_ID } from './corpus'
import type { IsoAssessment, IsoProfile, RegulationId } from '@/types/domain'

/**
 * Le module ISO 27001 ne doit jamais inventer de conformité : ces tests
 * vérifient qu'il ne propose rien sans saisie, qu'il plafonne ce qu'il doit
 * plafonner et qu'il se tait quand le périmètre certifié est partiel.
 */

const certified: IsoProfile = { status: 'certifie', validUntil: '2099-12-31', perimeter: 'integral' }
const implemented = { applicability: 'applicable', implementation: 'mis_en_oeuvre' } as const

function ctx(assessment: IsoAssessment | undefined, profile: IsoProfile | undefined = certified, applicable: RegulationId[] = ['RGPD', 'NIS2', 'DORA']): IsoContext {
  return {
    profile,
    assessment,
    applicable,
    inScope: ALL_OBLIGATIONS.filter((o) => applicable.includes(o.regulation)),
  }
}

const allImplemented: IsoAssessment = {
  themes: { A5: implemented, A6: implemented, A7: implemented, A8: implemented },
  controls: {},
  detailed: [],
}

describe('référentiel ISO/IEC 27001:2022', () => {
  it("compte 93 contrôles répartis 37 / 8 / 14 / 34 dans l'annexe A", () => {
    expect(ISO_CONTROLS).toHaveLength(93)
    for (const [theme, meta] of Object.entries(ISO_THEME_META)) {
      expect(ISO_CONTROLS.filter((c) => c.theme === theme)).toHaveLength(meta.count)
    }
  })

  it('ne mappe que des contrôles et des thèmes existants', () => {
    const ids = new Set(ISO_CONTROLS.map((c) => c.id))
    for (const m of ISO_MAPPING) {
      expect(CROSSWALK_BY_ID.has(m.themeId), m.themeId).toBe(true)
      for (const c of m.controls) if (!c.startsWith('C')) expect(ids.has(c), `${m.themeId} ${c}`).toBe(true)
    }
  })

  it('ne classe comme structurelles que des obligations et des thèmes existants', () => {
    for (const id of Object.keys(ISO_STRUCTURAL_OBLIGATIONS)) expect(OBLIGATION_BY_ID.has(id), id).toBe(true)
    for (const id of Object.keys(ISO_STRUCTURAL_THEMES)) expect(CROSSWALK_BY_ID.has(id), id).toBe(true)
  })
})

describe('saisie groupée et détaillée', () => {
  it('applique la saisie du thème à chacun de ses contrôles', () => {
    expect(effectiveControl(allImplemented, '8.15')).toEqual(implemented)
  })

  it('fait primer la saisie du contrôle sur celle du thème', () => {
    const a: IsoAssessment = { ...allImplemented, controls: { '8.15': { applicability: 'non_applicable' } } }
    expect(effectiveControl(a, '8.15').applicability).toBe('non_applicable')
    expect(effectiveControl(a, '8.16')).toEqual(implemented)
  })
})

describe('pré-remplissage', () => {
  it('ne propose rien tant que rien n’est déclaré', () => {
    const s = isoSuggestionFor(CROSSWALK_BY_ID.get('DET-01')!, ctx({ themes: {}, controls: {}, detailed: [] }))
    expect(s?.level).toBeNull()
  })

  it('propose « en place » quand tous les contrôles correspondants sont mis en œuvre', () => {
    expect(isoSuggestionFor(CROSSWALK_BY_ID.get('DET-01')!, ctx(allImplemented))?.level).toBe('en_place')
  })

  it('plafonne à « partiel » quand un contrôle n’est que partiellement mis en œuvre', () => {
    const a: IsoAssessment = { ...allImplemented, controls: { '8.17': { applicability: 'applicable', implementation: 'partiel' } } }
    expect(isoSuggestionFor(CROSSWALK_BY_ID.get('DET-01')!, ctx(a))?.level).toBe('partiel')
  })

  it('plafonne à « partiel » quand un texte applicable va au-delà de la norme', () => {
    const s = isoSuggestionFor(CROSSWALK_BY_ID.get('RES-04')!, ctx(allImplemented, certified, ['NIS2', 'DORA']))
    expect(s?.capped).toBe(true)
    expect(s?.level).toBe('partiel')
  })

  it('désactive le pré-remplissage quand la démarche ne couvre qu’une partie du périmètre', () => {
    const partial: IsoProfile = { ...certified, perimeter: 'partiel', perimeterRegulations: ['NIS2'] }
    const s = isoSuggestionFor(CROSSWALK_BY_ID.get('DET-01')!, ctx(allImplemented, partial))
    expect(s?.blockedByPerimeter).toBe(true)
    expect(s?.level).toBeNull()
  })

  it('ne pré-remplit jamais les délais de notification ni la responsabilité des dirigeants', () => {
    const all = isoSuggestions(ctx(allImplemented))
    for (const id of ['REP-02', 'REP-03', 'GOV-01']) expect(all.has(id), id).toBe(false)
  })

  it('ne pré-remplit rien pour une entité soumise au seul RGPD', () => {
    expect(isoSuggestions(ctx(allImplemented, certified, ['RGPD'])).size).toBe(0)
  })

  it('ne pré-remplit pas les correspondances qui restent à valider', () => {
    for (const m of ISO_MAPPING.filter((x) => x.confidence === 'a_valider')) {
      expect(isoSuggestionFor(CROSSWALK_BY_ID.get(m.themeId)!, ctx(allImplemented)), m.themeId).toBeNull()
    }
  })
})

describe('fusion avec la saisie manuelle', () => {
  const suggestions = isoSuggestions(ctx(allImplemented))

  it('applique la proposition sur un thème non évalué et la marque comme telle', () => {
    const merged = mergeCoverage({}, suggestions)
    expect(merged['DET-01']).toMatchObject({ level: 'en_place', fromIso: true })
  })

  it('laisse toujours primer un niveau choisi à la main', () => {
    const merged = mergeCoverage({ 'DET-01': { level: 'absent', updatedAt: '2026-09-01' } }, suggestions)
    expect(merged['DET-01'].level).toBe('absent')
    expect(merged['DET-01'].fromIso).toBeUndefined()
  })

  it('respecte une proposition écartée par l’utilisateur', () => {
    const merged = mergeCoverage({ 'DET-01': { level: 'non_evalue', isoDismissed: true, updatedAt: '' } }, suggestions)
    expect(merged['DET-01'].level).toBe('non_evalue')
  })
})

describe('alertes et recoupement', () => {
  it('alerte quand un contrôle exclu correspond à une exigence obligatoire d’un texte applicable', () => {
    const a: IsoAssessment = { ...allImplemented, controls: { '8.15': { applicability: 'non_applicable', justification: 'Pas de journalisation' } } }
    const alert = isoExclusionAlerts(ctx(a)).get('DET-01')
    expect(alert?.controls).toContain('8.15')
    expect(alert?.regulations.length).toBeGreaterThan(0)
  })

  it('classe les obligations de notification comme hors du champ de la norme', () => {
    const items = isoOverlap('NIS2', ctx(allImplemented))
    expect(items.find((i) => i.obligation.id === 'NIS2-A23-1')?.category).toBe('structurel')
  })

  it('distingue ce qui est couvert de ce qui ne l’est pas faute de mise en œuvre', () => {
    const none: IsoAssessment = { themes: { A8: { applicability: 'applicable', implementation: 'non_mis_en_oeuvre' } }, controls: {}, detailed: [] }
    const covered = isoOverlap('NIS2', ctx(allImplemented)).filter((i) => i.category === 'couvert').length
    const gaps = isoOverlap('NIS2', ctx(none)).filter((i) => i.category === 'ecart').length
    expect(covered).toBeGreaterThan(0)
    expect(gaps).toBeGreaterThan(0)
  })
})

describe('équivalence ReCyF', () => {
  it('reconnaît les objectifs 2 et 16 à un certificat valide couvrant tout le périmètre', () => {
    const eq = isoRecyfEquivalence(certified, RECYF_OBJECTIVES)
    const ids = Object.keys(eq)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((id) => id.startsWith('2.') || id.startsWith('16.'))).toBe(true)
  })

  it('ne reconnaît rien sans certificat, avec un certificat expiré ou sur un périmètre partiel', () => {
    expect(isoRecyfEquivalence({ status: 'conforme' }, RECYF_OBJECTIVES)).toEqual({})
    expect(isoRecyfEquivalence({ ...certified, validUntil: '2020-01-01' }, RECYF_OBJECTIVES)).toEqual({})
    expect(isoRecyfEquivalence({ ...certified, perimeter: 'partiel' }, RECYF_OBJECTIVES)).toEqual({})
  })
})

describe('vue par exigence pour la carte de croisement', () => {
  it('signale ce qui est hors du champ de la norme par nature', () => {
    expect(isoThemeView('REP-02', ctx(allImplemented)).kind).toBe('structurel')
    expect(isoThemeView('GOV-01', ctx(allImplemented)).structural).toBe('dirigeants')
  })

  it('résume une exigence dont tous les contrôles sont mis en œuvre comme couverte', () => {
    const v = isoThemeView('DET-01', ctx(allImplemented))
    expect(v.kind).toBe('correspondance')
    expect(v.summary).toBe('couvert')
    expect(v.controls.length).toBeGreaterThan(0)
  })

  it('résume une exigence dont le contrôle est exclu comme exclue', () => {
    const a: IsoAssessment = { themes: {}, controls: { '8.15': { applicability: 'non_applicable' }, '8.17': { applicability: 'non_applicable' } }, detailed: [] }
    expect(isoThemeView('DET-01', ctx(a)).summary).toBe('exclu')
  })

  it('reste « non renseigné » tant que rien n’est déclaré', () => {
    expect(isoThemeView('DET-01', ctx({ themes: {}, controls: {}, detailed: [] })).summary).toBe('non_renseigne')
  })

  it('garde une correspondance à valider comme simple piste', () => {
    expect(isoThemeView('RES-02', ctx(allImplemented)).confidence).toBe('a_valider')
  })
})
