import { describe, it, expect } from 'vitest'
import { rateRider, rateAll } from './ratingEngine'
import riders from '../data/riders.json'
import type { Rider } from '../types'

const all = riders as Rider[]

function byName(part: string): Rider {
  const r = all.find((x) => x.name.toLowerCase().includes(part.toLowerCase()))
  if (!r) throw new Error('rider not found: ' + part)
  return r
}

describe('ratingEngine with PCS discipline blending', () => {
  it('rates every rider in the pool', () => {
    const map = rateAll(all)
    expect(Object.keys(map).length).toBe(all.length)
  })

  it('keeps all discipline scores within 0..100', () => {
    for (const r of all) {
      const rating = rateRider(r)
      for (const v of [rating.gc, rating.sprint, rating.mountain, rating.timeTrial, rating.overall]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })

  it('gives a GC/climber leader (Pogačar) a strong mountain score', () => {
    const rating = rateRider(byName('Pogačar'))
    expect(rating.mountain).toBeGreaterThan(50)
    expect(rating.gc).toBeGreaterThan(50)
  })

  it('rates a top sprinter higher on sprint than on mountain', () => {
    const rating = rateRider(byName('Merlier'))
    expect(rating.sprint).toBeGreaterThan(rating.mountain)
  })

  it('is deterministic for the same rider', () => {
    const r = byName('Pogačar')
    expect(rateRider(r)).toEqual(rateRider(r))
  })
})
