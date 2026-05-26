export default function SearchFilters({
  query, onQueryChange,
  selectedClass, onClassChange,
  selectedType, onTypeChange,
  selectedRarity, onRarityChange,
  selectedManufacturer, onManufacturerChange,
  filters,
  onClear,
}) {
  const hasFilters = query || selectedClass || selectedType || selectedRarity || selectedManufacturer

  return (
    <div className="search-bar">
      <div className="row g-2">
        <div className="col-12 col-sm-6 col-lg-4">
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

        <div className="col-6 col-sm-3 col-lg-2">
          <select className="form-select form-select-sm" value={selectedManufacturer} onChange={e => onManufacturerChange(e.target.value)}>
            <option value="">All Makes</option>
            {filters.manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="col-6 col-sm-3 col-lg-2">
          <select className="form-select form-select-sm" value={selectedClass} onChange={e => onClassChange(e.target.value)}>
            <option value="">All Classes</option>
            {filters.classes.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </div>

        <div className="col-6 col-sm-3 col-lg-2">
          <select className="form-select form-select-sm" value={selectedType} onChange={e => onTypeChange(e.target.value)}>
            <option value="">All Types</option>
            {filters.types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="col-6 col-sm-3 col-lg-2">
          <select className="form-select form-select-sm" value={selectedRarity} onChange={e => onRarityChange(e.target.value)}>
            <option value="">All Rarities</option>
            {filters.rarities.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

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
