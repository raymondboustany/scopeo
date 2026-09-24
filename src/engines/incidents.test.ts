import { describe, expect, it } from 'vitest'
import { formatRemaining, incidentSteps, nextDeadline, suggestedRegimes } from './incidents'
import type { IncidentRecord } from '@/types/domain'

/**
 * Délais de notification : chaque cas reprend l'article qui fixe l'horloge.
 * Une erreur ici ferait manquer une échéance réelle.
 */

const H = 3_600_000
const T0 = new Date('2026-09-20T08:00:00Z')
const at = (h: number) => new Date(T0.getTime() + h * H)

function incident(patch: Partial<IncidentRecord>): IncidentRecord {
  return {
    id: 'i1',
    entity_id: 'e1',
    title: 'Test',
    description: '',
    detected_at: T0.toISOString(),
    classified_at: null,
    corrected_at: null,
    regimes: [],
    steps: {},
    closed: false,
    created_at: T0.toISOString(),
    updated_at: T0.toISOString(),
    ...patch,
  }
}

const step = (steps: ReturnType<typeof incidentSteps>, id: string) => steps.find((s) => s.id === id)!

describe('RGPD : article 33', () => {
  it('fixe la notification à 72 heures de la prise de connaissance', () => {
    const s = incidentSteps(incident({ regimes: ['RGPD'] }), {}, at(1))
    expect(step(s, 'RGPD-notification').due!.getTime()).toBe(at(72).getTime())
  })

  it('ne chiffre pas la communication aux personnes', () => {
    const s = incidentSteps(incident({ regimes: ['RGPD'] }), {}, at(1))
    expect(step(s, 'RGPD-personnes').due).toBeNull()
    expect(step(s, 'RGPD-personnes').status).toBe('no_deadline')
  })
})

describe('NIS2 : article 23', () => {
  it('enchaîne 24 heures, 72 heures, puis un mois après la notification', () => {
    const s = incidentSteps(incident({ regimes: ['NIS2'] }), {}, at(1))
    expect(step(s, 'NIS2-alerte').due!.getTime()).toBe(at(24).getTime())
    expect(step(s, 'NIS2-notification').due!.getTime()).toBe(at(72).getTime())
    expect(step(s, 'NIS2-final').provisional).toBe(true)
  })

  it('recale le rapport final sur la notification effective', () => {
    const s = incidentSteps(incident({ regimes: ['NIS2'], steps: { 'NIS2-notification': at(30).toISOString() } }), {}, at(31))
    const final = step(s, 'NIS2-final')
    expect(final.provisional).toBe(false)
    const expected = new Date(at(30))
    expected.setMonth(expected.getMonth() + 1)
    expect(final.due!.getTime()).toBe(expected.getTime())
  })
})

describe('DORA : règlement délégué 2025/301, article 5', () => {
  it('retient 4 heures après la classification', () => {
    const s = incidentSteps(incident({ regimes: ['DORA'], classified_at: at(2).toISOString() }), {}, at(3))
    expect(step(s, 'DORA-initiale').due!.getTime()).toBe(at(6).getTime())
  })

  it('plafonne la notification initiale à 24 heures après la détection', () => {
    const s = incidentSteps(incident({ regimes: ['DORA'], classified_at: at(22).toISOString() }), {}, at(22))
    expect(step(s, 'DORA-initiale').due!.getTime()).toBe(at(24).getTime())
  })

  it("retient le plafond, à titre provisoire, tant que l'incident n'est pas classé", () => {
    const s = incidentSteps(incident({ regimes: ['DORA'] }), {}, at(1))
    expect(step(s, 'DORA-initiale').due!.getTime()).toBe(at(24).getTime())
    expect(step(s, 'DORA-initiale').provisional).toBe(true)
  })

  it('fait courir le rapport intermédiaire 72 heures après la notification initiale', () => {
    const s = incidentSteps(
      incident({ regimes: ['DORA'], classified_at: at(1).toISOString(), steps: { 'DORA-initiale': at(3).toISOString() } }),
      {},
      at(4),
    )
    expect(step(s, 'DORA-intermediaire').due!.getTime()).toBe(at(75).getTime())
  })

  it("désigne l'AMF pour un prestataire sur crypto-actifs, l'ACPR pour un établissement de paiement", () => {
    const crypto = incidentSteps(incident({ regimes: ['DORA'] }), { type_financier: 'crypto' }, at(1))
    const paiement = incidentSteps(incident({ regimes: ['DORA'] }), { type_financier: 'paiement' }, at(1))
    expect(step(crypto, 'DORA-initiale').authority).toBe('AMF')
    expect(step(paiement, 'DORA-initiale').authority).toBe('ACPR')
  })
})

describe('CRA : article 14', () => {
  it('attend la date du correctif pour chiffrer le rapport final sur une vulnérabilité', () => {
    const s = incidentSteps(incident({ regimes: ['CRA-VULN'] }), {}, at(1))
    expect(step(s, 'CRA-VULN-final').due).toBeNull()
    const withFix = incidentSteps(incident({ regimes: ['CRA-VULN'], corrected_at: at(48).toISOString() }), {}, at(49))
    expect(step(withFix, 'CRA-VULN-final').due!.getTime()).toBe(at(48 + 14 * 24).getTime())
  })
})

describe('statuts et alertes', () => {
  it('passe en « échéance proche » dans les six dernières heures, puis en dépassement', () => {
    const inc = incident({ regimes: ['RGPD'] })
    expect(step(incidentSteps(inc, {}, at(60)), 'RGPD-notification').status).toBe('running')
    expect(step(incidentSteps(inc, {}, at(67)), 'RGPD-notification').status).toBe('due_soon')
    expect(step(incidentSteps(inc, {}, at(73)), 'RGPD-notification').status).toBe('overdue')
  })

  it('distingue une notification faite à temps de celle faite hors délai', () => {
    const onTime = incidentSteps(incident({ regimes: ['RGPD'], steps: { 'RGPD-notification': at(70).toISOString() } }), {}, at(80))
    const late = incidentSteps(incident({ regimes: ['RGPD'], steps: { 'RGPD-notification': at(75).toISOString() } }), {}, at(80))
    expect(step(onTime, 'RGPD-notification').status).toBe('done_on_time')
    expect(step(late, 'RGPD-notification').status).toBe('done_late')
  })

  it("désigne comme prochaine échéance la plus proche non accomplie", () => {
    const s = incidentSteps(incident({ regimes: ['RGPD', 'NIS2'] }), {}, at(1))
    expect(nextDeadline(s)!.id).toBe('NIS2-alerte')
  })

  it('formate le temps restant et le dépassement', () => {
    expect(formatRemaining(26 * H)).toBe('1 j 2 h')
    expect(formatRemaining(-90 * 60_000)).toBe('dépassé de 1 h 30')
  })
})

describe('régimes proposés', () => {
  it("n'ouvre pas l'horloge NIS2 d'une entité financière, qui notifie au titre de DORA", () => {
    expect(suggestedRegimes(['RGPD', 'NIS2', 'DORA'], { entite_financiere: 'oui' })).toEqual(['RGPD', 'DORA'])
  })

  it('ne propose les horloges du CRA qu’à un fabricant', () => {
    expect(suggestedRegimes(['CRA'], { cra_roles: ['distributeur'] })).toEqual([])
    expect(suggestedRegimes(['CRA'], { cra_roles: ['fabricant'] })).toEqual(['CRA-VULN', 'CRA-INC'])
  })
})
