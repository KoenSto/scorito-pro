import type { Rider, Rules } from '../types'

export interface BudgetSummary {
  spent: number
  remaining: number
  budget: number
  count: number
  teamSize: number
  avgPrice: number
  valid: boolean
  violations: string[]
}

export function summarizeBudget(selected: Rider[], rules: Rules): BudgetSummary {
  const spent = selected.reduce((sum, r) => sum + r.price, 0)
  const remaining = rules.budget - spent
  const count = selected.length
  const avgPrice = count ? spent / count : 0

  const violations: string[] = []
  if (spent > rules.budget) {
    violations.push(`Budget overschreden met ${(spent - rules.budget).toFixed(1)} mln`)
  }
  if (count > rules.teamSize) {
    violations.push(`Te veel renners (${count}/${rules.teamSize})`)
  }

  const perTeam = new Map<string, number>()
  for (const r of selected) perTeam.set(r.team, (perTeam.get(r.team) ?? 0) + 1)
  for (const [team, n] of perTeam) {
    if (n > rules.maxPerTeam) {
      violations.push(`Max ${rules.maxPerTeam} per ploeg overschreden: ${team} (${n})`)
    }
  }

  return {
    spent: Number(spent.toFixed(2)),
    remaining: Number(remaining.toFixed(2)),
    budget: rules.budget,
    count,
    teamSize: rules.teamSize,
    avgPrice: Number(avgPrice.toFixed(2)),
    valid: violations.length === 0 && count === rules.teamSize,
    violations,
  }
}
