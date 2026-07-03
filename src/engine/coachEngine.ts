import type { Rider, RiderRole, Stage, Rules, RiderRating } from '../types'
import scoring from '../data/scoring.json'
import riderStats from '../data/riderStats.json'

/**
 * Coach Engine (Sprint 3.1 - realistische etappeprojectie)
 *
 * De AI-coach adviseert per etappe welke 9 van je 20 renners je opstelt,
 * wie je als kopman kiest (dubbele etappepunten) en geeft transferadvies.
 *
 * Nieuw: de verwachte dagpunten komen uit een expliciet kansmodel per renner.
 * We schatten de kans op een dagzege, top-10 en top-20 finish op basis van
 * (a) een DISCIPLINE-specifieke kwaliteit (sprint/klim/tijdrit/eendaags via PCS)
 * en (b) hoe goed het etappetype bij de renner past. Die kansen vertalen we
 * naar de echte Scorito-etappepuntentabel, zodat topfavorieten realistische
 * (hogere) dagpunten krijgen i.p.v. een sterk afgevlakte verwachting.
 */

export const LINEUP_SIZE = 9
export const CAPTAIN_MULTIPLIER = 2

const MAX_PRICE = 8

type StageTypeKey = 'Vlak' | 'Heuvel' | 'Berg' | 'Tijdrit' | 'Ploegentijdrit'

// Hoe goed past een rol bij een etappetype (0..1) - kans om mee te strijden.
const stageFit: Record<RiderRole, Record<StageTypeKey, number>> = {
  Sprint:   { Vlak: 1,   Heuvel: 0.55, Berg: 0.05, Tijdrit: 0.1, Ploegentijdrit: 0.2 },
  Klassiek: { Vlak: 0.6, Heuvel: 1,    Berg: 0.25, Tijdrit: 0.3, Ploegentijdrit: 0.2 },
  Klimmer:  { Vlak: 0,   Heuvel: 0.5,  Berg: 1,    Tijdrit: 0.1, Ploegentijdrit: 0.2 },
  GC:       { Vlak: 0.2, Heuvel: 0.6,  Berg: 1,    Tijdrit: 0.9, Ploegentijdrit: 0.4 },
  Tijdrit:  { Vlak: 0.3, Heuvel: 0.3,  Berg: 0.1,  Tijdrit: 1,   Ploegentijdrit: 0.6 },
  Knecht:   { Vlak: 0.1, Heuvel: 0.1,  Berg: 0.1,  Tijdrit: 0.1, Ploegentijdrit: 0.3 },
}

// Welk PCS-specialisme telt voor de dagzege per etappetype.
const typeDiscipline: Record<StageTypeKey, 'gc' | 'sprint' | 'climber' | 'oneday' | 'timetrial'> = {
  Vlak: 'sprint',
  Heuvel: 'oneday',
  Berg: 'climber',
  Tijdrit: 'timetrial',
  Ploegentijdrit: 'timetrial',
}

interface DisciplineEntry { rank: number; points: number }
interface RiderStatEntry {
  pcsRank: number
  pcsPoints: number
  disciplines?: Partial<Record<'gc' | 'sprint' | 'climber' | 'oneday' | 'timetrial', DisciplineEntry>>
}

const statsMeta = (riderStats as { meta: { disciplineMaxPoints: Record<string, number> } }).meta
const statsById = (riderStats as unknown as { riders: Record<string, RiderStatEntry> }).riders

/**
 * Discipline-specifieke kwaliteit (0..1) voor de dagzege op DIT etappetype.
 * Een topsprinter scoort op een vlakke etappe hoog, ook al is zijn totale
 * PCS-ranking bescheiden. We blenden prijs met de PCS-specialismepunten,
 * genormaliseerd naar het maximum binnen dat specialisme.
 */
