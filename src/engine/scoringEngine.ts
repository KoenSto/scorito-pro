import type { Rider, RiderRole } from '../types'
import scoring from '../data/scoring.json'
import stagesData from '../data/stages.json'
import type { Stage } from '../types'
import riderStats from '../data/riderStats.json'
import { marketScore } from './bookmakerEngine'

/*
 * Scoring Engine (Sprint 4.0) - kansgebaseerde puntenverdeling.
 *
 * Elke renner krijgt PER ETAPPE een realistische kans op de dagzege, top-10
 * en top-20 (zelfde model als de AI-coach), plus kansen in de vier
 * dagklassementen en de eindklassementen. De kwaliteit is nu DISCIPLINE-
 * SPECIFIEK: op een vlakke etappe telt het PCS-sprintniveau, in de bergen het
 * klimniveau, enzovoort. Zo komen sprinters op de vele vlakke en heuvel-
 * etappes veel beter tot hun recht en zijn de verwachte punten consistent
 * over alle tabbladen (Renners, Optimizer en Coach delen dit model).
 */

const MAX_PRICE = 8
const MARKET_BOOST = 0.08
const NO_DATA_FACTOR = 0.85

type StageTypeKey = 'Vlak' | 'Heuvel' | 'Berg' | 'Tijdrit' | 'Ploegentijdrit'
type DisciplineKey = 'gc' | 'sprint' | 'climber' | 'oneday' | 'timetrial'
type ClassKey = 'algemeen' | 'punten' | 'berg' | 'jongeren'

/** Kans dat een renner van een bepaalde rol meestrijdt om de dagzege per etappetype. */
const stageFit: Record<RiderRole, Record<StageTypeKey, number>> = {
  Sprint:   { Vlak: 1,    Heuvel: 0.55, Berg: 0.05, Tijdrit: 0.1, Ploegentijdrit: 0 },
  Klassiek: { Vlak: 0.6,  Heuvel: 1,    Berg: 0.25, Tijdrit: 0.3, Ploegentijdrit: 0 },
  Klimmer:  { Vlak: 0,    Heuvel: 0.5,  Berg: 1,    Tijdrit: 0.1, Ploegentijdrit: 0 },
  GC:       { Vlak: 0.2,  Heuvel: 0.6,  Berg: 1,    Tijdrit: 0.9, Ploegentijdrit: 0 },
  Tijdrit:  { Vlak: 0.3,  Heuvel: 0.3,  Berg: 0.1,  Tijdrit: 1,   Ploegentijdrit: 0 },
  Knecht:   { Vlak: 0.15, Heuvel: 0.15, Berg: 0.1,  Tijdrit: 0.1, Ploegentijdrit: 0 },
}

/** Welk PCS-specialisme telt voor de dagzege per etappetype. */
const typeDiscipline: Record<StageTypeKey, DisciplineKey> = {
  Vlak: 'sprint',
  Heuvel: 'oneday',
  Berg: 'climber',
  Tijdrit: 'timetrial',
  Ploegentijdrit: 'timetrial',
}

/** Welk PCS-specialisme telt voor elk dagklassement / eindklassement. */
const classDiscipline: Record<ClassKey, DisciplineKey> = {
  algemeen: 'gc',
  punten: 'sprint',
  berg: 'climber',
  jongeren: 'gc',
}

/** Hoeveel een etappetype meetelt voor elk DAGKLASSEMENT (per etappe toegekend). */
const dailyClassStageFit: Record<ClassKey, Record<StageTypeKey, number>> = {
  algemeen: { Vlak: 0.2, Heuvel: 0.5, Berg: 1,    Tijdrit: 0.8, Ploegentijdrit: 0 },
  punten:   { Vlak: 1,   Heuvel: 0.7, Berg: 0.15, Tijdrit: 0.1, Ploegentijdrit: 0 },
  berg:     { Vlak: 0,   Heuvel: 0.5, Berg: 1,    Tijdrit: 0,   Ploegentijdrit: 0 },
  jongeren: { Vlak: 0.2, Heuvel: 0.5, Berg: 1,    Tijdrit: 0.8, Ploegentijdrit: 0 },
}

