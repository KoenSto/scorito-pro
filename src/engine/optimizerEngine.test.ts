import { describe, it, expect } from 'vitest'
import { optimizeTeam } from './optimizerEngine'
import { rateAll } from './ratingEngine'
import ridersData from '../data/riders.json'
import rulesData from '../data/rules.json'
import type { Rider, Rules } from '../types'

const riders = ridersData as Rider[]
const rules = rulesData as Rules
const ratings = rateAll(riders)

function teamCountFor(team: Rider[], name: string): number {
  return team.filter((r) => r.team === name).length
}

describe('optimizeTeam', () => {
  const result = optimizeTeam(riders, ratings, rules)

  it('selecteert precies teamSize renners', () => {
    expect(result.team).toHaveLength(rules.teamSize)
  })

  it('blijft binnen het budget', () => {
    expect(result.totalPrice).toBeLessThanOrEqual(rules.budget + 1e-6)
  })

  it('respecteert het maximum aantal renners per ploeg', () => {
    const teams = new Set(result.team.map((r) => r.team))
    for (const t of teams) {
      expect(teamCountFor(result.team, t)).toBeLessThanOrEqual(rules.maxPerTeam)
    }
  })

  it('kiest geen dubbele renners', () => {
    const ids = new Set(result.team.map((r) => r.id))
    expect(ids.size).toBe(result.team.length)
  })

  it('levert een kopman uit het geselecteerde team', () => {
    expect(result.captain).not.toBeNull()
    if (result.captain) {
      expect(result.team.some((r) => r.id === result.captain!.id)).toBe(true)
    }
  })

  it('rapporteert een positief puntentotaal', () => {
    expect(result.totalPoints).toBeGreaterThan(0)
  })
})
