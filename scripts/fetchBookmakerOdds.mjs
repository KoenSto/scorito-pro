#!/usr/bin/env node
// Haalt bookmaker-odds op van oddschecker.com (publieke odds-aggregator,
// geen losse bookmaker en geen login nodig) voor de Tour de France
// eindwinnaar, de truiklassementen en de volgende etappe, en schrijft ze
// naar src/data/bookmakerOdds.json.
//
// Handmatig draaien: node scripts/fetchBookmakerOdds.mjs
// Draait automatisch elke ochtend via .github/workflows/daily-update.yml.
//
// Belangrijk: dit zijn publieke marktprijzen, geen garanties op winst. De
// opmaak van oddschecker.com kan veranderen; dit script is defensief
// (try/catch per markt) zodat 1 kapotte markt de rest niet blokkeert.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { matchRider, slugToName } from './lib/riderMatch.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RIDERS_PATH = join(ROOT, 'src/data/riders.json')
const RESULTS_PATH = join(ROOT, 'src/data/stageResults.json')
const OUT_PATH = join(ROOT, 'src/data/bookmakerOdds.json')

const BASE = 'https://www.oddschecker.com'
const UA = 'Mozilla/5.0 (compatible; ScoritoProBot/1.0; +https://github.com/KoenSto/scorito-pro)'

const riders = JSON.parse(readFileSync(RIDERS_PATH, 'utf8'))

async function fetchText(url) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
    return res.text()
}

// Fractional odds "2/11" -> implied probability den/(num+den).
function fractionalToProbability(fraction) {
    const match = /^(\d+)\s*\/\s*(\d+)$/.exec(fraction.trim())
    if (!match) return null
    const num = parseInt(match[1], 10)
    const den = parseInt(match[2], 10)
    if (!den && !num) return null
    return den / (num + den)
}

// Parses an oddschecker market page: finds selectionName slugs and the
// first odds fraction that follows each of them, and returns
// implied-probability weights that sum to 1 across the found runners
// (removes bookmaker overround). Best-effort, not guaranteed exact.
function parseMarket(html) {
    const found = new Map()
    const linkRegex = /selectionName=([a-z0-9-]+)/g
    let match
    while ((match = linkRegex.exec(html))) {
          const slug = match[1]
          if (found.has(slug)) continue
          const windowText = html.slice(match.index, match.index + 400)
          const oddsMatch = /(\d{1,3}\/\d{1,3})/.exec(windowText)
          if (!oddsMatch) continue
          const prob = fractionalToProbability(oddsMatch[1])
          if (prob !== null) found.set(slug, prob)
    }
    const total = [...found.values()].reduce((sum, p) => sum + p, 0)
    const weights = []
        for (const [slug, prob] of found) {
              const rider = matchRider(riders, slugToName(slug))
              if (!rider) continue
              weights.push({ riderId: rider.id, weight: total > 0 ? prob / total : 0 })
        }
    weights.sort((a, b) => b.weight - a.weight)
    return weights.slice(0, 10)
}

function nextStageNumber() {
    if (!existsSync(RESULTS_PATH)) return 1
    try {
          const data = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'))
          const numbers = (data.stages || []).map((s) => s.stageNumber)
          return numbers.length > 0 ? Math.max(...numbers) + 1 : 1
    } catch (err) {
          return 1
    }
}

            async function main() {
                let existing = { meta: {}, classifications: {}, stageTypes: {} }
                    if (existsSync(OUT_PATH)) {
                          try {
                                  existing = JSON.parse(readFileSync(OUT_PATH, 'utf8'))
                          } catch (err) {
                                  console.warn('Kon bestaande bookmakerOdds.json niet lezen, begin leeg:', err.message)
                          }
                    }

  const markets = {
        eindzege: '/cycling/tour-de-france/winner',
        geel: '/cycling/tour-de-france/winner',
        groen: '/cycling/tour-de-france/points-classification',
        bergtrui: '/cycling/tour-de-france/king-of-the-mountains',
        wit: '/cycling/tour-de-france/young-rider-classification',
  }

  const classifications = { ...(existing.classifications || {}) }
                for (const key of Object.keys(markets)) {
                      const path = markets[key]
                      try {
                              const html = await fetchText(`${BASE}${path}`)
                              classifications[key] = parseMarket(html)
                      } catch (err) {
                              console.warn(`Kon markt ${key} niet ophalen:`, err.message)
                      }
                }

  const stageNumber = nextStageNumber()
                const stagesOdds = { ...(existing.stages || {}) }
                try {
                      const html = await fetchText(`${BASE}/cycling/tour-de-france/tour-de-france-stage-${stageNumber}/winner`)
                      stagesOdds[String(stageNumber)] = parseMarket(html)
                } catch (err) {
                      console.warn(`Kon winnaarsmarkt voor etappe ${stageNumber} niet ophalen:`, err.message)
                }

  const output = {
        meta: {
                source: 'https://www.oddschecker.com (publieke odds-aggregator, geen losse bookmaker)',
                snapshotDate: new Date().toISOString().slice(0, 10),
                lastUpdated: new Date().toISOString(),
                note: 'Automatisch bijgewerkt door .github/workflows/daily-update.yml (scripts/fetchBookmakerOdds.mjs). Implied-probability gewichten (0..1) afgeleid van fractional odds, genormaliseerd per markt. Geen garanties, alleen indicatief.',
                classifications: Object.keys(classifications),
                stageTypes: Object.keys(existing.stageTypes || {}),
        },
        classifications,
        stageTypes: existing.stageTypes || {},
        stages: stagesOdds,
  }

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8')
                console.log(`Bookmaker-odds bijgewerkt in ${OUT_PATH}`)
            }

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
