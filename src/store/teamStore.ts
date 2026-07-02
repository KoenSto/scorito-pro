import { useCallback, useEffect, useState } from 'react'
import ridersData from '../data/riders.json'
import type { Rider } from '../types'

/**
 * Team Store (Sprint 4)
 *
 * Bewaart de renner-ids van JOUW team in localStorage zodat je selectie
 * blijft staan tussen sessies en herbruikbaar is op meerdere pagina's
 * (Team, Coach, straks Simulator). Puur client-side, geen backend nodig.
 */

const STORAGE_KEY = 'scorito-pro:my-team'

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

export interface MyTeam {
  ids: number[]
  riders: Rider[]
  has: (id: number) => boolean
  toggle: (id: number) => void
  add: (id: number) => void
  remove: (id: number) => void
  setIds: (ids: number[]) => void
  clear: () => void
}

/**
 * React-hook voor het opgeslagen team. Elke wijziging wordt direct naar
 * localStorage geschreven en gesynchroniseerd tussen open tabbladen.
 */
export function useMyTeam(): MyTeam {
  const [ids, setIdsState] = useState<number[]>(() => readIds())

  // Synchroniseer als een ander tabblad het team aanpast.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setIdsState(readIds())
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

  const riders = ids
    .map((id) => riderById.get(id))
    .filter((r): r is Rider => Boolean(r))

  return { ids, riders, has, toggle, add, remove, setIds, clear }
}
