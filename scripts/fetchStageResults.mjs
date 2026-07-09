#!/usr/bin/env node
// Haalt per-etappe uitslagen en uitvallers/DNS op van letour.fr en schrijft
// ze naar src/data/stageResults.json.
//
// Handmatig draaien: node scripts/fetchStageResults.mjs
// Draait automatisch elke ochtend via .github/workflows/daily-update.yml.
//
// Dit script scraped publieke HTML-pagina's van letour.fr. De opmaak van die
// site kan veranderen; dit script is defensief (try/catch per etappe) zodat
// een kapotte pagina voor 1 etappe de rest niet blokkeert. Werkt de site zijn
// layout bij, dan moeten de selectors hieronder mogelijk worden aangepast.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { matchRider } from './lib/riderMatch.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RIDERS_PATH = join(ROOT, 'src/data/riders.json')
const STAGES_PATH = join(ROOT, 'src/data/stages.json')
const OUT_PATH = join(ROOT, 'src/data/stageResults.json')

const BASE = 'https://www.letour.fr'
const UA = 'Mozilla/5.0 (compatible; ScoritoProBot/1.0; +https://github.com/KoenSto/scorito-pro)'
const TOUR_YEAR = 2026
const MONTHS = { jan: 0, feb: 1, mrt: 2, apr: 3, mei: 4, jun: 5, jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11 }

const riders = JSON.parse(readFileSync(RIDERS_PATH, 'utf8'))
const stages = JSON.parse(readFileSync(STAGES_PATH, 'utf8'))

async function fetchText(url) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
    return res.text()
}

function stripTags(html) {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
}

function parseStageDate(dayField) {
    const match = /(\d+)\s+([a-z]+)/i.exec(dayField || '')
    if (!match) return null
    const day = parseInt(match[1], 10)
    const month = MONTHS[match[2].toLowerCase()]
    if (month === undefined) return null
    return new Date(Date.UTC(TOUR_YEAR, month, day)).toISOString().slice(0, 10)
}

                             function parseRankingRows(html, limit) {
                                 const max = limit || 10
                                 const rows = []
                                     const rowRegex = /<tr[^>]*class="[^"]*rankingTables__row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g
                                 let match
                                 while ((match = rowRegex.exec(html)) && rows.length < max) {
                                       const rowHtml = match[1]
                                       const cellRegex = /<td[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g
                                       const cells = []
                                             let cellMatch
                                       while ((cellMatch = cellRegex.exec(rowHtml))) {
                                               cells.push({ cls: cellMatch[1], text: stripTags(cellMatch[2]) })
                                       }
                                       if (cells.length === 0) continue
                                       const rankCell = cells.find((c) => c.cls.includes('position'))
                                       const nameCell = cells.find((c) => c.cls.includes('profile'))
                                       const teamCell = cells.find((c) => c.cls.includes('team'))
                                       const valueCandidates = cells.filter((c) => c.cls.includes('time') || c.cls.includes('point'))
                                       const valueCell = valueCandidates[valueCandidates.length - 1]
                                       if (!nameCell || !nameCell.text) continue
                                       rows.push({
                                               rank: rankCell ? parseInt(rankCell.text, 10) || rows.length + 1 : rows.length + 1,
                                               name: nameCell.text,
                                               team: teamCell ? teamCell.text : '',
                                               value: valueCell ? valueCell.text : '',
                                       })
                                 }
                                 return rows
                             }

function toResultRows(rawRows) {
    return rawRows.map((row) => {
          const rider = matchRider(riders, row.name, row.team)
          return {
                  rank: row.rank,
                  riderId: rider ? rider.id : null,
                  name: rider ? rider.name : row.name,
                  team: rider ? rider.team : row.team,
                  gap: row.value || undefined,
          }
    })
}

function extractAjaxStack(html, targetSuffix) {
    const stackRegex = /data-ajax-stack="([^"]*)"/g
    let match
    while ((match = stackRegex.exec(html))) {
          try {
                  const decoded = match[1].replace(/&quot;/g, '"').replace(/\\\//g, '/')
                  const stack = JSON.parse(decoded)
                  const keys = Object.keys(stack)
                  if (keys.some((k) => k.endsWith(targetSuffix))) return stack
          } catch (err) {
                  continue
          }
    }
    return null
}

