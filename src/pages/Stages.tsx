import stagesData from '../data/stages.json'
import type { Stage } from '../types'

const stages = stagesData as Stage[]

const typeColor: Record<string, string> = {
  Vlak: 'bg-success/20 text-success',
  Heuvel: 'bg-warning/20 text-warning',
  Berg: 'bg-danger/20 text-danger',
  Tijdrit: 'bg-primary/20 text-primary',
  Ploegentijdrit: 'bg-primary/20 text-primary',
}

export default function Stages() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card text-muted">
          <tr>
            <th className="px-4 py-3 text-left font-medium">#</th>
            <th className="px-4 py-3 text-left font-medium">Dag</th>
            <th className="px-4 py-3 text-left font-medium">Van</th>
            <th className="px-4 py-3 text-left font-medium">Naar</th>
            <th className="px-4 py-3 text-left font-medium">Km</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.id} className="border-t border-border hover:bg-cardhover">
              <td className="px-4 py-2 font-mono text-muted">{s.id}</td>
              <td className="px-4 py-2">{s.day}</td>
              <td className="px-4 py-2">{s.from}</td>
              <td className="px-4 py-2">{s.to}</td>
              <td className="px-4 py-2 font-mono">{s.distanceKm || '-'}</td>
              <td className="px-4 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[s.type] ?? 'bg-cardhover'}`}>
                  {s.type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
