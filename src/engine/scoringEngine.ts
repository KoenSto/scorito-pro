import type { Rider, RiderRole } from '../types'
import scoring from '../data/scoring.json'
import stagesData from '../data/stages.json'
import type { Stage } from '../types'
import riderStats from '../data/riderStats.json'
import { marketScore } from './bookmakerEngine'

/**
 * Scoring Engine (Sprint 2.1)
 *
 * Berekent verwachte Scorito-punten per renner op basis van het ECHTE
 * puntensysteem uit scoring.json (etappe-uitslagen, klassementen,
 * eindklassement en ploegentijdrit).
 *
 * Omdat we geen echte uitslagen kunnen voorspellen, gebruiken we de prijs
 * als proxy voor kwaliteit (kans op een hoge klassering) en de rol om te
 * bepalen in welke etappetypes en klassementen een renner scoort. Alles is
 * transparant en aanpasbaar: pas de gewichten aan als je betere data hebt.
 */

const stages = stagesData as Stage[]

// Aandeel etappetypes waarin een rol kans maakt op een topklassering.
const stageFit: Record<RiderRole, Record<string, number>> = {
  Sprint:   { Vlak: 1.0, Heuvel: 0.3, Berg: 0.0, Tijdrit: 0.1, Ploegentijdrit: 0.0 },
  Klassiek: { Vlak: 0.5, Heuvel: 1.0, Berg: 0.2, Tijdrit: 0.3, Ploegentijdrit: 0.0 },
  Klimmer:  { Vlak: 0.0, Heuvel: 0.5, Berg: 1.0, Tijdrit: 0.1, Ploegentijdrit: 0.0 },
  GC:       { Vlak: 0.2, Heuvel: 0.6, Berg: 1.0, Tijdrit: 0.9, Ploegentijdrit: 0.0 },
  Tijdrit:  { Vlak: 0.3, Heuvel: 0.3, Berg: 0.1, Tijdrit: 1.0, Ploegentijdrit: 0.0 },
  Knecht:   { Vlak: 0.1, Heuvel: 0.1, Berg: 0.1, Tijdrit: 0.1, Ploegentijdrit: 0.0 },
}

// Kans dat een rol meetelt voor de eindklassementen.
const finalFit: Record<RiderRole, { algemeen: number; punten: number; berg: number; jongeren: number }> = {
  GC:       { algemeen: 1.0, punten: 0.1, berg: 0.3, jongeren: 0.4 },
  Klimmer:  { algemeen: 0.4, punten: 0.1, berg: 1.0, jongeren: 0.3 },
  Sprint:   { algemeen: 0.0, punten: 1.0, berg: 0.0, jongeren: 0.2 },
  Klassiek: { algemeen: 0.1, punten: 0.5, berg: 0.2, jongeren: 0.2 },
  Tijdrit:  { algemeen: 0.3, punten: 0.1, berg: 0.1, jongeren: 0.2 },
  Knecht:   { algemeen: 0.05, punten: 0.05, berg: 0.05, jongeren: 0.1 },
}

const MAX_PRICE = 8 // duurste renner in de dataset (Pogacar)

/** Kwaliteit 0..1: hoe duurder de renner, hoe hoger de kans op punten. */
// Historische PCS-ranglijstpunten als vormsignaal (bron: procyclingstats.com).
// Zie src/data/riderStats.json. Renners zonder entry vallen terug op prijs.
const PCS_MAX_POINTS = riderStats.meta.maxPoints
// Max relative boost applied to a rider's quality from the bookmaker market
// snapshot (0.08 = up to +8% for the clearest market favourite).
const MARKET_BOOST = 0.08
const pcsById = riderStats.riders as unknown as Record<string, { pcsRank: number; pcsPoints: number }>

/**
 * Kwaliteit van een renner op een schaal 0..1.
 *
 * We combineren twee signalen:
 *  - prijsQ: de Scorito-prijs (marktwaardering) genormaliseerd op de duurste renner;
 *  - vormQ: de PCS-ranglijstpunten van de laatste 12 maanden (echte resultaten).
 *
 * Voor renners met PCS-data wegen we beide gelijk (50/50). Zonder PCS-data
 * gebruiken we alleen de prijs, zodat het model altijd een waarde teruggeeft.
 */
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
 * Verwacht puntengemiddelde uit een puntentabel, gegeven een kwaliteit q.
 * We modelleren de kans dat de renner in de tabel eindigt als een
 * exponentieel aflopende verdeling die naar de top schuift naarmate q hoger is.
 */
function expectedFromTable(table: number[], q: number, opportunity: number): number {
  if (opportunity <= 0) return 0
  // Kans op deelname aan de "strijd": schaalt met kwaliteit en kans (fit).
  const contention = q * opportunity
  let sum = 0
  for (let pos = 0; pos < table.length; pos++) {
    // Betere renners (hoge q) hebben meer massa op de eerste posities.
    const posWeight = Math.pow(1 - 1 / (table.length + 1), pos)
    const prob = contention * posWeight * (1 - 0.5 * (1 - q))
    sum += prob * table[pos]
  }
  // Normaliseer zodat waarden realistisch blijven.
  return sum * 0.12
}

export function expectedPoints(rider: Rider): number {
  const q = quality(rider)
  const fit = stageFit[rider.role] ?? stageFit.Knecht
  const ffit = finalFit[rider.role] ?? finalFit.Knecht

  // 1. Etappepunten: som over alle etappes, gewogen naar etappetype-fit.
  let stagePts = 0
  for (const st of stages) {
    const opp = fit[st.type] ?? 0
    stagePts += expectedFromTable(scoring.stageResult, q, opp)
  }

  // 2. Klassementspunten per etappe (dagelijkse leiders): kleine bijdrage.
  const dailyClass =
    expectedFromTable(scoring.stageClassification.algemeen, q, ffit.algemeen) +
    expectedFromTable(scoring.stageClassification.berg, q, ffit.berg) +
    expectedFromTable(scoring.stageClassification.punten, q, ffit.punten) +
    expectedFromTable(scoring.stageClassification.jongeren, q, ffit.jongeren)

  // 3. Eindklassement (telt zwaar in Scorito).
  const finalPts =
    expectedFromTable(scoring.finalClassification.algemeen, q, ffit.algemeen) +
    expectedFromTable(scoring.finalClassification.berg, q, ffit.berg) +
    expectedFromTable(scoring.finalClassification.punten, q, ffit.punten) +
    expectedFromTable(scoring.finalClassification.jongeren, q, ffit.jongeren)

  const total = stagePts + dailyClass * 3 + finalPts
  return Math.round(total)
}

export function scoreAll(riders: Rider[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const r of riders) out[r.id] = expectedPoints(r)
  return out
}