/** Hoe sterk een rol meestrijdt in elk dagklassement (los van etappetype). */
const dailyRoleFit: Record<RiderRole, { algemeen: number; punten: number; berg: number; jongeren: number }> = {
  GC:       { algemeen: 1,    punten: 0.1,  berg: 0.35, jongeren: 0.5 },
  Klimmer:  { algemeen: 0.4,  punten: 0.05, berg: 1,    jongeren: 0.3 },
  Sprint:   { algemeen: 0,    punten: 1,    berg: 0,    jongeren: 0.15 },
  Klassiek: { algemeen: 0.15, punten: 0.6,  berg: 0.15, jongeren: 0.2 },
  Tijdrit:  { algemeen: 0.3,  punten: 0.1,  berg: 0.05, jongeren: 0.2 },
  Knecht:   { algemeen: 0.05, punten: 0.05, berg: 0.05, jongeren: 0.1 },
}

/** Bijdrage van elke rol aan de EINDklassementen. */
const finalFit: Record<RiderRole, { algemeen: number; punten: number; berg: number; jongeren: number }> = {
  GC:       { algemeen: 1,    punten: 0.15, berg: 0.35, jongeren: 0.4 },
  Klimmer:  { algemeen: 0.4,  punten: 0.1,  berg: 1,    jongeren: 0.3 },
  Sprint:   { algemeen: 0,    punten: 1,    berg: 0,    jongeren: 0.25 },
  Klassiek: { algemeen: 0.15, punten: 0.6,  berg: 0.2,  jongeren: 0.25 },
  Tijdrit:  { algemeen: 0.3,  punten: 0.1,  berg: 0.1,  jongeren: 0.2 },
  Knecht:   { algemeen: 0.05, punten: 0.05, berg: 0.05, jongeren: 0.1 },
}

const stages = stagesData as Stage[]

interface DisciplineEntry { rank: number; points: number }
interface RiderStatEntry {
  pcsRank: number
  pcsPoints: number
  disciplines?: Partial<Record<DisciplineKey, DisciplineEntry>>
}

const statsMeta = (riderStats as { meta: { disciplineMaxPoints: Record<string, number> } }).meta
const statsById = (riderStats as unknown as { riders: Record<string, RiderStatEntry> }).riders

const STAGE_TABLE = scoring.stageResult as number[]

/**
 * Discipline-specifieke kwaliteit (0..1) voor een bepaald PCS-specialisme.
 * Een topsprinter scoort op 'sprint' hoog, ook al is zijn totale PCS-ranking
 * bescheiden. We blenden prijs met de genormaliseerde specialisme-punten en
 * geven favorieten van de bookmakers een lichte boost.
 */
function disciplineQuality(rider: Rider, disc: DisciplineKey): number {
  const priceQ = Math.min(1, rider.price / MAX_PRICE)
  const entry = statsById[String(rider.id)]
  const discPoints = entry?.disciplines?.[disc]?.points
  const discMax = statsMeta?.disciplineMaxPoints?.[disc]
  const floor = priceQ * NO_DATA_FACTOR
  const base =
    typeof discPoints !== 'number' || !discMax
      ? floor
      : Math.max(floor, Math.min(1, 0.45 * priceQ + 0.55 * Math.min(1, discPoints / discMax)))
  const boost = 1 + MARKET_BOOST * marketScore(rider.id)
  return Math.min(1, base * boost)
}

export interface StageProjection {
  pWin: number
  pTop10: number
  pTop20: number
  points: number
}

/**
 * Zet een 'contention' (kwaliteit x etappe-fit, 0..1) om in geneste kansen op
 * dagzege, top-10 en top-20, plus de verwachte etappepunten uit de echte
 * Scorito-uitslagtabel.
 */
function project(contention: number, table: number[]): StageProjection {
  const c = Math.min(1, Math.max(0, contention))
  const n = table.length
  if (c <= 0 || n === 0) return { pWin: 0, pTop10: 0, pTop20: 0, points: 0 }

  const pTop20 = Math.min(0.97, 0.15 + 0.85 * Math.pow(c, 0.7))
  const pTop10 = pTop20 * Math.min(1, 0.25 + 0.75 * Math.pow(c, 0.9))
  const pWin = pTop10 * Math.min(1, 0.05 + 0.85 * Math.pow(c, 1.6))

  // Verdeel de kansmassa over de posities van DEZE tabel (etappe- of
  // klassementstabel, wisselende lengte). Kortere tabellen krijgen minder
  // top-10/top-20 posities.
  const top10n = Math.min(10, n)
  const top20n = Math.min(20, n)
  const posP = new Array(n).fill(0)
  posP[0] = pWin
  const midMass = pTop10 - pWin
  let midSum = 0
  for (let i = 1; i < top10n; i++) midSum += Math.exp(-0.3 * (i - 1))
  if (midSum > 0) for (let i = 1; i < top10n; i++) posP[i] = (midMass * Math.exp(-0.3 * (i - 1))) / midSum
  const lowMass = pTop20 - pTop10
  let lowSum = 0
  for (let i = top10n; i < top20n; i++) lowSum += Math.exp(-0.15 * (i - top10n))
  if (lowSum > 0) for (let i = top10n; i < top20n; i++) posP[i] = (lowMass * Math.exp(-0.15 * (i - top10n))) / lowSum

  let points = 0
  for (let i = 0; i < n; i++) points += posP[i] * table[i]
  return { pWin, pTop10, pTop20, points }
}

