import type { Rider, RiderRole, Stage, Rules, RiderRating } from '../types'
import scoring from '../data/scoring.json'

/**
 * Coach Engine (Sprint 3)
 *
 * De AI-coach adviseert per etappe:
 *  - welke 9 van je 20 renners je opstelt (grootste kans op punten die dag)
 *  - wie je als kopman aanwijst (kopman = dubbele etappepunten)
 *  - en geeft transferadvies: welke renner uit je team het beste vervangen
 *    kan worden door een beschikbare renner voor meer verwachte punten.
 *
 * Alles is transparant en gebaseerd op rol x etappetype (stageFit) en de
 * prijs als kwaliteitsproxy. Pas de gewichten aan als je betere data hebt.
 */

// Aantal renners dat je per etappe opstelt (Scorito: 9 van de 20).
export const LINEUP_SIZE = 9

// Kopman verdubbelt de etappepunten van die ene renner.
export const CAPTAIN_MULTIPLIER = 2

const MAX_PRICE = 8

// Hoe goed past een rol bij een etappetype (0..1). Zelfde logica als de
// scoringEngine, maar hier per losse etappe zodat we per dag kunnen kiezen.
const stageFit: Record<RiderRole, Record<string, number>> = {
  Sprint: { Vlak: 1.0, Heuvel: 0.3, Berg: 0.0, Tijdrit: 0.1, Ploegentijdrit: 0.2 },
  Klassiek: { Vlak: 0.5, Heuvel: 1.0, Berg: 0.2, Tijdrit: 0.3, Ploegentijdrit: 0.2 },
  Klimmer: { Vlak: 0.0, Heuvel: 0.5, Berg: 1.0, Tijdrit: 0.1, Ploegentijdrit: 0.2 },
  GC: { Vlak: 0.2, Heuvel: 0.6, Berg: 1.0, Tijdrit: 0.9, Ploegentijdrit: 0.4 },
  Tijdrit: { Vlak: 0.3, Heuvel: 0.3, Berg: 0.1, Tijdrit: 1.0, Ploegentijdrit: 0.6 },
  Knecht: { Vlak: 0.1, Heuvel: 0.1, Berg: 0.1, Tijdrit: 0.1, Ploegentijdrit: 0.3 },
}

function quality(rider: Rider): number {
  return Math.min(1, rider.price / MAX_PRICE)
}

/** Verwacht puntengemiddelde uit een tabel, gegeven kwaliteit q en kans. */
function expectedFromTable(table: number[], q: number, opportunity: number): number {
  if (opportunity <= 0) return 0
  const contention = q * opportunity
  let sum = 0
  for (let pos = 0; pos < table.length; pos++) {
    const posWeight = Math.pow(1 - 1 / (table.length + 1), pos)
    const prob = contention * posWeight * (1 - 0.5 * (1 - q))
    sum += prob * table[pos]
  }
  return sum * 0.12
}

/**
 * Verwachte etappepunten voor EEN renner op EEN specifieke etappe.
 * Rustdagen (from === 'Rustdag') leveren 0 punten op.
 */
export function expectedStagePoints(rider: Rider, stage: Stage): number {
  if (stage.from === 'Rustdag') return 0
  const q = quality(rider)
  const fit = stageFit[rider.role] ?? stageFit.Knecht
  const opp = fit[stage.type] ?? 0
  return expectedFromTable(scoring.stageResult, q, opp)
}

export interface LineupPick {
  rider: Rider
  points: number
  isCaptain: boolean
}

export interface StageAdvice {
  stage: Stage
  lineup: LineupPick[]
  bench: LineupPick[]
  captain: Rider | null
  expectedPoints: number
}

/**
 * Beste opstelling voor een etappe: kies de LINEUP_SIZE renners met de
 * hoogste verwachte etappepunten en maak de beste daarvan kopman.
 */
export function recommendLineup(team: Rider[], stage: Stage): StageAdvice {
  const scored = team
    .map((rider) => ({ rider, points: expectedStagePoints(rider, stage), isCaptain: false }))
    .sort((a, b) => b.points - a.points)

  const lineup = scored.slice(0, LINEUP_SIZE)
  const bench = scored.slice(LINEUP_SIZE)

  // Kopman = renner met de meeste verwachte etappepunten in de opstelling.
  const captain = lineup.length ? lineup[0].rider : null
  if (lineup.length) lineup[0].isCaptain = true

  const expectedPoints = lineup.reduce(
    (sum, p) => sum + p.points * (p.isCaptain ? CAPTAIN_MULTIPLIER : 1),
    0,
  )

  return {
    stage,
    lineup,
    bench,
    captain,
    expectedPoints: Math.round(expectedPoints),
  }
}

/** Advies voor alle etappes (rustdagen worden overgeslagen). */
export function seasonPlan(team: Rider[], stages: Stage[]): StageAdvice[] {
  return stages
    .filter((s) => s.from !== 'Rustdag')
    .map((s) => recommendLineup(team, s))
}

export interface TransferSuggestion {
  out: Rider
  in: Rider
  gain: number
}

function teamCount(team: Rider[], t: string): number {
  return team.filter((r) => r.team === t).length
}

/**
 * Transferadvies over de HELE Tour: welke renner in je team kun je het beste
 * inruilen voor een beschikbare renner om je totale verwachte seizoenspunten
 * te verhogen, zonder de spelregels te schenden (budget + max per ploeg).
 * Geeft de beste suggesties gesorteerd op winst.
 */
export function transferAdvice(
  team: Rider[],
  allRiders: Rider[],
  ratings: Record<number, RiderRating>,
  rules: Rules,
  limit = 5,
): TransferSuggestion[] {
  const points = (r: Rider) => ratings[r.id]?.expectedPoints ?? 0
  const teamIds = new Set(team.map((r) => r.id))
  const teamPrice = team.reduce((s, r) => s + r.price, 0)

  const suggestions: TransferSuggestion[] = []

  for (const out of team) {
    const restPrice = teamPrice - out.price
    for (const cand of allRiders) {
      if (teamIds.has(cand.id)) continue
      if (restPrice + cand.price > rules.budget) continue
      const rest = team.filter((r) => r.id !== out.id)
      if (teamCount(rest, cand.team) >= rules.maxPerTeam) continue
      const gain = points(cand) - points(out)
      if (gain > 0) suggestions.push({ out, in: cand, gain: Math.round(gain) })
    }
  }

  // Beste per uit-renner, daarna gesorteerd op winst.
  const bestPerOut = new Map<number, TransferSuggestion>()
  for (const s of suggestions) {
    const cur = bestPerOut.get(s.out.id)
    if (!cur || s.gain > cur.gain) bestPerOut.set(s.out.id, s)
  }

  return [...bestPerOut.values()].sort((a, b) => b.gain - a.gain).slice(0, limit)
}
