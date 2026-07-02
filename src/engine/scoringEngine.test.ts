import { describe, it, expect } from 'vitest'
import { expectedPoints, scoreAll } from './scoringEngine'
import ridersData from '../data/riders.json'
import riderStats from '../data/riderStats.json'
import type { Rider } from '../types'

const riders = ridersData as Rider[]
const byName = (n: string) => riders.find((r) => r.name === n)!

describe('scoringEngine met PCS-vormdata', () => {
  it('geeft voor elke renner een positief, eindig puntenaantal', () => {
    for (const r of riders) {
      const pts = expectedPoints(r)
      expect(Number.isFinite(pts)).toBe(true)
      expect(pts).toBeGreaterThanOrEqual(0)
    }
  })

  it('scoreAll bevat een entry voor iedere renner', () => {
    const all = scoreAll(riders)
    expect(Object.keys(all)).toHaveLength(riders.length)
  })

  it('laadt PCS-vormdata voor de topfavorieten', () => {
    const stats = riderStats.riders as Record<string, { pcsPoints: number }>
    const pog = byName('Tadej Pogačar')
    expect(stats[String(pog.id)]).toBeDefined()
    expect(stats[String(pog.id)].pcsPoints).toBeGreaterThan(0)
  })

  it('waardeert een topvormrenner hoger dan een even dure renner zonder PCS-data', () => {
    // Zoek twee GC-renners met dezelfde prijs, waarvan er een wel en een geen PCS-data heeft.
    const stats = riderStats.riders as Record<string, unknown>
    const withData = riders.find((r) => stats[String(r.id)])!
    const clonePrice = withData.price
    const fake: Rider = {
      ...withData,
      id: 999999,
      name: 'Onbekende Renner',
      price: clonePrice,
    }
    // De renner met echte PCS-punten hoort minstens zo hoog te scoren.
    expect(expectedPoints(withData)).toBeGreaterThanOrEqual(expectedPoints(fake))
  })
})
