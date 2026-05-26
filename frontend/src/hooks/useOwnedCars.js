import { useState, useCallback } from 'react'

const KEY = 'fh6_owned_cars'

function readOwned() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export default function useOwnedCars() {
  const [owned, setOwned] = useState(readOwned)

  const toggleOwned = useCallback((id) => {
    setOwned(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(KEY, JSON.stringify([...next]))
      return next
    })
  }, [])

  const isOwned = useCallback((id) => owned.has(id), [owned])

  return { owned, toggleOwned, isOwned }
}
