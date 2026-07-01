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

De applicatie scheidt **data**, **engine** (businesslogica) en **UI** zodat de logica herbruikbaar is.

### Data (src/data)

- `riders.json` - alle 184 renners uit de officiele Scorito-poule (naam, ploeg, rol, land, leeftijd, prijs in mln EUR)
- `stages.json` - 21 etappes met type (vlak/heuvel/berg/tijdrit)
- `rules.json` - spelregels: budget 45 mln, 20 renners, max 4 per ploeg
- `scoring.json` - het ECHTE Scorito-puntensysteem (etappe-uitslagen, klassementen, eindklassement, ploegentijdrit)

### Engine (src/engine)

- `scoringEngine.ts` - berekent verwachte Scorito-punten per renner op basis van scoring.json, rol en kwaliteit
- `ratingEngine.ts` - disciplinescores + value + captainscore, gevoed door de scoringEngine
- `budgetEngine.ts` - controleert budget, teamgrootte en ploeglimiet
- `optimizerEngine.ts` - stelt het optimale team samen (max punten binnen de regels)

## Databron

De renner- en puntendata komen uit `Scorito_Tour_2026_Poule_184renners.xlsx`. De etappeprofielen (vlak/heuvel/berg) zijn een inschatting en kunnen later worden verfijnd.

## Deploy

Automatische deploy naar GitHub Pages via GitHub Actions (.github/workflows/deploy.yml). Zet hiervoor in Settings > Pages de bron op "GitHub Actions".
