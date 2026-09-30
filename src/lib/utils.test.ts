import { describe, expect, it } from 'vitest'
import { daysUntil, parseDate, todayInParis } from './utils'

describe('parseDate', () => {
  it('lit une date seule à minuit heure locale, quel que soit le fuseau', () => {
    const d = parseDate('2027-12-02')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 11, 2, 0])
  })

  it('garde les horodatages complets tels quels', () => {
    expect(parseDate('2026-09-25T10:00:00Z').toISOString()).toBe('2026-09-25T10:00:00.000Z')
  })
})

describe('décompte des jours', () => {
  it("compte en jours calendaires à l'heure de Paris", () => {
    // 30 septembre 2026, 15 h à Paris (13 h UTC) : le 7 octobre est dans 7 jours.
    const now = new Date('2026-09-30T13:00:00Z')
    expect(daysUntil('2026-10-07', now)).toBe(7)
    expect(daysUntil('2026-09-30', now)).toBe(0)
    expect(daysUntil('2026-09-29', now)).toBe(-1)
  })

  it('suit la date française quand il est déjà le lendemain à Paris', () => {
    // 30 septembre, 23 h 30 UTC : 1er octobre, 1 h 30 à Paris.
    const now = new Date('2026-09-30T23:30:00Z')
    expect(todayInParis(now).getDate()).toBe(1)
    expect(daysUntil('2026-10-07', now)).toBe(6)
  })
})