function stageQuality(rider: Rider, stageType: StageTypeKey): number {
  const priceQ = Math.min(1, rider.price / MAX_PRICE)
  const entry = statsById[String(rider.id)]
  const disc = typeDiscipline[stageType]
  const discPoints = entry?.disciplines?.[disc]?.points
  const discMax = statsMeta?.disciplineMaxPoints?.[disc]
  if (typeof discPoints !== 'number' || !discMax) return priceQ
  const discQ = Math.min(1, discPoints / discMax)
  return Math.min(1, 0.45 * priceQ + 0.55 * discQ)
}

export interface StageProjection {
  pWin: number
  pTop10: number
  pTop20: number
  points: number
}

const STAGE_TABLE = scoring.stageResult as number[]

/**
 * Zet een 'contention' (kwaliteit x etappe-fit, 0..1) om in geneste kansen
 * op een dagzege, top-10 en top-20, plus de verwachte etappepunten uit de
 * echte Scorito-uitslagtabel.
 */
function project(contention: number): StageProjection {
  const c = Math.min(1, Math.max(0, contention))
  if (c <= 0) return { pWin: 0, pTop10: 0, pTop20: 0, points: 0 }

  const pTop20 = Math.min(0.97, 0.15 + 0.85 * Math.pow(c, 0.7))
  const pTop10 = pTop20 * Math.min(1, 0.25 + 0.75 * Math.pow(c, 0.9))
  const pWin = pTop10 * Math.min(1, 0.05 + 0.85 * Math.pow(c, 1.6))

  // Verdeel de kansmassa over de 20 puntenposities voor de verwachting.
  const posP = new Array(STAGE_TABLE.length).fill(0)
  posP[0] = pWin
  const midMass = pTop10 - pWin
  let midSum = 0
  for (let i = 1; i < 10; i++) midSum += Math.exp(-0.3 * (i - 1))
  for (let i = 1; i < 10; i++) posP[i] = (midMass * Math.exp(-0.3 * (i - 1))) / midSum
  const lowMass = pTop20 - pTop10
  let lowSum = 0
  for (let i = 10; i < 20; i++) lowSum += Math.exp(-0.15 * (i - 10))
  for (let i = 10; i < 20; i++) posP[i] = (lowMass * Math.exp(-0.15 * (i - 10))) / lowSum

  let points = 0
  for (let i = 0; i < STAGE_TABLE.length; i++) points += posP[i] * STAGE_TABLE[i]
  return { pWin, pTop10, pTop20, points }
}

/** Volledige etappeprojectie (kansen + verwachte punten) voor een renner. */
export function stageProjection(rider: Rider, stage: Stage): StageProjection {
  if (stage.from === 'Rustdag') return { pWin: 0, pTop10: 0, pTop20: 0, points: 0 }
  const type = stage.type as StageTypeKey
  const q = stageQuality(rider, type)
  const opp = (stageFit[rider.role] ?? stageFit.Knecht)[type] ?? 0
  return project(q * opp)
}

/** Verwachte etappepunten voor EEN renner op EEN etappe. */
export function expectedStagePoints(rider: Rider, stage: Stage): number {
  return stageProjection(rider, stage).points
}

export interface LineupPick {
  rider: Rider
  points: number
  pWin: number
  pTop10: number
  pTop20: number
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
    .map((rider) => {
      const p = stageProjection(rider, stage)
      return {
        rider,
        points: p.points,
        pWin: p.pWin,
        pTop10: p.pTop10,
        pTop20: p.pTop20,
        isCaptain: false,
      }
    })
    .sort((a, b) => b.points - a.points)

  const lineup = scored.slice(0, LINEUP_SIZE)
  const bench = scored.slice(LINEUP_SIZE)

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

  const bestPerOut = new Map<number, TransferSuggestion>()
  for (const s of suggestions) {
    const cur = bestPerOut.get(s.out.id)
    if (!cur || s.gain > cur.gain) bestPerOut.set(s.out.id, s)
  }

  return [...bestPerOut.values()].sort((a, b) => b.gain - a.gain).slice(0, limit)
}
