import bookmakerOdds from '../data/bookmakerOdds.json'
import type { StageType } from '../types'

// Static bookmaker-favourites snapshot. These are NOT live odds: they are a
// point-in-time market view (implied-probability weights, 0..1) bundled at
// build time. Refresh by editing src/data/bookmakerOdds.json.

export type Classification = 'geel' | 'groen' | 'bergtrui' | 'wit' | 'eindzege'

export interface FavouriteWeight {
  riderId: number
  weight: number
}

interface OddsSnapshot {
  meta: {
    source: string
    snapshotDate: string
    note: string
    classifications: string[]
    stageTypes: string[]
  }
  classifications: Record<Classification, FavouriteWeight[]>
  stageTypes: Record<string, FavouriteWeight[]>
}

const odds = bookmakerOdds as unknown as OddsSnapshot

export function snapshotDate(): string {
  return odds.meta.snapshotDate
}

export function snapshotNote(): string {
  return odds.meta.note
}

// Ordered favourites (highest weight first) for a classification.
export function favouritesForClassification(c: Classification): FavouriteWeight[] {
  return [...(odds.classifications[c] ?? [])].sort((a, b) => b.weight - a.weight)
}

// Ordered favourites for a stage type (Ploegentijdrit has no market list -> []).
export function favouritesForStageType(t: StageType): FavouriteWeight[] {
  return [...(odds.stageTypes[t] ?? [])].sort((a, b) => b.weight - a.weight)
}

// Weight (0..1) of a rider for a given classification, or 0 if not a favourite.
export function classificationWeight(riderId: number, c: Classification): number {
  return odds.classifications[c]?.find((f) => f.riderId === riderId)?.weight ?? 0
}

// Weight (0..1) of a rider for a given stage type, or 0 if not a favourite.
export function stageTypeWeight(riderId: number, t: StageType): number {
  return odds.stageTypes[t]?.find((f) => f.riderId === riderId)?.weight ?? 0
}

// A single 0..1 'market favourite' score per rider: the best weight the rider
// holds across all classifications and stage types. Used as a light boost in
// scoring so the market's clear favourites are nudged upward, capped and
// transparent. Riders absent from the snapshot score 0 (no boost).
export function marketScore(riderId: number): number {
  let best = 0
  for (const list of Object.values(odds.classifications)) {
    for (const f of list) if (f.riderId === riderId && f.weight > best) best = f.weight
  }
  for (const list of Object.values(odds.stageTypes)) {
    for (const f of list) if (f.riderId === riderId && f.weight > best) best = f.weight
  }
  return best
}
