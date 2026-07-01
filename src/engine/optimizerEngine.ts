import type { Rider, Rules, RiderRating } from '../types'

export interface OptimizeResult {
  team: Rider[]
  totalPoints: number
  totalPrice: number
  captain: Rider | null
  iterations: number
}

/**
 * Team Optimizer (Sprint 2.1)
 *
 * Maximaliseert de verwachte Scorito-punten (uit de scoringEngine, via de
 * ratingEngine) binnen de spelregels:
 *   - exact rules.teamSize renners
 *   - totale prijs <= rules.budget
 *   - maximaal rules.maxPerTeam renners per ploeg
 *
 * Aanpak: start met de goedkoopste haalbare selectie van precies teamSize
 * renners (altijd geldig binnen budget) en verbeter daarna via "best swap":
 * vervang telkens een renner door de beste beschikbare renner die de punten
 * verhoogt zonder een restrictie te schenden. De teamgrootte blijft zo altijd
 * exact teamSize. Dit draait direct in de browser en benadert het optimum.
 */

interface Ctx {
  rules: Rules
  points: (r: Rider) => number
}

function teamCount(team: Rider[], t: string): number {
  return team.filter((r) => r.team === t).length
}

function totals(team: Rider[], ctx: Ctx) {
  const price = team.reduce((s, r) => s + r.price, 0)
  const points = team.reduce((s, r) => s + ctx.points(r), 0)
  return { price, points }
}

/** Goedkoopste haalbare team van precies teamSize renners. */
function seedCheapest(riders: Rider[], rules: Rules): Rider[] {
  const byPrice = [...riders].sort((a, b) => a.price - b.price)
  const team: Rider[] = []
  for (const r of byPrice) {
    if (team.length >= rules.teamSize) break
    if (teamCount(team, r.team) >= rules.maxPerTeam) continue
    team.push(r)
  }
  return team
}

export function optimizeTeam(
  riders: Rider[],
  ratings: Record<number, RiderRating>,
  rules: Rules,
): OptimizeResult {
  const ctx: Ctx = { rules, points: (r) => ratings[r.id]?.expectedPoints ?? 0 }

  const team = seedCheapest(riders, rules)

  // Best-swap local search: teamgrootte blijft exact teamSize.
  let iterations = 0
  let improved = true
  const maxIterations = 50000
  while (improved && iterations < maxIterations) {
    improved = false
    for (let i = 0; i < team.length; i++) {
      const out = team[i]
      const rest = team.filter((_, idx) => idx !== i)
      const restPrice = totals(rest, ctx).price
      let best: Rider | null = null
      let bestGain = 0
      for (const cand of riders) {
        iterations++
        if (team.some((x) => x.id === cand.id)) continue
        if (teamCount(rest, cand.team) >= rules.maxPerTeam) continue
        if (restPrice + cand.price > rules.budget) continue
        const gain = ctx.points(cand) - ctx.points(out)
        if (gain > bestGain) {
          bestGain = gain
          best = cand
        }
      }
      if (best) {
        team[i] = best
        improved = true
      }
    }
  }

  const { price, points } = totals(team, ctx)
  const captain = team.length
    ? team.reduce((b, r) =>
        (ratings[r.id]?.captain ?? 0) > (ratings[b.id]?.captain ?? 0) ? r : b,
      )
    : null

  return {
    team: [...team].sort((a, b) => ctx.points(b) - ctx.points(a)),
    totalPoints: points,
    totalPrice: Number(price.toFixed(2)),
    captain,
    iterations,
  }
}
