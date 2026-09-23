import { describe, expect, it } from 'vitest'
import { qualify, meetsMediumThreshold, exceedsMediumThreshold, applicableRegulations } from './qualification'
import type { Answers } from '@/types/domain'

/**
 * Les cas ci-dessous reprennent des situations que le texte tranche
 * explicitement. Ils servent de garde-fou : une régression sur la
 * qualification fausserait tout ce qui en découle.
 */

const base: Answers = {
  secteur: 'conseil',
  effectif: 'petite',
  chiffre_affaires: '2a10',
  bilan: 'lte10',
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
  entite_financiere: 'non',
  entite_critique: 'non',
  incidents_recents: 'aucun',
  certification: 'non',
}

const answers = (patch: Answers): Answers => ({ ...base, ...patch })

describe('seuils de taille — recommandation 2003/361/CE', () => {
  it('retient le seuil de moyenne entreprise dès 50 personnes', () => {
    expect(meetsMediumThreshold(answers({ effectif: 'moyenne' }))).toBe(true)
  })

  it("n'atteint pas le seuil avec un chiffre d'affaires élevé mais un bilan faible", () => {
    // Le texte exige le franchissement cumulatif du chiffre d'affaires ET du bilan.
    expect(meetsMediumThreshold(answers({ effectif: 'petite', chiffre_affaires: '10a50', bilan: 'lte10' }))).toBe(false)
  })

  it('atteint le seuil quand le chiffre d\'affaires et le bilan dépassent tous deux 10 M€', () => {
    expect(meetsMediumThreshold(answers({ effectif: 'petite', chiffre_affaires: '10a50', bilan: '10a43' }))).toBe(true)
  })

  it('ne dépasse le seuil de grande entreprise que si les deux critères financiers sont franchis', () => {
    expect(exceedsMediumThreshold(answers({ effectif: 'moyenne', chiffre_affaires: '50a250', bilan: '10a43' }))).toBe(false)
    expect(exceedsMediumThreshold(answers({ effectif: 'moyenne', chiffre_affaires: '50a250', bilan: 'gt43' }))).toBe(true)
  })
})

describe('RGPD — articles 2 et 3', () => {
  it("s'applique à une entité établie dans l'Union qui traite des données", () => {
    const r = qualify(base)
    expect(r.verdicts.RGPD.status).toBe('applicable')
  })

  it("s'applique à une entité hors Union qui cible des personnes dans l'Union", () => {
    const r = qualify(answers({ etablissement_ue: 'non', cible_ue: 'oui' }))
    expect(r.verdicts.RGPD.status).toBe('applicable')
    expect(r.verdicts.RGPD.basis.some((b) => b.article.includes('paragraphe 2') && b.met)).toBe(true)
  })

  it("est hors champ pour une entité hors Union qui ne cible pas l'Union", () => {
    const r = qualify(answers({ etablissement_ue: 'non', cible_ue: 'non' }))
    expect(r.verdicts.RGPD.status).toBe('hors_champ')
  })

  it("retient la désignation d'un délégué pour une autorité publique", () => {
    const r = qualify(answers({ autorite_publique: 'oui' }))
    expect(r.verdicts.RGPD.qualification).toContain('délégué')
  })

  it('retient le plafond forfaitaire quand il dépasse le pourcentage', () => {
    // 4 % de 150 M€ = 6 M€, inférieur au plafond de 20 M€ : c'est ce dernier qui s'applique.
    const r = qualify(answers({ chiffre_affaires: '50a250' }))
    expect(r.verdicts.RGPD.exposure?.maxEur).toBe(20_000_000)
  })

  it('retient le pourcentage quand il dépasse le plafond forfaitaire', () => {
    // 4 % de 2 Md€ = 80 M€, supérieur au plafond de 20 M€ : c'est le pourcentage qui s'applique.
    const r = qualify(answers({ chiffre_affaires: 'gt1000' }))
    expect(r.verdicts.RGPD.exposure?.maxEur).toBe(80_000_000)
  })
})

