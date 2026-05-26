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

export default function CarCard({ car, onClick }) {
  const noAuction = !car.auctionable

  return (
    <div className="car-card p-3 h-100" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick?.()}>
      <div className="d-flex justify-content-between align-items-start mb-1">
        <div className="d-flex gap-1 flex-wrap">
          {car.pi_class && <span className="class-badge">{car.pi_class}</span>}
          <span className={`rarity-badge ${rarityClass(car.rarity)}`}>{car.rarity}</span>
        </div>
        {car.pi && <span className="text-muted small">PI {car.pi}</span>}
      </div>

      <div className="mt-2 mb-1">
        <div className="fw-semibold" style={{ lineHeight: 1.3 }}>{car.full_name}</div>
        {car.availability && (
          <div className="text-muted small">{car.availability}</div>
        )}
      </div>

      <div className="mt-2 d-flex justify-content-between align-items-center">
        {noAuction
          ? <span className="base-value no-auction"><i className="fas fa-ban me-1" />Not auctionable</span>
          : <span className="base-value">{formatCredits(car.base_value) || '—'}</span>
        }
        {car.country && (
          <span className="text-muted small">{car.country}</span>
        )}
      </div>
    </div>
  )
}
