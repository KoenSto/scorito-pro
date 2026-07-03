import { describe, it, expect } from 'vitest'
import {
  favouritesForClassification,
  favouritesForStageType,
  classificationWeight,
  stageTypeWeight,
  marketScore,
  snapshotDate,
} from './bookmakerEngine'
import odds from '../data/bookmakerOdds.json'
import riders from '../data/riders.json'
import type { Rider } from '../types'

const all = riders as Rider[]
const validIds = new Set(all.map((r) => r.id))
const byName = (part: string) =>
  all.find((r) => r.name.toLowerCase().includes(part.toLowerCase()))!

describe('bookmakerEngine snapshot', () => {
  it('exposes a snapshot date', () => {
    expect(snapshotDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('only references valid rider ids with weights in 0..1', () => {
    const groups = [
      ...Object.values(odds.classifications),
      ...Object.values(odds.stageTypes),
    ] as { riderId: number; weight: number }[][]
    for (const g of groups) {
      for (const f of g) {
        expect(validIds.has(f.riderId)).toBe(true)
        expect(f.weight).toBeGreaterThan(0)
        expect(f.weight).toBeLessThanOrEqual(1)
      }
    }
  })

  it('returns favourites sorted by descending weight', () => {
    const geel = favouritesForClassification('geel')
    for (let i = 1; i < geel.length; i++) {
      expect(geel[i - 1].weight).toBeGreaterThanOrEqual(geel[i].weight)
    }
  })

  it('rates Pogačar as the yellow-jersey favourite', () => {
    const geel = favouritesForClassification('geel')
    expect(geel[0].riderId).toBe(byName('Pogačar').id)
  })

  it('lists sprinters as flat-stage favourites', () => {
    const vlak = favouritesForStageType('Vlak')
    expect(vlak.some((f) => f.riderId === byName('Merlier').id)).toBe(true)
  })

  it('gives 0 weight to riders not in the snapshot', () => {
    expect(classificationWeight(999999, 'geel')).toBe(0)
    expect(stageTypeWeight(999999, 'Berg')).toBe(0)
    expect(marketScore(999999)).toBe(0)
  })

  it('gives a positive market score to a clear favourite', () => {
    expect(marketScore(byName('Pogačar').id)).toBeGreaterThan(0)
  })
})
