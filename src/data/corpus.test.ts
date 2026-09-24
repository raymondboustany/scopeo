import { describe, expect, it } from 'vitest'
import { ALL_OBLIGATIONS, OBLIGATION_BY_ID } from '@/engines/corpus'
import { CROSSWALK, CROSSWALK_BY_ID } from '@/data/crosswalk'
import { RECYF_META, RECYF_OBJECTIVES } from '@/data/recyf'
import { REGULATIONS, REGULATION_ORDER } from '@/data/regulations'
import { QUESTIONS, QUESTION_SECTIONS, SECTORS } from '@/data/questionnaire'
import { RECURRING_DUTIES, TIMELINE } from '@/data/timeline'

/**
 * Intégrité du corpus.
 *
 * Ces tests ne vérifient pas le droit, ils vérifient que les renvois internes
 * tiennent. Un thème qui pointe vers une obligation inexistante, ou une
 * obligation qui invoque un palier de sanction absent, produirait une fiche
 * silencieusement trouée.
 */

describe('obligations', () => {
  it('ont toutes un identifiant unique', () => {
    const ids = ALL_OBLIGATIONS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('renvoient à un palier de sanction existant dans leur règlement', () => {
    for (const o of ALL_OBLIGATIONS) {
      const tiers = REGULATIONS[o.regulation].sanctions.map((s) => s.id)
      expect(tiers, `${o.id} : palier ${o.sanctionTier}`).toContain(o.sanctionTier)
    }
  })

  it('renvoient à des thèmes de croisement existants', () => {
    for (const o of ALL_OBLIGATIONS) {
      for (const t of o.themes) {
        expect(CROSSWALK_BY_ID.has(t), `${o.id} → thème ${t}`).toBe(true)
      }
    }
  })

  it('portent au moins une exigence élémentaire et une preuve attendue', () => {
    for (const o of ALL_OBLIGATIONS) {
      expect(o.requirements.length, o.id).toBeGreaterThan(0)
      expect(o.evidence.length, o.id).toBeGreaterThan(0)
    }
  })

  it('ont des identifiants d\'exigence uniques au sein du corpus', () => {
    const ids = ALL_OBLIGATIONS.flatMap((o) => o.requirements.map((r) => r.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('renvoient vers une source officielle', () => {
    for (const o of ALL_OBLIGATIONS) {
      expect(o.sourceUrl, o.id).toMatch(/^https:\/\/eur-lex\.europa\.eu\//)
    }
  })

  it('couvrent les cinq textes', () => {
    expect(REGULATION_ORDER).toHaveLength(5)
    for (const id of REGULATION_ORDER) {
      expect(ALL_OBLIGATIONS.filter((o) => o.regulation === id).length, id).toBeGreaterThan(0)
    }
  })
})

describe('croisements', () => {
  it('ont un identifiant et un code uniques', () => {
    expect(new Set(CROSSWALK.map((t) => t.id)).size).toBe(CROSSWALK.length)
    expect(new Set(CROSSWALK.map((t) => t.code)).size).toBe(CROSSWALK.length)
  })

  it('renvoient à des obligations existantes', () => {
    for (const t of CROSSWALK) {
      for (const m of t.mappings) {
        for (const id of m.obligationIds) {
          expect(OBLIGATION_BY_ID.has(id), `${t.id} → ${id}`).toBe(true)
        }
      }
    }
  })

  it('associent chaque obligation citée au règlement annoncé', () => {
    for (const t of CROSSWALK) {
      for (const m of t.mappings) {
        for (const id of m.obligationIds) {
          expect(OBLIGATION_BY_ID.get(id)!.regulation, `${t.id} → ${id}`).toBe(m.regulation)
        }
      }
    }
  })

  it('croisent au moins deux textes, faute de quoi le thème ne croise rien', () => {
    for (const t of CROSSWALK) {
      expect(t.mappings.length, t.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('nomment la règle qui commande pour chaque divergence', () => {
    for (const t of CROSSWALK.filter((x) => x.relation === 'divergence')) {
      expect(t.strictest, `${t.id} : divergence sans règle désignée`).toBeDefined()
      expect(t.strictest!.rationale.length).toBeGreaterThan(40)
    }
  })

  it('nomment le texte qui prime pour chaque hiérarchie', () => {
    for (const t of CROSSWALK.filter((x) => x.relation === 'hierarchie')) {
      expect(t.precedence, `${t.id} : hiérarchie sans texte désigné`).toBeDefined()
      expect(t.precedence!.over.length).toBeGreaterThan(0)
      expect(t.precedence!.over).not.toContain(t.precedence!.prevails)
    }
  })

  it('renvoient à des objectifs ReCyF existants', () => {
    const known = new Set(RECYF_OBJECTIVES.map((o) => o.n))
    for (const t of CROSSWALK) {
      for (const n of t.recyf ?? []) {
        expect(known.has(n), `${t.id} → objectif ${n}`).toBe(true)
      }
    }
  })

  it('sont tous atteignables depuis au moins une obligation', () => {
    const referenced = new Set(ALL_OBLIGATIONS.flatMap((o) => o.themes))
    for (const t of CROSSWALK) {
      expect(referenced.has(t.id), `${t.id} n'est cité par aucune obligation`).toBe(true)
    }
  })
})

describe('ReCyF', () => {
  it('comporte vingt objectifs et le nombre de mesures annoncé', () => {
    expect(RECYF_OBJECTIVES).toHaveLength(20)
    expect(RECYF_META.totalMeasures).toBe(152)
  })

  it('a des numéros d\'objectif uniques de 1 à 20', () => {
    const ns = RECYF_OBJECTIVES.map((o) => o.n).sort((a, b) => a - b)
    expect(ns).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  it('a des identifiants de mesure uniques', () => {
    const ids = RECYF_OBJECTIVES.flatMap((o) => o.measures.map((m) => m.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("encode dans l'identifiant la même applicabilité que les drapeaux", () => {
    for (const o of RECYF_OBJECTIVES) {
      for (const m of o.measures) {
        const expectsBoth = m.id.endsWith('-EI/EE')
        expect(m.ei, m.id).toBe(expectsBoth)
        expect(m.ee, m.id).toBe(true)
      }
    }
  })

  it('préfixe chaque mesure du numéro de son objectif', () => {
    for (const o of RECYF_OBJECTIVES) {
      for (const m of o.measures) {
        expect(m.id.startsWith(`${o.n}.`), `${m.id} sous l'objectif ${o.n}`).toBe(true)
      }
    }
  })

  it("n'attend aucune mesure d'une entité importante sur un objectif qui lui est étranger", () => {
    for (const o of RECYF_OBJECTIVES.filter((x) => x.scope === 'EE')) {
      expect(o.measures.every((m) => !m.ei), `objectif ${o.n}`).toBe(true)
    }
  })

  it('renvoie à des thèmes de croisement existants', () => {
    for (const o of RECYF_OBJECTIVES) {
      for (const t of o.themes) {
        expect(CROSSWALK_BY_ID.has(t), `objectif ${o.n} → ${t}`).toBe(true)
      }
    }
  })
})

describe('questionnaire', () => {
  it('a des identifiants de question uniques', () => {
    const ids = QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('rattache chaque question à une section déclarée', () => {
    const sections = new Set(QUESTION_SECTIONS.map((s) => s.id))
    for (const q of QUESTIONS) {
      expect(sections.has(q.section), q.id).toBe(true)
    }
  })

  it('accompagne chaque question de son fondement juridique', () => {
    for (const q of QUESTIONS) {
      expect(q.basis.length, q.id).toBeGreaterThan(5)
    }
  })

  it('propose des options à toute question qui en attend', () => {
    for (const q of QUESTIONS.filter((x) => x.type !== 'number')) {
      expect(q.options?.length ?? 0, q.id).toBeGreaterThan(1)
      const values = q.options!.map((o) => o.value)
      expect(new Set(values).size, q.id).toBe(values.length)
    }
  })

  it('a des valeurs de secteur uniques', () => {
    const values = SECTORS.map((s) => s.value)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('échéancier', () => {
  it('a des identifiants uniques et des dates valides', () => {
    expect(new Set(TIMELINE.map((e) => e.id)).size).toBe(TIMELINE.length)
    for (const e of TIMELINE) {
      expect(Number.isNaN(new Date(e.date).getTime()), e.id).toBe(false)
    }
  })

  it('rattache chaque charge récurrente à un texte couvert', () => {
    for (const d of RECURRING_DUTIES) {
      expect(REGULATION_ORDER, d.id).toContain(d.regulation)
    }
  })
})
