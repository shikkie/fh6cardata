function rarityClass(rarity) {
  const map = {
    'Common': 'rarity-common',
    'Rare': 'rarity-rare',
    'Epic': 'rarity-epic',
    'Legendary': 'rarity-legendary',
    'Forza Edition': 'rarity-forza',
    'Barn Find': 'rarity-barn',
  }
  return map[rarity] || 'rarity-common'
}

function formatCredits(val) {
  if (!val) return null
  return val.toLocaleString('en-US') + ' CR'
}

export default function CarCard({ car }) {
  const noAuction = car.rarity === 'Barn Find' || car.rarity === 'Forza Edition'

  return (
    <div className="car-card p-3 h-100">
      <div className="d-flex justify-content-between align-items-start mb-1">
        <div>
          <span className="class-badge me-2">{car.class}</span>
          <span className={`rarity-badge ${rarityClass(car.rarity)}`}>{car.rarity}</span>
        </div>
        <span className="text-muted small">PI {car.pi}</span>
      </div>

      <div className="mt-2 mb-1">
        <div className="fw-semibold" style={{ lineHeight: 1.3 }}>{car.full_name}</div>
        <div className="text-muted small">{car.type}</div>
      </div>

      <div className="mt-2 d-flex justify-content-between align-items-center">
        {noAuction
          ? <span className="base-value no-auction"><i className="fas fa-ban me-1" />Not auctionable</span>
          : <span className="base-value">{formatCredits(car.base_value) || '—'}</span>
        }
        {car.drivetrain && (
          <span className="badge bg-secondary text-light" style={{ fontSize: '0.7rem' }}>{car.drivetrain}</span>
        )}
      </div>
    </div>
  )
}