/** Etappeprojectie (kansen + verwachte punten) voor een renner op een etappe. */
export function stageProjection(rider: Rider, stage: Stage): StageProjection {
  if (stage.from === 'Rustdag') return { pWin: 0, pTop10: 0, pTop20: 0, points: 0 }
  const type = stage.type as StageTypeKey
  const q = disciplineQuality(rider, typeDiscipline[type])
  const opp = (stageFit[rider.role] ?? stageFit.Knecht)[type] ?? 0
  return project(q * opp, STAGE_TABLE)
}

/**
 * Verwachte klassementspunten uit een puntentabel, gegeven een discipline-
 * specifieke kwaliteit q en de kans (opportunity) dat de renner meedoet.
 */
function expectedFromTable(table: number[], q: number, opportunity: number): number {
  if (opportunity <= 0) return 0
  return project(q * opportunity, table).points
}

/**
 * Dagklassement-punten opgebouwd PER ETAPPE. Elk dagklassement (algemeen,
 * punten/groen, berg/bol, jongeren) krijgt per etappe een kans die afhangt van
 * (a) hoe sterk de rol dat klassement bevecht, (b) hoe relevant het etappetype
 * is en (c) de DISCIPLINE-specifieke kwaliteit van de renner voor dat
 * klassement. Zo pakt een sprinter groene-truipunten op elke vlakke etappe.
 */
function dailyClassificationPoints(rider: Rider): number {
  const roleFit = dailyRoleFit[rider.role] ?? dailyRoleFit.Knecht
  const classKeys: ClassKey[] = ['algemeen', 'punten', 'berg', 'jongeren']
  let total = 0
  for (const st of stages) {
    if (st.from === 'Rustdag') continue
    const type = st.type as StageTypeKey
    for (const key of classKeys) {
      const typeFit = dailyClassStageFit[key][type] ?? 0
      const opp = roleFit[key] * typeFit
      if (opp <= 0) continue
      const q = disciplineQuality(rider, classDiscipline[key])
      total += expectedFromTable(scoring.stageClassification[key], q, opp)
    }
  }
  return total
}

/**
 * Verwachte totale Scorito-punten voor de hele Tour. Gelijk model als de AI-
 * coach: som van de per-etappe verwachte punten (op basis van dagzege/top-10/
 * top-20 kansen) + dagklassementen + eindklassementen.
 */
export function expectedPoints(rider: Rider): number {
  const ffit = finalFit[rider.role] ?? finalFit.Knecht

  // 1. Etappepunten: som over alle etappes met discipline-specifieke kansen.
  let stagePts = 0
  for (const st of stages) stagePts += stageProjection(rider, st).points

  // 2. Dagklassementen: per etappe opgebouwd.
  const dailyClass = dailyClassificationPoints(rider)

  // 3. Eindklassementen tellen zwaar in Scorito, elk met eigen discipline.
  const finalPts =
    expectedFromTable(scoring.finalClassification.algemeen, disciplineQuality(rider, classDiscipline.algemeen), ffit.algemeen) +
    expectedFromTable(scoring.finalClassification.berg, disciplineQuality(rider, classDiscipline.berg), ffit.berg) +
    expectedFromTable(scoring.finalClassification.punten, disciplineQuality(rider, classDiscipline.punten), ffit.punten) +
    expectedFromTable(scoring.finalClassification.jongeren, disciplineQuality(rider, classDiscipline.jongeren), ffit.jongeren)

  const total = stagePts + dailyClass + finalPts
  return Math.round(total)
}

export function scoreAll(riders: Rider[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const r of riders) out[r.id] = expectedPoints(r)
  return out
}
