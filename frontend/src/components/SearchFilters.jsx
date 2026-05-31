import ComboBox from './ComboBox.jsx'

const COMBOBOX_THRESHOLD = 5

export default function SearchFilters({
  query, onQueryChange,
  selectedClass, onClassChange,
  selectedRarity, onRarityChange,
  selectedManufacturer, onManufacturerChange,
  selectedAvailability, onAvailabilityChange,
  ownedOnly, onOwnedOnlyChange,
  wishlistedOnly, onWishlistedOnlyChange,
  ordinalFilter, onOrdinalFilterChange,
  sortKey, onSortChange, sortOptions,
  filters,
  onClear,
}) {
  const hasFilters = query || selectedClass || selectedRarity || selectedManufacturer || selectedAvailability || ownedOnly !== null || wishlistedOnly || ordinalFilter

  // Helper: use ComboBox for long lists, native <select> for short ones
  function FilterSelect({ value, onChange, options, placeholder, colClass }) {
    if (options.length > COMBOBOX_THRESHOLD) {
      return (
        <div className={colClass}>
          <ComboBox
            value={value}
            onChange={onChange}
            options={options}
            placeholder={placeholder}
          />
        </div>
      )
    }
    return (
      <div className={colClass}>
        <select className="form-select form-select-sm" value={value} onChange={e => onChange(e.target.value)}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="search-bar">
      <div className="row g-2">
        {/* Search */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="input-group input-group-sm">
            <span className="input-group-text">
              <i className="fas fa-magnifying-glass" />
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

        {/* Make — 89 options → ComboBox */}
        <FilterSelect
          value={selectedManufacturer}
          onChange={onManufacturerChange}
          options={filters.manufacturers ?? []}
          placeholder="All Makes"
          colClass="col-6 col-sm-3 col-lg-2"
        />

        {/* Class — 7 options → ComboBox */}
        <FilterSelect
          value={selectedClass}
          onChange={onClassChange}
          options={filters.classes ?? []}
          placeholder="Class"
          colClass="col-6 col-sm-3 col-lg-1"
        />

        {/* Rarity — 8 options → ComboBox */}
        <FilterSelect
          value={selectedRarity}
          onChange={onRarityChange}
          options={filters.rarities ?? []}
          placeholder="Rarity"
          colClass="col-6 col-sm-3 col-lg-2"
        />

        {/* Availability — 23 options → ComboBox */}
        <FilterSelect
          value={selectedAvailability}
          onChange={onAvailabilityChange}
          options={filters.availabilities ?? []}
          placeholder="All Sources"
          colClass="col-6 col-sm-3 col-lg-2"
        />

        {/* Sort — keep as native select (descriptive labels don't benefit from search) */}
        <div className="col-6 col-sm-3 col-lg-2">
          <select className="form-select form-select-sm" value={sortKey} onChange={e => onSortChange(e.target.value)}>
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Owned filter — 3 options → native select */}
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

        {/* Wishlist filter */}
        <div className="col-6 col-sm-3 col-lg-2">
          <select
            className="form-select form-select-sm"
            value={wishlistedOnly ? 'wishlisted' : ''}
            onChange={e => onWishlistedOnlyChange(e.target.value === 'wishlisted')}
          >
            <option value="">⭐ All Cars</option>
            <option value="wishlisted">⭐ Wishlist</option>
          </select>
        </div>

        {/* Ordinal filter */}
        <div className="col-6 col-sm-3 col-lg-2">
          <select
            className="form-select form-select-sm"
            value={ordinalFilter}
            onChange={e => onOrdinalFilterChange(e.target.value)}
          >
            <option value="">📡 All Ordinals</option>
            <option value="assigned">📡 Ordinal Set</option>
            <option value="unassigned">📡 No Ordinal</option>
          </select>
        </div>

        {/* Clear */}
        {hasFilters && (
          <div className="col-auto">
            <button className="btn btn-sm btn-outline-secondary" onClick={onClear} title="Clear filters">
              <i className="fas fa-xmark" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
