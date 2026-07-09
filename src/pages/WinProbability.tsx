import { createElement as h } from 'react'
import ridersData from '../data/riders.json'
import type { Rider } from '../types'
import {
    favouritesForClassification,
    favouritesForStage,
    snapshotDate,
    snapshotNote,
    lastUpdated,
} from '../engine/bookmakerEngine'
import stageResultsData from '../data/stageResults.json'

const riders = ridersData as Rider[]
const riderById = new Map(riders.map((r) => [r.id, r]))

function pct(weight: number): string {
    return weight > 0 ? `${Math.round(weight * 100)}%` : '-'
}

function weightFor(list: { riderId: number; weight: number }[], riderId: number): number {
    return list.find((f) => f.riderId === riderId)?.weight ?? 0
}

export default function WinProbability() {
    const eindzege = favouritesForClassification('eindzege')
    const geel = favouritesForClassification('geel')
    const groen = favouritesForClassification('groen')
    const bergtrui = favouritesForClassification('bergtrui')
    const wit = favouritesForClassification('wit')

  const stagesFile = stageResultsData as unknown as { stages: { stageNumber: number }[] }
    const stageNumbers = stagesFile.stages.map((s) => s.stageNumber)
    const nextStageNumber = stageNumbers.length > 0 ? Math.max(...stageNumbers) + 1 : 1
    const nextStage = favouritesForStage(nextStageNumber)

  const riderIds = new Set<number>()
    const allLists = [eindzege, geel, groen, bergtrui, wit, nextStage]
    allLists.forEach((list) => list.forEach((f) => riderIds.add(f.riderId)))

  const rows = Array.from(riderIds)
      .map((riderId) => ({
              riderId,
              rider: riderById.get(riderId),
              eindzege: weightFor(eindzege, riderId),
              geel: weightFor(geel, riderId),
              groen: weightFor(groen, riderId),
              bergtrui: weightFor(bergtrui, riderId),
              wit: weightFor(wit, riderId),
              nextStage: weightFor(nextStage, riderId),
      }))
      .sort((a, b) => b.eindzege - a.eindzege)

  const headerCell = (label: string) =>
        h('th', { key: label, className: 'px-3 py-2 text-left text-xs font-semibold uppercase text-muted' }, label)

  return h(
        'div',
    { className: 'space-y-6' },
        h(
                'div',
          { className: 'rounded-xl border border-border bg-card p-5' },
                h('div', { className: 'text-xl font-bold' }, 'Winstkans per renner'),
                h(
                          'div',
                  { className: 'mt-1 text-sm text-muted' },
                          `Bron: bookmaker-odds (implied probability). Laatst bijgewerkt: ${lastUpdated() ?? snapshotDate()}.`,
                        ),
                h('div', { className: 'mt-2 text-xs text-muted' }, snapshotNote()),
                h(
                          'div',
                  { className: 'mt-2 text-xs text-muted' },
                          'Let op: dit zijn kansen zoals ingeprijsd door bookmakers, geen garanties. Gebruik ze als indicatie, niet als advies.',
                        ),
              ),
        rows.length === 0
          ? h(
                      'div',
            { className: 'rounded-xl border border-border bg-card p-5 text-sm text-muted' },
                      'Nog geen odds-data beschikbaar.',
                    )
          : h(
                      'div',
            { className: 'overflow-x-auto rounded-xl border border-border bg-card' },
                      h(
                                    'table',
                        { className: 'w-full text-sm' },
                                    h(
                                                    'thead',
                                                    null,
                                                    h(
                                                                      'tr',
                                                      { className: 'border-b border-border' },
                                                                      headerCell('Renner'),
                                                                      headerCell('Ploeg'),
                                                                      headerCell('Eindzege'),
                                                                      headerCell('Geel'),
                                                                      headerCell('Groen'),
                                                                      headerCell('Bergtrui'),
                                                                      headerCell('Wit'),
                                                                      headerCell(`Etappe ${nextStageNumber}`),
                                                                    ),
                                                  ),
                                    h(
                                                    'tbody',
                                                    null,
                                                    rows.map((row) =>
                                                                      h(
                                                                                          'tr',
                                                                        { key: row.riderId, className: 'border-b border-border/50' },
                                                                                          h('td', { className: 'px-3 py-2 font-medium' }, row.rider ? row.rider.name : `#${row.riderId}`),
                                                                                          h('td', { className: 'px-3 py-2 text-muted' }, row.rider ? row.rider.team : ''),
                                                                                          h('td', { className: 'px-3 py-2 tabular-nums' }, pct(row.eindzege)),
                                                                                          h('td', { className: 'px-3 py-2 tabular-nums' }, pct(row.geel)),
                                                                                          h('td', { className: 'px-3 py-2 tabular-nums' }, pct(row.groen)),
                                                                                          h('td', { className: 'px-3 py-2 tabular-nums' }, pct(row.bergtrui)),
                                                                                          h('td', { className: 'px-3 py-2 tabular-nums' }, pct(row.wit)),
                                                                                          h('td', { className: 'px-3 py-2 tabular-nums' }, pct(row.nextStage)),
                                                                                        ),
                                                                           ),
                                                  ),
                                  ),
                    ),
      )
}
