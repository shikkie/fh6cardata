import { useState, useEffect, useCallback } from 'react'
import Navbar from './components/Navbar.jsx'
import SearchFilters from './components/SearchFilters.jsx'
import CarGrid from './components/CarGrid.jsx'
import useDebounce from './hooks/useDebounce.js'

const API_BASE = '/api'

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

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    fetch(`${API_BASE}/filters`)
      .then(r => r.json())
      .then(setFilters)
      .catch(() => {})
  }, [])

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
  }, [debouncedQuery, selectedManufacturer, selectedClass, selectedRarity, selectedAvailability])

  useEffect(() => { fetchCars() }, [fetchCars])

  function clearFilters() {
    setQuery('')
    setSelectedClass('')
    setSelectedRarity('')
    setSelectedManufacturer('')
    setSelectedAvailability('')
  }

  return (
    <>
      <Navbar />
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
            filters={filters}
            onClear={clearFilters}
          />
        </div>
        <CarGrid cars={cars} loading={loading} error={error} />
      </main>
    </>
  )
}

export default App
