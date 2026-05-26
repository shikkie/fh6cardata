import { useState, useEffect } from 'react'

const TIER_ORDER = ['Street', 'Sport', 'Race', 'Elite', 'Rally', 'Off-Road', 'Drag', 'Swap', 'Custom', 'Stock']

const LEGEND_TIERS = [
  { tier: 'Street',   color: '#4caf50', desc: 'Entry-level upgrade. Small PI gain, affordable.' },
  { tier: 'Sport',    color: '#2196f3', desc: 'Mid-range upgrade. Good balance of cost and PI.' },
  { tier: 'Race',     color: '#ff9800', desc: 'High-performance. Significant PI and stat gains.' },
  { tier: 'Elite',    color: '#e91e63', desc: 'Top-tier. Maximum performance, highest cost.' },
  { tier: 'Rally',    color: '#795548', desc: 'Off-road and rally-focused build.' },
  { tier: 'Off-Road', color: '#8bc34a', desc: 'Off-road and dirt track optimized.' },
  { tier: 'Drag',     color: '#9c27b0', desc: 'Drag strip only — max straight-line power.' },
  { tier: 'Swap',     color: '#f44336', desc: 'Engine/drivetrain swap. Major change to PI class.' },
]

const LEGEND_STATS = [
  { icon: '⚡', stat: 'Speed',        desc: 'Top speed capability.' },
  { icon: '🔄', stat: 'Handling',     desc: 'Cornering and lateral grip.' },
  { icon: '🚀', stat: 'Acceleration', desc: 'Mid-range acceleration (20–60 mph).' },
  { icon: '🏁', stat: 'Launch',       desc: '0–60 mph launch performance.' },
  { icon: '🛑', stat: 'Braking',      desc: 'Stopping distance and brake feel.' },
  { icon: '🏔️', stat: 'Off-Road',    desc: 'Traction and stability on loose surfaces.' },
]

function TuneLegendModal({ onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1e1e1e',
          border: '1px solid #333',
          borderRadius: '14px',
          padding: '20px',
          maxWidth: '380px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          color: '#f5f5f5',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>🔧 Tuning Legend</span>
          <button
            className="btn btn-sm"
            style={{ color: '#aaa', fontSize: '1.1rem', lineHeight: 1, padding: '0 4px', background: 'none', border: 'none' }}
            onClick={onClose}
          >✕</button>
        </div>

        {/* Tier badges */}
        <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Upgrade Tiers
        </div>
        <div className="mb-3">
          {LEGEND_TIERS.map(({ tier, color, desc }) => (
            <div key={tier} className="d-flex align-items-start gap-2 mb-2">
              <span style={{
                fontSize: '0.65rem', padding: '2px 7px', borderRadius: '8px',
                border: `1px solid ${color}`, color, flexShrink: 0, marginTop: '1px',
              }}>{tier}</span>
              <span style={{ fontSize: '0.78rem', color: '#ccc' }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* PI Impact */}
        <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          PI Impact
        </div>
        <div className="mb-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span style={{ fontSize: '0.72rem', color: '#f0a500', fontWeight: 700 }}>+12 PI</span>
            <span style={{ fontSize: '0.78rem', color: '#ccc' }}>Adds PI — may push car into a higher class.</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '0.72rem', color: '#81c784', fontWeight: 700 }}>−5 PI</span>
            <span style={{ fontSize: '0.78rem', color: '#ccc' }}>Removes PI — useful for staying within class limits.</span>
          </div>
        </div>

        {/* Stat icons */}
        <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Stat Effects
        </div>
        <div className="mb-3">
          {LEGEND_STATS.map(({ icon, stat, desc }) => (
            <div key={stat} className="d-flex align-items-start gap-2 mb-2">
              <span style={{ fontSize: '0.9rem', flexShrink: 0, width: '20px', textAlign: 'center' }}>{icon}</span>
              <span>
                <span style={{ fontSize: '0.78rem', color: '#f5f5f5', fontWeight: 600 }}>{stat}</span>
                <span style={{ fontSize: '0.75rem', color: '#999' }}> — {desc}</span>
              </span>
            </div>
          ))}
          <div className="d-flex align-items-center gap-2 mt-2">
            <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '8px', backgroundColor: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }}>⚡ +5</span>
            <span style={{ fontSize: '0.75rem', color: '#999' }}>Green = stat improvement</span>
          </div>
          <div className="d-flex align-items-center gap-2 mt-1">
            <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '8px', backgroundColor: 'rgba(244,67,54,0.15)', color: '#e57373', border: '1px solid rgba(244,67,54,0.3)' }}>🛑 −3</span>
            <span style={{ fontSize: '0.75rem', color: '#999' }}>Red = stat decrease (trade-off)</span>
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: '#666', borderTop: '1px solid #333', paddingTop: '10px' }}>
          Tap anywhere outside to close.
        </div>
      </div>
    </div>
  )
}

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
  const [showLegend, setShowLegend] = useState(false)

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
      {showLegend && <TuneLegendModal onClose={() => setShowLegend(false)} />}

      {/* Category tabs + legend button */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex gap-1 flex-wrap">
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
        <button
          className="btn btn-sm"
          title="Legend — what do these icons mean?"
          style={{
            fontSize: '0.75rem',
            padding: '2px 7px',
            borderRadius: '12px',
            border: '1px solid #444',
            color: '#aaa',
            background: 'transparent',
            flexShrink: 0,
            marginLeft: '6px',
          }}
          onClick={() => setShowLegend(true)}
        >ℹ️ Legend</button>
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
