import { createElement as h, useState } from 'react'
import ridersData from '../data/riders.json'
import stagesData from '../data/stages.json'
import type { Rider, Stage } from '../types'
import {
  favouritesForClassification,
  favouritesForStage,
  snapshotDate,
  snapshotNote,
  lastUpdated,
  type Classification,
} from '../engine/bookmakerEngine'
import scoringData from '../data/scoring.json'
import stageResultsData from '../data/stageResults.json'

const riders = ridersData as Rider[]
const riderById = new Map(riders.map((r) => [r.id, r]))
const stages = stagesData as Stage[]
const scoring = scoringData as {
  stageResult: number[]
  finalClassification: { algemeen: number[]; punten: number[]; berg: number[]; jongeren: number[] }
}

type Option = {
  key: string
  label: string
  kind: 'classification' | 'stage'
  classification?: Classification
  stageNumber?: number
}

const CLASSIFICATION_OPTIONS: Option[] = [
  { key: 'eindzege', label: 'Eindzege (algemeen klassement)', kind: 'classification', classification: 'eindzege' },
  { key: 'geel', label: 'Gele trui (algemeen klassement)', kind: 'classification', classification: 'geel' },
  { key: 'groen', label: 'Groene trui (puntenklassement)', kind: 'classification', classification: 'groen' },
  { key: 'bergtrui', label: 'Bergtrui (bergklassement)', kind: 'classification', classification: 'bergtrui' },
  { key: 'wit', label: 'Witte trui (jongerenklassement)', kind: 'classification', classification: 'wit' },
]

const STAGE_OPTIONS: Option[] = stages.map((s) => ({
  key: 'stage-' + s.id,
  label: 'Etappe ' + s.id + ': ' + s.from + ' - ' + s.to + ' (' + s.type + ')',
  kind: 'stage',
  stageNumber: s.id,
}))

const ALL_OPTIONS: Option[] = [...CLASSIFICATION_OPTIONS, ...STAGE_OPTIONS]

function pointsTableFor(option: Option): number[] {
  if (option.kind === 'stage') return scoring.stageResult ?? []
  switch (option.classification) {
    case 'eindzege':
    case 'geel':
      return scoring.finalClassification.algemeen ?? []
    case 'groen':
      return scoring.finalClassification.punten ?? []
    case 'bergtrui':
      return scoring.finalClassification.berg ?? []
    case 'wit':
      return scoring.finalClassification.jongeren ?? []
    default:
      return []
  }
}

function favouritesFor(option: Option) {
  if (option.kind === 'stage' && option.stageNumber != null) return favouritesForStage(option.stageNumber)
  if (option.kind === 'classification' && option.classification) return favouritesForClassification(option.classification)
  return []
}

function pct(weight: number): string {
  return weight > 0 ? Math.round(weight * 100) + '%' : '-'
}

export default function WinProbability() {
  const stagesFile = stageResultsData as unknown as { stages: { stageNumber: number }[] }
  const stageNumbers = stagesFile.stages.map((s) => s.stageNumber)
  const nextStageNumber = stageNumbers.length > 0 ? Math.max(...stageNumbers) + 1 : 1
  const defaultOption =
    ALL_OPTIONS.find((o) => o.kind === 'stage' && o.stageNumber === nextStageNumber) ?? ALL_OPTIONS[0]

  const [selectedKey, setSelectedKey] = useState(defaultOption.key)
  const selected = ALL_OPTIONS.find((o) => o.key === selectedKey) ?? ALL_OPTIONS[0]

  const list = favouritesFor(selected)
  const points = pointsTableFor(selected)

  const rows = list.map((f, idx) => ({
    rank: idx + 1,
    riderId: f.riderId,
    rider: riderById.get(f.riderId),
    weight: f.weight,
    projectedPoints: points[idx] ?? 0,
  }))

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
        { className: 'mt-3 max-w-md' },
        h(
          'label',
          { className: 'text-xs font-semibold uppercase text-muted', htmlFor: 'winprob-select' },
          'Klassement of etappe',
        ),
        h(
          'select',
          {
            id: 'winprob-select',
            className: 'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm',
            value: selectedKey,
            onChange: (e) => setSelectedKey(e.target.value),
          },
          h(
            'optgroup',
            { label: 'Klassementen' },
            CLASSIFICATION_OPTIONS.map((o) => h('option', { key: o.key, value: o.key }, o.label)),
          ),
          h(
            'optgroup',
            { label: 'Etappes' },
            STAGE_OPTIONS.map((o) => h('option', { key: o.key, value: o.key }, o.label)),
          ),
        ),
      ),
      h(
        'div',
        { className: 'mt-3 text-sm text-muted' },
        'Bron: bookmaker-odds (implied probability). Laatst bijgewerkt: ' + (lastUpdated() ?? snapshotDate()),
      ),
      h('div', { className: 'mt-2 text-xs text-muted' }, snapshotNote()),
      h(
        'div',
        { className: 'mt-2 text-xs text-muted' },
        'Let op: dit zijn kansen zoals ingeprijsd door bookmakers, geen garanties. De kolom "Verwachte punten" toont de Scorito-punten die bij deze rangorde horen, als de renner exact op deze marktpositie zou eindigen.',
      ),
    ),
    rows.length === 0
      ? h(
          'div',
          { className: 'rounded-xl border border-border bg-card p-5 text-sm text-muted' },
          'Nog geen odds-data beschikbaar voor deze selectie.',
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
                headerCell('#'),
                headerCell('Renner'),
                headerCell('Ploeg'),
                headerCell('Winstkans'),
                headerCell('Verwachte punten'),
              ),
            ),
            h(
              'tbody',
              null,
              rows.map((row) =>
                h(
                  'tr',
                  { key: row.riderId, className: 'border-b border-border' },
                  h('td', { className: 'px-3 py-2' }, row.rank),
                  h('td', { className: 'px-3 py-2 font-medium' }, row.rider ? row.rider.name : '#' + row.riderId),
                  h('td', { className: 'px-3 py-2 text-muted' }, row.rider ? row.rider.team : '-'),
                  h('td', { className: 'px-3 py-2' }, pct(row.weight)),
                  h('td', { className: 'px-3 py-2 font-semibold' }, row.projectedPoints),
                ),
              ),
            ),
          ),
        ),
  )
}
