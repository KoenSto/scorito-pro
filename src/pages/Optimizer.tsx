import { useMemo, useState } from 'react'
import { Sparkles, Crown, Coins, Trophy } from 'lucide-react'
import ridersData from '../data/riders.json'
import rulesData from '../data/rules.json'
import type { Rider, Rules } from '../types'
import { rateAll } from '../engine/ratingEngine'
import { optimizeTeam, type OptimizeResult } from '../engine/optimizerEngine'
import StatCard from '../components/common/StatCard'

const riders = ridersData as Rider[]
const rules = rulesData as Rules
const ratings = rateAll(riders)

export default function Optimizer() {
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [running, setRunning] = useState(false)

  const run = () => {
    setRunning(true)
    setTimeout(() => {
      setResult(optimizeTeam(riders, ratings, rules))
      setRunning(false)
    }, 30)
  }

  const perTeam = useMemo(() => {
    if (!result) return []
    const m = new Map<string, number>()
    for (const r of result.team) m.set(r.team, (m.get(r.team) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [result])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles size={18} className="text-primary" /> Team Optimizer
          </h2>
          <p className="mt-1 text-sm text-muted">
            Beste team binnen {rules.budget} mln, {rules.teamSize} renners, max{' '}
            {rules.maxPerTeam} per ploeg.
          </p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {running ? 'Berekenen...' : 'Optimaliseer'}
        </button>
      </div>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Verwachte punten" value={result.totalPoints} icon={<Trophy size={18} />} accent="success" />
            <StatCard label="Totale prijs" value={`${result.totalPrice} mln`} icon={<Coins size={18} />} accent="warning" />
            <StatCard label="Kopman" value={result.captain?.name ?? '-'} icon={<Crown size={18} />} accent="primary" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Renner</th>
                  <th className="px-4 py-3 text-left font-medium">Ploeg</th>
                  <th className="px-4 py-3 text-left font-medium">Rol</th>
                  <th className="px-4 py-3 text-left font-medium">Prijs</th>
                  <th className="px-4 py-3 text-left font-medium">Exp. pnt</th>
                </tr>
              </thead>
              <tbody>
                {result.team.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-cardhover">
                    <td className="px-4 py-2 font-medium">
                      {r.name}
                      {result.captain?.id === r.id && (
                        <Crown size={14} className="ml-2 inline text-warning" />
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted">{r.team}</td>
                    <td className="px-4 py-2 text-muted">{r.role}</td>
                    <td className="px-4 py-2 font-mono">{r.price.toFixed(1)}</td>
                    <td className="px-4 py-2 font-mono text-success">{ratings[r.id].expectedPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Renners per ploeg</h3>
            <div className="flex flex-wrap gap-2">
              {perTeam.map(([team, n]) => (
                <span key={team} className="rounded-full bg-cardhover px-3 py-1 text-xs">
                  {team}: {n}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
