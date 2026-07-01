import { Sparkles } from 'lucide-react'

export default function Optimizer() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <Sparkles className="mx-auto mb-4 text-primary" size={32} />
      <h2 className="text-lg font-semibold">Team Optimizer</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        De optimizer berekent straks het beste team binnen budget, teamgrootte
        en de limiet van renners per ploeg. Dit onderdeel volgt in Sprint 2,
        gebouwd bovenop de Rating Engine.
      </p>
    </div>
  )
}
