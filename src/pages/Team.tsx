import { useMemo, useState } from 'react'
import {
  Wallet,
  Users,
  Coins,
  Sparkles,
  Trash2,
  Search,
  Check,
  Save,
  FolderOpen,
  Trophy,
} from 'lucide-react'
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
  const [teamName, setTeamName] = useState('')

  const budget = summarizeBudget(team.riders, rules)

  // Potentieel: som van de verwachte Scorito-punten (scoringEngine) van de selectie.
  const potentialPoints = useMemo(
    () => team.riders.reduce((sum, r) => sum + (ratings[r.id]?.expectedPoints ?? 0), 0),
    [team.riders],
  )

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

  function handleSave() {
    const name = teamName.trim()
    if (!name) return
    team.saveTeam(name)
    setTeamName('')
  }

  return (
    <div className="space-y-6">
      {/* Header met samenvatting + acties */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mijn team</h1>
          <p className="text-sm text-slate-500">
            Stel je selectie van {rules.teamSize} renners samen (max {rules.maxPerTeam} per
            ploeg, budget {rules.budget} mln).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={importOptimized}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Sparkles size={16} /> Optimaal team laden
          </button>
          <button
            onClick={team.clear}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Trash2 size={16} /> Leegmaken
          </button>
        </div>
      </div>

      {/* Budget stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          label="Renners"
          value={`${budget.count} / ${rules.teamSize}`}
          icon={<Users size={18} />}
          accent={budget.count === rules.teamSize ? 'success' : 'primary'}
        />
        <StatCard
          label="Potentiële punten"
          value={Math.round(potentialPoints).toLocaleString('nl-NL')}
          icon={<Trophy size={18} />}
          accent="primary"
        />
        <StatCard
          label="Besteed"
          value={`${budget.spent.toFixed(1)} mln`}
          icon={<Coins size={18} />}
        />
        <StatCard
          label="Resterend"
          value={`${budget.remaining.toFixed(1)} mln`}
          icon={<Wallet size={18} />}
          accent={budget.remaining < 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Geldig"
          value={budget.valid ? 'Ja' : 'Nee'}
          icon={<Check size={18} />}
          accent={budget.valid ? 'success' : 'warning'}
        />
      </div>

      {budget.violations.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <ul className="list-inside list-disc space-y-1">
            {budget.violations.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Team opslaan / inladen */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Save size={16} /> Teams opslaan &amp; inladen
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Naam voor dit team..."
            className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={!teamName.trim() || team.ids.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} /> Huidig team opslaan
          </button>
        </div>

        {team.savedTeams.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            Nog geen opgeslagen teams. Geef je selectie een naam en sla het op.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {team.savedTeams.map((st) => (
              <li
                key={st.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium text-slate-800">{st.name}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {st.ids.length} renners
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => team.loadTeam(st.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-primary px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                  >
                    <FolderOpen size={14} /> Inladen
                  </button>
                  <button
                    onClick={() => team.deleteTeam(st.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    <Trash2 size={14} /> Verwijderen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Zoek + filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek renner of ploeg..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                roleFilter === role
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Rennerlijst */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Renner</th>
              <th className="px-4 py-2">Ploeg</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2 text-right">Prijs</th>
              <th className="px-4 py-2 text-right">Actie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const active = team.has(r.id)
              const allowed = canAdd(r)
              return (
                <tr key={r.id} className={active ? 'bg-primary/5' : ''}>
                  <td className="px-4 py-2 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-2 text-slate-500">{r.team}</td>
                  <td className="px-4 py-2 text-slate-500">{r.role}</td>
                  <td className="px-4 py-2 text-right text-slate-700">
                    {r.price.toFixed(1)} mln
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => team.toggle(r.id)}
                      disabled={!active && !allowed}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        active
                          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          : allowed
                            ? 'bg-primary text-white hover:bg-primary/90'
                            : 'cursor-not-allowed bg-slate-100 text-slate-400'
                      }`}
                    >
                      {active ? 'Verwijder' : 'Voeg toe'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
