import ridersData from '../data/riders.json'
import type { Rider, StageType } from '../types'
import {
  favouritesForClassification,
  favouritesForStageType,
  snapshotDate,
  snapshotNote,
  type Classification,
  type FavouriteWeight,
} from '../engine/bookmakerEngine'

const riders = ridersData as Rider[]
const nameById = new Map(riders.map((r) => [r.id, r]))

const classifications: { key: Classification; label: string }[] = [
  { key: 'geel', label: 'Geel (eindklassement)' },
  { key: 'groen', label: 'Groen (punten)' },
  { key: 'bergtrui', label: 'Bergtrui' },
  { key: 'wit', label: 'Wit (jongeren)' },
  { key: 'eindzege', label: 'Eindzege / etappejager' },
]

const stageTypes: { key: StageType; label: string }[] = [
  { key: 'Vlak', label: 'Vlakke etappe' },
  { key: 'Heuvel', label: 'Heuveletappe' },
  { key: 'Berg', label: 'Bergetappe' },
  { key: 'Tijdrit', label: 'Tijdrit' },
]

function FavouriteRow({ fav, rank }: { fav: FavouriteWeight; rank: number }) {
  const rider = nameById.get(fav.riderId)
  const pct = Math.round(fav.weight * 100)
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="w-5 text-right text-xs text-muted">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{rider?.name ?? 'Onbekend'}</div>
        <div className="truncate text-xs text-muted">{rider?.team ?? ''}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-9 text-right text-xs tabular-nums text-muted">{pct}%</span>
      </div>
    </li>
  )
}

function FavouriteCard({ title, favs }: { title: string; favs: FavouriteWeight[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-200">{title}</h3>
      {favs.length === 0 ? (
        <p className="text-xs text-muted">Geen favorieten in de snapshot.</p>
      ) : (
        <ol className="divide-y divide-border/50">
          {favs.map((f, i) => (
            <FavouriteRow key={f.riderId} fav={f} rank={i + 1} />
          ))}
        </ol>
      )}
    </div>
  )
}

export default function Favourites() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h1 className="text-xl font-bold">Bookmaker-favorieten</h1>
        <p className="mt-1 text-sm text-muted">
          Marktbeeld per klassement en etappetype (momentopname van {snapshotDate()}).
        </p>
        <p className="mt-2 text-xs text-muted">{snapshotNote()}</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Klassementen</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classifications.map((c) => (
            <FavouriteCard
              key={c.key}
              title={c.label}
              favs={favouritesForClassification(c.key)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Etappetypes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stageTypes.map((s) => (
            <FavouriteCard
              key={s.key}
              title={s.label}
              favs={favouritesForStageType(s.key)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
