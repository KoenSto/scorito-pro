import { describe, it, expect } from 'vitest'
import { summarizeBudget } from './budgetEngine'
import type { Rider, Rules, RiderRole } from '../types'

const rules: Rules = { budget: 45, teamSize: 20, maxPerTeam: 4 }

function rider(id: number, price: number, team = 'A', role: RiderRole = 'GC'): Rider {
  return {
    id,
    name: `Renner ${id}`,
    team,
    role,
    country: 'NL',
    age: 28,
    price,
  }
}

describe('summarizeBudget', () => {
  it('geeft nul-waarden voor een leeg team', () => {
    const s = summarizeBudget([], rules)
    expect(s.spent).toBe(0)
    expect(s.count).toBe(0)
    expect(s.remaining).toBe(45)
    expect(s.avgPrice).toBe(0)
  })

  it('telt de prijzen correct op en berekent het restbudget', () => {
    const s = summarizeBudget([rider(1, 5), rider(2, 3.5), rider(3, 1.5)], rules)
    expect(s.spent).toBeCloseTo(10)
    expect(s.count).toBe(3)
    expect(s.remaining).toBeCloseTo(35)
  })

  it('markeert het team als ongeldig wanneer het budget wordt overschreden', () => {
    // 20 renners a 5 mln = 100 mln, verdeeld over 5 ploegen (4 per ploeg)
    const big = Array.from({ length: 20 }, (_, i) => rider(i + 1, 5, `T${i % 5}`))
    const s = summarizeBudget(big, rules)
    expect(s.spent).toBe(100)
    expect(s.valid).toBe(false)
    expect(s.violations.some((v) => v.toLowerCase().includes('budget'))).toBe(true)
  })

  it('markeert het team als ongeldig bij te veel renners per ploeg', () => {
    const team = Array.from({ length: 5 }, (_, i) => rider(i + 1, 1, 'SameTeam'))
    const s = summarizeBudget(team, rules)
    expect(s.valid).toBe(false)
    expect(s.violations.some((v) => v.includes('SameTeam'))).toBe(true)
  })

  it('is geldig voor een team binnen alle regels', () => {
    // 20 renners a 2 mln = 40 mln, verdeeld over 6 ploegen (max 4 per ploeg)
    const team = Array.from({ length: 20 }, (_, i) => rider(i + 1, 2, `T${i % 6}`))
    const s = summarizeBudget(team, rules)
    expect(s.count).toBe(20)
    expect(s.spent).toBe(40)
    expect(s.valid).toBe(true)
    expect(s.violations).toHaveLength(0)
  })
})
