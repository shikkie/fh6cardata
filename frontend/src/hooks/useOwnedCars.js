import { useState, useCallback, useEffect } from 'react'

const LS_KEY = 'fh6_owned_cars'
const API_GARAGE = '/api/garage'

function readOwned() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function persistOwned(set) {
  localStorage.setItem(LS_KEY, JSON.stringify([...set]))
}

export default function useOwnedCars() {
  const [owned, setOwned] = useState(readOwned)
  // 'idle' | 'syncing' | 'synced' | 'offline'
  const [syncStatus, setSyncStatus] = useState('idle')

  // On mount: push localStorage IDs to the API, get back the merged set.
  // This covers three scenarios:
  //   1. Items added offline → uploaded to server on reconnect
  //   2. Items added via telemetry (by-ordinal) → pulled into the UI
  //   3. First load on a new device → server state wins
  useEffect(() => {
    async function syncOnMount() {
      setSyncStatus('syncing')
      try {
        const localIds = [...readOwned()]
        const resp = await fetch(`${API_GARAGE}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ car_ids: localIds }),
        })
        if (!resp.ok) { setSyncStatus('offline'); return }
        const { owned_car_ids } = await resp.json()
        const merged = new Set(owned_car_ids)
        setOwned(merged)
        persistOwned(merged)
        setSyncStatus('synced')
      } catch {
        // Offline or API unreachable — localStorage state is the source of truth
        setSyncStatus('offline')
      }
    }
    syncOnMount()
  }, [])

  const toggleOwned = useCallback((id) => {
    setOwned(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        fetch(`${API_GARAGE}/${id}`, { method: 'DELETE' }).catch(() => {})
      } else {
        next.add(id)
        fetch(`${API_GARAGE}/${id}`, { method: 'POST' }).catch(() => {})
      }
      persistOwned(next)
      return next
    })
  }, [])

  const isOwned = useCallback((id) => owned.has(id), [owned])

  return { owned, toggleOwned, isOwned, syncStatus }
}
