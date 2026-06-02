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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [discountSettings, setDiscountSettings] = useState({ enabled: false, percent: 5 })
  const [discountDraft, setDiscountDraft] = useState({ enabled: false, percent: 5 })
  const [discountSaving, setDiscountSaving] = useState(false)
  const [discountError, setDiscountError] = useState(null)

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

  useEffect(() => {
    fetch(`${API_BASE}/discount`)
      .then(r => r.ok ? r.json() : { enabled: false, percent: 5 })
      .then(data => {
        const normalized = {
          enabled: Boolean(data?.enabled),
          percent: Number.isFinite(data?.percent) ? Number(data.percent) : 5,
        }
        setDiscountSettings(normalized)
        setDiscountDraft(normalized)
      })
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

  function openSettings() {
    setDiscountDraft(discountSettings)
    setDiscountError(null)
    setSettingsOpen(true)
  }

  function closeSettings() {
    setSettingsOpen(false)
    setDiscountError(null)
  }

  async function saveDiscountSettings() {
    const percent = Number(discountDraft.percent)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setDiscountError('Discount percent must be between 0 and 100')
      return
    }
    setDiscountSaving(true)
    setDiscountError(null)
    try {
      const resp = await fetch(`${API_BASE}/discount`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: Boolean(discountDraft.enabled), percent }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setDiscountError(data?.error || 'Could not save discount settings')
        return
      }
      setDiscountSettings(data)
      setDiscountDraft(data)
      setSettingsOpen(false)
    } catch {
      setDiscountError('Could not reach the API server')
    } finally {
      setDiscountSaving(false)
    }
  }

  return (
    <>
      <UpdateBanner />
      <Navbar
        onRefreshData={handleRefreshData}
        onOpenSettings={openSettings}
        discountSettings={discountSettings}
      />
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
        <CarGrid
          cars={displayCars}
          loading={loading}
          error={error}
          isOwned={isOwned}
          toggleOwned={handleToggleOwned}
          isWishlisted={isWishlisted}
          toggleWishlisted={toggleWishlisted}
          onCarUpdate={handleCarUpdate}
          discountSettings={discountSettings}
        />
      </main>
      {settingsOpen && (
        <div className="settings-backdrop" onClick={closeSettings} role="dialog" aria-modal="true" aria-label="Pricing settings">
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 mb-0 settings-title">Pricing Settings</h2>
              <button className="btn-close btn-close-white settings-close" aria-label="Close" onClick={closeSettings} />
            </div>

            <div className="form-check form-switch mb-3 settings-switch-wrap">
              <input
                className="form-check-input settings-switch"
                type="checkbox"
                id="discountEnabled"
                checked={Boolean(discountDraft.enabled)}
                onChange={e => setDiscountDraft(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <label className="form-check-label settings-label" htmlFor="discountEnabled">
                Enable autoshow discount display
              </label>
            </div>

            <label htmlFor="discountPercent" className="form-label small settings-subtle mb-1">Discount Percent</label>
            <div className="input-group input-group-sm mb-2">
              <input
                id="discountPercent"
                type="number"
                className="form-control settings-input"
                min="0"
                max="100"
                step="0.1"
                value={discountDraft.percent}
                onChange={e => setDiscountDraft(prev => ({ ...prev, percent: e.target.value }))}
              />
              <span className="input-group-text settings-addon">%</span>
            </div>
            <div className="small settings-subtle mb-3">Default is 5% (in-game autoshow discount).</div>

            {discountError && <div className="alert alert-danger py-2 mb-3 settings-error">{discountError}</div>}

            <div className="d-flex gap-2 justify-content-end settings-actions">
              <button className="btn btn-sm settings-btn settings-btn-cancel" onClick={closeSettings} disabled={discountSaving}>Cancel</button>
              <button className="btn btn-sm settings-btn settings-btn-save" onClick={saveDiscountSettings} disabled={discountSaving}>
                {discountSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
