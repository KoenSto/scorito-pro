import { useLocation } from 'react-router-dom'
import { createElement as h } from 'react'
import { Menu } from 'lucide-react'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/team': 'Mijn Team',
  '/riders': 'Alle Renners',
  '/stages': 'Etappes',
  '/optimizer': 'Optimizer',
  '/settings': 'Instellingen',
}

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'Scorito Pro'

return h(
  'header',
  { className: 'sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 md:px-8 backdrop-blur' },
  h(
    'div',
    { className: 'flex items-center gap-3' },
    h(
      'button',
      {
        type: 'button',
        onClick: onMenuClick,
        className: 'md:hidden text-muted hover:text-slate-100',
        'aria-label': 'Menu openen',
      },
      h(Menu, { size: 22 }),
      ),
    h('h1', { className: 'text-lg font-semibold' }, title),
    ),
  h('div', { className: 'text-sm text-muted' }, 'Tour de France 2026'),
  )
}
