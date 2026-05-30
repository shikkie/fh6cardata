import CarImage from './CarImage.jsx'

function rarityClass(rarity) {
  const map = {
    'Common': 'rarity-common',
    'Rare': 'rarity-rare',
    'Epic': 'rarity-epic',
    'Legendary': 'rarity-legendary',
    'Forza Edition': 'rarity-forza',
    'Barn Find': 'rarity-barn',
    'Treasure Car': 'rarity-barn',
    'Unreleased': 'rarity-common',
  }
  return map[rarity] || 'rarity-common'
}

function formatCredits(val) {
  if (!val) return null
  return val.toLocaleString('en-US') + ' CR'
}

export default function CarCard({ car, owned, wishlisted, onClick, onToggleOwned, onToggleWishlisted }) {
  const noAuction = !car.auctionable

  return (
    <div
      className={`car-card p-3 h-100${owned ? ' car-card-owned' : wishlisted ? ' car-card-wishlisted' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
    >
      <CarImage src={car.image_url} alt={car.full_name} className="car-card-thumb mb-2" />

      <div className="d-flex justify-content-between align-items-start mb-1">
        <div className="d-flex gap-1 flex-wrap">
          {car.pi_class && <span className={`class-badge class-${car.pi_class}`}>{car.pi_class}</span>}
          <span className={`rarity-badge ${rarityClass(car.rarity)}`}>{car.rarity}</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          {car.pi && <span style={{ color: '#888', fontSize: '0.8rem' }}>PI {car.pi}</span>}
        </div>
      </div>

      <div className="mt-2 mb-1">
        <div className="fw-semibold" style={{ lineHeight: 1.3 }}>{car.full_name}</div>
        {car.availability && (
          <div style={{ color: '#888', fontSize: '0.8rem' }}>{car.availability}</div>
        )}
      </div>

      <div className="mt-2 d-flex justify-content-between align-items-center">
        {noAuction
          ? <span className="base-value no-auction"><i className="fas fa-ban me-1" />Not auctionable</span>
          : <span className="base-value">{formatCredits(car.base_value) || '—'}</span>
        }
        <div className="d-flex align-items-center gap-2">
          {car.carordinalid != null && (
            <span title="Telemetry Ordinal ID" style={{ color: '#666', fontSize: '0.72rem', fontFamily: 'monospace' }}>
              #{car.carordinalid}
            </span>
          )}
          {!owned && (
            <button
              className={`wishlist-btn${wishlisted ? ' wishlist-btn-active' : ''}`}
              title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              onClick={e => { e.stopPropagation(); onToggleWishlisted?.() }}
              aria-pressed={wishlisted}
            >
              ⭐
            </button>
          )}
          <button
            className={`garage-btn${owned ? ' garage-btn-owned' : ''}`}
            title={owned ? 'Remove from garage' : 'Add to garage'}
            onClick={e => { e.stopPropagation(); onToggleOwned?.() }}
            aria-pressed={owned}
          >
            🚗
          </button>
        </div>
      </div>
    </div>
  )
}
