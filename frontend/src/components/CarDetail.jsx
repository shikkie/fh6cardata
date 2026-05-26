import { useEffect, useRef } from 'react'

const STAT_LABELS = [
  { key: 'speed',        label: 'Speed' },
  { key: 'handling',     label: 'Handling' },
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'launch',       label: 'Launch' },
  { key: 'braking',      label: 'Braking' },
  { key: 'offroad',      label: 'Off-Road' },
]

function StatBar({ label, value }) {
  const pct = value != null ? Math.round((value / 10) * 100) : 0
  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.78rem' }}>
        <span className="text-muted">{label}</span>
        <span className="fw-semibold">{value != null ? value.toFixed(1) : '—'}</span>
      </div>
      <div className="progress" style={{ height: '6px', backgroundColor: '#333' }}>
        <div
          className="progress-bar"
          style={{ width: `${pct}%`, backgroundColor: 'var(--fh6-accent)', transition: 'width 0.4s ease' }}
        />
      </div>
    </div>
  )
}

function formatCR(val) {
  if (!val) return '—'
  return val.toLocaleString('en-US') + ' CR'
}

function bidRange(car) {
  if (!car.auctionable || !car.base_value) return null
  // Estimate: min bid ~60% of base value, buyout ~150%
  // Adjusted by rarity
  const multipliers = {
    'Common':    [0.5, 1.2],
    'Rare':      [0.6, 1.4],
    'Epic':      [0.7, 1.6],
    'Legendary': [0.8, 2.0],
  }
  const [loMult, hiMult] = multipliers[car.rarity] || [0.6, 1.4]
  const lo = Math.round(car.base_value * loMult / 1000) * 1000
  const hi = Math.round(car.base_value * hiMult / 1000) * 1000
  return { lo, hi }
}

export default function CarDetail({ car, onClose }) {
  const ref = useRef(null)
  const range = bidRange(car)

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Trap focus / close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  async function copyValue(text) {
    try {
      await navigator.clipboard.writeText(text)
      const btn = ref.current?.querySelector('.copy-btn')
      if (btn) {
        btn.textContent = '✓ Copied!'
        setTimeout(() => { btn.textContent = 'Copy value' }, 1500)
      }
    } catch {}
  }

  return (
    <div
      className="car-detail-backdrop"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div className="car-detail-sheet" ref={ref}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div className="fw-bold fs-6">{car.full_name}</div>
            <div className="text-muted small">{car.availability}</div>
          </div>
          <button className="btn-close btn-close-white" onClick={onClose} aria-label="Close" />
        </div>

        {/* Badges row */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          {car.pi_class && (
            <span className="class-badge">{car.pi_class}</span>
          )}
          <span className={`rarity-badge rarity-${car.rarity.toLowerCase().replace(' ', '-')}`}>{car.rarity}</span>
          {car.pi && <span className="badge bg-secondary">PI {car.pi}</span>}
          {car.country && <span className="badge bg-secondary">{car.country}</span>}
        </div>

        {/* Stats */}
        {car.stats && (
          <div className="mb-3">
            <div className="text-uppercase text-muted mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}>Performance Stats</div>
            {STAT_LABELS.map(({ key, label }) => (
              <StatBar key={key} label={label} value={car.stats[key]} />
            ))}
          </div>
        )}

        {/* Value & bid range */}
        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#1a1a1a' }}>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="text-muted small">Base Value</span>
            <span className="fw-bold" style={{ color: 'var(--fh6-accent)' }}>{formatCR(car.base_value)}</span>
          </div>
          {range && (
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted small">Est. Auction Range</span>
              <span className="small">{formatCR(range.lo)} – {formatCR(range.hi)}</span>
            </div>
          )}
          {!car.auctionable && (
            <div className="text-muted small"><i className="fas fa-ban me-1" />Not auctionable</div>
          )}
        </div>

        {/* Actions */}
        <div className="d-flex gap-2">
          {car.base_value && car.auctionable && (
            <button
              className="btn btn-sm btn-outline-light copy-btn"
              onClick={() => copyValue(car.base_value.toLocaleString('en-US') + ' CR')}
            >
              Copy value
            </button>
          )}
          <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
