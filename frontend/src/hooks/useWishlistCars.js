import { useState, useCallback, useEffect } from 'react'

const LS_KEY = 'fh6_wishlist'
const API_WISHLIST = '/api/wishlist'

function readWishlist() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function persistWishlist(set) {
  localStorage.setItem(LS_KEY, JSON.stringify([...set]))
}

export default function useWishlistCars() {
  const [wishlisted, setWishlisted] = useState(readWishlist)

  // On mount: push localStorage IDs to the API and get back the merged set.
  useEffect(() => {
    async function syncOnMount() {
      try {
        const localIds = [...readWishlist()]
        const resp = await fetch(`${API_WISHLIST}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ car_ids: localIds }),
        })
        if (!resp.ok) return
        const { car_ids } = await resp.json()
        const merged = new Set(car_ids)
        setWishlisted(merged)
        persistWishlist(merged)
      } catch {
        // Offline — localStorage is the source of truth
      }
    }
    syncOnMount()
  }, [])

  const toggleWishlisted = useCallback((id) => {
    setWishlisted(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        fetch(`${API_WISHLIST}/${id}`, { method: 'DELETE' }).catch(() => {})
      } else {
        next.add(id)
        fetch(`${API_WISHLIST}/${id}`, { method: 'POST' }).catch(() => {})
      }
      persistWishlist(next)
      return next
    })
  }, [])

  const removeWishlisted = useCallback((id) => {
    setWishlisted(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      fetch(`${API_WISHLIST}/${id}`, { method: 'DELETE' }).catch(() => {})
      persistWishlist(next)
      return next
    })
  }, [])

  const isWishlisted = useCallback((id) => wishlisted.has(id), [wishlisted])

  return { wishlisted, toggleWishlisted, removeWishlisted, isWishlisted }
}
