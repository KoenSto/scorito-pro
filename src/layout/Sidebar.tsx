import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Bike,
  Map,
  Sparkles,
  Brain,
  Settings as SettingsIcon,
} from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/team', label: 'Mijn Team', icon: Users },
  { to: '/riders', label: 'Alle Renners', icon: Bike },
  { to: '/stages', label: 'Etappes', icon: Map },
  { to: '/optimizer', label: 'Optimizer', icon: Sparkles },
  { to: '/coach', label: 'AI Coach', icon: Brain },
  { to: '/settings', label: 'Instellingen', icon: SettingsIcon },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold">
          S
        </div>
        <span className="font-semibold text-lg">Scorito Pro</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-muted hover:bg-cardhover hover:text-slate-100',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 text-xs text-muted border-t border-border">
        v0.1.0 &middot; Tour 2026
      </div>
    </aside>
  )
}
