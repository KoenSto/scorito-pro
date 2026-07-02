import { useCallback, useEffect, useState } from 'react'
import ridersData from '../data/riders.json'
import type { Rider } from '../types'

/**
 * Team Store (Sprint 4 + opslaan/inladen)
 *
 * Bewaart het ACTIEVE team (renner-ids) in localStorage zodat je selectie
 * blijft staan tussen sessies en herbruikbaar is op meerdere pagina's
 * (Team, Coach, straks Simulator).
 *
 * Daarnaast kun je meerdere teams onder een NAAM opslaan en later weer
 * inladen of verwijderen. Puur client-side, geen backend nodig.
 */

const STORAGE_KEY = 'scorito-pro:my-team'
const SAVED_KEY = 'scorito-pro:saved-teams'

const allRiders = ridersData as Rider[]
const riderById = new Map(allRiders.map((r) => [r.id, r]))

function readIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x) => typeof x === 'number')
  } catch {
    return []
  }
}

function writeIds(ids: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // localStorage niet beschikbaar: stil negeren.
  }
}

export interface SavedTeam {
  id: string
  name: string
  ids: number[]
  savedAt: number
}

function readSaved(): SavedTeam[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (t): t is SavedTeam =>
        t && typeof t.id === 'string' && typeof t.name === 'string' && Array.isArray(t.ids),
    )
  } catch {
    return []
  }
}

function writeSaved(teams: SavedTeam[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(teams))
  } catch {
    // stil negeren
  }
}

export interface MyTeam {
  ids: number[]
  riders: Rider[]
  has: (id: number) => boolean
  toggle: (id: number) => void
  add: (id: number) => void
  remove: (id: number) => void
  setIds: (ids: number[]) => void
  clear: () => void
  // Opslaan / inladen van benoemde teams
  savedTeams: SavedTeam[]
  saveTeam: (name: string) => void
  loadTeam: (id: string) => void
  deleteTeam: (id: string) => void
}

/**
 * React-hook voor het opgeslagen team. Elke wijziging wordt direct naar
 * localStorage geschreven en gesynchroniseerd tussen open tabbladen.
 */
export function useMyTeam(): MyTeam {
  const [ids, setIdsState] = useState<number[]>(() => readIds())
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>(() => readSaved())

  // Synchroniseer als een ander tabblad het team aanpast.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setIdsState(readIds())
      if (e.key === SAVED_KEY) setSavedTeams(readSaved())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const commit = useCallback((next: number[]) => {
    setIdsState(next)
    writeIds(next)
  }, [])

  const has = useCallback((id: number) => ids.includes(id), [ids])

  const toggle = useCallback(
    (id: number) =>
      commit(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
    [ids, commit],
  )

  const add = useCallback(
    (id: number) => {
      if (!ids.includes(id)) commit([...ids, id])
    },
    [ids, commit],
  )

  const remove = useCallback(
    (id: number) => commit(ids.filter((x) => x !== id)),
    [ids, commit],
  )

  const setIds = useCallback((next: number[]) => commit(next), [commit])

  const clear = useCallback(() => commit([]), [commit])

  const commitSaved = useCallback((next: SavedTeam[]) => {
    setSavedTeams(next)
    writeSaved(next)
  }, [])

  // Sla het huidige actieve team op onder een naam. Bestaat de naam al,
  // dan wordt die overschreven (case-insensitive).
  const saveTeam = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const now = Date.now()
      const existing = savedTeams.find(
        (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
      )
      let next: SavedTeam[]
      if (existing) {
        next = savedTeams.map((t) =>
          t.id === existing.id ? { ...t, ids: [...ids], savedAt: now } : t,
        )
      } else {
        const entry: SavedTeam = {
          id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
          name: trimmed,
          ids: [...ids],
          savedAt: now,
        }
        next = [...savedTeams, entry]
      }
      commitSaved(next)
    },
    [ids, savedTeams, commitSaved],
  )

  // Laad een opgeslagen team in als het actieve team.
  const loadTeam = useCallback(
    (id: string) => {
      const team = savedTeams.find((t) => t.id === id)
      if (team) commit([...team.ids])
    },
    [savedTeams, commit],
  )

  const deleteTeam = useCallback(
    (id: string) => commitSaved(savedTeams.filter((t) => t.id !== id)),
    [savedTeams, commitSaved],
  )

  const riders = ids
    .map((id) => riderById.get(id))
    .filter((r): r is Rider => Boolean(r))

  return {
    ids,
    riders,
    has,
    toggle,
    add,
    remove,
    setIds,
    clear,
    savedTeams,
    saveTeam,
    loadTeam,
    deleteTeam,
  }
}