describe('NIS 2 — articles 2 et 3', () => {
  it('écarte une petite entité d\'un secteur non couvert', () => {
    const r = qualify(base)
    expect(r.verdicts.NIS2.status).toBe('hors_champ')
    expect(r.nis2Category).toBeNull()
  })

  it("retient une entité essentielle pour une grande entreprise de l'annexe I", () => {
    const r = qualify(answers({ secteur: 'energie', effectif: 'grande', chiffre_affaires: 'gt1000', bilan: 'gt43' }))
    expect(r.verdicts.NIS2.status).toBe('applicable')
    expect(r.nis2Category).toBe('essentielle')
    expect(r.verdicts.NIS2.exposure?.maxEur).toBe(40_000_000) // 2 % de 2 Md€, supérieur au plafond de 10 M€
  })

  it("retient une entité importante pour une moyenne entreprise de l'annexe I", () => {
    const r = qualify(answers({ secteur: 'energie', effectif: 'moyenne' }))
    expect(r.nis2Category).toBe('importante')
    // 1,4 % de 6 M€ = 84 k€, très inférieur au plafond de 7 M€ : c'est ce dernier qui s'applique.
    expect(r.verdicts.NIS2.exposure?.maxEur).toBe(7_000_000)
  })

  it("retient une entité importante pour un secteur de l'annexe II, même en grande entreprise", () => {
    const r = qualify(answers({ secteur: 'poste', effectif: 'grande', chiffre_affaires: 'gt1000', bilan: 'gt43' }))
    expect(r.nis2Category).toBe('importante')
  })

  it('qualifie un fournisseur DNS d\'entité essentielle quelle que soit sa taille', () => {
    const r = qualify(answers({ effectif: 'micro', chiffre_affaires: 'lt2', type_taille_independante: ['dns'] }))
    expect(r.nis2Category).toBe('essentielle')
  })

  it("qualifie un prestataire de services de confiance non qualifié d'entité importante", () => {
    const r = qualify(answers({ effectif: 'micro', type_taille_independante: ['confiance_non_qualifie'] }))
    expect(r.nis2Category).toBe('importante')
  })

  it('signale un assujettissement probable pour une petite entité critique du secteur', () => {
    const r = qualify(answers({ secteur: 'sante', effectif: 'petite', criticite_service: 'majeur' }))
    expect(r.verdicts.NIS2.status).toBe('probable')
  })
})

describe('DORA — article 2', () => {
  it("s'applique directement à une entité financière", () => {
    const r = qualify(answers({ entite_financiere: 'oui', type_financier: 'credit', dora_regime_simplifie: 'non', dora_tlpt: 'non', tiers_ict_critiques: 'oui' }))
    expect(r.verdicts.DORA.status).toBe('applicable')
    expect(r.verdicts.DORA.qualification).toBe('Entité financière')
  })

  it('signale le cadre simplifié quand il est revendiqué', () => {
    const r = qualify(answers({ entite_financiere: 'oui', type_financier: 'investissement', dora_regime_simplifie: 'oui', tiers_ict_critiques: 'non' }))
    expect(r.verdicts.DORA.qualification).toContain('cadre simplifié')
  })

  it("retient un assujettissement indirect pour un prestataire TIC d'entités financières", () => {
    const r = qualify(answers({ services_ict: 'oui', clients_financiers: 'oui' }))
    expect(r.verdicts.DORA.status).toBe('indirect')
  })

  it('reste hors champ pour un prestataire TIC sans clientèle financière', () => {
    const r = qualify(answers({ services_ict: 'oui', clients_financiers: 'non' }))
    expect(r.verdicts.DORA.status).toBe('hors_champ')
  })
})

describe('entité critique — NIS 2, article 3, paragraphe 1, point f)', () => {
  it("emporte la qualification d'entité essentielle sans condition de taille", () => {
    const r = qualify(answers({ secteur: 'eau_potable', effectif: 'micro', chiffre_affaires: 'lt2', entite_critique: 'oui' }))
    expect(r.nis2Category).toBe('essentielle')
  })
})

describe('CRA — produits comportant des éléments numériques', () => {
  it('retient le fabricant et la catégorie du produit', () => {
    const r = qualify(answers({ cra_roles: ['fabricant'], cra_categorie: 'classe_i', cra_exclu: 'non' }))
    expect(r.verdicts.CRA.status).toBe('applicable')
    expect(r.verdicts.CRA.qualification).toContain('Fabricant')
  })

  it("reste hors champ sans produit mis sur le marché", () => {
    const r = qualify(answers({ cra_roles: ['aucun'] }))
    expect(r.verdicts.CRA.status).toBe('hors_champ')
  })

  it('reste hors champ lorsque tous les produits relèvent d’un régime sectoriel exclu', () => {
    const r = qualify(answers({ cra_roles: ['fabricant'], cra_categorie: 'defaut', cra_exclu: 'oui' }))
    expect(r.verdicts.CRA.status).toBe('hors_champ')
  })
})

describe('articulation DORA / NIS 2', () => {
  it('signale la primauté de DORA lorsque les deux textes trouvent à s\'appliquer', () => {
    const r = qualify(
      answers({
        secteur: 'banque',
        effectif: 'grande',
        chiffre_affaires: 'gt1000',
        bilan: 'gt43',
        entite_financiere: 'oui',
        type_financier: 'credit',
        dora_regime_simplifie: 'non',
        dora_tlpt: 'oui',
        tiers_ict_critiques: 'oui',
      }),
    )
    expect(r.derived.doraPrevails).toBe(true)
    expect(r.verdicts.NIS2.caveats.some((c) => c.includes('lex specialis'))).toBe(true)
  })
})

describe('liste des textes applicables', () => {
  it('ne retient que les textes applicables, probables ou indirects', () => {
    const r = qualify(answers({ secteur: 'energie', effectif: 'grande', chiffre_affaires: 'gt1000', bilan: 'gt43' }))
    const list = applicableRegulations(r)
    expect(list).toContain('RGPD')
    expect(list).toContain('NIS2')
    expect(list).not.toContain('DORA')
  })

  it('renvoie une liste vide en l\'absence de qualification', () => {
    expect(applicableRegulations(null)).toEqual([])
  })
})
