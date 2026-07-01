import type { Rider, RiderRating, RiderRole } from '../types'
import { expectedPoints as scoreRider } from './scoringEngine'

/**
 * Scorito Pro Rating Engine (v2)
 *
 * expectedPoints komt nu uit de scoringEngine, die het ECHTE Scorito-
 * puntensysteem gebruikt (scoring.json). De discipline-scores (gc/sprint/
 * mountain/tt) blijven een leesbare inschatting op basis van rol en prijs,
 * puur voor weergave en filtering in de UI.
 *
 * De engine staat los van de UI zodat we hem kunnen blijven verfijnen.
 */

const MAX_PRICE = 8

function base(price: number): number {
  return Math.round((price / MAX_PRICE) * 100)
}

const roleWeights: Record<RiderRole, { gc: number; sprint: number; mountain: number; tt: number }> = {
  GC: { gc: 1.0, sprint: 0.2, mountain: 0.9, tt: 0.8 },
  Klimmer: { gc: 0.6, sprint: 0.1, mountain: 1.0, tt: 0.3 },
  Sprint: { gc: 0.1, sprint: 1.0, mountain: 0.1, tt: 0.3 },
  Klassiek: { gc: 0.3, sprint: 0.6, mountain: 0.4, tt: 0.5 },
  Tijdrit: { gc: 0.5, sprint: 0.2, mountain: 0.3, tt: 1.0 },
  Knecht: { gc: 0.3, sprint: 0.3, mountain: 0.3, tt: 0.3 },
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function rateRider(rider: Rider): RiderRating {
  const b = base(rider.price)
  const w = roleWeights[rider.role] ?? roleWeights.Knecht

  const gc = clamp(b * w.gc)
  const sprint = clamp(b * w.sprint)
  const mountain = clamp(b * w.mountain)
  const timeTrial = clamp(b * w.tt)
  const overall = clamp((gc + sprint + mountain + timeTrial) / 4 + b * 0.4)

  // Echte verwachte Scorito-punten uit het puntensysteem.
  const expectedPoints = scoreRider(rider)

  // Value = verwachte punten per miljoen euro.
  const value = Math.round((expectedPoints / Math.max(0.5, rider.price)) * 10) / 10

  // Captain-geschiktheid: kopman verdubbelt de etappepunten, dus renners met
  // veel punten en hoge kwaliteit zijn de beste kopmannen.
  const captain = Math.round(expectedPoints * (0.7 + 0.3 * (b / 100)))

  const ageRisk = Math.abs(rider.age - 28) * 1.5
  const risk = clamp(40 - b * 0.3 + ageRisk)

  return { riderId: rider.id, gc, sprint, mountain, timeTrial, overall, expectedPoints, value, captain, risk }
}

export function rateAll(riders: Rider[]): Record<number, RiderRating> {
  const map: Record<number, RiderRating> = {}
  for (const r of riders) map[r.id] = rateRider(r)
  return map
}
