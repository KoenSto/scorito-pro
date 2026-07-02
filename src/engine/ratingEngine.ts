import type { Rider, RiderRating, RiderRole } from '../types'
import { expectedPoints as scoreRider } from './scoringEngine'
import riderStats from '../data/riderStats.json'

const MAX_PRICE = 8

function base(price: number): number {
  return Math.round((price / MAX_PRICE) * 100)
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

const roleWeights: Record<RiderRole, { gc: number; sprint: number; mountain: number; tt: number }> = {
  GC: { gc: 1.0, sprint: 0.2, mountain: 0.9, tt: 0.8 },
  Klimmer: { gc: 0.6, sprint: 0.1, mountain: 1.0, tt: 0.3 },
  Sprint: { gc: 0.1, sprint: 1.0, mountain: 0.1, tt: 0.3 },
  Klassiek: { gc: 0.3, sprint: 0.6, mountain: 0.4, tt: 0.5 },
  Tijdrit: { gc: 0.5, sprint: 0.2, mountain: 0.3, tt: 1.0 },
  Knecht: { gc: 0.3, sprint: 0.3, mountain: 0.3, tt: 0.3 },
}

// --- PCS per-discipline specialty data ---------------------------------
// riderStats.json holds season specialty ranking points per rider, which
// let us derive result-based discipline strengths instead of relying purely
// on the (price x role) heuristic. We normalise each discipline's points to
// a 0..100 score using the discipline's maximum in the dataset, then blend
// it with the role-based score. Riders without PCS data fall back cleanly to
// the role-based score only.
type DisciplineStat = { rank: number; points: number }
interface RiderStatEntry {
  pcsRank?: number
  pcsPoints?: number
  disciplines?: Partial<Record<'gc' | 'sprint' | 'climber' | 'oneday' | 'timetrial', DisciplineStat>>
}
const stats = riderStats as {
  meta: { disciplineMaxPoints: Record<string, number> }
  riders: Record<string, RiderStatEntry>
}
const discMax = stats.meta.disciplineMaxPoints

// Weight given to the PCS result-based signal vs. the role-based heuristic.
const PCS_DISCIPLINE_WEIGHT = 0.5

// Map our four rating disciplines onto PCS specialty keys. Mountain draws on
// the PCS climber ranking; the classics/one-day ranking feeds the sprint/
// puncheur-flavoured score alongside the pure sprinters ranking.
function pcsScore(entry: RiderStatEntry | undefined, keys: string[]): number | null {
  if (!entry || !entry.disciplines) return null
  let best: number | null = null
  for (const k of keys) {
    const d = entry.disciplines[k as keyof typeof entry.disciplines]
    const max = discMax[k]
    if (d && max) {
      const s = clamp((d.points / max) * 100)
      if (best === null || s > best) best = s
    }
  }
  return best
}

// Blend the role-based score with the PCS-based score when the latter exists.
function blend(roleScore: number, pcs: number | null): number {
  if (pcs === null) return roleScore
  return clamp(roleScore * (1 - PCS_DISCIPLINE_WEIGHT) + pcs * PCS_DISCIPLINE_WEIGHT)
}

export function rateRider(rider: Rider): RiderRating {
  const b = base(rider.price)
  const w = roleWeights[rider.role] ?? roleWeights.Knecht
  const entry = stats.riders[String(rider.id)]

  const gc = blend(clamp(b * w.gc), pcsScore(entry, ['gc']))
  const sprint = blend(clamp(b * w.sprint), pcsScore(entry, ['sprint', 'oneday']))
  const mountain = blend(clamp(b * w.mountain), pcsScore(entry, ['climber']))
  const timeTrial = blend(clamp(b * w.tt), pcsScore(entry, ['timetrial']))

  const overall = clamp((gc + sprint + mountain + timeTrial) / 4 + b * 0.4)
  const expectedPoints = scoreRider(rider)
  const value = Math.round((expectedPoints / Math.max(0.5, rider.price)) * 10) / 10
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
