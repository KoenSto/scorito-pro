import type { Rider, RiderRating, RiderRole } from '../types'

/**
 * Scorito Pro Rating Engine (v1)
 *
 * Placeholder heuristiek: leidt discipline-scores af uit rol en prijs.
 * De prijs (0..6 mln) fungeert als proxy voor kwaliteit tot we echte
 * historische Scorito-punten koppelen. Alles wordt genormaliseerd naar 0..100.
 *
 * Deze engine staat bewust los van de UI zodat we hem later kunnen
 * uitbreiden met echte data zonder de componenten aan te passen.
 */

const MAX_PRICE = 6

function base(price: number): number {
  return Math.round((price / MAX_PRICE) * 100)
}

// Relatieve nadruk per discipline afhankelijk van de rol.
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

  // Verwachte Tour-punten: grove schatting op basis van overall.
  const expectedPoints = Math.round(overall * 3.2)

  // Value = punten per miljoen (hoger is beter).
  const value = clamp((expectedPoints / Math.max(0.3, rider.price)) / 3)

  // Captain-geschiktheid weegt overall zwaarder (kopman verdubbelt punten).
  const captain = clamp(overall * 0.7 + value * 0.3)

  // Risico: goedkope renners en jonge/oude renners zijn wisselvalliger.
  const ageRisk = Math.abs(rider.age - 28) * 1.5
  const risk = clamp(40 - b * 0.3 + ageRisk)

  return { riderId: rider.id, gc, sprint, mountain, timeTrial, overall, expectedPoints, value, captain, risk }
}

export function rateAll(riders: Rider[]): Record<number, RiderRating> {
  const map: Record<number, RiderRating> = {}
  for (const r of riders) map[r.id] = rateRider(r)
  return map
}
