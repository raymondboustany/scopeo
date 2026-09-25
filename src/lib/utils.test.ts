import { describe, expect, it } from 'vitest'
import { parseDate } from './utils'

describe('parseDate', () => {
  it('lit une date seule à minuit heure locale, quel que soit le fuseau', () => {
    const d = parseDate('2027-12-02')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 11, 2, 0])
  })

  it('garde les horodatages complets tels quels', () => {
    expect(parseDate('2026-09-25T10:00:00Z').toISOString()).toBe('2026-09-25T10:00:00.000Z')
  })
})
