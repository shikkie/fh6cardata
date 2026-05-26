import { useState, useEffect } from 'react'

const TIER_ORDER = ['Street', 'Sport', 'Race', 'Elite', 'Rally', 'Off-Road', 'Drag', 'Swap', 'Custom', 'Stock']

const TIER_COLORS = {
  Street:   '#4caf50',
  Sport:    '#2196f3',
  Race:     '#ff9800',
  Elite:    '#e91e63',
  Rally:    '#795548',
  'Off-Road': '#8bc34a',
  Drag:     '#9c27b0',
  Swap:     '#f44336',
  Custom:   '#607d8b',
  Stock:    '#555',
}

const STAT_ICONS = {
  speed:        '⚡',
  handling:     '🔄',
  acceleration: '🚀',
  launch:       '🏁',
  braking:      '🛑',
  offroad:      '🏔️',
}

function StatEffect({ effects }) {
  const entries = Object.entries(effects).filter(([, v]) => v !== 0)
  if (!entries.length) return null
  return (
    <div className="d-flex flex-wrap gap-1 mt-1">
      {entries.map(([stat, val]) => (
        <span key={stat} style={{
          fontSize: '0.68rem',
          padding: '1px 5px',
          borderRadius: '8px',
          backgroundColor: val > 0 ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
          color: val > 0 ? '#81c784' : '#e57373',
          border: `1px solid ${val > 0 ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'}`,
        }}>
          {STAT_ICONS[stat]} {val > 0 ? '+' : ''}{val}
        </span>
      ))}
    </div>
  )
}

function PartRow({ part }) {
  const tierColor = TIER_COLORS[part.tier] || '#888'
  return (
    <div className="tune-part-row">
      <div className="d-flex justify-content-between align-items-start">
        <div className="fw-semibold" style={{ color: '#f5f5f5', fontSize: '0.82rem' }}>{part.name}</div>
        <div className="d-flex align-items-center gap-1 flex-shrink-0 ms-2">
          <span style={{
            fontSize: '0.65rem',
            padding: '1px 6px',
            borderRadius: '8px',
            border: `1px solid ${tierColor}`,
            color: tierColor,
          }}>{part.tier}</span>
          {part.pi_impact !== 0 && (
            <span style={{ fontSize: '0.7rem', color: part.pi_impact > 0 ? '#f0a500' : '#81c784' }}>
              {part.pi_impact > 0 ? '+' : ''}{part.pi_impact} PI
            </span>
          )}
        </div>
      </div>
      <StatEffect effects={part.stat_effects} />
      {part.notes && (
        <div style={{ fontSize: '0.68rem', color: '#777', marginTop: '2px' }}>{part.notes}</div>
      )}
    </div>
  )
}

export default function TunePanel({ piClass }) {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Engine')

  useEffect(() => {
    if (!piClass) { setLoading(false); return }
    fetch(`/api/parts?class=${piClass}`)
      .then(r => r.json())
      .then(data => { setParts(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [piClass])

  if (!piClass) return (
    <div style={{ color: '#888', fontSize: '0.82rem', padding: '8px 0' }}>
      No PI class — tuning data unavailable.
    </div>
  )

  if (loading) return (
    <div style={{ color: '#888', fontSize: '0.82rem', padding: '8px 0' }}>Loading parts…</div>
  )

  const categories = [...new Set(parts.map(p => p.category))]
    .sort((a, b) => ['Engine','Drivetrain','Platform','Tires','Aero'].indexOf(a) - ['Engine','Drivetrain','Platform','Tires','Aero'].indexOf(b))

  const filtered = parts
    .filter(p => p.category === activeCategory)
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))

  const grouped = filtered.reduce((acc, p) => {
    acc[p.subcategory] = acc[p.subcategory] || []
    acc[p.subcategory].push(p)
    return acc
  }, {})

  return (
    <div>
      {/* Category tabs */}
      <div className="d-flex gap-1 flex-wrap mb-3">
        {categories.map(cat => (
          <button
            key={cat}
            className="btn btn-sm"
            style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              backgroundColor: activeCategory === cat ? 'var(--fh6-accent)' : 'transparent',
              color: activeCategory === cat ? '#000' : '#aaa',
              border: `1px solid ${activeCategory === cat ? 'var(--fh6-accent)' : '#444'}`,
              borderRadius: '12px',
            }}
            onClick={() => setActiveCategory(cat)}
          >{cat}</button>
        ))}
      </div>

      {/* Parts by subcategory */}
      {Object.entries(grouped).map(([sub, subParts]) => (
        <div key={sub} className="mb-3">
          <div className="detail-section-label mb-1">{sub}</div>
          {subParts.map(p => <PartRow key={p.id} part={p} />)}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ color: '#888', fontSize: '0.82rem' }}>No parts for class {piClass} in this category.</div>
      )}
    </div>
  )
}
