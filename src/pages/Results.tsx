import { createElement as h } from 'react'
import stageResultsData from '../data/stageResults.json'
import ridersData from '../data/riders.json'
import stagesData from '../data/stages.json'
import type { Rider, Stage } from '../types'

interface ResultRow {
    rank: number
    riderId: number | null
    name: string
    team: string
    gap?: string
}

interface Withdrawal {
    bib: number | null
    riderId: number | null
    name: string
    team: string
    status: string
}

interface StageResult {
    stageNumber: number
    date: string | null
    stageTop: ResultRow[]
    gcTop: ResultRow[]
    pointsTop: ResultRow[]
    mountainsTop: ResultRow[]
    youthTop: ResultRow[]
    withdrawals: Withdrawal[]
}

interface StageResultsFile {
    meta: { source: string; lastUpdated: string | null; note: string }
    stages: StageResult[]
}

const data = stageResultsData as unknown as StageResultsFile
const riders = ridersData as Rider[]
const stages = stagesData as Stage[]
const riderById = new Map(riders.map((r) => [r.id, r]))

function displayName(row: { riderId: number | null; name: string }): string {
    const rider = row.riderId != null ? riderById.get(row.riderId) : undefined
    return rider ? rider.name : row.name
}

function resultCard(title: string, rows: ResultRow[]) {
    return h(
          'div',
      { key: title, className: 'rounded-xl border border-border bg-card p-4' },
          h('div', { className: 'mb-2 text-sm font-semibold text-slate-200' }, title),
          rows.length === 0
            ? h('div', { className: 'text-xs text-muted' }, 'Nog geen data.')
            : h(
                        'ol',
              { className: 'divide-y divide-border/50' },
                        rows.map((row) =>
                                      h(
                                                      'li',
                                        { key: `${title}-${row.rank}-${row.riderId ?? row.name}`, className: 'flex items-center gap-3 py-1.5' },
                                                      h('span', { className: 'w-5 text-right text-xs text-muted' }, row.rank),
                                                      h(
                                                                        'div',
                                                        { className: 'flex-1 min-w-0' },
                                                                        h('div', { className: 'truncate text-sm font-medium' }, displayName(row)),
                                                                        h('div', { className: 'truncate text-xs text-muted' }, row.team),
                                                                      ),
                                                      row.gap ? h('span', { className: 'text-xs tabular-nums text-muted' }, row.gap) : null,
                                                    ),
                                           ),
                      ),
        )
}

  function withdrawalCard(withdrawals: Withdrawal[]) {
      if (withdrawals.length === 0) return null
      return h(
            'div',
        { className: 'rounded-xl border border-border bg-card p-4' },
            h('div', { className: 'mb-2 text-sm font-semibold text-red-400' }, 'Uitgevallen / niet gestart'),
            h(
                    'ul',
              { className: 'divide-y divide-border/50' },
                    withdrawals.map((w) =>
                              h(
                                          'li',
                                { key: `${w.bib ?? ''}-${w.name}`, className: 'flex items-center gap-3 py-1.5' },
                                          h(
                                                        'div',
                                            { className: 'flex-1 min-w-0' },
                                                        h('div', { className: 'truncate text-sm font-medium' }, displayName(w)),
                                                        h('div', { className: 'truncate text-xs text-muted' }, w.team),
                                                      ),
                                          h('span', { className: 'text-xs text-red-400' }, w.status),
                                        ),
                                          ),
                  ),
          )
  }

export default function Results() {
    const sorted = [...data.stages].sort((a, b) => b.stageNumber - a.stageNumber)
    return h(
          'div',
      { className: 'space-y-6' },
          h(
                  'div',
            { className: 'rounded-xl border border-border bg-card p-5' },
                  h('div', { className: 'text-xl font-bold' }, 'Uitslagen per etappe'),
                  h(
                            'div',
                    { className: 'mt-1 text-sm text-muted' },
                            `Bron: letour.fr. Laatst bijgewerkt: ${data.meta.lastUpdated ?? 'nog niet automatisch bijgewerkt'}.`,
                          ),
                  h('div', { className: 'mt-2 text-xs text-muted' }, data.meta.note),
                ),
          sorted.length === 0
            ? h(
                        'div',
              { className: 'rounded-xl border border-border bg-card p-5 text-sm text-muted' },
                        'Er zijn nog geen etappe-uitslagen opgehaald. Dit gebeurt automatisch elke ochtend via de daily-update workflow.',
                      )
            : sorted.map((stage) => {
                        const info = stages.find((s) => s.id === stage.stageNumber)
                        const routeLabel = info ? `${info.from} > ${info.to}` : ''
                        return h(
                                      'section',
                          { key: stage.stageNumber, className: 'space-y-3' },
                                      h(
                                                      'h2',
                                        { className: 'text-lg font-semibold' },
                                                      `Etappe ${stage.stageNumber}${routeLabel ? ' — ' + routeLabel : ''} `,
                                                      h('span', { className: 'ml-2 text-xs text-muted' }, stage.date ?? ''),
                                                    ),
                                      h(
                                                      'div',
                                        { className: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' },
                                                      resultCard('Etappe-uitslag', stage.stageTop),
                                                      resultCard('Algemeen klassement (geel)', stage.gcTop),
                                                      resultCard('Punten (groen)', stage.pointsTop),
                                                      resultCard('Berg (bolletjes)', stage.mountainsTop),
                                                      resultCard('Jongeren (wit)', stage.youthTop),
                                                    ),
                                      withdrawalCard(stage.withdrawals),
                                    )
            }),
        )
}
