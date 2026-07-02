import { useMemo, useState } from 'react'
import { Wallet, Users, Coins, Sparkles, Trash2, Search, Check } from 'lucide-react'
import ridersData from '../data/riders.json'
import rulesData from '../data/rules.json'
import type { Rider, Rules, RiderRole } from '../types'
import { summarizeBudget } from '../engine/budgetEngine'
import { rateAll } from '../engine/ratingEngine'
import { optimizeTeam } from '../engine/optimizerEngine'
import { useMyTeam } from '../store/teamStore'
import StatCard from '../components/common/StatCard'

const riders = ridersData as Rider[]
const rules = rulesData as Rules
const ratings = rateAll(riders)

const roles: (RiderRole | 'Alle')[] = [
  'Alle',
  'GC',
  'Klimmer',
  'Sprint',
  'Klassiek',
  'Tijdrit',
  'Knecht',
]

export default function Team() {
  const team = useMyTeam()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RiderRole | 'Alle'>('Alle')

  const budget = summarizeBudget(team.riders, rules)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return riders.filter((r) => {
      if (roleFilter !== 'Alle' && r.role !== roleFilter) return false
      if (q && !r.name.toLowerCase().includes(q) && !r.team.toLowerCase().includes(q))
        return false
      return true
    })
  }, [query, roleFilter])

  const teamCountFor = (t: string) =>
    team.riders.filter((r) => r.team === t).length

  function canAdd(r: Rider): boolean {
    if (team.has(r.id)) return true
    if (team.ids.length >= rules.teamSize) return false
    if (budget.spent + r.price > rules.budget) return false
    if (teamCountFor(r.team) >= rules.maxPerTeam) return false
    return true
  }

  function importOptimized() {
    const result = optimizeTeam(riders, ratings, rules)
    team.setIds(result.team.map((r) => r.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Users size={18} className="text-primary" /> Mijn Team
          </h2>
          <p className="mt-1 text-sm text-muted">
            Stel je team samen ({rules.teamSize} renners, max {rules.budget} mln,
            max {rules.maxPerTeam} per ploeg). Je selectie wordt automatisch
            bewaard.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={importOptimized}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Sparkles size={16} /> Importeer optimizer-team
          </button>
          <button
            onClick={team.clear}
            disabled={team.ids.length === 0}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-cardhover disabled:opacity-50"
          >
            <Trash2 size={16} /> Wis team
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Besteed"
          value={`${budget.spent} mln`}
          icon={<Coins size={18} />}
          accent={budget.spent > rules.budget ? 'danger' : 'success'}
        />
        <StatCard
          label="Resterend"
          value={`${budget.remaining} mln`}
          icon={<Wallet size={18} />}
          accent="primary"
        />
        <StatCard
          label="Renners"
          value={`${budget.count}/${rules.teamSize}`}
          icon={<Users size={18} />}
          accent="warning"
        />
        <StatCard
          label="Team compleet"
          value={budget.valid ? 'Ja' : 'Nee'}
          icon={<Check size={18} />}
          accent={budget.valid ? 'success' : 'danger'}
        />
      </div>

      {budget.violations.length > 0 && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {budget.violations.map((v) => (
            <div key={v}>{v}</div>
          ))}
        </div>
      )}

      {team.riders.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">
            Geselecteerd ({team.riders.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {team.riders.map((r) => (
              <button
                key={r.id}
                onClick={() => team.remove(r.id)}
                className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs text-primary hover:bg-danger/20 hover:text-danger"
                title="Klik om te verwijderen"
              >
                {r.name} &middot; {r.price.toFixed(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek renner of ploeg..."
            className="rounded-lg border border-border bg-cardhover py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RiderRole | 'Alle')}
          className="rounded-lg border border-border bg-cardhover px-3 py-2 text-sm"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">{filtered.length} renners</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => {
          const active = team.has(r.id)
          const disabled = !active && !canAdd(r)
          return (
            <button
              key={r.id}
              onClick={() => team.toggle(r.id)}
              disabled={disabled}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                active
                  ? 'border-primary bg-primary/15'
                  : disabled
                  ? 'border-border bg-card opacity-40'
                  : 'border-border bg-card hover:bg-cardhover'
              }`}
            >
              <span>
                <span className="font-medium">{r.name}</span>
                <span className="block text-xs text-muted">
                  {r.team} &middot; {r.role} &middot; {ratings[r.id].expectedPoints} pnt
                </span>
              </span>
              <span className="font-mono">{r.price.toFixed(1)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
