// Best-effort matching of rider names/teams as they appear on letour.fr or
// oddschecker.com against the riders.json roster used by Scorito Pro.
// This is heuristic, not guaranteed 100% correct: unmatched riders keep
// riderId = null and the raw scraped name/team so the UI can still show
// something useful. Review src/data/stageResults.json / bookmakerOdds.json
// after a run if a rider looks wrong.

function stripDiacritics(input) {
    return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalize(input) {
    return stripDiacritics(input).toLowerCase().replace(/[^a-z]/g, '')
}

function riderSurname(fullName) {
    const parts = fullName.trim().split(/\s+/)
    return parts.length > 1 ? parts.slice(1).join(' ') : parts[0]
}

// riders: array from riders.json. rawName: any format ("T. POGACAR",
// "POGACAR Tadej", "tadej-pogacar" slug, ...). team: optional, used to
// disambiguate when multiple riders share a surname.
export function matchRider(riders, rawName, team) {
    const rawNorm = normalize(rawName)
    if (!rawNorm) return null
    const candidates = riders.filter((r) => {
          const surnameNorm = normalize(riderSurname(r.name))
          return surnameNorm.length > 2 && rawNorm.includes(surnameNorm)
    })
    if (candidates.length === 1) return candidates[0]
    if (candidates.length > 1 && team) {
          const teamNorm = normalize(team)
          const withTeam = candidates.filter((r) => {
                  const rTeamNorm = normalize(r.team)
                  return teamNorm.length > 0 && (rTeamNorm.includes(teamNorm) || teamNorm.includes(rTeamNorm))
          })
          if (withTeam.length >= 1) return withTeam[0]
    }
    return candidates[0] ?? null
}

// Convert an oddschecker selectionName slug ('tadej-pogacar') into a
// space-separated name ('tadej pogacar') for matching purposes.
export function slugToName(slug) {
    return slug.split('-').join(' ')
}
