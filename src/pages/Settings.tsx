import rulesData from '../data/rules.json'
import type { Rules } from '../types'

const rules = rulesData as Rules

export default function Settings() {
  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">Spelregels</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Budget" value={`${rules.budget} mln`} />
          <Row label="Teamgrootte" value={String(rules.teamSize)} />
          <Row label="Max per ploeg" value={String(rules.maxPerTeam)} />
        </dl>
        <p className="mt-4 text-xs text-muted">
          Deze regels komen uit src/data/rules.json en worden gebruikt door de
          budget- en optimizer-engines.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  )
}
