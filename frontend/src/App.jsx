import { useState, useEffect, useCallback, useMemo } from 'react'
import Navbar from './components/Navbar.jsx'
import SearchFilters from './components/SearchFilters.jsx'
import CarGrid from './components/CarGrid.jsx'
import UpdateBanner from './components/UpdateBanner.jsx'
import useDebounce from './hooks/useDebounce.js'
import useOwnedCars from './hooks/useOwnedCars.js'
import useWishlistCars from './hooks/useWishlistCars.js'

const API_BASE = '/api'

const SORT_OPTIONS = [
  { value: 'pi_desc',    label: 'PI ↓ High→Low' },
  { value: 'pi_asc',     label: 'PI ↑ Low→High' },
  { value: 'value_desc', label: 'Value ↓ High→Low' },
  { value: 'value_asc',  label: 'Value ↑ Low→High' },
  { value: 'year_desc',  label: 'Year ↓ Newest' },
  { value: 'year_asc',   label: 'Year ↑ Oldest' },
  { value: 'name_asc',   label: 'Name A→Z' },
]

function sortCars(cars, sortKey) {
  const sorted = [...cars]
  switch (sortKey) {
    case 'pi_desc':    return sorted.sort((a, b) => (b.pi ?? 0) - (a.pi ?? 0))
    case 'pi_asc':     return sorted.sort((a, b) => (a.pi ?? 0) - (b.pi ?? 0))
    case 'value_desc': return sorted.sort((a, b) => (b.base_value ?? 0) - (a.base_value ?? 0))
    case 'value_asc':  return sorted.sort((a, b) => (a.base_value ?? 0) - (b.base_value ?? 0))
    case 'year_desc':  return sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    case 'year_asc':   return sorted.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    case 'name_asc':   return sorted.sort((a, b) => a.full_name.localeCompare(b.full_name))
    default:           return sorted
  }
}

function App() {
  const [cars, setCars] = useState([])
  const [filters, setFilters] = useState({ manufacturers: [], classes: [], rarities: [], availabilities: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [query, setQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedRarity, setSelectedRarity] = useState('')
  const [selectedManufacturer, setSelectedManufacturer] = useState('')
  const [selectedAvailability, setSelectedAvailability] = useState('')
  const [ownedOnly, setOwnedOnly] = useState(null) // null=all, true=owned, false=not owned
  const [wishlistedOnly, setWishlistedOnly] = useState(false)
  const [ordinalFilter, setOrdinalFilter] = useState('') // ''=all, 'assigned'=has ordinal, 'unassigned'=no ordinal
  const [sortKey, setSortKey] = useState('pi_desc')
  // Incrementing this triggers a cache-bypassing re-fetch (Approach 3: Refresh Data)
  const [dataRefreshCount, setDataRefreshCount] = useState(0)

  const { owned, toggleOwned, isOwned } = useOwnedCars()
  const { toggleWishlisted, removeWishlisted, isWishlisted } = useWishlistCars()

  // Adding a car to the garage clears its wishlist status.
  function handleToggleOwned(id) {
    if (!isOwned(id)) removeWishlisted(id)
    toggleOwned(id)
  }

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    fetch(`${API_BASE}/filters`)
      .then(r => r.json())
      .then(setFilters)
      .catch(() => {})
  }, [dataRefreshCount])   // re-fetch filters when user taps "Refresh Data"

  const fetchCars = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (debouncedQuery)        params.set('q', debouncedQuery)
    if (selectedManufacturer)  params.set('manufacturer', selectedManufacturer)
    if (selectedClass)         params.set('class', selectedClass)
    if (selectedRarity)        params.set('rarity', selectedRarity)
    if (selectedAvailability)  params.set('availability', selectedAvailability)

    fetch(`${API_BASE}/cars?${params}`)
      .then(r => r.json())
      .then(data => { setCars(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  // dataRefreshCount is intentionally included: incrementing it creates a new
  // fetchCars reference which the useEffect below picks up.
  }, [debouncedQuery, selectedManufacturer, selectedClass, selectedRarity, selectedAvailability, dataRefreshCount])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCars() }, [fetchCars])

  // ── Approach 3: Refresh Data ────────────────────────────────────────────
  // Deletes the Workbox API caches so the next fetch() goes straight to the
  // network, then increments the refresh counter to trigger a React re-fetch.
  async function handleRefreshData() {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter(k => k.startsWith('fh6-') && k.endsWith('-api'))
          .map(k => caches.delete(k))
      )
    }
    setDataRefreshCount(c => c + 1)
  }

  // Apply owned/wishlist filter + sort client-side (both live in localStorage)
  const displayCars = useMemo(() => {
    let result = cars
    if (ownedOnly === true)           result = result.filter(c => owned.has(c.id))
    if (ownedOnly === false)          result = result.filter(c => !owned.has(c.id))
    if (wishlistedOnly)               result = result.filter(c => isWishlisted(c.id))
    if (ordinalFilter === 'assigned')   result = result.filter(c => c.carordinalid != null)
    if (ordinalFilter === 'unassigned') result = result.filter(c => c.carordinalid == null)
    return sortCars(result, sortKey)
  }, [cars, ownedOnly, owned, wishlistedOnly, isWishlisted, ordinalFilter, sortKey])

  function handleCarUpdate(updatedCar) {
    setCars(prev => prev.map(c => c.id === updatedCar.id ? updatedCar : c))
  }

  function clearFilters() {
    setQuery('')
    setSelectedClass('')
    setSelectedRarity('')
    setSelectedManufacturer('')
    setSelectedAvailability('')
    setOwnedOnly(null)
    setWishlistedOnly(false)
    setOrdinalFilter('')
  }

  return (
    <>
      <UpdateBanner />
      <Navbar onRefreshData={handleRefreshData} />
      <main className="container-fluid px-3 py-3">
        <div className="search-sticky mb-3">
          <SearchFilters
            query={query}
            onQueryChange={setQuery}
            selectedClass={selectedClass}
            onClassChange={setSelectedClass}
            selectedRarity={selectedRarity}
            onRarityChange={setSelectedRarity}
            selectedManufacturer={selectedManufacturer}
            onManufacturerChange={setSelectedManufacturer}
            selectedAvailability={selectedAvailability}
            onAvailabilityChange={setSelectedAvailability}
            ownedOnly={ownedOnly}
            onOwnedOnlyChange={setOwnedOnly}
            wishlistedOnly={wishlistedOnly}
            onWishlistedOnlyChange={setWishlistedOnly}
            ordinalFilter={ordinalFilter}
            onOrdinalFilterChange={setOrdinalFilter}
            sortKey={sortKey}
            onSortChange={setSortKey}
            sortOptions={SORT_OPTIONS}
            filters={filters}
            onClear={clearFilters}
          />
        </div>
        <CarGrid cars={displayCars} loading={loading} error={error} isOwned={isOwned} toggleOwned={handleToggleOwned} isWishlisted={isWishlisted} toggleWishlisted={toggleWishlisted} onCarUpdate={handleCarUpdate} />
      </main>
    </>
  )
}

export default App
