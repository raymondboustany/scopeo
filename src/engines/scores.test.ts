import { describe, expect, it } from 'vitest'
import { deriveScoping } from '@/lib/hooks'
import { buildSnapshot, computeScores } from './scores'
import { diffScope } from './diff'
import type { Answers, EntityRecord } from '@/types/domain'

const answers: Answers = {
  secteur: 'energie',
  effectif: 'grande',
  chiffre_affaires: 'gt1000',
  bilan: 'gt43',
  etablissement_ue: 'oui',
  etats_membres: 'un',
  donnees_perso: 'oui',
  role_rgpd: 'responsable',
  donnees_sensibles: 'non',
  suivi_grande_echelle: 'non',
  autorite_publique: 'non',
  transferts_hors_ue: 'non',
  base_consentement: 'non',
  type_taille_independante: ['aucun'],
  services_ict: 'non',
  criticite_service: 'limite',
  entite_critique: 'non',
  entite_financiere: 'non',
  cra_roles: ['aucun'],
  incidents_recents: 'aucun',
  ia_roles: ['aucun'],
}

function entity(patch: Partial<EntityRecord> = {}): EntityRecord {
  return {
    id: 'e',
    user_id: 'u',
    name: 'Test',
    scope_note: 'Note interne sensible',
    answers,
    coverage: {},
    measures: {},
    weights: {},
    contacts: [{ id: 'c', role: 'rssi', name: 'Personne', title: '', email: 'x@y.z', phone: '0600000000' }],
    profile: {},
    notes: [],
    seen_alerts: [],
    public_snapshot: null,
    iso_controls: {},
    share_enabled: false,
    share_token: 't',
    is_demo: false,
    created_at: '',
    updated_at: '',
    ...patch,
  }
}

describe('scores', () => {
  it('vaut zéro sans évaluation, et compte le partiel pour moitié', () => {
    const s = deriveScoping(entity())
    expect(s.scores.global.score).toBe(0)
    const half = Object.fromEntries(s.prioritised.map((p) => [p.themeId, { level: 'partiel' as const, updatedAt: '' }]))
    expect(deriveScoping(entity({ coverage: half })).scores.global.score).toBeCloseTo(0.5, 5)
  })

  it('ne donne un sous-score qu’aux textes applicables', () => {
    const s = deriveScoping(entity())
    const scores = computeScores(s.prioritised, s.applicable)
    expect(Object.keys(scores.byRegulation).sort()).toEqual([...s.applicable].sort())
    expect(scores.byRegulation.CRA).toBeUndefined()
  })
})

describe('instantané public', () => {
  it("n'expose ni contact, ni note, ni réponse, ni montant", () => {
    const s = deriveScoping(entity())
    const snap = buildSnapshot(answers, s.qualification, s.prioritised, s.applicable)
    const text = JSON.stringify(snap)
    expect(text).not.toContain('x@y.z')
    expect(text).not.toContain('sensible')
    expect(text).not.toContain('gt1000')
    expect(Object.keys(snap).sort()).toEqual(
      ['domains', 'generatedAt', 'nis2Category', 'score', 'scores', 'sectorLabel', 'themesCovered', 'themesTotal', 'verdicts'].sort(),
    )
  })
})

describe('comparateur avant / après', () => {
  it('ne signale rien quand rien ne change', () => {
    const d = diffScope(answers, answers)
    expect(d.answers).toHaveLength(0)
    expect(d.added).toHaveLength(0)
    expect(d.removed).toHaveLength(0)
  })

  it('fait apparaître les obligations du CRA quand l’entité devient fabricant', () => {
    const d = diffScope(answers, { ...answers, cra_roles: ['fabricant'], cra_categorie: 'defaut', cra_exclu: 'non' })
    expect(d.comparable).toBe(true)
    expect(d.verdicts.map((v) => v.regulation)).toContain('CRA')
    expect(d.added.length).toBeGreaterThan(0)
    expect(d.added.every((o) => o.regulation === 'CRA')).toBe(true)
    expect(d.removed).toHaveLength(0)
    expect(d.requirementDelta).toBeGreaterThan(0)
  })

  it('fait disparaître les obligations RGPD sans donnée personnelle', () => {
    const d = diffScope(answers, { ...answers, donnees_perso: 'non' })
    expect(d.removed.some((o) => o.regulation === 'RGPD')).toBe(true)
    expect(d.answers.map((a) => a.questionId)).toContain('donnees_perso')
  })
})
