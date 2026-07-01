import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import ridersData from '../data/riders.json'
import type { Rider } from '../types'
import { rateAll } from '../engine/ratingEngine'

const riders = ridersData as Rider[]
const ratings = rateAll(riders)

type SortKey = 'name' | 'team' | 'price' | 'overall' | 'value' | 'captain' | 'expectedPoints'

export default function Riders() {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [sort, setSort] = useState<SortKey>('overall')

  const roles = useMemo(() => ['all', ...new Set(riders.map((r) => r.role))], [])

  const rows = useMemo(() => {
    let list = riders.filter((r) => {
      const q = query.toLowerCase()
      const matchQ = r.name.toLowerCase().includes(q) || r.team.toLowerCase().includes(q)
      const matchRole = role === 'all' || r.role === role
      return matchQ && matchRole
    })
    list = [...list].sort((a, b) => {
      if (sort === 'name' || sort === 'team') return a[sort].localeCompare(b[sort])
      if (sort === 'price') return b.price - a.price
      return ratings[b.id][sort] - ratings[a.id][sort]
    })
    return list
  }, [query, role, sort])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek renner of ploeg..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {roles.map((r) => (
            <option key={r} value={r}>{r === 'all' ? 'Alle rollen' : r}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-muted">
            <tr>
              {([
                ['name', 'Renner'],
                ['team', 'Ploeg'],
                ['price', 'Prijs'],
                ['overall', 'Rating'],
                ['expectedPoints', 'Exp. pnt'],
                ['value', 'Value'],
                ['captain', 'Captain'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => setSort(key)}
                  className={`cursor-pointer px-4 py-3 text-left font-medium hover:text-slate-100 ${sort === key ? 'text-primary' : ''}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rt = ratings[r.id]
              return (
                <tr key={r.id} className="border-t border-border hover:bg-cardhover">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2 text-muted">{r.team}</td>
                  <td className="px-4 py-2 font-mono">{r.price.toFixed(1)}</td>
                  <td className="px-4 py-2 font-mono">{rt.overall}</td>
                  <td className="px-4 py-2 font-mono">{rt.expectedPoints}</td>
                  <td className="px-4 py-2 font-mono text-success">{rt.value}</td>
                  <td className="px-4 py-2 font-mono text-primary">{rt.captain}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">{rows.length} renners getoond</p>
    </div>
  )
}
