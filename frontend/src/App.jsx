import { useState, useEffect, useCallback, useMemo } from 'react'
import Navbar from './components/Navbar.jsx'
import SearchFilters from './components/SearchFilters.jsx'
import CarGrid from './components/CarGrid.jsx'
import UpdateBanner from './components/UpdateBanner.jsx'
import useDebounce from './hooks/useDebounce.js'
import useOwnedCars from './hooks/useOwnedCars.js'
import useWishlistCars from './hooks/useWishlistCars.js'

const API_BASE = '/api'
const AUCTION_RARITIES = ['Common', 'Rare', 'Epic', 'Legendary']
const DEFAULT_SETTINGS = {
  discount: { enabled: false, percent: 5 },
  auction_tiers: {
    Common: { min: 0.5, fair: 1.0, max: 1.5 },
    Rare: { min: 0.6, fair: 1.2, max: 1.8 },
    Epic: { min: 0.7, fair: 1.4, max: 2.0 },
    Legendary: { min: 0.8, fair: 1.6, max: 2.5 },
  },
}

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
  const [appSettings, setAppSettings] = useState(DEFAULT_SETTINGS)
  const [settingsDraft, setSettingsDraft] = useState(DEFAULT_SETTINGS)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState(null)

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
    fetch(`${API_BASE}/settings`)
      .then(r => r.ok ? r.json() : DEFAULT_SETTINGS)
      .then(data => {
        const normalized = {
          discount: {
            enabled: Boolean(data?.discount?.enabled),
            percent: Number.isFinite(data?.discount?.percent) ? Number(data.discount.percent) : 5,
          },
          auction_tiers: Object.fromEntries(
            AUCTION_RARITIES.map(rarity => {
              const tier = data?.auction_tiers?.[rarity]
              return [
                rarity,
                {
                  min: Number.isFinite(tier?.min) ? Number(tier.min) : DEFAULT_SETTINGS.auction_tiers[rarity].min,
                  fair: Number.isFinite(tier?.fair) ? Number(tier.fair) : DEFAULT_SETTINGS.auction_tiers[rarity].fair,
                  max: Number.isFinite(tier?.max) ? Number(tier.max) : DEFAULT_SETTINGS.auction_tiers[rarity].max,
                },
              ]
            })
          ),
        }
        setAppSettings(normalized)
        setSettingsDraft(normalized)
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
    setSettingsDraft(appSettings)
    setSettingsError(null)
    setSettingsOpen(true)
  }

  function closeSettings() {
    setSettingsOpen(false)
    setSettingsError(null)
  }

  async function saveAppSettings() {
    const percent = Number(settingsDraft.discount?.percent)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setSettingsError('Discount percent must be between 0 and 100')
      return
    }

    for (const rarity of AUCTION_RARITIES) {
      const tier = settingsDraft.auction_tiers?.[rarity]
      const min = Number(tier?.min)
      const max = Number(tier?.max)
      if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
        setSettingsError(`${rarity} min/max multipliers must be numbers > 0`)
        return
      }
      if (min > max) {
        setSettingsError(`${rarity} min multiplier cannot be greater than max`)
        return
      }
    }

    setSettingsSaving(true)
    setSettingsError(null)
    try {
      const payload = {
        discount: {
          enabled: Boolean(settingsDraft.discount?.enabled),
          percent,
        },
        auction_tiers: Object.fromEntries(
          AUCTION_RARITIES.map(rarity => {
            const tier = settingsDraft.auction_tiers[rarity]
            const min = Number(tier.min)
            const max = Number(tier.max)
            return [rarity, { min, fair: Number(((min + max) / 2).toFixed(2)), max }]
          })
        ),
      }

      const resp = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setSettingsError(data?.error || 'Could not save settings')
        return
      }
      setAppSettings(data)
      setSettingsDraft(data)
      setSettingsOpen(false)
    } catch {
      setSettingsError('Could not reach the API server')
    } finally {
      setSettingsSaving(false)
    }
  }

  return (
    <>
      <UpdateBanner />
      <Navbar
        onRefreshData={handleRefreshData}
        onOpenSettings={openSettings}
        discountSettings={appSettings.discount}
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
          appSettings={appSettings}
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
                checked={Boolean(settingsDraft.discount?.enabled)}
                onChange={e => setSettingsDraft(prev => ({
                  ...prev,
                  discount: { ...prev.discount, enabled: e.target.checked },
                }))}
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
                value={settingsDraft.discount?.percent}
                onChange={e => setSettingsDraft(prev => ({
                  ...prev,
                  discount: { ...prev.discount, percent: e.target.value },
                }))}
              />
              <span className="input-group-text settings-addon">%</span>
            </div>
            <div className="small settings-subtle mb-3">Default is 5% (in-game autoshow discount).</div>

            <div className="settings-divider mb-3" />
            <div className="settings-subheading mb-2">Auction Range Multipliers</div>
            <div className="small settings-subtle mb-2">Applied to effective base value after autoshow discount.</div>
            <div className="settings-tier-grid mb-3">
              {AUCTION_RARITIES.map(rarity => (
                <div className="settings-tier-row" key={rarity}>
                  <div className="settings-tier-label">{rarity}</div>
                  <div className="settings-tier-inputs">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text settings-addon settings-addon-mini">Min</span>
                      <input
                        type="number"
                        className="form-control settings-input"
                        min="0.01"
                        step="0.01"
                        value={settingsDraft.auction_tiers?.[rarity]?.min ?? ''}
                        onChange={e => setSettingsDraft(prev => ({
                          ...prev,
                          auction_tiers: {
                            ...prev.auction_tiers,
                            [rarity]: {
                              ...prev.auction_tiers[rarity],
                              min: e.target.value,
                            },
                          },
                        }))}
                      />
                    </div>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text settings-addon settings-addon-mini">Max</span>
                      <input
                        type="number"
                        className="form-control settings-input"
                        min="0.01"
                        step="0.01"
                        value={settingsDraft.auction_tiers?.[rarity]?.max ?? ''}
                        onChange={e => setSettingsDraft(prev => ({
                          ...prev,
                          auction_tiers: {
                            ...prev.auction_tiers,
                            [rarity]: {
                              ...prev.auction_tiers[rarity],
                              max: e.target.value,
                            },
                          },
                        }))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {settingsError && <div className="alert alert-danger py-2 mb-3 settings-error">{settingsError}</div>}

            <div className="d-flex gap-2 justify-content-end settings-actions">
              <button className="btn btn-sm settings-btn settings-btn-cancel" onClick={closeSettings} disabled={settingsSaving}>Cancel</button>
              <button className="btn btn-sm settings-btn settings-btn-save" onClick={saveAppSettings} disabled={settingsSaving}>
                {settingsSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
