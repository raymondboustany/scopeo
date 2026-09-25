import { describe, expect, it } from 'vitest'
import { DEFAULT_WEIGHTS, coverageRatio, prioritise } from './prioritisation'
import { qualify } from './qualification'
import { scopeObligations } from './corpus'
import { CROSSWALK } from '@/data/crosswalk'
import type { Answers, CoverageEntry } from '@/types/domain'

const profile: Answers = {
  secteur: 'energie',
  effectif: 'grande',
  chiffre_affaires: 'gt1000',
  bilan: 'gt43',
  etablissement_ue: 'oui',
  etats_membres: 'deux_cinq',
  donnees_perso: 'oui',
  role_rgpd: 'les_deux',
  donnees_sensibles: 'non',
  suivi_grande_echelle: 'non',
  autorite_publique: 'non',
  transferts_hors_ue: 'oui',
  base_consentement: 'non',
  type_taille_independante: ['aucun'],
  services_ict: 'non',
  criticite_service: 'majeur',
  entite_financiere: 'non',
  service_essentiel: 'oui',
  notifie_rec: 'non',
  oiv: 'non',
  incidents_recents: 'aucun',
  ia_roles: ['aucun'],
}

function run(coverage: Record<string, CoverageEntry> = {}, weights = DEFAULT_WEIGHTS) {
  const qualification = qualify(profile)
  const obligations = scopeObligations(profile, qualification).filter((o) => o.inScope)
  return prioritise({ qualification, coverage, weights, obligations })
}

const entry = (level: CoverageEntry['level']): CoverageEntry => ({ level, updatedAt: '2026-09-22' })

describe('moteur de priorisation', () => {
  it('ne retient que les thèmes portés par une obligation applicable', () => {
    const items = run()
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(CROSSWALK.length)
    for (const item of items) {
      expect(item.regulations.length).toBeGreaterThan(0)
    }
  })

  it('produit un classement strictement ordonné et sans trou', () => {
    const items = run()
    expect(items.map((i) => i.rank)).toEqual(items.map((_, i) => i + 1))
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].score).toBeGreaterThanOrEqual(items[i].score)
    }
  })

  it('expose chaque facteur avec sa justification', () => {
    const [first] = run()
    expect(first.factors).toHaveLength(5)
    for (const f of first.factors) {
      expect(f.rationale.length).toBeGreaterThan(10)
      expect(f.raw).toBeGreaterThanOrEqual(0)
      expect(f.raw).toBeLessThanOrEqual(1)
    }
  })

  it('fait descendre un thème dont la couverture est déclarée complète', () => {
    const before = run()
    const target = before[0].themeId
    const after = run({ [target]: entry('en_place') })
    const rankBefore = before.find((i) => i.themeId === target)!.rank
    const rankAfter = after.find((i) => i.themeId === target)!.rank
    expect(rankAfter).toBeGreaterThan(rankBefore)
  })

  it("fait remonter un thème quand le poids de l'écart augmente", () => {
    const coverage = Object.fromEntries(
      run().map((i, idx) => [i.themeId, entry(idx % 2 === 0 ? 'en_place' : 'absent')]),
    )
    const gapFocused = run(coverage, { ...DEFAULT_WEIGHTS, ecart: 80, exposition: 5, levier: 5, echeance: 5, effort: 5 })
    // Avec un poids d'écart dominant, la tête de classement ne peut plus être un thème déjà couvert.
    expect(gapFocused[0].coverage).not.toBe('en_place')
  })

  it('respecte les antériorités techniques en repoussant les thèmes bloqués', () => {
    const items = run()
    for (const item of items) {
      for (const dep of item.blockedBy) {
        const prerequisite = items.find((i) => i.themeId === dep)
        expect(prerequisite).toBeDefined()
        expect(prerequisite!.rank).toBeLessThan(item.rank)
      }
      if (item.blockedBy.length > 0) {
        expect(item.wave).toBeGreaterThan(1)
      }
    }
  })

  it('répartit toutes les exigences sur quatre phases au plus', () => {
    const items = run()
    for (const item of items) {
      expect([1, 2, 3, 4]).toContain(item.wave)
    }
  })
})

describe('taux de couverture', () => {
  it('vaut zéro sans évaluation', () => {
    expect(coverageRatio(run())).toBe(0)
  })

  it('vaut un lorsque tout est en place', () => {
    const items = run()
    const full = Object.fromEntries(items.map((i) => [i.themeId, entry('en_place')]))
    expect(coverageRatio(run(full))).toBe(1)
  })

  it('pondère les niveaux intermédiaires', () => {
    const items = run()
    const partial = Object.fromEntries(items.map((i) => [i.themeId, entry('partiel')]))
    expect(coverageRatio(run(partial))).toBeCloseTo(0.5, 5)
  })

  it('renvoie zéro sur une liste vide plutôt que de diviser par zéro', () => {
    expect(coverageRatio([])).toBe(0)
  })
})

describe('restriction du corpus au profil', () => {
  it("écarte les obligations dont la condition n'est pas remplie", () => {
    const qualification = qualify({ ...profile, transferts_hors_ue: 'non' })
    const scoped = scopeObligations({ ...profile, transferts_hors_ue: 'non' }, qualification)
    const transfers = scoped.find((o) => o.id === 'RGPD-A44-49')!
    expect(transfers.inScope).toBe(false)
    expect(transfers.unmetConditions.length).toBeGreaterThan(0)
  })

  it('retient ces mêmes obligations quand la condition est remplie', () => {
    const qualification = qualify(profile)
    const scoped = scopeObligations(profile, qualification)
    expect(scoped.find((o) => o.id === 'RGPD-A44-49')!.inScope).toBe(true)
  })

  it("écarte le régime NIS2 de gestion des risques pour une entité financière soumise à DORA", () => {
    // Article 4 de NIS2 : DORA, lex specialis, se substitue sur ce champ.
    const financial: Answers = {
      ...profile,
      secteur: 'banque',
      entite_financiere: 'oui',
      type_financier: 'credit',
      dora_regime_simplifie: 'non',
      dora_tlpt: 'non',
      tiers_ict_critiques: 'oui',
      service_essentiel: 'non',
    }
    const qualification = qualify(financial)
    const scoped = scopeObligations(financial, qualification)
    const nis2Risk = scoped.find((o) => o.id === 'NIS2-A21-2a')!
    expect(nis2Risk.inScope).toBe(false)
    expect(nis2Risk.reservedTo).toBe('DORA')
  })
})
