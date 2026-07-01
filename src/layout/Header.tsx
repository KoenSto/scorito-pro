import { useLocation } from 'react-router-dom'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/team': 'Mijn Team',
  '/riders': 'Alle Renners',
  '/stages': 'Etappes',
  '/optimizer': 'Optimizer',
  '/settings': 'Instellingen',
}

export default function Header() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'Scorito Pro'

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 md:px-8 backdrop-blur">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="text-sm text-muted">Tour de France 2026</div>
    </header>
  )
}
