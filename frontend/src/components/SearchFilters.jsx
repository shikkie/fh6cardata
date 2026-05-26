export default function SearchFilters({
  query, onQueryChange,
  selectedClass, onClassChange,
  selectedRarity, onRarityChange,
  selectedManufacturer, onManufacturerChange,
  selectedAvailability, onAvailabilityChange,
  ownedOnly, onOwnedOnlyChange,
  sortKey, onSortChange, sortOptions,
  filters,
  onClear,
}) {
  const hasFilters = query || selectedClass || selectedRarity || selectedManufacturer || selectedAvailability || ownedOnly !== null

  return (
    <div className="search-bar">
      <div className="row g-2">
        {/* Search */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-dark border-secondary text-muted">
              <i className="fas fa-search" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search make, model…"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
            />
          </div>
        </div>

        {/* Make */}
        <div className="col-6 col-sm-3 col-lg-2">
          <select className="form-select form-select-sm" value={selectedManufacturer} onChange={e => onManufacturerChange(e.target.value)}>
            <option value="">All Makes</option>
            {filters.manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Class */}
        <div className="col-6 col-sm-3 col-lg-1">
          <select className="form-select form-select-sm" value={selectedClass} onChange={e => onClassChange(e.target.value)}>
            <option value="">Class</option>
            {filters.classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Rarity */}
        <div className="col-6 col-sm-3 col-lg-2">
          <select className="form-select form-select-sm" value={selectedRarity} onChange={e => onRarityChange(e.target.value)}>
            <option value="">All Rarities</option>
            {filters.rarities.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Availability */}
        <div className="col-6 col-sm-3 col-lg-2">
          <select className="form-select form-select-sm" value={selectedAvailability} onChange={e => onAvailabilityChange(e.target.value)}>
            <option value="">All Sources</option>
            {filters.availabilities && filters.availabilities.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Sort */}
        <div className="col-6 col-sm-3 col-lg-2">
          <select className="form-select form-select-sm" value={sortKey} onChange={e => onSortChange(e.target.value)}>
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Owned filter */}
        <div className="col-6 col-sm-3 col-lg-2">
          <select
            className="form-select form-select-sm"
            value={ownedOnly === true ? 'owned' : ownedOnly === false ? 'not_owned' : ''}
            onChange={e => {
              const v = e.target.value
              onOwnedOnlyChange(v === 'owned' ? true : v === 'not_owned' ? false : null)
            }}
          >
            <option value="">🚗 All Cars</option>
            <option value="owned">✅ Owned</option>
            <option value="not_owned">❌ Not Owned</option>
          </select>
        </div>

        {/* Clear */}
        {hasFilters && (
          <div className="col-auto">
            <button className="btn btn-sm btn-outline-secondary" onClick={onClear} title="Clear filters">
              <i className="fas fa-times" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
