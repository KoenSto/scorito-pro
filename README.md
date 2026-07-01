# Scorito Pro Analytics

AI-ondersteund analyseplatform voor Scorito Wielermanager (Tour de France 2026).

## Tech stack

- React + Vite + TypeScript
- Tailwind CSS
- React Router
- Recharts, TanStack Table, lucide-react

## Ontwikkelen

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Architectuur

De applicatie scheidt **data**, **engine** (businesslogica: rating, budget, optimizer) en **UI** zodat de logica later herbruikbaar is voor een mobiele app of andere wielerspellen.

## Deploy

Automatische deploy naar GitHub Pages via GitHub Actions (zie .github/workflows/deploy.yml).
