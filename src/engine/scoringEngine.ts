import type { Rider, RiderRole } from '../types'
import scoring from '../data/scoring.json'
import stagesData from '../data/stages.json'
import type { Stage } from '../types'
import riderStats from '../data/riderStats.json'
import { marketScore } from './bookmakerEngine'

/**
 * Scoring Engine (Sprint 2.2 - herziene puntenverdeling)
 *
 * Berekent verwachte Scorito-punten per renner op basis van het ECHTE
 * puntensysteem uit scoring.json.
 *
 * Belangrijkste herziening: de dagklassementen (met name het puntenklassement /
 * groene trui) worden nu PER ETAPPE opgebouwd en gewogen naar etappetype. Daardoor
 * komen sprinters op de vele vlakke en heuveletappes veel beter tot hun recht,
 * i.p.v. een eenmalige, te lage bijdrage. Alles blijft transparant en aanpasbaar.
 */

const MAX_PRICE = 8
const MARKET_BOOST = 0.08
const PCS_MAX_POINTS = 4744

type StageTypeKey = 'Vlak' | 'Heuvel' | 'Berg' | 'Tijdrit' | 'Ploegentijdrit'

/** Kans dat een renner van een bepaalde rol meestrijdt om de dagzege per etappetype. */
const stageFit: Record<RiderRole, Record<StageTypeKey, number>> = {
  Sprint:   { Vlak: 1,    Heuvel: 0.55, Berg: 0.05, Tijdrit: 0.1, Ploegentijdrit: 0 },
  Klassiek: { Vlak: 0.6,  Heuvel: 1,    Berg: 0.25, Tijdrit: 0.3, Ploegentijdrit: 0 },
  Klimmer:  { Vlak: 0,    Heuvel: 0.5,  Berg: 1,    Tijdrit: 0.1, Ploegentijdrit: 0 },
  GC:       { Vlak: 0.2,  Heuvel: 0.6,  Berg: 1,    Tijdrit: 0.9, Ploegentijdrit: 0 },
  Tijdrit:  { Vlak: 0.3,  Heuvel: 0.3,  Berg: 0.1,  Tijdrit: 1,   Ploegentijdrit: 0 },
  Knecht:   { Vlak: 0.15, Heuvel: 0.15, Berg: 0.1,  Tijdrit: 0.1, Ploegentijdrit: 0 },
}

/** Hoeveel een etappetype meetelt voor elk DAGKLASSEMENT (per etappe toegekend). */
const dailyClassStageFit: Record<'algemeen' | 'punten' | 'berg' | 'jongeren', Record<StageTypeKey, number>> = {
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
const pcsById = (riderStats as { riders: Record<string, { pcsRank: number; pcsPoints: number }> }).riders

function quality(rider: Rider): number {
  const priceQ = Math.min(1, rider.price / MAX_PRICE)
  const stat = pcsById[String(rider.id)]
  const baseQ =
    !stat || typeof stat.pcsPoints !== 'number'
      ? priceQ
      : Math.min(1, 0.5 * priceQ + 0.5 * Math.min(1, stat.pcsPoints / PCS_MAX_POINTS))
  // Light, capped nudge for riders the bookmaker market rates as favourites.
  const boost = 1 + MARKET_BOOST * marketScore(rider.id)
  return Math.min(1, baseQ * boost)
}

/**
 * Verwacht puntengemiddelde uit een puntentabel, gegeven kwaliteit q en de
 * kans (opportunity) dat de renner meestrijdt. Betere renners (hoge q) hebben
 * meer kansmassa op de eerste posities.
 */
function expectedFromTable(table: number[], q: number, opportunity: number): number {
  if (opportunity <= 0) return 0
  const contention = q * opportunity
  let sum = 0
  for (let pos = 0; pos < table.length; pos++) {
    const posWeight = Math.pow(1 - 1 / (table.length + 1), pos)
    const prob = contention * posWeight * (0.5 + 0.5 * q)
    sum += prob * table[pos]
  }
  return sum * 0.12
}

type ClassKey = 'algemeen' | 'punten' | 'berg' | 'jongeren'

/**
 * Dagklassement-punten opgebouwd PER ETAPPE. Per etappe krijgt elk dagklassement
 * een kans die afhangt van (a) hoe sterk de rol dat klassement bevecht en (b) hoe
 * relevant het etappetype is voor dat klassement. Zo verzamelt een sprinter over
 * de vele vlakke/heuveletappes flink wat groene-trui-punten.
 */
function dailyClassificationPoints(rider: Rider, q: number): number {
  const roleFit = dailyRoleFit[rider.role] ?? dailyRoleFit.Knecht
  const classKeys: ClassKey[] = ['algemeen', 'punten', 'berg', 'jongeren']
  let total = 0
  for (const st of stages) {
    const type = st.type as StageTypeKey
    for (const key of classKeys) {
      const typeFit = dailyClassStageFit[key][type] ?? 0
      const opp = roleFit[key] * typeFit
      if (opp <= 0) continue
      total += expectedFromTable(scoring.stageClassification[key], q, opp)
    }
  }
  return total
}

export function expectedPoints(rider: Rider): number {
  const q = quality(rider)
  const fit = stageFit[rider.role] ?? stageFit.Knecht
  const ffit = finalFit[rider.role] ?? finalFit.Knecht

  // 1. Etappepunten: som over alle etappes, gewogen naar etappetype-fit.
  let stagePts = 0
  for (const st of stages) {
    const opp = fit[st.type as StageTypeKey] ?? 0
    stagePts += expectedFromTable(scoring.stageResult, q, opp)
  }

  // 2. Dagklassementen: nu PER ETAPPE opgebouwd (zie hierboven).
  const dailyClass = dailyClassificationPoints(rider, q)

  // 3. Eindklassement telt zwaar in Scorito.
  const finalPts =
    expectedFromTable(scoring.finalClassification.algemeen, q, ffit.algemeen) +
    expectedFromTable(scoring.finalClassification.berg, q, ffit.berg) +
    expectedFromTable(scoring.finalClassification.punten, q, ffit.punten) +
    expectedFromTable(scoring.finalClassification.jongeren, q, ffit.jongeren)

  const total = stagePts + dailyClass + finalPts
  return Math.round(total)
}

export function scoreAll(riders: Rider[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const r of riders) out[r.id] = expectedPoints(r)
  return out
}
