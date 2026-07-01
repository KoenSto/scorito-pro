import { useState } from 'react'
import ridersData from '../data/riders.json'
import rulesData from '../data/rules.json'
import type { Rider, Rules } from '../types'
import { summarizeBudget } from '../engine/budgetEngine'
import StatCard from '../components/common/StatCard'
import { Wallet, Users, Coins } from 'lucide-react'

const riders = ridersData as Rider[]
const rules = rulesData as Rules

export default function Team() {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const selected = riders.filter((r) => selectedIds.includes(r.id))
  const budget = summarizeBudget(selected, rules)

  function toggle(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Besteed" value={`${budget.spent} mln`} icon={<Coins size={18} />} accent={budget.spent > rules.budget ? 'danger' : 'success'} />
        <StatCard label="Resterend" value={`${budget.remaining} mln`} icon={<Wallet size={18} />} accent="primary" />
        <StatCard label="Renners" value={`${budget.count}/${rules.teamSize}`} icon={<Users size={18} />} accent="warning" />
      </div>

      {budget.violations.length > 0 && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {budget.violations.map((v) => (
            <div key={v}>{v}</div>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 font-semibold">Selecteer je team ({rules.teamSize} renners, max {rules.budget} mln)</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {riders.map((r) => {
            const active = selectedIds.includes(r.id)
            return (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${active ? 'border-primary bg-primary/15' : 'border-border bg-card hover:bg-cardhover'}`}
              >
                <span>
                  <span className="font-medium">{r.name}</span>
                  <span className="block text-xs text-muted">{r.team} &middot; {r.role}</span>
                </span>
                <span className="font-mono">{r.price.toFixed(1)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
