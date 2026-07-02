import type { ReactNode } from 'react'
import { Users, Bike, Wallet, TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts'
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

  // --- Data voor de grafieken ---

  // Top 10 op value (verwachte punten per miljoen)
  const valueChart = [...riders]
    .sort((a, b) => ratings[b.id].value - ratings[a.id].value)
    .slice(0, 10)
    .map((r) => ({
      name: r.name.split(' ').slice(-1)[0],
      value: Number(ratings[r.id].value.toFixed(1)),
    }))

  // Prijsverdeling: aantal renners per prijsklasse (bucket van 1 mln)
  const maxPrice = Math.ceil(Math.max(...riders.map((r) => r.price)))
  const priceBuckets = Array.from({ length: maxPrice }, (_, i) => {
    const lo = i
    const hi = i + 1
    const count = riders.filter((r) => r.price > lo && r.price <= hi).length
    return { range: `${lo}-${hi}`, count }
  }).filter((b) => b.count > 0)

  // Scatter: prijs vs. verwachte punten (waarde-analyse)
  const scatterData = riders.map((r) => ({
    price: r.price,
    points: Number(ratings[r.id].expectedPoints.toFixed(0)),
    name: r.name,
  }))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Renners in database" value={riders.length} icon={<Bike size={18} />} />
        <StatCard label="Ploegen" value={teams} icon={<Users size={18} />} accent="success" />
        <StatCard label="Budget" value={`${rules.budget} mln`} icon={<Wallet size={18} />} accent="warning" />
        <StatCard label="Teamgrootte" value={rules.teamSize} icon={<TrendingUp size={18} />} />
      </div>

      {/* Grafiek: beste value top 10 */}
      <ChartCard title="Top 10 Value (verwachte punten per mln)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={valueChart} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} name="Value" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grafiek: prijsverdeling */}
        <ChartCard title="Prijsverdeling van renners">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={priceBuckets} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} label={{ value: 'Prijs (mln)', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} name="Aantal renners" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Grafiek: prijs vs. verwachte punten */}
        <ChartCard title="Waarde-analyse: prijs vs. verwachte punten">
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" dataKey="price" name="Prijs" unit=" mln" tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="points" name="Punten" tick={{ fontSize: 11 }} />
              <ZAxis range={[40, 40]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number, n: string) => [v, n]} />
              <Scatter data={scatterData} fill="#f59e0b" />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopList title="Beste Value (punten per mln)" rows={topValue.map((r) => ({ name: r.name, team: r.team, score: ratings[r.id].value }))} />
        <TopList title="Beste Kopman-keuzes" rows={topCaptain.map((r) => ({ name: r.name, team: r.team, score: ratings[r.id].captain }))} />
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
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