async function fetchWithdrawals() {
    const html = await fetchText(`${BASE}/en/withdrawal`)
    const perStage = new Map()
    const blockRegex = /Stage (\d+)([\s\S]*?)(?=Stage \d+|FOLLOW US|$)/g
    let match
    while ((match = blockRegex.exec(html))) {
          const stageNumber = parseInt(match[1], 10)
          const block = match[2]
          const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
          const withdrawals = []
                let rowMatch
          while ((rowMatch = rowRegex.exec(block))) {
                  const cellMatches = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
                  const cells = cellMatches.map((c) => stripTags(c[1]))
                  if (cells.length < 3) continue
                  const bibText = cells[0]
                  const name = cells[1]
                  const team = cells[2]
                  const status = cells[3] || 'withdrawal'
                  const bib = parseInt(bibText, 10)
                  if (!name || Number.isNaN(bib)) continue
                  const rider = matchRider(riders, name, team)
                  withdrawals.push({
                            bib,
                            riderId: rider ? rider.id : null,
                            name: rider ? rider.name : name,
                            team: rider ? rider.team : team,
                            status,
                  })
          }
          perStage.set(stageNumber, withdrawals)
    }
    return perStage
}

async function fetchStage(stage, withdrawalsByStage) {
    const stageNumber = stage.id
    const url = `${BASE}/en/rankings/stage-${stageNumber}`
    const html = await fetchText(url)
    const stageTop = toResultRows(parseRankingRows(html, 10))
    if (stageTop.length === 0) return null

  let gcTop = []
      let pointsTop = []
          let mountainsTop = []
              let youthTop = []
                  const generalStack = extractAjaxStack(html, 'g')
    if (generalStack) {
          const targets = [
            { key: 'itg', assign: (rows) => (gcTop = rows) },
            { key: 'ipg', assign: (rows) => (pointsTop = rows) },
            { key: 'img', assign: (rows) => (mountainsTop = rows) },
            { key: 'ijg', assign: (rows) => (youthTop = rows) },
                ]
          for (const target of targets) {
                  const path = generalStack[target.key]
                  if (!path) continue
                  try {
                            const fragment = await fetchText(`${BASE}${path}`)
                            target.assign(toResultRows(parseRankingRows(fragment, 5)))
                  } catch (err) {
                            console.warn(`Kon ${target.key} voor etappe ${stageNumber} niet ophalen:`, err.message)
                  }
          }
    }

  return {
        stageNumber,
        date: parseStageDate(stage.day),
        stageTop,
        gcTop,
        pointsTop,
        mountainsTop,
        youthTop,
        withdrawals: withdrawalsByStage.get(stageNumber) || [],
  }
}

async function main() {
    let withdrawalsByStage
    try {
          withdrawalsByStage = await fetchWithdrawals()
    } catch (err) {
          console.warn('Kon uitvallers-pagina niet ophalen:', err.message)
          withdrawalsByStage = new Map()
    }

  const results = []
      for (const stage of stages) {
            try {
                    const result = await fetchStage(stage, withdrawalsByStage)
                    if (result) results.push(result)
            } catch (err) {
                    console.warn(`Kon etappe ${stage.id} niet ophalen:`, err.message)
            }
      }

  const output = {
        meta: {
                source: 'https://www.letour.fr/en/rankings en https://www.letour.fr/en/withdrawal',
                lastUpdated: new Date().toISOString(),
                note: 'Automatisch bijgewerkt door .github/workflows/daily-update.yml (scripts/fetchStageResults.mjs). Bevat per etappe de uitslag (etappe-, algemeen-, punten-, berg- en jongerenklassement) en uitvallers/niet-gestarte renners.',
        },
        stages: results,
  }

  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8')
    console.log(`Geschreven: ${results.length} etappes naar ${OUT_PATH}`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
