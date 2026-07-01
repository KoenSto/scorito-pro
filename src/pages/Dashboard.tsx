import { Users, Bike, Wallet, TrendingUp } from 'lucide-react'
import StatCard from '../components/common/StatCard'
import ridersData from '../data/riders.json'
import rulesData from '../data/rules.json'
import type { Rider, Rules } from '../types'
import { rateAll } from '../engine/ratingEngine'

const riders = ridersData as Rider[]
const rules = rulesData as Rules

export default function Dashboard() {
  const ratings = rateAll(riders)
  const teams = new Set(riders.map((r) => r.team)).size
  const topValue = [...riders]
    .sort((a, b) => ratings[b.id].value - ratings[a.id].value)
    .slice(0, 5)
  const topCaptain = [...riders]
    .sort((a, b) => ratings[b.id].captain - ratings[a.id].captain)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Renners in database" value={riders.length} icon={<Bike size={18} />} />
        <StatCard label="Ploegen" value={teams} icon={<Users size={18} />} accent="success" />
        <StatCard label="Budget" value={`${rules.budget} mln`} icon={<Wallet size={18} />} accent="warning" />
        <StatCard label="Teamgrootte" value={rules.teamSize} icon={<TrendingUp size={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopList title="Beste Value (punten per mln)" rows={topValue.map((r) => ({ name: r.name, team: r.team, score: ratings[r.id].value }))} />
        <TopList title="Beste Kopman-keuzes" rows={topCaptain.map((r) => ({ name: r.name, team: r.team, score: ratings[r.id].captain }))} />
      </div>
    </div>
  )
}

function TopList({ title, rows }: { title: string; rows: { name: string; team: string; score: number }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-3">
              <span className="w-5 text-muted">{i + 1}</span>
              <span className="font-medium">{r.name}</span>
              <span className="text-muted">{r.team}</span>
            </span>
            <span className="font-mono text-primary">{r.score}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
