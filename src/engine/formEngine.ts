import type { Rider } from '../types'
import ridersData from '../data/riders.json'
import stagesData from '../data/stages.json'
import type { Stage } from '../types'
import scoring from '../data/scoring.json'
import {
  disciplineQuality,
  project,
  stageProjection,
  classDiscipline,
  finalFit,
  type ClassKey,
} from './scoringEngine'
import type { Classification } from './bookmakerEngine'

/*
 * Form-engine: model-gebaseerde 'favorieten' voor de Winstkans-tab, gebouwd
 * op data die al in de app zit (prijs, rol, PCS-vorm en tot-nu-toe behaalde
 * uitslagen) via hetzelfde kansmodel als Renners/Optimizer/Coach
 * (scoringEngine.ts). Dient als automatische fallback wanneer er geen
 * (actuele) bookmaker-odds beschikbaar zijn voor de gekozen klassement of
 * etappe.
 */

const riders = ridersData as Rider[]
const stages = stagesData as Stage[]
const finalTables = scoring.finalClassification as unknown as Record<ClassKey, number[]>

const classKeyFor: Record<Classification, ClassKey> = {
  eindzege: 'algemeen',
  geel: 'algemeen',
  groen: 'punten',
  bergtrui: 'berg',
  wit: 'jongeren',
}

export interface FormWeight {
  riderId: number
  weight: number
  points: number
}

const MAX_ROWS = 50

function normalize(scored: { riderId: number; pWin: number; points: number }[]): FormWeight[] {
  const sum = scored.reduce((s, x) => s + x.pWin, 0)
  return scored
    .map((x) => ({ riderId: x.riderId, weight: sum > 0 ? x.pWin / sum : 0, points: x.points }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_ROWS)
}

/** Model-gebaseerde favorieten voor een klassement (eindzege/geel/groen/bergtrui/wit). */
export function formFavouritesForClassification(c: Classification): FormWeight[] {
  const key = classKeyFor[c]
  const table = finalTables[key] ?? []
  let pool = riders
  if (c === 'wit') pool = riders.filter((r) => r.age <= 25)
  const scored = pool.map((r) => {
    const q = disciplineQuality(r, classDiscipline[key])
    const opp = (finalFit[r.role] ?? finalFit.Knecht)[key]
    const proj = project(q * opp, table)
    return { riderId: r.id, pWin: proj.pWin, points: proj.points }
  })
  return normalize(scored)
}

/** Model-gebaseerde favorieten voor de winnaar van een specifieke etappe. */
export function formFavouritesForStage(stageNumber: number): FormWeight[] {
  const stage = stages.find((s) => s.id === stageNumber)
  if (!stage) return []
  const scored = riders.map((r) => {
    const proj = stageProjection(r, stage)
    return { riderId: r.id, pWin: proj.pWin, points: proj.points }
  })
  return normalize(scored)
}
