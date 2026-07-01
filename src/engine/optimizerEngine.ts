import type { Rider, Rules, RiderRating } from '../types'

export interface OptimizeResult {
  team: Rider[]
  totalPoints: number
  totalPrice: number
  captain: Rider | null
  iterations: number
}

/**
 * Team Optimizer (Sprint 2)
 *
 * Doel: maximaliseer verwachte Scorito-punten binnen de spelregels:
 *   - exact rules.teamSize renners
 *   - totale prijs <= rules.budget
 *   - maximaal rules.maxPerTeam renners per ploeg
 *
 * Aanpak: greedy start op basis van punten-per-euro, gevolgd door
 * local search (swaps) die het team stap voor stap verbetert zolang
 * dat punten oplevert zonder de restricties te schenden. Dit draait
 * direct in de browser en benadert het optimum goed.
 */

interface Ctx {
  rules: Rules
  points: (r: Rider) => number
}

function teamCount(team: Rider[], t: string): number {
  return team.filter((r) => r.team === t).length
}

function isFeasibleAdd(team: Rider[], r: Rider, ctx: Ctx): boolean {
  if (team.some((x) => x.id === r.id)) return false
  if (teamCount(team, r.team) >= ctx.rules.maxPerTeam) return false
  return true
}

function totals(team: Rider[], ctx: Ctx) {
  const price = team.reduce((s, r) => s + r.price, 0)
  const points = team.reduce((s, r) => s + ctx.points(r), 0)
  return { price, points }
}

export function optimizeTeam(
  riders: Rider[],
  ratings: Record<number, RiderRating>,
  rules: Rules,
): OptimizeResult {
  const ctx: Ctx = { rules, points: (r) => ratings[r.id]?.expectedPoints ?? 0 }

  // 1. Greedy seed: sorteer op punten-per-euro, vul aan met restricties.
  const byEfficiency = [...riders].sort(
    (a, b) => ctx.points(b) / b.price - ctx.points(a) / a.price,
  )
  const team: Rider[] = []
  for (const r of byEfficiency) {
    if (team.length >= rules.teamSize) break
    const { price } = totals(team, ctx)
    if (price + r.price > rules.budget) continue
    if (!isFeasibleAdd(team, r, ctx)) continue
    team.push(r)
  }

  // 2. Local search: probeer een renner in het team te vervangen door een
  // renner erbuiten als dat punten oplevert binnen budget en ploeglimiet.
  let iterations = 0
  let improved = true
  while (improved && iterations < 5000) {
    improved = false
    for (let i = 0; i < team.length; i++) {
      const out = team[i]
      for (const cand of riders) {
        iterations++
        if (team.some((x) => x.id === cand.id)) continue
        const rest = team.filter((_, idx) => idx !== i)
        if (teamCount(rest, cand.team) >= rules.maxPerTeam) continue
        const newPrice = totals(rest, ctx).price + cand.price
        if (newPrice > rules.budget) continue
        if (ctx.points(cand) > ctx.points(out)) {
          team[i] = cand
          improved = true
          break
        }
      }
      if (improved) break
    }
  }

  const { price, points } = totals(team, ctx)
  const captain = team.length
    ? team.reduce((best, r) =>
        (ratings[r.id]?.captain ?? 0) > (ratings[best.id]?.captain ?? 0) ? r : best,
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
