import { NavLink } from 'react-router-dom'
import { createElement as h } from 'react'
import {
    LayoutDashboard,
    Users,
    Bike,
    Map,
    Sparkles,
    Brain,
    Trophy,
    Flag,
    TrendingUp,
    Settings as SettingsIcon,
    X,
} from 'lucide-react'
import clsx from 'clsx'

const nav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/team', label: 'Mijn Team', icon: Users },
    { to: '/riders', label: 'Alle Renners', icon: Bike },
    { to: '/stages', label: 'Etappes', icon: Map },
    { to: '/results', label: 'Uitslagen', icon: Flag },
    { to: '/optimizer', label: 'Optimizer', icon: Sparkles },
    { to: '/coach', label: 'AI Coach', icon: Brain },
    { to: '/favourites', label: 'Favorieten', icon: Trophy },
    { to: '/winprobability', label: 'Winstkans', icon: TrendingUp },
    { to: '/settings', label: 'Instellingen', icon: SettingsIcon },
    ]

interface SidebarProps {
    open: boolean
    onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
    return h(
        'div',
        null,
        open &&
        h('div', {
            className: 'fixed inset-0 z-40 bg-black/50 md:hidden',
            onClick: onClose,
        }),
        h(
            'aside',
            {
                className: clsx(
                    'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out md:translate-x-0',
                    open ? 'translate-x-0' : '-translate-x-full',
                    ),
            },
            h(
                'div',
                { className: 'flex items-center justify-between gap-2 px-6 h-16 border-b border-border' },
                h(
                    'div',
                    { className: 'flex items-center gap-2' },
                    h('div', { className: 'h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold' }, 'S'),
                    h('span', { className: 'font-semibold text-lg' }, 'Scorito Pro'),
                    ),
                h(
                    'button',
                    {
                        type: 'button',
                        className: 'md:hidden text-muted hover:text-slate-100',
                        onClick: onClose,
                        'aria-label': 'Menu sluiten',
                    },
                    h(X, { size: 20 }),
                    ),
                ),
            h(
                'nav',
                { className: 'flex-1 overflow-y-auto p-3 space-y-1' },
                nav.map(({ to, label, icon: Icon }) =>
                    h(
                        NavLink,
                        {
                            key: to,
                            to,
                            end: to === '/',
                            onClick: onClose,
                            className: ({ isActive }: { isActive: boolean }) =>
                                clsx(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    isActive ? 'bg-primary text-white' : 'text-muted hover:bg-cardhover hover:text-slate-100',
                                    ),
                        },
                        h(Icon, { size: 18 }),
                        label,
                        ),
                        ),
                ),
            h(
                'div',
                { className: 'p-4 text-xs text-muted border-t border-border' },
                'v0.1.0 \u00b7 Tour 2026',
                ),
            ),
        )
}
)
}
