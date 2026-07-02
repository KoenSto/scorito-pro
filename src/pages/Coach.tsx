import { useMemo, useState } from 'react'
import { Brain, Crown, Trophy, ArrowLeftRight, Users } from 'lucide-react'
import ridersData from '../data/riders.json'
import rulesData from '../data/rules.json'
import stagesData from '../data/stages.json'
import type { Rider, Rules, Stage } from '../types'
import { rateAll } from '../engine/ratingEngine'
import { optimizeTeam } from '../engine/optimizerEngine'
import { recommendLineup, transferAdvice } from '../engine/coachEngine'
import StatCard from '../components/common/StatCard'

const riders = ridersData as Rider[]
const rules = rulesData as Rules
const stages = (stagesData as Stage[]).filter((s) => s.from !== 'Rustdag')
const ratings = rateAll(riders)

// De coach adviseert op basis van je (geoptimaliseerde) team van 20 renners.
const optimized = optimizeTeam(riders, ratings, rules)
const myTeam = optimized.team

const typeColor: Record<string, string> = {
  Vlak: 'bg-success/20 text-success',
  Heuvel: 'bg-warning/20 text-warning',
  Berg: 'bg-danger/20 text-danger',
  Tijdrit: 'bg-primary/20 text-primary',
  Ploegentijdrit: 'bg-primary/20 text-primary',
}

export default function Coach() {
  const [stageId, setStageId] = useState<number>(stages[0]?.id ?? 1)

  const stage = useMemo(
    () => stages.find((s) => s.id === stageId) ?? stages[0],
    [stageId],
  )

  const advice = useMemo(() => recommendLineup(myTeam, stage), [stage])
  const transfers = useMemo(
    () => transferAdvice(myTeam, riders, ratings, rules, 5),
    [],
  )

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Brain size={18} className="text-primary" /> AI Coach
        </h2>
        <p className="mt-1 text-sm text-muted">
          Advies per etappe: beste 9 renners uit je team van {myTeam.length},
          plus kopmankeuze en transfertips.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted">Kies etappe:</label>
          <select
            value={stageId}
            onChange={(e) => setStageId(Number(e.target.value))}
            className="rounded-lg border border-border bg-cardhover px-3 py-2 text-sm"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                Etappe {s.id} - {s.from} &rarr; {s.to} ({s.type})
              </option>
            ))}
          </select>
          <span
            className={`rounded-full px-3 py-1 text-xs ${typeColor[stage.type] ?? ''}`}
          >
            {stage.type} &middot; {stage.distanceKm} km
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Verwachte dagpunten"
          value={advice.expectedPoints}
          icon={<Trophy size={18} />}
          accent="success"
        />
        <StatCard
          label="Kopman"
          value={advice.captain?.name ?? '-'}
          sub="Dubbele etappepunten"
          icon={<Crown size={18} />}
          accent="warning"
        />
        <StatCard
          label="Opgesteld"
          value={`${advice.lineup.length} / ${myTeam.length}`}
          icon={<Users size={18} />}
          accent="primary"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Renner</th>
              <th className="px-4 py-3 text-left font-medium">Ploeg</th>
              <th className="px-4 py-3 text-left font-medium">Rol</th>
              <th className="px-4 py-3 text-right font-medium">Dagpunten</th>
            </tr>
          </thead>
          <tbody>
            {advice.lineup.map((pick, i) => (
              <tr
                key={pick.rider.id}
                className="border-t border-border hover:bg-cardhover"
              >
                <td className="px-4 py-2 text-muted">{i + 1}</td>
                <td className="px-4 py-2 font-medium">
                  {pick.rider.name}
                  {pick.isCaptain && (
                    <Crown size={14} className="ml-2 inline text-warning" />
                  )}
                </td>
                <td className="px-4 py-2 text-muted">{pick.rider.team}</td>
                <td className="px-4 py-2 text-muted">{pick.rider.role}</td>
                <td className="px-4 py-2 text-right font-mono text-success">
                  {pick.points.toFixed(1)}
                  {pick.isCaptain && <span className="text-warning"> x2</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {advice.bench.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Bank (niet opgesteld)</h3>
          <div className="flex flex-wrap gap-2">
            {advice.bench.map((pick) => (
              <span
                key={pick.rider.id}
                className="rounded-full bg-cardhover px-3 py-1 text-xs"
              >
                {pick.rider.name} ({pick.points.toFixed(1)})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ArrowLeftRight size={16} className="text-primary" /> Transfertips
          (hele Tour)
        </h3>
        {transfers.length === 0 ? (
          <p className="text-sm text-muted">
            Geen verbeteringen gevonden: je team is al optimaal binnen de
            spelregels.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {transfers.map((t) => (
              <li
                key={t.out.id}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="text-danger">{t.out.name}</span>
                <ArrowLeftRight size={14} className="text-muted" />
                <span className="text-success">{t.in.name}</span>
                <span className="text-muted">
                  (+{t.gain} pnt, {t.in.price.toFixed(1)} mln)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted">
        Advies o.b.v. rol x etappetype en prijs als kwaliteitsproxy. De etappes
        komen uit de officiele Tour de France 2026-route.
      </p>
    </div>
  )
}
